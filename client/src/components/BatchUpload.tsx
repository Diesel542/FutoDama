import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, Plus, X, FileText, AlertCircle, CheckCircle, Clock, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BatchUploadProps {
  selectedCodexId: string;
  onBatchComplete?: (batchId: string) => void;
}

interface TextEntry {
  id: string;
  content: string;
}

export default function BatchUpload({ selectedCodexId, onBatchComplete }: BatchUploadProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [files, setFiles] = useState<File[]>([]);
  const [textEntries, setTextEntries] = useState<TextEntry[]>([]);
  const [newTextEntry, setNewTextEntry] = useState('');
  const [batchStatus, setBatchStatus] = useState<{
    batchId?: string;
    status?: string;
    totalJobs?: number;
    completedJobs?: number;
    jobs?: any[];
  }>({});

  // Batch upload mutation
  const batchUploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/jobs/batch-upload', {
        method: 'POST',
        body: formData
      });
      if (!response.ok) throw new Error('Failed to upload batch');
      return response.json();
    },
    onSuccess: (data) => {
      setBatchStatus(data);
      startStatusPolling(data.batchId);
      toast({
        title: "Batch Processing Started",
        description: `Processing ${data.totalJobs} job descriptions...`,
      });
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload batch",
        variant: "destructive"
      });
    }
  });

  // Status polling
  const statusPolling = useRef<NodeJS.Timeout>();

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (statusPolling.current) {
        clearInterval(statusPolling.current);
      }
    };
  }, []);

  const startStatusPolling = (batchId: string) => {
    console.log('Starting status polling for batch:', batchId);
    if (statusPolling.current) {
      clearInterval(statusPolling.current);
    }
    
    statusPolling.current = setInterval(async () => {
      try {
        console.log('Polling batch status for:', batchId);
        const response = await fetch(`/api/batch/${batchId}`);
        if (response.ok) {
          const status = await response.json();
          console.log('Batch status update:', status);
          setBatchStatus(status);
          
          if (status.status === 'completed' || status.status === 'error') {
            console.log('Batch processing finished:', status.status);
            clearInterval(statusPolling.current!);
            
            if (status.status === 'completed') {
              toast({
                title: "Batch Processing Completed",
                description: `Successfully processed ${status.completedJobs} job descriptions.`,
              });
              if (onBatchComplete) {
                onBatchComplete(batchId);
              }
            } else if (status.status === 'error') {
              toast({
                title: "Batch Processing Failed",
                description: "Some jobs may not have been processed correctly.",
                variant: "destructive"
              });
            }
          }
        } else {
          console.error('Failed to fetch batch status:', response.status);
        }
      } catch (error) {
        console.error('Status polling error:', error);
      }
    }, 2000);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddTextEntry = () => {
    if (newTextEntry.trim()) {
      const entry: TextEntry = {
        id: Date.now().toString(),
        content: newTextEntry.trim()
      };
      setTextEntries(prev => [...prev, entry]);
      setNewTextEntry('');
    }
  };

  const handleRemoveTextEntry = (id: string) => {
    setTextEntries(prev => prev.filter(entry => entry.id !== id));
  };

  const handleBatchUpload = () => {
    if (files.length === 0 && textEntries.length === 0) {
      toast({
        title: "No content to process",
        description: "Please add files or text entries to process.",
        variant: "destructive"
      });
      return;
    }

    const formData = new FormData();
    
    // Add files
    files.forEach(file => {
      formData.append('files', file);
    });
    
    // Add text entries
    if (textEntries.length > 0) {
      formData.append('textEntries', JSON.stringify(textEntries.map(e => e.content)));
    }
    
    // Add codex ID
    formData.append('codexId', selectedCodexId);
    
    batchUploadMutation.mutate(formData);
  };

  const clearBatch = () => {
    setFiles([]);
    setTextEntries([]);
    setBatchStatus({});
    if (statusPolling.current) {
      clearInterval(statusPolling.current);
    }
  };

  const totalItems = files.length + textEntries.length;
  const progressPercentage = batchStatus.totalJobs ? 
    Math.round((batchStatus.completedJobs || 0) / batchStatus.totalJobs * 100) : 0;

  return (
    <Card className="w-full" data-testid="batch-upload-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Batch Processing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Upload Section */}
        <div>
          <Label className="text-sm font-medium">Upload Files</Label>
          <div 
            className="mt-2 border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
            data-testid="file-drop-zone"
          >
            <Upload className="w-8 h-8 text-muted-foreground mb-2 mx-auto" />
            <p className="text-sm text-muted-foreground mb-2">
              Click to upload or drag and drop files
            </p>
            <p className="text-xs text-muted-foreground">
              PDF, DOCX up to 10MB each (max 10 files)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.doc"
              onChange={handleFileSelect}
              className="hidden"
              data-testid="file-input"
            />
          </div>
          
          {/* Selected Files */}
          {files.length > 0 && (
            <div className="mt-3 space-y-2" data-testid="selected-files">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-accent/20 rounded">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm truncate">{file.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {(file.size / 1024 / 1024).toFixed(1)} MB
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveFile(index)}
                    data-testid={`remove-file-${index}`}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Text Entry Section */}
        <div>
          <Label className="text-sm font-medium">Add Text Entries</Label>
          <div className="mt-2 space-y-2">
            <Textarea
              placeholder="Paste job description text here..."
              value={newTextEntry}
              onChange={(e) => setNewTextEntry(e.target.value)}
              rows={3}
              data-testid="text-entry-input"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddTextEntry}
              disabled={!newTextEntry.trim()}
              data-testid="add-text-entry"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Text Entry
            </Button>
          </div>
          
          {/* Text Entries List */}
          {textEntries.length > 0 && (
            <ScrollArea className="mt-3 max-h-40" data-testid="text-entries-list">
              <div className="space-y-2">
                {textEntries.map((entry, index) => (
                  <div key={entry.id} className="flex items-start justify-between p-2 bg-accent/20 rounded">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" title={entry.content}>
                        Text Entry {index + 1}: {entry.content.substring(0, 100)}...
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveTextEntry(entry.id)}
                      data-testid={`remove-text-${index}`}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Batch Status */}
        {batchStatus.batchId && (
          <div className="space-y-3" data-testid="batch-status">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Batch Progress</Label>
              <Badge variant={
                batchStatus.status === 'completed' ? 'default' :
                batchStatus.status === 'error' ? 'destructive' :
                'secondary'
              }>
                {batchStatus.status === 'processing' && <Clock className="w-3 h-3 mr-1" />}
                {batchStatus.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                {batchStatus.status === 'error' && <AlertCircle className="w-3 h-3 mr-1" />}
                {batchStatus.status || 'Unknown'}
              </Badge>
            </div>
            
            <Progress value={progressPercentage} className="w-full" />
            
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {batchStatus.completedJobs || 0} of {batchStatus.totalJobs || 0} jobs completed
              </span>
              <span>{progressPercentage}%</span>
            </div>

            {batchStatus.status === 'completed' && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Batch processing completed successfully! All job descriptions have been processed.
                </AlertDescription>
              </Alert>
            )}

            {batchStatus.status === 'error' && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Batch processing encountered errors. Some jobs may not have been processed.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {totalItems} item{totalItems !== 1 ? 's' : ''} ready for processing
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={clearBatch}
              disabled={batchUploadMutation.isPending}
              data-testid="clear-batch"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Clear
            </Button>
            <Button
              onClick={handleBatchUpload}
              disabled={totalItems === 0 || batchUploadMutation.isPending}
              data-testid="start-batch-processing"
            >
              <Upload className="w-4 h-4 mr-1" />
              {batchUploadMutation.isPending ? 'Starting...' : 'Process Batch'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}