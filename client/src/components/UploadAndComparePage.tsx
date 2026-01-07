import { Briefcase, FileUser, Activity, FolderOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import UploadSection from "@/components/UploadSection";
import ResumeUploadSection from "@/components/ResumeUploadSection";
import ProcessingStatus from "@/components/ProcessingStatus";
import JobCardSkeleton from "@/components/JobCardSkeleton";
import JobCard from "@/components/JobCard";
import ResumeViewer from "@/components/ResumeViewer";
import { JobStatus } from "@/lib/api";

interface UploadAndComparePageProps {
  onJobStarted: (jobId: string) => void;
  processingJobId: string | null;
  currentJob: JobStatus | null;
  selectedCodexId: string;
  codexes: any[];
  onJobCompleted: (job: JobStatus) => void;
  onRetry: () => void;
  onResumeStarted: (resumeId: string) => void;
  processingResumeId: string | null;
  onResumeCompleted: () => void;
}

export default function UploadAndComparePage({
  onJobStarted,
  processingJobId,
  currentJob,
  selectedCodexId,
  codexes,
  onJobCompleted,
  onRetry,
  onResumeStarted,
  processingResumeId,
  onResumeCompleted,
}: UploadAndComparePageProps) {
  const hasActiveProcessing = processingJobId || processingResumeId;
  const hasCompletedJob = currentJob?.jobCard && !processingJobId && currentJob.status === 'completed';

  return (
    <div className="max-w-6xl mx-auto" data-testid="upload-compare-page">
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
        {/* LEFT COLUMN: Documents Workbench */}
        <Card className="border-border/50 bg-card/50" data-testid="workbench-column">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FolderOpen className="w-5 h-5" />
              Documents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Job Description Upload Section */}
            <div>
              <UploadSection
                onJobStarted={onJobStarted}
                processingJobId={processingJobId}
                currentJob={currentJob}
                selectedCodexId={selectedCodexId}
                codexes={codexes}
                sidebarPortalTarget="job-status-portal"
              />
            </div>

            <Separator className="opacity-50" />

            {/* Resume Upload Section */}
            <div>
              <ResumeUploadSection
                onResumeStarted={onResumeStarted}
                processingResumeId={processingResumeId}
                selectedCodexId="resume-card-v1"
                codexes={codexes}
                sidebarPortalTarget="resume-status-portal"
              />
            </div>
          </CardContent>
        </Card>

        {/* RIGHT COLUMN: Processing Sidebar */}
        <div data-testid="processing-sidebar">
          <Card className="sticky top-4 bg-muted/20 border-border">
            <CardHeader className="pb-3 border-b border-border/50 bg-muted/30">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <Activity className="w-5 h-5" />
                Processing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto pt-4">
            {/* Empty State - positioned at top when nothing is processing */}
            {!hasActiveProcessing && !hasCompletedJob && (
              <div className="text-center py-4 text-muted-foreground/60" data-testid="processing-empty-state">
                <Activity className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-xs">
                  Upload a job description or resume to begin processing
                </p>
              </div>
            )}

            {/* Portal targets for AI Agent Status panels */}
            <div id="job-status-portal" data-testid="job-status-portal" />
            <div id="resume-status-portal" data-testid="resume-status-portal" />

            {/* Job Processing Status */}
            {processingJobId && (
              <div className="space-y-3" data-testid="job-processing-section">
                <h4 className="text-xs font-medium text-muted-foreground/80 uppercase tracking-wide">Job Status</h4>
                <ProcessingStatus
                  jobId={processingJobId}
                  onJobCompleted={onJobCompleted}
                  onRetry={onRetry}
                />
              </div>
            )}

            {/* Job Skeleton while processing */}
            {processingJobId && (!currentJob || (currentJob.status !== 'failed' && currentJob.status !== 'error')) && (
              <div className="mt-4">
                <JobCardSkeleton />
              </div>
            )}

            {/* Completed Job Card */}
            {hasCompletedJob && (
              <div className="space-y-3" data-testid="completed-job-section">
                <h4 className="text-xs font-medium text-muted-foreground/80 uppercase tracking-wide">Extracted Job</h4>
                <div className="max-h-[400px] overflow-y-auto">
                  <JobCard jobCard={currentJob.jobCard} />
                </div>
              </div>
            )}

            {/* Resume Processing / Viewer */}
            <div className="space-y-3" data-testid="resume-processing-section">
              <ResumeViewer
                processingResumeId={processingResumeId}
                onResumeCompleted={onResumeCompleted}
              />
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}
