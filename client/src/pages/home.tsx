import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, Settings, Download, Sparkles, Upload, Users, FileDown } from "lucide-react";
import UploadSection from "@/components/UploadSection";
import BatchUpload from "@/components/BatchUpload";
import ResumeUploadModal from "@/components/ResumeUploadModal";
import ResumeViewer from "@/components/ResumeViewer";
import JobCard from "@/components/JobCard";
import ProcessingStatus from "@/components/ProcessingStatus";
import CodexModal from "@/components/CodexModal";
import { ExportDialog } from "@/components/ExportDialog";
import { JobStatus, getAllCodexes } from "@/lib/api";

export default function Home() {
  const [currentJob, setCurrentJob] = useState<JobStatus | null>(null);
  const [showCodexModal, setShowCodexModal] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showResumeUploadModal, setShowResumeUploadModal] = useState(false);
  const [processingJobId, setProcessingJobId] = useState<string | null>(null);
  const [processingResumeId, setProcessingResumeId] = useState<string | null>(null);
  const [selectedCodexId, setSelectedCodexId] = useState<string>('job-card-v2.1');

  // Fetch available codexes
  const { data: codexes, isLoading: isLoadingCodexes } = useQuery({
    queryKey: ['/api/codex'],
    queryFn: getAllCodexes,
  });

  const handleJobStarted = (jobId: string) => {
    setProcessingJobId(jobId);
    setCurrentJob(null);
  };

  const handleJobCompleted = (job: JobStatus) => {
    // Job processing completed - updating UI state
    setCurrentJob(job);
    setProcessingJobId(null);
  };

  const handleResumeStarted = (resumeId: string) => {
    setProcessingResumeId(resumeId);
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
                <p className="text-xs text-muted-foreground">AI Agent Prototype - ATLAS Consultancy Brokering v.0.1.1</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* AI Agent Selector */}
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">AI Agent:</span>
                <Select value={selectedCodexId} onValueChange={setSelectedCodexId} disabled={isLoadingCodexes}>
                  <SelectTrigger className="w-48" data-testid="select-codex">
                    <SelectValue placeholder="Select AI Agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {codexes?.map((codex: any) => (
                      <SelectItem key={codex.id} value={codex.id} data-testid={`option-codex-${codex.id}`}>
                        {codex.name || codex.id}
                      </SelectItem>
                    )) || (
                      <SelectItem value="job-card-v1">Standard Job Card Extractor</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowCodexModal(true)}
                data-testid="button-manage-codex"
              >
                <Settings className="w-4 h-4 mr-2" />
                Manage AI Agents
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  import("@/lib/api").then(api => api.exportCodex(selectedCodexId));
                }}
                data-testid="button-export-agent"
              >
                <Download className="w-4 h-4 mr-2" />
                Export AI Agent
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowExportDialog(true)}
                data-testid="button-advanced-export"
              >
                <FileDown className="w-4 h-4 mr-2" />
                Advanced Export
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <Tabs defaultValue="job" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="job" className="flex items-center gap-2" data-testid="tab-job">
              <Upload className="w-4 h-4" />
              Job Description Upload
            </TabsTrigger>
            <TabsTrigger value="resume" className="flex items-center gap-2" data-testid="tab-resume">
              <Sparkles className="w-4 h-4" />
              Resume Upload
            </TabsTrigger>
            <TabsTrigger value="batch" className="flex items-center gap-2" data-testid="tab-batch">
              <Users className="w-4 h-4" />
              Batch Processing
            </TabsTrigger>
          </TabsList>

          <TabsContent value="job" className="space-y-8">
            {/* Job Description Upload Section */}
            <UploadSection 
              onJobStarted={handleJobStarted}
              processingJobId={processingJobId}
              selectedCodexId={selectedCodexId}
              codexes={codexes || []}
            />

            {/* Processing Status */}
            {processingJobId && (
              <ProcessingStatus 
                jobId={processingJobId}
                onJobCompleted={handleJobCompleted}
              />
            )}

            {/* Job Card Display */}
            {currentJob?.jobCard && !processingJobId && (
              <JobCard jobCard={currentJob.jobCard} />
            )}
          </TabsContent>

          <TabsContent value="resume" className="space-y-8">
            {/* Upload Button */}
            <div className="flex justify-center mb-6">
              <Button 
                size="lg"
                onClick={() => setShowResumeUploadModal(true)}
                data-testid="button-upload-resume"
              >
                <Upload className="w-5 h-5 mr-2" />
                Upload Resume
              </Button>
            </div>

            {/* Resume Viewer */}
            <ResumeViewer processingResumeId={processingResumeId} />
          </TabsContent>

          <TabsContent value="batch">
            {/* Batch Upload Section */}
            <BatchUpload 
              selectedCodexId={selectedCodexId}
              onBatchComplete={(batchId) => {
                console.log('Batch completed:', batchId);
              }}
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* Codex Management Modal */}
      <CodexModal 
        open={showCodexModal}
        onClose={() => setShowCodexModal(false)}
      />

      {/* Advanced Export Dialog */}
      <ExportDialog 
        open={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        jobId={currentJob?.id}
      />

      {/* Resume Upload Modal */}
      <ResumeUploadModal
        open={showResumeUploadModal}
        onClose={() => setShowResumeUploadModal(false)}
        onResumeStarted={handleResumeStarted}
        selectedCodexId="resume-card-v1"
      />
    </div>
  );
}
