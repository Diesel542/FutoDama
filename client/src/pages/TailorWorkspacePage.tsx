import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, AlertCircle, Briefcase, User } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Job, Resume, TailoringOptions } from "@shared/schema";
import { defaultTailoringOptions } from "@shared/schema";
import { JobSnapshotPanel, CandidatePanel, TailoredOutputPanel } from "@/components/tailor/TailorPanels";

interface TailorResult {
  ok: boolean;
  errors: string[];
  bundle: any | null;
}

export default function TailorWorkspacePage() {
  const { jobId: routeJobId, profileId: routeProfileId } = useParams<{ jobId: string; profileId: string }>();
  const [, setLocation] = useLocation();
  
  const [selectedJobId, setSelectedJobId] = useState<string | undefined>(routeJobId);
  const [selectedProfileId, setSelectedProfileId] = useState<string | undefined>(routeProfileId);
  const [options, setOptions] = useState<TailoringOptions>(defaultTailoringOptions);
  
  const isStandaloneMode = !routeJobId || !routeProfileId;

  useEffect(() => {
    if (routeJobId) setSelectedJobId(routeJobId);
    if (routeProfileId) setSelectedProfileId(routeProfileId);
  }, [routeJobId, routeProfileId]);

  const { data: allJobs } = useQuery<Job[]>({
    queryKey: ['/api/jobs'],
    enabled: isStandaloneMode,
  });

  const { data: allResumes } = useQuery<Resume[]>({
    queryKey: ['/api/resumes'],
    enabled: isStandaloneMode,
  });

  const { data: job, isLoading: isLoadingJob, error: jobError } = useQuery<Job>({
    queryKey: ['/api/jobs', selectedJobId],
    enabled: !!selectedJobId,
  });

  const { data: resume, isLoading: isLoadingResume, error: resumeError } = useQuery<Resume>({
    queryKey: ['/api/resumes', selectedProfileId],
    enabled: !!selectedProfileId,
  });

  const tailorMutation = useMutation<TailorResult, Error>({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/tailor-resume', {
        jobId: selectedJobId,
        profileId: selectedProfileId,
        tailoring: options
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

  if (isLoading && !isStandaloneMode) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-primary" />
          <p className="text-lg text-muted-foreground">Loading tailor workspace...</p>
        </div>
      </div>
    );
  }

  if (!isStandaloneMode && (hasError || !job || !resume)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-destructive" />
          <p className="text-lg text-destructive mb-2">Failed to load data</p>
          <p className="text-sm text-muted-foreground mb-4">
            {!job && "Job not found. "}
            {!resume && "Resume not found."}
          </p>
          <Button variant="outline" onClick={() => setLocation(`/jobs/${routeJobId}/match`)}>
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
                onClick={() => isStandaloneMode ? setLocation('/') : setLocation(`/jobs/${routeJobId}/match`)}
                data-testid="button-back"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {isStandaloneMode ? 'Back to Home' : 'Back to Matching'}
              </Button>
              <div className="border-l border-border pl-4">
                <h1 className="text-lg font-semibold text-foreground">Tailoring Workspace</h1>
                {job && resume ? (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">{candidateName}</span> for <span className="font-medium">{jobTitle}</span>
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">Select a job and profile to begin</p>
                )}
              </div>
            </div>
            
            {isStandaloneMode && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-muted-foreground" />
                  <Select value={selectedJobId || ""} onValueChange={setSelectedJobId}>
                    <SelectTrigger className="w-[200px]" data-testid="select-job">
                      <SelectValue placeholder="Select Job" />
                    </SelectTrigger>
                    <SelectContent>
                      {allJobs && allJobs.length > 0 ? (
                        allJobs.map(j => {
                          const jc = j.jobCard as any;
                          return (
                            <SelectItem key={j.id} value={j.id}>
                              {jc?.basics?.title || j.title || 'Untitled Job'}
                            </SelectItem>
                          );
                        })
                      ) : (
                        <SelectItem value="__no_jobs" disabled>No jobs available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <Select value={selectedProfileId || ""} onValueChange={setSelectedProfileId}>
                    <SelectTrigger className="w-[200px]" data-testid="select-profile">
                      <SelectValue placeholder="Select Profile" />
                    </SelectTrigger>
                    <SelectContent>
                      {allResumes && allResumes.length > 0 ? (
                        allResumes.map(r => {
                          const rc = r.resumeCard as any;
                          return (
                            <SelectItem key={r.id} value={r.id}>
                              {rc?.personal_info?.name || r.name || 'Unnamed Profile'}
                            </SelectItem>
                          );
                        })
                      ) : (
                        <SelectItem value="__no_profiles" disabled>No profiles available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 overflow-hidden">
        <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 overflow-auto">
            {job ? (
              <JobSnapshotPanel job={job} />
            ) : (
              <Card className="h-full" data-testid="panel-job-empty">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-muted-foreground" />
                    <CardTitle className="text-lg text-muted-foreground">Target Job</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="flex items-center justify-center min-h-[200px]">
                  <p className="text-muted-foreground text-center">
                    {isLoadingJob ? "Loading job..." : "Select a job from the dropdown above"}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
          
          <div className="lg:col-span-1 overflow-auto">
            {resume ? (
              <CandidatePanel
                resume={resume}
                options={options}
                onOptionsChange={setOptions}
                onGenerate={handleGenerate}
                isGenerating={tailorMutation.isPending}
              />
            ) : (
              <Card className="h-full" data-testid="panel-candidate-empty">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-muted-foreground" />
                    <CardTitle className="text-lg text-muted-foreground">Candidate</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="flex items-center justify-center min-h-[200px]">
                  <p className="text-muted-foreground text-center">
                    {isLoadingResume ? "Loading profile..." : "Select a profile from the dropdown above"}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
          
          <div className="lg:col-span-1 overflow-hidden">
            <TailoredOutputPanel
              bundle={tailorResult?.ok ? tailorResult.bundle : null}
              isLoading={tailorMutation.isPending}
              errors={tailorResult && !tailorResult.ok ? tailorResult.errors : null}
              candidateName={candidateName}
              jobTitle={jobTitle}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
