import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Job, Resume } from "@shared/schema";
import { JobSnapshotPanel, CandidatePanel, TailoredOutputPanel } from "@/components/tailor/TailorPanels";

interface TailorResult {
  ok: boolean;
  errors: string[];
  bundle: any | null;
}

export default function TailorWorkspacePage() {
  const { jobId, profileId } = useParams<{ jobId: string; profileId: string }>();
  const [, setLocation] = useLocation();
  
  const [language, setLanguage] = useState<'en' | 'da'>('en');
  const [style, setStyle] = useState<'conservative' | 'modern' | 'impact'>('modern');

  const { data: job, isLoading: isLoadingJob, error: jobError } = useQuery<Job>({
    queryKey: ['/api/jobs', jobId],
    enabled: !!jobId,
  });

  const { data: resume, isLoading: isLoadingResume, error: resumeError } = useQuery<Resume>({
    queryKey: ['/api/resumes', profileId],
    enabled: !!profileId,
  });

  const tailorMutation = useMutation<TailorResult, Error>({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/tailor-resume', {
        jobId,
        profileId,
        language,
        style
      });
      const data = await response.json();
      return data as TailorResult;
    }
  });

  const handleGenerate = () => {
    tailorMutation.reset();
    tailorMutation.mutate();
  };
  
  const tailorResult: TailorResult | null = tailorMutation.isError 
    ? { ok: false, errors: [tailorMutation.error?.message || 'Failed to generate tailored resume'], bundle: null }
    : tailorMutation.data || null;

  const isLoading = isLoadingJob || isLoadingResume;
  const hasError = jobError || resumeError;

  const jobCard = job?.jobCard as any;
  const resumeCard = resume?.resumeCard as any;
  
  const jobTitle = jobCard?.basics?.title || "Job";
  const candidateName = resumeCard?.personal_info?.name || resumeCard?.contact?.name || "Candidate";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-primary" />
          <p className="text-lg text-muted-foreground">Loading tailor workspace...</p>
        </div>
      </div>
    );
  }

  if (hasError || !job || !resume) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-destructive" />
          <p className="text-lg text-destructive mb-2">Failed to load data</p>
          <p className="text-sm text-muted-foreground mb-4">
            {!job && "Job not found. "}
            {!resume && "Resume not found."}
          </p>
          <Button variant="outline" onClick={() => setLocation(`/jobs/${jobId}/match`)}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col" data-testid="page-tailor-workspace">
      <header className="border-b border-border bg-card sticky top-0 z-10 flex-shrink-0">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation(`/jobs/${jobId}/match`)}
                data-testid="button-back"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Matching
              </Button>
              <div className="border-l border-border pl-4">
                <h1 className="text-lg font-semibold text-foreground">Tailoring Workspace</h1>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">{candidateName}</span> for <span className="font-medium">{jobTitle}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 overflow-hidden">
        <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 overflow-auto">
            <JobSnapshotPanel job={job} />
          </div>
          
          <div className="lg:col-span-1 overflow-auto">
            <CandidatePanel
              resume={resume}
              language={language}
              style={style}
              onLanguageChange={setLanguage}
              onStyleChange={setStyle}
              onGenerate={handleGenerate}
              isGenerating={tailorMutation.isPending}
            />
          </div>
          
          <div className="lg:col-span-1 overflow-hidden">
            <TailoredOutputPanel
              bundle={tailorResult?.ok ? tailorResult.bundle : null}
              isLoading={tailorMutation.isPending}
              errors={tailorResult && !tailorResult.ok ? tailorResult.errors : null}
              candidateName={candidateName}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
