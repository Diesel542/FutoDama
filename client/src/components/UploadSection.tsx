import { useState, useRef } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CloudUpload, Wand2 } from "lucide-react";
import { uploadJobDescription } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface UploadSectionProps {
  onJobStarted: (jobId: string) => void;
  processingJobId: string | null;
}

export default function UploadSection({ onJobStarted, processingJobId }: UploadSectionProps) {
  const [textInput, setTextInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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

  const handleProcess = async () => {
    if (!selectedFile && !textInput.trim()) {
      toast({
        title: "No input provided",
        description: "Please upload a file or enter text to process.",
        variant: "destructive"
      });
      return;
    }

    try {
      const formData = new FormData();
      
      if (selectedFile) {
        formData.append('file', selectedFile);
      } else {
        formData.append('text', textInput.trim());
      }

      const response = await uploadJobDescription(formData);
      onJobStarted(response.jobId);
      
      // Reset form
      setSelectedFile(null);
      setTextInput('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      toast({
        title: "Processing started",
        description: "Your job description is being analyzed by AI agents.",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload job description",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              disabled={processingJobId !== null || (!selectedFile && !textInput.trim())}
              data-testid="button-process"
            >
              <Wand2 className="w-4 h-4 mr-2" />
              Process with AI
            </Button>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <span data-testid="text-processing-status">
                {processingJobId ? 'Processing...' : 'Ready'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Agent Status Card */}
      <Card data-testid="card-agent-status">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4 text-card-foreground">AI Agent Status</h2>
          
          {/* Active Codex Info */}
          <div className="bg-accent/20 border border-accent/30 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-accent-foreground">Active Codex</span>
              <span className="text-xs px-2 py-1 bg-primary/20 text-primary rounded-full">v1.0</span>
            </div>
            <p className="text-sm text-muted-foreground">job-card-v1.json</p>
            <p className="text-xs text-muted-foreground mt-1">
              Standard job description extraction with 15 key fields
            </p>
          </div>

          {/* Processing Steps */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">Processing Pipeline</h3>
            
            <div className="flex items-center space-x-3 p-3 bg-muted/20 rounded-lg">
              <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs">✓</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Document Parsing</p>
                <p className="text-xs text-muted-foreground">Extract text from uploaded files</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-3 bg-muted/20 rounded-lg">
              <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs">✓</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">AI Analysis</p>
                <p className="text-xs text-muted-foreground">OpenAI GPT-5 processing</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-muted/20 rounded-lg opacity-60">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full processing-spinner flex-shrink-0"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Schema Validation</p>
                <p className="text-xs text-muted-foreground">Checking completeness...</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
