import { useState, useRef, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, FileText, User, Briefcase, FolderOpen, Award, Star, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface ResumeUploadProps {
  onResumeStarted: (resumeId: string) => void;
  processingResumeId: string | null;
  selectedCodexId: string;
}

interface LogMessage {
  timestamp: string;
  step?: string;
  message: string;
  details?: any;
  type: 'info' | 'debug' | 'error';
}

export default function ResumeUpload({ onResumeStarted, processingResumeId, selectedCodexId }: ResumeUploadProps) {
  const [textInput, setTextInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [resumeData, setResumeData] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();

  // WebSocket connection for real-time logs
  useEffect(() => {
    if (processingResumeId && !wsRef.current) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}`);
      
      ws.onopen = () => {
        console.log('[WebSocket] Connected for resume:', processingResumeId);
        ws.send(JSON.stringify({ type: 'subscribe', jobId: processingResumeId }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'log') {
            setLogs(prev => [...prev, data.log]);
          }
        } catch (error) {
          console.error('[WebSocket] Parse error:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
      };

      ws.onclose = () => {
        console.log('[WebSocket] Disconnected');
        wsRef.current = null;
      };

      wsRef.current = ws;
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [processingResumeId]);

  // Poll for resume completion
  useEffect(() => {
    if (!processingResumeId) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/resumes/${processingResumeId}`);
        const data = await response.json();
        
        if (data.status === 'completed') {
          setResumeData(data);
          setIsProcessing(false);
          clearInterval(pollInterval);
          toast({
            title: "Resume Processed",
            description: "Your resume has been successfully analyzed!",
          });
        } else if (data.status === 'error') {
          setIsProcessing(false);
          clearInterval(pollInterval);
          toast({
            title: "Processing Error",
            description: "There was an error processing your resume.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Poll error:', error);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [processingResumeId, toast]);

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
    setLogs([]);
    setResumeData(null);

    const formData = new FormData();
    
    if (selectedFile) {
      formData.append('file', selectedFile);
    } else if (textInput.trim()) {
      formData.append('text', textInput);
    }
    
    formData.append('codexId', selectedCodexId);

    try {
      const response = await fetch('/api/resumes/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (data.resumeId) {
        onResumeStarted(data.resumeId);
      } else {
        throw new Error('No resume ID returned');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setIsProcessing(false);
      toast({
        title: "Upload Failed",
        description: "Failed to upload resume. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Left Side: Document Viewer / Upload (60%) */}
      <div className="lg:col-span-3 space-y-4">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Upload Resume</h3>
          
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
            <div className="space-y-4">
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

              {/* Document Preview Placeholder */}
              <div className="aspect-[8.5/11] bg-secondary rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Document preview will appear here
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="my-6 flex items-center">
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
            disabled={isProcessing || (!selectedFile && !textInput.trim())}
            className="w-full mt-6"
            data-testid="button-process-resume"
          >
            {isProcessing ? (
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
        </Card>

        {/* Processing Logs */}
        {logs.length > 0 && (
          <Card className="p-4">
            <h4 className="text-sm font-semibold mb-3">Processing Logs</h4>
            <div className="space-y-2 max-h-[300px] overflow-y-auto font-mono text-xs">
              {logs.map((log, index) => (
                <div
                  key={index}
                  className={`p-2 rounded ${
                    log.type === 'error' ? 'bg-destructive/10 text-destructive' :
                    log.type === 'debug' ? 'bg-muted' :
                    'bg-secondary'
                  }`}
                >
                  <div className="font-semibold">{log.step}</div>
                  <div>{log.message}</div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Right Side: Extracted Information (40%) */}
      <div className="lg:col-span-2">
        <Card className="p-6 min-h-[600px]">
          <h3 className="text-lg font-semibold mb-4">Extracted Information</h3>
          
          {!resumeData ? (
            <div className="flex items-center justify-center h-[500px]">
              <div className="text-center">
                {isProcessing ? (
                  <>
                    <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">
                      Processing your resume...
                    </p>
                  </>
                ) : (
                  <>
                    <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Upload a resume to see extracted information
                    </p>
                  </>
                )}
              </div>
            </div>
          ) : (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-5 mb-4">
                <TabsTrigger value="overview" className="text-xs" data-testid="tab-overview">
                  <User className="w-3 h-3" />
                </TabsTrigger>
                <TabsTrigger value="experience" className="text-xs" data-testid="tab-experience">
                  <Briefcase className="w-3 h-3" />
                </TabsTrigger>
                <TabsTrigger value="portfolio" className="text-xs" data-testid="tab-portfolio">
                  <FolderOpen className="w-3 h-3" />
                </TabsTrigger>
                <TabsTrigger value="skills" className="text-xs" data-testid="tab-skills">
                  <Award className="w-3 h-3" />
                </TabsTrigger>
                <TabsTrigger value="reviews" className="text-xs" data-testid="tab-reviews">
                  <Star className="w-3 h-3" />
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <div className="space-y-4 text-sm">
                  <p className="text-muted-foreground">Overview tab - coming soon</p>
                  <pre className="bg-secondary p-4 rounded text-xs overflow-auto">
                    {JSON.stringify(resumeData.resumeCard, null, 2)}
                  </pre>
                </div>
              </TabsContent>

              <TabsContent value="experience">
                <p className="text-sm text-muted-foreground">Experience tab - coming soon</p>
              </TabsContent>

              <TabsContent value="portfolio">
                <p className="text-sm text-muted-foreground">Portfolio tab - coming soon</p>
              </TabsContent>

              <TabsContent value="skills">
                <p className="text-sm text-muted-foreground">Skills tab - coming soon</p>
              </TabsContent>

              <TabsContent value="reviews">
                <p className="text-sm text-muted-foreground">Reviews tab - coming soon</p>
              </TabsContent>
            </Tabs>
          )}
        </Card>
      </div>
    </div>
  );
}
