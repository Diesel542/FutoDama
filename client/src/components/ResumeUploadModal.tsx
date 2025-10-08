import { useState, useRef } from 'react';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, FileText, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import * as pdfjsLib from 'pdfjs-dist';

interface ResumeUploadModalProps {
  open: boolean;
  onClose: () => void;
  onResumeStarted: (resumeId: string) => void;
  selectedCodexId: string;
}

export default function ResumeUploadModal({ 
  open, 
  onClose, 
  onResumeStarted, 
  selectedCodexId 
}: ResumeUploadModalProps) {
  const [textInput, setTextInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isProcessingVision, setIsProcessingVision] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file && (file.type === 'application/pdf' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.type === 'text/plain')) {
      setSelectedFile(file);
      setTextInput('');
    } else {
      toast({
        title: "Invalid File Type",
        description: "Please upload a PDF, DOCX, or TXT file",
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setTextInput('');
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile && !textInput.trim()) {
      toast({
        title: "No Input",
        description: "Please upload a resume file or paste resume text",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

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
            
            // Check if vision processing is needed
            if (data.needsVision) {
              console.log('Vision processing required for image-based PDF');
              
              setIsProcessingVision(true);
              toast({
                title: "Converting PDF to images",
                description: "Processing your resume with advanced vision analysis...",
              });
              
              try {
                const images = await convertPdfToImages(selectedFile);
                console.log(`Converted resume PDF to ${images.length} images`);
                
                const visionResponse = await fetch('/api/resumes/vision-extract', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    images,
                    resumeId: resumeId, // Pass the existing resumeId
                    codexId: selectedCodexId,
                  }),
                });

                if (!visionResponse.ok) {
                  throw new Error('Vision processing failed');
                }

                onResumeStarted(resumeId);
                
                toast({
                  title: "Vision processing started",
                  description: `Successfully converted your resume to ${images.length} images and started AI analysis.`,
                });
              } catch (visionError) {
                console.error('Vision processing failed:', visionError);
                throw new Error(`Vision processing failed. Please try uploading a text version.`);
              } finally {
                setIsProcessingVision(false);
              }
            } else {
              // Regular processing
              onResumeStarted(resumeId);
              
              toast({
                title: "Processing started",
                description: "Your resume is being analyzed by AI.",
              });
            }
          } catch (uploadError) {
            // If upload completely fails, show error
            console.error('PDF upload failed:', uploadError);
            throw uploadError;
          }
        } else {
          // For non-PDF files, use regular upload
          const formData = new FormData();
          formData.append('file', selectedFile);
          formData.append('codexId', selectedCodexId);
          
          const response = await fetch('/api/resumes/upload', {
            method: 'POST',
            body: formData,
          });

          const data = await response.json();
          resumeId = data.resumeId;
          
          onResumeStarted(resumeId);
          
          toast({
            title: "Processing started",
            description: "Your resume is being analyzed by AI.",
          });
        }
      } else {
        // For text input, use regular upload
        const formData = new FormData();
        formData.append('text', textInput.trim());
        formData.append('codexId', selectedCodexId);
        
        const response = await fetch('/api/resumes/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();
        resumeId = data.resumeId;
        
        onResumeStarted(resumeId);
        
        toast({
          title: "Processing started",
          description: "Your resume is being analyzed by AI.",
        });
      }

      // Reset form and close modal on success
      setSelectedFile(null);
      setTextInput('');
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onClose();

    } catch (error) {
      console.error('Upload error:', error);
      setIsProcessing(false);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload resume. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Resume</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {!selectedFile ? (
            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                isDragOver ? 'border-primary bg-primary/5' : 'border-border'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              data-testid="dropzone-resume"
            >
              <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">
                Drag and drop your resume here, or click to browse
              </p>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                data-testid="button-browse-resume"
              >
                <Upload className="w-4 h-4 mr-2" />
                Browse Files
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.docx,.txt"
                onChange={handleFileSelect}
                data-testid="input-file-resume"
              />
              <p className="text-xs text-muted-foreground mt-4">
                Supported formats: PDF, DOCX, TXT
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-primary" />
                <div>
                  <p className="font-medium" data-testid="text-filename">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedFile(null)}
                data-testid="button-remove-file"
              >
                Remove
              </Button>
            </div>
          )}

          <div className="flex items-center">
            <div className="flex-1 border-t border-border"></div>
            <span className="px-4 text-sm text-muted-foreground">OR</span>
            <div className="flex-1 border-t border-border"></div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium">Paste Resume Text</label>
            <Textarea
              value={textInput}
              onChange={(e) => {
                setTextInput(e.target.value);
                if (e.target.value.trim()) setSelectedFile(null);
              }}
              placeholder="Paste your resume text here..."
              className="min-h-[150px] font-mono text-sm"
              disabled={!!selectedFile}
              data-testid="input-resume-text"
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={isProcessing || isProcessingVision || (!selectedFile && !textInput.trim())}
            className="w-full"
            data-testid="button-process-resume"
          >
            {isProcessingVision ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Converting PDF to images...
              </>
            ) : isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Process Resume
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
