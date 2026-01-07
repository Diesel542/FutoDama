import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CloudUpload, Wand2, Eye } from "lucide-react";
import { uploadJobDescription, processWithVision } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import * as pdfjsLib from 'pdfjs-dist';
import { ScrollArea } from "@/components/ui/scroll-area";
import SidebarPortal from "@/components/SidebarPortal";

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

interface UploadSectionProps {
  onJobStarted: (jobId: string) => void;
  processingJobId: string | null;
  currentJob?: { status: string; processingError?: string } | null;
  selectedCodexId: string;
  codexes: any[];
  compactMode?: boolean;
  sidebarPortalTarget?: string;
}

interface LogMessage {
  timestamp: string;
  step?: string;
  message: string;
  details?: any;
  type: 'info' | 'debug' | 'error';
}

export default function UploadSection({ onJobStarted, processingJobId, currentJob, selectedCodexId, codexes, compactMode = false, sidebarPortalTarget }: UploadSectionProps) {
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
    if (processingJobId) {
      // DON'T clear logs - preserve client-side logs already added
      
      // Connect to WebSocket
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/logs?jobId=${processingJobId}`;
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
  }, [processingJobId]);
  
  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);
  
  // Append error log when job fails
  useEffect(() => {
    if (currentJob && (currentJob.status === 'failed' || currentJob.status === 'error')) {
      const errorMessage = currentJob.processingError || 
        "We couldn't process this job description. Please check the input and try again.";
      
      setLogs(prev => {
        // Avoid duplicate error logs
        const hasErrorLog = prev.some(log => log.type === 'error' && log.step === 'ERROR');
        if (hasErrorLog) return prev;
        
        return [...prev, {
          timestamp: new Date().toISOString(),
          step: 'ERROR',
          message: errorMessage,
          type: 'error' as const
        }];
      });
    }
  }, [currentJob]);

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
      if (file.type.includes('pdf') || file.type.includes('document') || file.name.endsWith('.docx')) {
        setSelectedFile(file);
        setTextInput(''); // Clear text input when file is selected
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF or DOCX file.",
          variant: "destructive"
        });
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
      setTextInput(''); // Clear text input when file is selected
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
    addClientLog('Preparing to send job description to server...', 'UPLOAD INITIATED');

    if (selectedFile) {
      const fileSizeMB = (selectedFile.size / (1024 * 1024)).toFixed(2);
      addClientLog(`File selected: ${selectedFile.name} (${fileSizeMB} MB)`);
    } else {
      const charCount = textInput.trim().length;
      addClientLog(`Text input: ${charCount} characters`);
    }

    addClientLog('Sending to server...');

    try {
      let response;
      
      if (selectedFile) {
        // Check if it's a PDF file
        const isPDF = selectedFile.type === 'application/pdf' || selectedFile.name.toLowerCase().endsWith('.pdf');
        
        if (isPDF) {
          // Try regular upload first for PDFs
          try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('codexId', selectedCodexId);
            
            response = await uploadJobDescription(formData);
            
            // Add log for job creation
            addClientLog(`Job created with ID: ${response.jobId}`, 'JOB CREATED');
            addClientLog('Connecting to live processing logs...');
            
            // If regular upload succeeds, use it
            onJobStarted(response.jobId);
            
            toast({
              title: "Processing started",
              description: "Your PDF is being analyzed by AI agents.",
            });
          } catch (uploadError) {
            // If regular upload fails, try vision processing
            console.log('Regular PDF upload failed, trying vision processing...');
            
            setIsProcessingVision(true);
            toast({
              title: "Converting PDF to images",
              description: "Processing your PDF with advanced vision analysis...",
            });
            
            try {
              const images = await convertPdfToImages(selectedFile);
              console.log(`Converted PDF to ${images.length} images`);
              addClientLog(`PDF converted to ${images.length} images for OCR processing`);
              
              response = await processWithVision(images, selectedCodexId);
              
              addClientLog(`Job created with ID: ${response.jobId}`, 'JOB CREATED');
              addClientLog('Connecting to live processing logs...');
              
              onJobStarted(response.jobId);
              
              toast({
                title: "Vision processing started",
                description: `Successfully converted your PDF to ${images.length} images and started AI analysis.`,
              });
            } catch (visionError) {
              console.error('Vision processing failed:', visionError);
              throw new Error(`Both regular and vision processing failed. Please try uploading a text version or contact support.`);
            } finally {
              setIsProcessingVision(false);
            }
          }
        } else {
          // For non-PDF files, use regular upload
          const formData = new FormData();
          formData.append('file', selectedFile);
          formData.append('codexId', selectedCodexId);
          
          response = await uploadJobDescription(formData);
          
          addClientLog(`Job created with ID: ${response.jobId}`, 'JOB CREATED');
          addClientLog('Connecting to live processing logs...');
          
          onJobStarted(response.jobId);
          
          toast({
            title: "Processing started",
            description: "Your document is being analyzed by AI agents.",
          });
        }
      } else {
        // For text input, use regular upload
        const formData = new FormData();
        formData.append('text', textInput.trim());
        formData.append('codexId', selectedCodexId);
        
        response = await uploadJobDescription(formData);
        
        addClientLog(`Job created with ID: ${response.jobId}`, 'JOB CREATED');
        addClientLog('Connecting to live processing logs...');
        
        onJobStarted(response.jobId);
        
        toast({
          title: "Processing started",
          description: "Your job description is being analyzed by AI agents.",
        });
      }
      
      // Reset form on success
      setSelectedFile(null);
      setTextInput('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
    } catch (error) {
      toast({
        title: "Processing failed",
        description: error instanceof Error ? error.message : "Failed to process job description",
        variant: "destructive"
      });
    }
  };

  return (
    <div className={compactMode ? "" : sidebarPortalTarget ? "space-y-4" : "grid grid-cols-1 lg:grid-cols-2 gap-6"}>
      {/* File Upload Card */}
      <Card data-testid="card-file-upload">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4 text-card-foreground">Upload Job Description</h2>
          
          {/* Upload Zone */}
          <div 
            className={`upload-zone rounded-lg p-8 text-center mb-4 ${isDragOver ? 'drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            data-testid="upload-zone"
          >
            <div className="flex flex-col items-center space-y-3">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <CloudUpload className="text-primary text-xl" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {selectedFile ? selectedFile.name : 'Drop files here or click to browse'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">PDF, DOCX up to 10MB</p>
              </div>
              <input 
                type="file" 
                accept=".pdf,.docx,.doc" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileSelect}
                data-testid="input-file"
              />
              <Button 
                variant="outline" 
                size="sm"
                data-testid="button-choose-file"
              >
                Choose File
              </Button>
            </div>
          </div>

          {/* Text Input Alternative */}
          <div className="space-y-3">
            <Label htmlFor="job-text" className="text-sm font-medium text-foreground">
              Or paste job description text:
            </Label>
            <Textarea 
              id="job-text"
              placeholder="Paste the job description here..." 
              rows={6} 
              value={textInput}
              onChange={(e) => {
                setTextInput(e.target.value);
                if (e.target.value.trim()) {
                  setSelectedFile(null); // Clear file when text is entered
                }
              }}
              className="resize-none"
              data-testid="textarea-job-description"
            />
          </div>

          <div className="flex items-center justify-between mt-4">
            <Button 
              onClick={handleProcess}
              disabled={processingJobId !== null || isProcessingVision || (!selectedFile && !textInput.trim())}
              data-testid="button-process"
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
              <span data-testid="text-processing-status">
                {isProcessingVision ? 'Converting PDF...' : processingJobId ? 'Processing...' : 'Ready'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Agent Status Card - rendered via portal when sidebarPortalTarget is set */}
      {!compactMode && !sidebarPortalTarget && (
      <Card data-testid="card-agent-status">
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
              {selectedCodex?.description || 'Standard job description extraction with 15 key fields'}
            </p>
          </div>

          {/* Live Processing Logs */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">Processing Logs</h3>
            
            <ScrollArea className="h-[300px] w-full rounded-lg border border-border bg-black/40 p-3">
              <div className="space-y-2 font-mono text-xs">
                {logs.length === 0 ? (
                  <div className="text-muted-foreground italic">
                    Waiting for job processing to start...
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
      )}

      {/* Portal rendering for sidebar - full feature parity with inline version */}
      {sidebarPortalTarget && (
        <SidebarPortal targetId={sidebarPortalTarget}>
          <div className="space-y-3" data-testid="job-agent-status-portal">
            <h4 className="text-sm font-semibold text-foreground">Job Description Agent</h4>
            
            <div className="bg-accent/20 border border-accent/30 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-accent-foreground">Active Codex</span>
                <span className="text-xs px-1.5 py-0.5 bg-primary/20 text-primary rounded-full">
                  {selectedCodex?.version || 'v1.0'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{selectedCodex?.id || selectedCodexId}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedCodex?.description || 'Standard job description extraction with 15 key fields'}
              </p>
            </div>

            <div className="space-y-2">
              <h5 className="text-xs font-medium text-foreground">Processing Logs</h5>
              <ScrollArea className="h-[200px] w-full rounded-lg border border-border bg-black/40 p-2">
                <div className="space-y-2 font-mono text-xs">
                  {logs.length === 0 ? (
                    <div className="text-muted-foreground italic">
                      Waiting for job processing to start...
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
                        <div className="ml-16 mt-0.5">{log.message}</div>
                        {log.details && (
                          <div className="ml-16 mt-0.5 text-muted-foreground text-xs opacity-75 overflow-x-auto">
                            <pre className="text-xs">{JSON.stringify(log.details, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                  <div ref={logEndRef} />
                </div>
              </ScrollArea>
            </div>
          </div>
        </SidebarPortal>
      )}
    </div>
  );
}
