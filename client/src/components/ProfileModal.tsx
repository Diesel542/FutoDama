import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Loader2, Trash2, Wand2 } from "lucide-react";
import { PDFViewer } from "@/components/PDFViewer";
import ResumeCard from "@/components/ResumeCard";
import TailoredResumeView from "@/components/TailoredResumeView";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Resume, Job } from "@shared/schema";

interface ProfileModalProps {
  resumeId: string | null;
  open: boolean;
  onClose: () => void;
}

type ViewMode = 'split' | 'extracted' | 'tailored';

interface TailoredBundle {
  tailored_resume: any;
  coverage: any[];
  diff: any;
  warnings: string[];
  ats_report: any;
}

export default function ProfileModal({ resumeId, open, onClose }: ProfileModalProps) {
  const [resumeData, setResumeData] = useState<Resume | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('extracted');
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showJobSelector, setShowJobSelector] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [tailoredBundle, setTailoredBundle] = useState<TailoredBundle | null>(null);
  const [selectedJobTitle, setSelectedJobTitle] = useState<string>("");
  const { toast } = useToast();

  // Fetch available jobs for tailoring
  const { data: jobsData } = useQuery<{ jobs: Job[] }>({
    queryKey: ['/api/jobs'],
    queryFn: async () => {
      const response = await fetch('/api/jobs?status=completed');
      if (!response.ok) throw new Error('Failed to fetch jobs');
      return response.json();
    },
    enabled: open && showJobSelector,
  });

  const completedJobs = (jobsData?.jobs || []).filter(j => j.status === 'completed' && j.jobCard);

  // Fetch resume data when resumeId changes
  useEffect(() => {
    if (resumeId && open) {
      setIsLoading(true);
      setError(null);
      
      fetch(`/api/resumes/${resumeId}`)
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch resume');
          return res.json();
        })
        .then(data => {
          setResumeData(data);
          // Auto-switch to split view if document is available
          if (data.documentPath) {
            setViewMode('split');
          } else {
            setViewMode('extracted');
          }
          setIsLoading(false);
        })
        .catch(err => {
          setError(err.message);
          setIsLoading(false);
        });
    } else {
      setResumeData(null);
      setViewMode('extracted');
    }
  }, [resumeId, open]);

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      setResumeData(null);
      setError(null);
      setViewMode('extracted');
      setShowDeleteConfirm(false);
      setShowJobSelector(false);
      setSelectedJobId(null);
      setTailoredBundle(null);
      setSelectedJobTitle("");
    }
  }, [open]);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/resumes/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Profile Deleted",
        description: "The profile has been successfully deleted.",
      });
      // Invalidate and refetch the resumes list
      queryClient.invalidateQueries({ queryKey: ['/api/resumes'] });
      // Close the modal
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete the profile.",
        variant: "destructive",
      });
    },
  });

  // Tailor resume mutation
  const tailorMutation = useMutation({
    mutationFn: async ({ resumeJson, jobCardJson }: { resumeJson: any; jobCardJson: any }) => {
      const response = await apiRequest('POST', '/api/tailor-resume', {
        resumeJson,
        jobCardJson,
        language: 'en',
        style: 'modern'
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.ok && data.bundle) {
        setTailoredBundle(data.bundle);
        setViewMode('tailored');
        setShowJobSelector(false);
        toast({
          title: "Resume Tailored",
          description: "Successfully tailored the resume for the selected job.",
        });
      } else {
        toast({
          title: "Tailoring Failed",
          description: data.errors?.join(', ') || "Failed to tailor resume.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Tailoring Failed",
        description: error.message || "Failed to tailor resume.",
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    if (resumeId) {
      deleteMutation.mutate(resumeId);
    }
  };

  const handleTailorClick = () => {
    setShowJobSelector(true);
  };

  const handleJobSelect = (jobId: string) => {
    setSelectedJobId(jobId);
    const job = completedJobs.find(j => j.id === jobId);
    if (job) {
      const jobCard = job.jobCard as any;
      setSelectedJobTitle(jobCard?.basics?.title || 'Selected Job');
    }
  };

  const handleStartTailoring = () => {
    if (!selectedJobId || !resumeData) return;
    
    const job = completedJobs.find(j => j.id === selectedJobId);
    if (!job || !job.jobCard) {
      toast({
        title: "Invalid Job",
        description: "Selected job has no extracted data.",
        variant: "destructive",
      });
      return;
    }

    tailorMutation.mutate({
      resumeJson: resumeData.resumeCard,
      jobCardJson: job.jobCard
    });
  };

  const handleBackToProfile = () => {
    setViewMode(resumeData?.documentPath ? 'split' : 'extracted');
    setTailoredBundle(null);
    setSelectedJobId(null);
    setSelectedJobTitle("");
  };

  const candidateName = (resumeData?.resumeCard as any)?.personal_info?.name || "Candidate";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-[95vw] w-[95vw] h-[95vh] max-h-[95vh] p-0 gap-0 [&>button]:hidden"
        data-testid="dialog-profile-modal"
      >
        {/* Accessible title for screen readers */}
        <DialogTitle className="sr-only">
          {candidateName}
        </DialogTitle>
        
        {/* Header - Only show when not in tailored view */}
        {viewMode !== 'tailored' && (
          <div className="flex items-center justify-between p-4 border-b border-border bg-card">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold text-foreground">
                {candidateName}
              </h2>
              
              {/* View Mode Toggle, Tailor Button, and Delete Button */}
              <div className="flex gap-2">
                {resumeData?.documentPath && (
                  <>
                    <Button
                      variant={viewMode === 'split' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('split')}
                      data-testid="button-modal-split-view"
                    >
                      Split View
                    </Button>
                    <Button
                      variant={viewMode === 'extracted' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('extracted')}
                      data-testid="button-modal-extracted-view"
                    >
                      Extracted Only
                    </Button>
                  </>
                )}
                
                {/* Tailor Resume Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTailorClick}
                  disabled={!resumeData || tailorMutation.isPending}
                  data-testid="button-tailor-resume"
                >
                  <Wand2 className="w-4 h-4 mr-2" />
                  Tailor Resume
                </Button>
                
                {/* Delete Button */}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={deleteMutation.isPending}
                  data-testid="button-delete-profile"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Profile
                </Button>
              </div>
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
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-primary" />
                <p className="text-lg text-muted-foreground">Loading profile...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-lg text-destructive">Failed to load profile</p>
                <p className="text-sm text-muted-foreground mt-2">{error}</p>
              </div>
            </div>
          )}

          {!isLoading && !error && resumeData && (
            <>
              {/* Tailored view */}
              {viewMode === 'tailored' && tailoredBundle && (
                <TailoredResumeView
                  bundle={tailoredBundle}
                  jobTitle={selectedJobTitle}
                  candidateName={candidateName}
                  onBack={handleBackToProfile}
                />
              )}

              {/* Split view layout */}
              {viewMode === 'split' && resumeData.documentPath && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                  {/* Left: Document Viewer */}
                  <div className="border border-border rounded-lg p-4 bg-card">
                    <h3 className="text-lg font-semibold mb-4">Original Document</h3>
                    <PDFViewer url={resumeData.documentPath} />
                  </div>

                  {/* Right: Extracted Information */}
                  <div className="overflow-y-auto" style={{ maxHeight: 'calc(95vh - 120px)' }}>
                    <ResumeCard 
                      resumeCard={resumeData.resumeCard as any} 
                      documentPath={resumeData.documentPath}
                    />
                  </div>
                </div>
              )}

              {/* Extracted only view */}
              {viewMode === 'extracted' && (
                <div className="max-w-5xl mx-auto">
                  <ResumeCard 
                    resumeCard={resumeData.resumeCard as any} 
                    documentPath={resumeData.documentPath || undefined}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>

      {/* Job Selector Dialog */}
      <AlertDialog open={showJobSelector} onOpenChange={setShowJobSelector}>
        <AlertDialogContent data-testid="dialog-job-selector">
          <AlertDialogHeader>
            <AlertDialogTitle>Select a Job Description</AlertDialogTitle>
            <AlertDialogDescription>
              Choose a job to tailor this resume for. The AI will optimize the resume to match the job requirements.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-4">
            <Select value={selectedJobId || ""} onValueChange={handleJobSelect}>
              <SelectTrigger data-testid="select-job-trigger">
                <SelectValue placeholder="Select a job..." />
              </SelectTrigger>
              <SelectContent>
                {completedJobs.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    No processed jobs available. Upload a job description first.
                  </div>
                ) : (
                  completedJobs.map(job => {
                    const jobCard = job.jobCard as any;
                    const title = jobCard?.basics?.title || 'Untitled Job';
                    const company = jobCard?.basics?.company || '';
                    return (
                      <SelectItem 
                        key={job.id} 
                        value={job.id}
                        data-testid={`select-job-${job.id}`}
                      >
                        {title}{company ? ` at ${company}` : ''}
                      </SelectItem>
                    );
                  })
                )}
              </SelectContent>
            </Select>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-job-select">
              Cancel
            </AlertDialogCancel>
            <Button
              onClick={handleStartTailoring}
              disabled={!selectedJobId || tailorMutation.isPending}
              data-testid="button-start-tailoring"
            >
              {tailorMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Tailoring...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Start Tailoring
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent data-testid="dialog-delete-confirmation">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you certain?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the profile
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
                'Delete Profile'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
