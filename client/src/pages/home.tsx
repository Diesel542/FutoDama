import { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, Settings, Download } from "lucide-react";
import UploadSection from "@/components/UploadSection";
import JobCard from "@/components/JobCard";
import ProcessingStatus from "@/components/ProcessingStatus";
import CodexModal from "@/components/CodexModal";
import { JobStatus } from "@/lib/api";

export default function Home() {
  const [currentJob, setCurrentJob] = useState<JobStatus | null>(null);
  const [showCodexModal, setShowCodexModal] = useState(false);
  const [processingJobId, setProcessingJobId] = useState<string | null>(null);

  const handleJobStarted = (jobId: string) => {
    setProcessingJobId(jobId);
    setCurrentJob(null);
  };

  const handleJobCompleted = (job: JobStatus) => {
    setCurrentJob(job);
    setProcessingJobId(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card" data-testid="header">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="codex-indicator w-8 h-8 rounded-lg flex items-center justify-center">
                <Bot className="text-white w-4 h-4" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground" data-testid="app-title">FUTODAMA</h1>
                <p className="text-xs text-muted-foreground">AI-Powered Job Description Digester</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowCodexModal(true)}
                data-testid="button-manage-codex"
              >
                <Settings className="w-4 h-4 mr-2" />
                Manage Codex
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  // Export current codex
                  import("@/lib/api").then(api => api.exportCodex('job-card-v1'));
                }}
                data-testid="button-export-agent"
              >
                <Download className="w-4 h-4 mr-2" />
                Export AI Agent
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Upload Section */}
        <div className="mb-8">
          <UploadSection 
            onJobStarted={handleJobStarted}
            processingJobId={processingJobId}
          />
        </div>

        {/* Processing Status */}
        {processingJobId && (
          <div className="mb-8">
            <ProcessingStatus 
              jobId={processingJobId}
              onJobCompleted={handleJobCompleted}
            />
          </div>
        )}

        {/* Job Card Display */}
        {currentJob?.jobCard && !processingJobId && (
          <JobCard jobCard={currentJob.jobCard} />
        )}
      </main>

      {/* Codex Management Modal */}
      <CodexModal 
        open={showCodexModal}
        onClose={() => setShowCodexModal(false)}
      />
    </div>
  );
}
