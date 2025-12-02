import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, FileText, AlertCircle, Sparkles } from "lucide-react";
import type { Job, Resume } from "@shared/schema";

export default function TailorWorkspacePage() {
  const { jobId, profileId } = useParams<{ jobId: string; profileId: string }>();
  const [, setLocation] = useLocation();

  const { data: job, isLoading: isLoadingJob, error: jobError } = useQuery<Job>({
    queryKey: ['/api/jobs', jobId],
    enabled: !!jobId,
  });

  const { data: resume, isLoading: isLoadingResume, error: resumeError } = useQuery<Resume>({
    queryKey: ['/api/resumes', profileId],
    enabled: !!profileId,
  });

  const isLoading = isLoadingJob || isLoadingResume;
  const hasError = jobError || resumeError;

  const jobCard = job?.jobCard as any;
  const resumeCard = resume?.resumeCard as any;
  
  const jobTitle = jobCard?.basics?.title || "Job";
  const candidateName = resumeCard?.contact?.name || "Candidate";

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

  if (hasError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-destructive" />
          <p className="text-lg text-destructive">Failed to load data</p>
          <Button variant="outline" className="mt-4" onClick={() => setLocation(`/jobs/${jobId}/match`)}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="page-tailor-workspace">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation(`/jobs/${jobId}/match`)}
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Match Workspace
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <Card>
          <CardContent className="p-12 text-center">
            <div className="mb-8">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-10 h-10 text-primary" />
              </div>
              <Badge variant="outline" className="mb-4">Coming Soon</Badge>
              <h1 className="text-3xl font-bold text-foreground mb-4" data-testid="text-page-title">
                Tailoring Workspace
              </h1>
              <p className="text-lg text-muted-foreground mb-6">
                Resume tailoring for <span className="font-semibold text-foreground">{candidateName}</span> on{" "}
                <span className="font-semibold text-foreground">{jobTitle}</span>
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-6 text-left">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                What's Coming
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>AI-powered 3-pass resume tailoring pipeline</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Skill coverage analysis with visual indicators</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>ATS optimization report and recommendations</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Side-by-side diff view of changes</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Export tailored resume in multiple formats</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 flex justify-center gap-4">
              <Button
                variant="outline"
                onClick={() => setLocation(`/jobs/${jobId}/match`)}
                data-testid="button-back-to-match"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Matching
              </Button>
            </div>

            <p className="text-xs text-muted-foreground mt-8">
              Job ID: {jobId} | Profile ID: {profileId}
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
