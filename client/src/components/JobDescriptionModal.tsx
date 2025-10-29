import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { X, Loader2, Trash2, Sparkles } from "lucide-react";
import JobCard from "@/components/JobCard";
import MatchPanel from "@/components/MatchPanel";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Job } from "@shared/schema";

interface JobDescriptionModalProps {
  jobId: string | null;
  open: boolean;
  onClose: () => void;
}

export default function JobDescriptionModal({ jobId, open, onClose }: JobDescriptionModalProps) {
  const [jobData, setJobData] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMatchPanel, setShowMatchPanel] = useState(false);
  const { toast } = useToast();

  // Fetch job data when jobId changes
  useEffect(() => {
    if (jobId && open) {
      setIsLoading(true);
      setError(null);
      
      fetch(`/api/jobs/${jobId}`)
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch job description');
          return res.json();
        })
        .then(data => {
          setJobData(data);
          setIsLoading(false);
        })
        .catch(err => {
          setError(err.message);
          setIsLoading(false);
        });
    } else {
      setJobData(null);
    }
  }, [jobId, open]);

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      setJobData(null);
      setError(null);
      setShowDeleteConfirm(false);
      setShowMatchPanel(false);
    }
  }, [open]);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/jobs/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Job Description Deleted",
        description: "The job description has been successfully deleted.",
      });
      // Invalidate and refetch the jobs list
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      // Close the modal
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete the job description.",
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    if (jobId) {
      deleteMutation.mutate(jobId);
    }
  };

  const jobTitle = (jobData?.jobCard as any)?.basics?.title || "Job Description";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-[95vw] w-[95vw] h-[95vh] max-h-[95vh] p-0 gap-0 [&>button]:hidden"
        data-testid="dialog-job-modal"
      >
        {/* Accessible title for screen readers */}
        <DialogTitle className="sr-only">
          {jobTitle}
        </DialogTitle>
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-card">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-foreground">
              {jobTitle}
            </h2>
            
            {/* Delete Button */}
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={deleteMutation.isPending}
              data-testid="button-delete-job"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Job
            </Button>

            {/* Find Matching Candidates Button */}
            {jobData && (
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowMatchPanel(true)}
                disabled={showMatchPanel}
                data-testid="button-find-matches"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Find Matching Candidates
              </Button>
            )}
          </div>
          
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onClose}
            data-testid="button-close-modal"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-primary" />
                <p className="text-lg text-muted-foreground">Loading job description...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-lg text-destructive">Failed to load job description</p>
                <p className="text-sm text-muted-foreground mt-2">{error}</p>
              </div>
            </div>
          )}

          {!isLoading && !error && jobData && (
            <div className="max-w-7xl mx-auto">
              <JobCard jobCard={jobData.jobCard as any} />
            </div>
          )}
        </div>
      </DialogContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent data-testid="dialog-delete-confirmation">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you certain?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the job description
              and remove all associated data from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Job Description'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Match Panel */}
      {showMatchPanel && jobId && (
        <MatchPanel
          jobId={jobId}
          jobTitle={jobTitle}
          onClose={() => setShowMatchPanel(false)}
        />
      )}
    </Dialog>
  );
}
