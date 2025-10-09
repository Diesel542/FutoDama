import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CloudUpload, Wand2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { ScrollArea } from "@/components/ui/scroll-area";

// Initialize PDF.js worker using Vite's URL import
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface ResumeUploadSectionProps {
  onResumeStarted: (resumeId: string) => void;
  processingResumeId: string | null;
  selectedCodexId: string;
  codexes: any[];
}

interface LogMessage {
  timestamp: string;
  step?: string;
  message: string;
  details?: any;
  type: 'info' | 'debug' | 'error';
}

export default function ResumeUploadSection({ onResumeStarted, processingResumeId, selectedCodexId, codexes }: ResumeUploadSectionProps) {
  const [textInput, setTextInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessingVision, setIsProcessingVision] = useState(false);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();
  
  // Find the selected codex details
  const selectedCodex = codexes.find(c => c.id === selectedCodexId);
  
  // WebSocket connection for live logs
  useEffect(() => {
    if (processingResumeId) {
      // Connect to WebSocket
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/logs?resumeId=${processingResumeId}`;
      const ws = new WebSocket(wsUrl);
      
      ws.onmessage = (event) => {
        const log: LogMessage = JSON.parse(event.data);
        setLogs(prev => [...prev, log]);
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      wsRef.current = ws;
      
      return () => {
        ws.close();
      };
    }
  }, [processingResumeId]);
  
  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Convert PDF file to base64 images using PDF.js
  const convertPdfToImages = async (file: File): Promise<string[]> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
      const images: string[] = [];
      
      // Limit to first 5 pages to control costs
      const maxPages = Math.min(pdf.numPages, 5);
      
      for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        
        // Set scale for good resolution (2x for crisp text)
        const scale = 2.0;
        const viewport = page.getViewport({ scale });
        
        // Create canvas
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        if (!context) {
          throw new Error('Could not get canvas context');
        }
        
        // Render page to canvas
        await page.render({
          canvasContext: context,
          viewport: viewport,
          canvas: canvas
        }).promise;
        
        // Convert canvas to base64 (remove data URL prefix)
        const base64 = canvas.toDataURL('image/png').split(',')[1];
        images.push(base64);
      }
      
      return images;
    } catch (error) {
      console.error('PDF conversion error:', error);
      throw new Error('Failed to convert PDF to images');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.includes('pdf') || file.type.includes('document') || file.type.includes('text') || file.name.endsWith('.docx') || file.name.endsWith('.txt')) {
        setSelectedFile(file);
        setTextInput('');
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF, DOCX, or TXT file.",
          variant: "destructive"
        });
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
      setTextInput('');
    }
  };

  // Helper function to add client logs
  const addClientLog = (message: string, step?: string) => {
    setLogs(prev => [...prev, {
      timestamp: new Date().toISOString(),
      step,
      message,
      type: 'info' as const
    }]);
  };

  const handleProcess = async () => {
    if (!selectedFile && !textInput.trim()) {
      toast({
        title: "No input provided",
        description: "Please upload a file or enter text to process.",
        variant: "destructive"
      });
      return;
    }

    // Clear previous logs and start fresh
    setLogs([]);

    // Add immediate client-side logs
    addClientLog('Preparing to send resume to server...', 'UPLOAD INITIATED');

    if (selectedFile) {
      const fileSizeMB = (selectedFile.size / (1024 * 1024)).toFixed(2);
      addClientLog(`File selected: ${selectedFile.name} (${fileSizeMB} MB)`);
    } else {
      const charCount = textInput.trim().length;
      addClientLog(`Text input: ${charCount} characters`);
    }

    addClientLog('Sending to server...');

    try {
      let resumeId;
      
      if (selectedFile) {
        // Check if it's a PDF file
        const isPDF = selectedFile.type === 'application/pdf' || selectedFile.name.toLowerCase().endsWith('.pdf');
        
        if (isPDF) {
          // Try regular upload first for PDFs
          try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('codexId', selectedCodexId);
            
            const response = await fetch('/api/resumes/upload', {
              method: 'POST',
              body: formData,
            });

            if (!response.ok) {
              throw new Error('Upload failed');
            }

            const data = await response.json();
            resumeId = data.resumeId;
            
            // Add log for resume creation
            addClientLog(`Resume created with ID: ${resumeId}`, 'RESUME CREATED');
            
            // Check if vision processing is needed
            if (data.needsVision) {
              console.log('Vision processing required for image-based PDF');
              
              setIsProcessingVision(true);
              addClientLog('PDF requires vision processing - converting to images...');
              
              toast({
                title: "Converting PDF to images",
                description: "Processing your resume with advanced vision analysis...",
              });
              
              try {
                const images = await convertPdfToImages(selectedFile);
                console.log(`Converted resume PDF to ${images.length} images`);
                addClientLog(`PDF converted to ${images.length} images for OCR processing`);
                
                const visionResponse = await fetch('/api/resumes/vision-extract', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    images,
                    resumeId: resumeId,
                    codexId: selectedCodexId,
                  }),
                });

                if (!visionResponse.ok) {
                  throw new Error('Vision processing failed');
                }

                addClientLog('Vision processing started successfully');
                addClientLog('Connecting to live processing logs...');
                
                onResumeStarted(resumeId);
                
                toast({
                  title: "Vision processing started",
                  description: `Successfully converted your PDF to ${images.length} images and started AI analysis.`,
                });
              } catch (visionError) {
                console.error('Vision processing failed:', visionError);
                throw new Error(`Vision processing failed. Please try uploading a text version or contact support.`);
              } finally {
                setIsProcessingVision(false);
              }
            } else {
              // Regular text extraction worked
              addClientLog('Connecting to live processing logs...');
              onResumeStarted(resumeId);
              
              toast({
                title: "Processing started",
                description: "Your resume is being analyzed by AI agents.",
              });
            }
          } catch (uploadError) {
            console.error('Resume upload failed:', uploadError);
            throw uploadError;
          }
        } else {
          // For non-PDF files (DOCX, TXT), use regular upload
          const formData = new FormData();
          formData.append('file', selectedFile);
          formData.append('codexId', selectedCodexId);
          
          const response = await fetch('/api/resumes/upload', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error('Upload failed');
          }

          const data = await response.json();
          resumeId = data.resumeId;
          
          addClientLog(`Resume created with ID: ${resumeId}`, 'RESUME CREATED');
          addClientLog('Connecting to live processing logs...');
          
          onResumeStarted(resumeId);
          
          toast({
            title: "Processing started",
            description: "Your resume is being analyzed by AI agents.",
          });
        }
      } else {
        // For text input, use text endpoint
        const formData = new FormData();
        formData.append('text', textInput.trim());
        formData.append('codexId', selectedCodexId);
        
        const response = await fetch('/api/resumes/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const data = await response.json();
        resumeId = data.resumeId;
        
        addClientLog(`Resume created with ID: ${resumeId}`, 'RESUME CREATED');
        addClientLog('Connecting to live processing logs...');
        
        onResumeStarted(resumeId);
        
        toast({
          title: "Processing started",
          description: "Your resume is being analyzed by AI agents.",
        });
      }
      
      // Don't reset form - keep input visible for potential reprocessing or editing
      // User can manually clear or type over the text
      
    } catch (error) {
      toast({
        title: "Processing failed",
        description: error instanceof Error ? error.message : "Failed to process resume",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* File Upload Card */}
      <Card data-testid="card-resume-upload">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4 text-card-foreground">Upload Resume</h2>
          
          {/* Upload Zone */}
          <div 
            className={`upload-zone rounded-lg p-8 text-center mb-4 ${isDragOver ? 'drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            data-testid="upload-zone-resume"
          >
            <div className="flex flex-col items-center space-y-3">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <CloudUpload className="text-primary text-xl" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {selectedFile ? selectedFile.name : 'Drop files here or click to browse'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, TXT up to 10MB</p>
              </div>
              <input 
                type="file" 
                accept=".pdf,.docx,.doc,.txt" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileSelect}
                data-testid="input-file-resume"
              />
              <Button 
                variant="outline" 
                size="sm"
                data-testid="button-choose-file-resume"
              >
                Choose File
              </Button>
            </div>
          </div>

          {/* Text Input Alternative */}
          <div className="space-y-3">
            <Label htmlFor="resume-text" className="text-sm font-medium text-foreground">
              Or paste resume text:
            </Label>
            <Textarea 
              id="resume-text"
              placeholder="Paste the resume here..." 
              rows={6} 
              value={textInput}
              onChange={(e) => {
                setTextInput(e.target.value);
                if (e.target.value.trim()) {
                  setSelectedFile(null);
                }
              }}
              className="resize-none"
              data-testid="textarea-resume"
            />
          </div>

          <div className="flex items-center justify-between mt-4">
            <Button 
              onClick={handleProcess}
              disabled={processingResumeId !== null || isProcessingVision || (!selectedFile && !textInput.trim())}
              data-testid="button-process-resume"
            >
              {isProcessingVision ? (
                <>
                  <Eye className="w-4 h-4 mr-2 animate-pulse" />
                  Converting PDF...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Process with AI
                </>
              )}
            </Button>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <span data-testid="text-processing-status-resume">
                {isProcessingVision ? 'Converting PDF...' : processingResumeId ? 'Processing...' : 'Ready'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Agent Status Card */}
      <Card data-testid="card-agent-status-resume">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4 text-card-foreground">AI Agent Status</h2>
          
          {/* Active Codex Info */}
          <div className="bg-accent/20 border border-accent/30 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-accent-foreground">Active Codex</span>
              <span className="text-xs px-2 py-1 bg-primary/20 text-primary rounded-full">
                {selectedCodex?.version || 'v1.0'}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{selectedCodex?.id || selectedCodexId}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {selectedCodex?.description || 'Intelligent resume extraction with two-pass classification'}
            </p>
          </div>

          {/* Live Processing Logs */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">Processing Logs</h3>
            
            <ScrollArea className="h-[300px] w-full rounded-lg border border-border bg-black/40 p-3">
              <div className="space-y-2 font-mono text-xs">
                {logs.length === 0 ? (
                  <div className="text-muted-foreground italic">
                    Waiting for resume processing to start...
                  </div>
                ) : (
                  logs.map((log, index) => (
                    <div 
                      key={index} 
                      className={`
                        ${log.type === 'error' ? 'text-red-400' : ''}
                        ${log.type === 'info' ? 'text-blue-400' : ''}
                        ${log.type === 'debug' ? 'text-blue-400' : ''}
                      `}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-muted-foreground opacity-60">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        {log.step && (
                          <span className="font-semibold text-slate-300">
                            [{log.step}]
                          </span>
                        )}
                      </div>
                      <div className="ml-20 mt-1">{log.message}</div>
                      {log.details && (
                        <div className="ml-20 mt-1 text-muted-foreground text-xs opacity-75 overflow-x-auto">
                          <pre>{JSON.stringify(log.details, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  ))
                )}
                <div ref={logEndRef} />
              </div>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
