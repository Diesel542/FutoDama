import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { getJobStatus, JobStatus, isJobProcessing, isJobComplete, isJobFailed } from "@/lib/api";

interface ProcessingStatusProps {
  jobId: string;
  onJobCompleted: (job: JobStatus) => void;
  onRetry?: () => void;
}

export default function ProcessingStatus({ jobId, onJobCompleted, onRetry }: ProcessingStatusProps) {
  const callbackFiredRef = useRef(false);
  
  const { data: job, isLoading } = useQuery({
    queryKey: ['/api/jobs', jobId],
    queryFn: () => getJobStatus(jobId),
    refetchInterval: (query) => {
      const data = query.state.data as JobStatus | undefined;
      if (!data) return 2000;
      if (isJobComplete(data.status) || isJobFailed(data.status)) return false;
      return 2000;
    },
    enabled: !!jobId,
  });

  useEffect(() => {
    callbackFiredRef.current = false;
  }, [jobId]);

  useEffect(() => {
    if (job && (isJobComplete(job.status) || isJobFailed(job.status)) && !callbackFiredRef.current) {
      callbackFiredRef.current = true;
      onJobCompleted(job);
    }
  }, [job, onJobCompleted]);

  if (isLoading || !job) {
    return (
      <Card data-testid="card-processing-status">
        <CardContent className="p-6">
          <div className="flex items-center space-x-3">
            <div className="processing-spinner w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
            <span className="text-sm text-muted-foreground">Loading job status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-destructive" />;
      default:
        return <div className="processing-spinner w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'error':
      case 'failed':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getStepStatus = (stepName: string, currentStatus: string) => {
    const steps = ['processing', 'extracting', 'validating', 'completed'];
    const currentIndex = steps.indexOf(currentStatus);
    const stepIndex = steps.indexOf(stepName);
    
    if (currentStatus === 'error' || currentStatus === 'failed') return 'error';
    if (stepIndex < currentIndex || currentStatus === 'completed') return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

  const renderStep = (stepName: string, displayName: string, description: string) => {
    const status = getStepStatus(stepName, job.status);
    
    return (
      <div key={stepName} className="flex items-center space-x-3 p-3 bg-muted/20 rounded-lg">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
          status === 'completed' ? 'bg-primary' : 
          status === 'active' ? 'border-2 border-primary processing-spinner' :
          status === 'error' ? 'bg-destructive' : 'border-2 border-muted'
        }`}>
          {status === 'completed' && <span className="text-white text-xs">✓</span>}
          {status === 'error' && <span className="text-white text-xs">✕</span>}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">{displayName}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
    );
  };

  return (
    <Card data-testid="card-processing-status">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Processing Status</h2>
          <div className="flex items-center space-x-2">
            {getStatusIcon(job.status)}
            <Badge variant={getStatusColor(job.status) as any}>
              {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
            </Badge>
          </div>
        </div>
        
        <div className="space-y-3">
          {renderStep('processing', 'Document Parsing', 'Extracting text from uploaded content')}
          {renderStep('extracting', 'AI Analysis', 'OpenAI GPT-5 processing job description')}
          {renderStep('validating', 'Schema Validation', 'Checking completeness and accuracy')}
          {renderStep('completed', 'Finalization', 'Preparing structured job card')}
        </div>

        {isJobFailed(job.status) && (
          <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg" data-testid="error-panel">
            <p className="text-sm text-destructive font-medium mb-2">Processing Failed</p>
            <p className="text-sm text-muted-foreground mb-3">
              {job.processingError || job.jobCard?.error || "We couldn't process this job description. Please check the input and try again."}
            </p>
            {onRetry && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onRetry}
                data-testid="button-retry"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
