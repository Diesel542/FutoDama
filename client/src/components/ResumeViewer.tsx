import { useState, useEffect, useRef } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, User, AlertCircle, SplitSquareHorizontal, FileText } from "lucide-react";
import ResumeCard from "@/components/ResumeCard";
import { PDFViewer } from "@/components/PDFViewer";
import { useToast } from "@/hooks/use-toast";

interface LogMessage {
  timestamp: string;
  step?: string;
  message: string;
  details?: any;
  type: 'info' | 'debug' | 'error';
}

interface ResumeViewerProps {
  processingResumeId: string | null;
  onResumeCompleted?: () => void;
}

type ViewMode = 'split' | 'extracted';

export default function ResumeViewer({ processingResumeId, onResumeCompleted }: ResumeViewerProps) {
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [resumeData, setResumeData] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('extracted');
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

    setIsProcessing(true);
    setLogs([]);
    setResumeData(null);

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/resumes/${processingResumeId}`);
        const data = await response.json();
        
        if (data.status === 'completed') {
          setResumeData(data);
          setIsProcessing(false);
          clearInterval(pollInterval);
          
          // Auto-switch to split view if document is available
          if (data.documentPath) {
            setViewMode('split');
          }
          
          // Notify parent that processing is complete
          console.log('[ResumeViewer] Calling onResumeCompleted callback');
          onResumeCompleted?.();
          
          toast({
            title: "Resume Processed",
            description: "Your resume has been successfully analyzed!",
          });
        } else if (data.status === 'error') {
          setIsProcessing(false);
          clearInterval(pollInterval);
          
          // Notify parent even on error to re-enable upload
          onResumeCompleted?.();
          
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

  // Empty state
  if (!processingResumeId && !resumeData) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="text-center">
          <User className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg text-muted-foreground">
            Click "Upload Resume" to start processing
          </p>
        </div>
      </div>
    );
  }

  // Processing state
  if (isProcessing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-[400px]">
          <div className="text-center">
            <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-primary" />
            <p className="text-lg text-muted-foreground">
              Processing your resume...
            </p>
          </div>
        </div>

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
    );
  }

  // Resume completed state
  if (!resumeData?.resumeCard) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-destructive" />
          <p className="text-lg text-muted-foreground">
            Error: Resume data is incomplete
          </p>
        </div>
      </div>
    );
  }

  // View mode buttons
  const viewModeButtons = (
    <div className="flex gap-2 mb-6">
      {resumeData.documentPath && (
        <Button
          variant={viewMode === 'split' ? 'default' : 'outline'}
          onClick={() => setViewMode('split')}
          data-testid="button-split-view"
        >
          <SplitSquareHorizontal className="w-4 h-4 mr-2" />
          Split View
        </Button>
      )}
      <Button
        variant={viewMode === 'extracted' ? 'default' : 'outline'}
        onClick={() => setViewMode('extracted')}
        data-testid="button-extracted-view"
      >
        <FileText className="w-4 h-4 mr-2" />
        Extracted Only
      </Button>
    </div>
  );

  // Split view layout
  if (viewMode === 'split' && resumeData.documentPath) {
    return (
      <div className="space-y-4">
        {viewModeButtons}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Document Viewer */}
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-4">Original Document</h3>
            <PDFViewer url={resumeData.documentPath} />
          </Card>

          {/* Right: Extracted Information */}
          <div className="overflow-y-auto" style={{ maxHeight: '850px' }}>
            <ResumeCard 
              resumeCard={resumeData.resumeCard} 
              documentPath={resumeData.documentPath}
            />
          </div>
        </div>
      </div>
    );
  }

  // Extracted only view
  return (
    <div className="space-y-4">
      {viewModeButtons}
      <ResumeCard 
        resumeCard={resumeData.resumeCard} 
        documentPath={resumeData.documentPath}
      />
    </div>
  );
}
