import { Briefcase, FileUser } from "lucide-react";
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
  return (
    <div className="space-y-8">
      {/* Section Headers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold mb-4">
            <Briefcase className="w-5 h-5" />
            Job Description
          </h2>
          <UploadSection
            onJobStarted={onJobStarted}
            processingJobId={processingJobId}
            currentJob={currentJob}
            selectedCodexId={selectedCodexId}
            codexes={codexes}
          />
        </div>

        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold mb-4">
            <FileUser className="w-5 h-5" />
            Resume
          </h2>
          <ResumeUploadSection
            onResumeStarted={onResumeStarted}
            processingResumeId={processingResumeId}
            selectedCodexId="resume-card-v1"
            codexes={codexes}
          />
        </div>
      </div>

      {/* Processing Status & Results - spans full width below upload sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Job Processing Status */}
        <div className="space-y-4">
          {processingJobId && (
            <ProcessingStatus
              jobId={processingJobId}
              onJobCompleted={onJobCompleted}
              onRetry={onRetry}
            />
          )}
          {processingJobId && (!currentJob || (currentJob.status !== 'failed' && currentJob.status !== 'error')) && (
            <JobCardSkeleton />
          )}
          {currentJob?.jobCard && !processingJobId && currentJob.status === 'completed' && (
            <JobCard jobCard={currentJob.jobCard} />
          )}
        </div>

        {/* Resume Viewer */}
        <div>
          <ResumeViewer
            processingResumeId={processingResumeId}
            onResumeCompleted={onResumeCompleted}
          />
        </div>
      </div>
    </div>
  );
}
