import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, Settings, Download, Sparkles, Upload, Users, FileDown, FileUser, Briefcase, UserSearch, FlaskConical, GitCompareArrows } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import UploadSection from "@/components/UploadSection";
import BatchUpload from "@/components/BatchUpload";
import ResumeUploadSection from "@/components/ResumeUploadSection";
import ResumeViewer from "@/components/ResumeViewer";
import JobCard from "@/components/JobCard";
import ProcessingStatus from "@/components/ProcessingStatus";
import JobCardSkeleton from "@/components/JobCardSkeleton";
import UploadAndComparePage from "@/components/UploadAndComparePage";
import CodexModal from "@/components/CodexModal";
import { ExportDialog } from "@/components/ExportDialog";
import ProfilesPage from "@/components/ProfilesPage";
import ProfileModal from "@/components/ProfileModal";
import JobDescriptionsPage from "@/components/JobDescriptionsPage";
import JobDescriptionModal from "@/components/JobDescriptionModal";
import { JobStatus, getAllCodexes } from "@/lib/api";
import { config } from "@/lib/config";

export default function Home() {
  const [currentJob, setCurrentJob] = useState<JobStatus | null>(null);
  const [showCodexModal, setShowCodexModal] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [processingJobId, setProcessingJobId] = useState<string | null>(null);
  const [processingResumeId, setProcessingResumeId] = useState<string | null>(null);
  const [selectedCodexId, setSelectedCodexId] = useState<string>('job-card-v2.1');
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [showJobModal, setShowJobModal] = useState(false);
  const [demoMode, setDemoMode] = useState(config.demoMode);

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
    // Only clear processingJobId if job succeeded
    // For failed jobs, keep it so ProcessingStatus shows the error
    if (job.status === 'completed') {
      setProcessingJobId(null);
    }
  };
  
  const handleRetry = () => {
    setProcessingJobId(null);
    setCurrentJob(null);
  };

  const handleResumeStarted = (resumeId: string) => {
    setProcessingResumeId(resumeId);
  };

  const handleResumeCompleted = () => {
    console.log('[Home] handleResumeCompleted called, clearing processingResumeId');
    setProcessingResumeId(null);
  };

  const handleViewProfile = (resumeId: string) => {
    setSelectedProfileId(resumeId);
    setShowProfileModal(true);
  };

  const handleCloseProfileModal = () => {
    setShowProfileModal(false);
    setSelectedProfileId(null);
  };

  const handleViewDetails = (jobId: string) => {
    setSelectedJobId(jobId);
    setShowJobModal(true);
  };

  const handleCloseJobModal = () => {
    setShowJobModal(false);
    setSelectedJobId(null);
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
                <h1 className="text-xl font-bold text-foreground" data-testid="app-title">PRIVATEERS FUTODAMA</h1>
                <p className="text-xs text-muted-foreground">AI Agent Prototype - Consultancy Brokering v.0.1.2</p>
              </div>
            </div>
            {/* Demo mode toggle */}
            <div className="flex items-center space-x-2 mr-4" data-testid="demo-mode-toggle">
              <Switch
                id="demo-mode"
                checked={demoMode}
                onCheckedChange={setDemoMode}
                data-testid="switch-demo-mode"
              />
              <Label htmlFor="demo-mode" className="flex items-center gap-1.5 text-sm cursor-pointer">
                <FlaskConical className="w-4 h-4" />
                {demoMode ? 'Demo' : 'Lab'}
              </Label>
            </div>
            {/* Lab controls hidden in demo mode */}
            {!demoMode && (
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
            )}
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-8">
        {(() => {
          const allTabs = [
            { value: "compare", label: "Upload & Compare", icon: GitCompareArrows, testId: "tab-compare" },
            { value: "batch", label: "Batch Processing", icon: Users, testId: "tab-batch", hideInDemo: true },
            { value: "jobs", label: "Job Descriptions", icon: Briefcase, testId: "tab-jobs" },
            { value: "profiles", label: "Profiles", icon: UserSearch, testId: "tab-profiles" },
          ];
          const visibleTabs = demoMode 
            ? allTabs.filter(tab => !tab.hideInDemo) 
            : allTabs;

          return (
            <Tabs defaultValue="compare" className="w-full">
              <TabsList className={`grid w-full mb-8`} style={{ gridTemplateColumns: `repeat(${visibleTabs.length}, minmax(0, 1fr))` }}>
                {visibleTabs.map(tab => (
                  <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-2" data-testid={tab.testId}>
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* Combined Upload & Compare page */}
              <TabsContent value="compare" className="space-y-8">
                <UploadAndComparePage
                  onJobStarted={handleJobStarted}
                  processingJobId={processingJobId}
                  currentJob={currentJob}
                  selectedCodexId={selectedCodexId}
                  codexes={codexes || []}
                  onJobCompleted={handleJobCompleted}
                  onRetry={handleRetry}
                  onResumeStarted={handleResumeStarted}
                  processingResumeId={processingResumeId}
                  onResumeCompleted={handleResumeCompleted}
                />
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

              <TabsContent value="jobs" className="space-y-8">
                <JobDescriptionsPage onViewDetails={handleViewDetails} />
              </TabsContent>

              <TabsContent value="profiles" className="space-y-8">
                <ProfilesPage onViewProfile={handleViewProfile} />
              </TabsContent>
            </Tabs>
          );
        })()}
      </main>
      {/* Codex Management Modal */}
      <CodexModal 
        open={showCodexModal}
        onClose={() => setShowCodexModal(false)}
        selectedCodexId={selectedCodexId}
      />
      {/* Advanced Export Dialog */}
      <ExportDialog 
        open={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        jobId={currentJob?.id}
      />
      {/* Profile Modal */}
      <ProfileModal 
        resumeId={selectedProfileId}
        open={showProfileModal}
        onClose={handleCloseProfileModal}
      />
      {/* Job Description Modal */}
      <JobDescriptionModal 
        jobId={selectedJobId}
        open={showJobModal}
        onClose={handleCloseJobModal}
      />
    </div>
  );
}
