import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowLeft, 
  Loader2, 
  Sparkles, 
  RefreshCw, 
  User, 
  MapPin, 
  Award,
  TrendingUp,
  AlertCircle,
  FileText,
  Building,
  Briefcase,
  ChevronRight
} from "lucide-react";
import type { Job, TypedMatchSession, MatchSessionStep1Result, MatchSessionStep2Result } from "@shared/schema";

interface MappedStep1Candidate {
  resumeId: string;
  candidateName: string;
  overlapScore: number;
  mustHaveMatches: number;
  mustHaveRequired: number;
  niceToHaveMatches: number;
  niceToHaveTotal: number;
  matchedSkills: string[];
  missingSkills: string[];
  location?: string;
  availability?: string;
}

interface MappedStep2Result {
  resumeId: string;
  candidateName: string;
  matchScore: number;
  summary: string;
  strengths: string[];
  concerns: string[];
  evidence: Array<{
    category: string;
    jobQuote: string;
    resumeQuote: string;
    assessment: string;
  }>;
  confidence: number;
}

interface Step1Response {
  sessionId: string;
  matches: MappedStep1Candidate[];
  totalMatches: number;
}

interface Step2Response {
  sessionId: string;
  results: MappedStep2Result[];
  totalAnalyzed: number;
}

interface SessionsResponse {
  sessions: TypedMatchSession[];
}

function mapStep1FromSchema(result: MatchSessionStep1Result): MappedStep1Candidate {
  return {
    resumeId: result.resumeId,
    candidateName: result.candidateName,
    overlapScore: result.overlapScore,
    mustHaveMatches: result.mustHaveMatches,
    mustHaveRequired: result.mustHaveRequired,
    niceToHaveMatches: result.niceToHaveMatches,
    niceToHaveTotal: result.niceToHaveTotal,
    matchedSkills: result.matchedSkills,
    missingSkills: result.missingSkills,
    location: result.location,
    availability: result.availability,
  };
}

function mapStep2FromSchema(result: MatchSessionStep2Result): MappedStep2Result {
  return {
    resumeId: result.profileId,
    candidateName: result.profileName,
    matchScore: result.aiScore,
    summary: result.explanation,
    strengths: result.strengths || [],
    concerns: result.concerns || [],
    evidence: result.evidence || [],
    confidence: result.confidence || 0.8,
  };
}

export default function MatchWorkspacePage() {
  const { jobId } = useParams<{ jobId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [step1Matches, setStep1Matches] = useState<MappedStep1Candidate[]>([]);
  const [step2Results, setStep2Results] = useState<MappedStep2Result[]>([]);
  const [selectedProfileIds, setSelectedProfileIds] = useState<Set<string>>(new Set());
  const [selectedResult, setSelectedResult] = useState<MappedStep2Result | null>(null);
  const [hasAutoRunStep1, setHasAutoRunStep1] = useState(false);

  const { data: job, isLoading: isLoadingJob, error: jobError } = useQuery<Job>({
    queryKey: ['/api/jobs', jobId],
    enabled: !!jobId,
  });

  const { data: sessionsData, isLoading: isLoadingSessions } = useQuery<SessionsResponse>({
    queryKey: ['/api/jobs', jobId, 'match-sessions'],
    enabled: !!jobId,
  });

  useEffect(() => {
    if (sessionsData?.sessions && sessionsData.sessions.length > 0) {
      const latestSession = sessionsData.sessions[0];
      setSessionId(latestSession.id);
      
      if (latestSession.step1Results && latestSession.step1Results.length > 0) {
        setStep1Matches(latestSession.step1Results.map(mapStep1FromSchema));
      }
      
      if (latestSession.step2Selections && latestSession.step2Selections.length > 0) {
        setSelectedProfileIds(new Set(latestSession.step2Selections));
      }
      
      if (latestSession.step2Results && latestSession.step2Results.length > 0) {
        const mapped = latestSession.step2Results.map(mapStep2FromSchema);
        setStep2Results(mapped);
        const sorted = [...mapped].sort((a, b) => b.matchScore - a.matchScore);
        setSelectedResult(sorted[0]);
      }
    }
  }, [sessionsData]);

  useEffect(() => {
    if (!isLoadingSessions && !hasAutoRunStep1 && sessionsData !== undefined) {
      const hasNoStep1Results = !sessionsData?.sessions?.length || 
        !sessionsData.sessions[0]?.step1Results?.length;
      
      if (hasNoStep1Results && jobId) {
        setHasAutoRunStep1(true);
        step1Mutation.mutate();
      }
    }
  }, [isLoadingSessions, sessionsData, hasAutoRunStep1, jobId]);

  const step1Mutation = useMutation({
    mutationFn: async (): Promise<Step1Response> => {
      const response = await apiRequest('POST', `/api/jobs/${jobId}/match/step1`);
      return response.json();
    },
    onSuccess: (data) => {
      setStep1Matches(data.matches);
      setSessionId(data.sessionId);
      setSelectedProfileIds(new Set());
      setStep2Results([]);
      setSelectedResult(null);
      queryClient.invalidateQueries({ queryKey: ['/api/jobs', jobId, 'match-sessions'] });
      toast({
        title: "Step 1 Complete",
        description: `Found ${data.totalMatches} matching candidates based on skill overlap.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Step 1 Failed",
        description: error.message || "Failed to find matching candidates.",
        variant: "destructive",
      });
    },
  });

  const step2Mutation = useMutation({
    mutationFn: async (profileIds: string[]): Promise<Step2Response> => {
      const response = await apiRequest('POST', `/api/jobs/${jobId}/match/step2`, {
        profileIds,
        sessionId,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setStep2Results(data.results);
      setSessionId(data.sessionId);
      queryClient.invalidateQueries({ queryKey: ['/api/jobs', jobId, 'match-sessions'] });
      
      if (data.results.length > 0) {
        const sorted = [...data.results].sort((a, b) => b.matchScore - a.matchScore);
        setSelectedResult(sorted[0]);
      }
      
      toast({
        title: "AI Analysis Complete",
        description: `Analyzed ${data.totalAnalyzed} candidates with detailed matching.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "AI Analysis Failed",
        description: error.message || "Failed to run AI analysis.",
        variant: "destructive",
      });
    },
  });

  const handleToggleProfile = (resumeId: string) => {
    const newSelection = new Set(selectedProfileIds);
    if (newSelection.has(resumeId)) {
      newSelection.delete(resumeId);
    } else {
      newSelection.add(resumeId);
    }
    setSelectedProfileIds(newSelection);
  };

  const handleRunStep2 = () => {
    if (selectedProfileIds.size === 0) {
      toast({
        title: "No Candidates Selected",
        description: "Please select at least one candidate for AI analysis.",
        variant: "destructive",
      });
      return;
    }
    if (!sessionId) {
      toast({
        title: "Session Not Ready",
        description: "Please wait for Step 1 to complete first.",
        variant: "destructive",
      });
      return;
    }
    step2Mutation.mutate(Array.from(selectedProfileIds));
  };

  const handleOpenTailor = (analysis: MappedStep2Result) => {
    setLocation(`/jobs/${jobId}/tailor/${analysis.resumeId}`);
  };

  const jobCard = job?.jobCard as any;
  const jobTitle = jobCard?.basics?.title || "Job";
  const company = jobCard?.basics?.company || "";
  const location = jobCard?.basics?.location || "";
  const workMode = jobCard?.basics?.work_mode || "";

  if (isLoadingJob || isLoadingSessions) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" data-testid="page-match-workspace-loading">
        <div className="text-center">
          <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-primary" />
          <p className="text-lg text-muted-foreground">Loading match workspace...</p>
        </div>
      </div>
    );
  }

  if (jobError || !job) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" data-testid="page-match-workspace-error">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-destructive" />
          <p className="text-lg text-destructive">Failed to load job</p>
          <Button variant="outline" className="mt-4" onClick={() => setLocation('/')} data-testid="button-go-back-error">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const canRunStep2 = sessionId !== null && selectedProfileIds.size > 0 && !step2Mutation.isPending;

  return (
    <div className="min-h-screen bg-background" data-testid="page-match-workspace">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/')}
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-foreground" data-testid="text-page-title">
                Match Workspace
              </h1>
              <p className="text-sm text-muted-foreground">{jobTitle}</p>
            </div>
            <Badge variant="outline" className="text-xs">Beta</Badge>
          </div>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-73px)]">
        <div className="w-full lg:w-[30%] border-b lg:border-b-0 lg:border-r border-border bg-card/50">
          <ScrollArea className="h-full max-h-[300px] lg:max-h-none">
            <div className="p-6">
              <JobCardPanel 
                jobCard={jobCard}
                jobTitle={jobTitle}
                company={company}
                location={location}
                workMode={workMode}
              />
            </div>
          </ScrollArea>
        </div>

        <div className="w-full lg:w-[40%] border-b lg:border-b-0 lg:border-r border-border">
          <ScrollArea className="h-full">
            <div className="p-6">
              <MatchStepsPanel
                step1Matches={step1Matches}
                step2Results={step2Results}
                selectedProfileIds={selectedProfileIds}
                isRunningStep1={step1Mutation.isPending}
                isRunningStep2={step2Mutation.isPending}
                canRunStep2={canRunStep2}
                onRunStep1={() => step1Mutation.mutate()}
                onRunStep2={handleRunStep2}
                onToggleProfile={handleToggleProfile}
                onSelectResult={setSelectedResult}
                selectedResult={selectedResult}
              />
            </div>
          </ScrollArea>
        </div>

        <div className="w-full lg:w-[30%]">
          <ScrollArea className="h-full">
            <div className="p-6">
              <CandidateInsightPanel
                selectedResult={selectedResult}
                onOpenTailor={handleOpenTailor}
              />
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}

interface JobCardPanelProps {
  jobCard: any;
  jobTitle: string;
  company: string;
  location: string;
  workMode: string;
}

function JobCardPanel({ jobCard, jobTitle, company, location, workMode }: JobCardPanelProps) {
  const requirements = jobCard?.requirements || {};

  return (
    <div className="space-y-4" data-testid="panel-job-card">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-2" data-testid="text-job-title">
          {jobTitle}
        </h2>
        {company && (
          <div className="flex items-center text-sm text-muted-foreground mb-1">
            <Building className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>{company}</span>
          </div>
        )}
        {location && (
          <div className="flex items-center text-sm text-muted-foreground mb-1">
            <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>{location}</span>
          </div>
        )}
        {workMode && (
          <div className="flex items-center text-sm text-muted-foreground">
            <Briefcase className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>{workMode}</span>
          </div>
        )}
      </div>

      {jobCard?.overview && (
        <div>
          <h3 className="text-sm font-medium text-foreground mb-2">Overview</h3>
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">
            {jobCard.overview}
          </p>
        </div>
      )}

      <Separator />

      {(requirements.technical_skills?.length > 0 || requirements.must_have?.length > 0) && (
        <div>
          <h3 className="text-sm font-medium text-foreground mb-2">
            {requirements.technical_skills ? 'Technical Skills' : 'Must Have'}
          </h3>
          <div className="flex flex-wrap gap-1">
            {(requirements.technical_skills || requirements.must_have || []).slice(0, 8).map((skill: string, idx: number) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {skill}
              </Badge>
            ))}
            {(requirements.technical_skills || requirements.must_have || []).length > 8 && (
              <Badge variant="outline" className="text-xs">
                +{(requirements.technical_skills || requirements.must_have).length - 8} more
              </Badge>
            )}
          </div>
        </div>
      )}

      {requirements.nice_to_have?.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-foreground mb-2">Nice to Have</h3>
          <div className="flex flex-wrap gap-1">
            {requirements.nice_to_have.slice(0, 6).map((skill: string, idx: number) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {skill}
              </Badge>
            ))}
            {requirements.nice_to_have.length > 6 && (
              <Badge variant="outline" className="text-xs">
                +{requirements.nice_to_have.length - 6} more
              </Badge>
            )}
          </div>
        </div>
      )}

      {requirements.experience_required && (
        <div>
          <h3 className="text-sm font-medium text-foreground mb-2">Experience</h3>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {requirements.experience_required}
          </p>
        </div>
      )}
    </div>
  );
}

interface MatchStepsPanelProps {
  step1Matches: MappedStep1Candidate[];
  step2Results: MappedStep2Result[];
  selectedProfileIds: Set<string>;
  isRunningStep1: boolean;
  isRunningStep2: boolean;
  canRunStep2: boolean;
  onRunStep1: () => void;
  onRunStep2: () => void;
  onToggleProfile: (resumeId: string) => void;
  onSelectResult: (result: MappedStep2Result) => void;
  selectedResult: MappedStep2Result | null;
}

function MatchStepsPanel({
  step1Matches,
  step2Results,
  selectedProfileIds,
  isRunningStep1,
  isRunningStep2,
  canRunStep2,
  onRunStep1,
  onRunStep2,
  onToggleProfile,
  onSelectResult,
  selectedResult,
}: MatchStepsPanelProps) {
  return (
    <div className="space-y-6" data-testid="panel-match-steps">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Step 1: Skill-Based Filtering</h3>
            <p className="text-sm text-muted-foreground">
              Systematic comparison of required skills vs candidate skills
            </p>
          </div>
          {step1Matches.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRunStep1}
              disabled={isRunningStep1}
              data-testid="button-rerun-step1"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRunningStep1 ? 'animate-spin' : ''}`} />
              Re-run
            </Button>
          )}
        </div>

        {step1Matches.length === 0 && !isRunningStep1 && (
          <div className="text-center py-8">
            <Sparkles className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground mb-4">
              Run Step 1 to find matching candidates based on skill overlap
            </p>
            <Button
              onClick={onRunStep1}
              disabled={isRunningStep1}
              data-testid="button-run-step1"
            >
              {isRunningStep1 && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Run Step 1 Matching
            </Button>
          </div>
        )}

        {isRunningStep1 && (
          <div className="flex items-center justify-center py-8" data-testid="step1-loading">
            <div className="text-center">
              <Loader2 className="w-12 h-12 mx-auto mb-3 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Running Step 1...</p>
            </div>
          </div>
        )}

        {step1Matches.length > 0 && !isRunningStep1 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {step1Matches.length} candidates found
              </span>
              <span className="text-muted-foreground">
                {selectedProfileIds.size} selected
              </span>
            </div>

            {step1Matches.map((candidate) => (
              <Card
                key={candidate.resumeId}
                className={`cursor-pointer transition-colors hover:border-primary dark:hover:border-primary ${
                  selectedProfileIds.has(candidate.resumeId) 
                    ? 'border-primary bg-primary/5 dark:border-primary dark:bg-primary/10' 
                    : ''
                }`}
                onClick={() => onToggleProfile(candidate.resumeId)}
                data-testid={`card-candidate-${candidate.resumeId}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedProfileIds.has(candidate.resumeId)}
                      onCheckedChange={() => onToggleProfile(candidate.resumeId)}
                      onClick={(e) => e.stopPropagation()}
                      data-testid={`checkbox-candidate-${candidate.resumeId}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-semibold text-foreground truncate">
                          {candidate.candidateName}
                        </h5>
                        <Badge variant={candidate.overlapScore >= 70 ? "default" : "secondary"}>
                          {candidate.overlapScore}% match
                        </Badge>
                      </div>

                      {candidate.location && (
                        <p className="text-xs text-muted-foreground mb-2 flex items-center">
                          <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                          <span className="truncate">{candidate.location}</span>
                        </p>
                      )}

                      <div className="flex gap-4 text-xs mb-2">
                        <span>
                          <span className="text-muted-foreground">Must-have: </span>
                          <span className="font-medium text-foreground">{candidate.mustHaveMatches}/{candidate.mustHaveRequired}</span>
                        </span>
                        <span>
                          <span className="text-muted-foreground">Nice-to-have: </span>
                          <span className="font-medium text-foreground">{candidate.niceToHaveMatches}/{candidate.niceToHaveTotal}</span>
                        </span>
                      </div>

                      {candidate.matchedSkills.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {candidate.matchedSkills.slice(0, 4).map((skill, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {candidate.matchedSkills.length > 4 && (
                            <Badge variant="outline" className="text-xs">
                              +{candidate.matchedSkills.length - 4}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {step1Matches.length > 0 && (
        <>
          <Separator />

          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Step 2: AI Deep Analysis</h3>
                <p className="text-sm text-muted-foreground">
                  Contextual analysis with GPT for selected candidates
                </p>
              </div>
            </div>

            <Button
              onClick={onRunStep2}
              disabled={!canRunStep2}
              className="w-full mb-4"
              data-testid="button-run-step2"
            >
              {isRunningStep2 && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Sparkles className="w-4 h-4 mr-2" />
              Analyze {selectedProfileIds.size} Selected Candidate{selectedProfileIds.size !== 1 ? 's' : ''}
            </Button>

            {isRunningStep2 && (
              <div className="flex items-center justify-center py-8" data-testid="step2-loading">
                <div className="text-center">
                  <Loader2 className="w-12 h-12 mx-auto mb-3 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Analyzing {selectedProfileIds.size} candidates...</p>
                  <p className="text-xs text-muted-foreground mt-1">This may take a few moments</p>
                </div>
              </div>
            )}

            {!isRunningStep2 && step2Results.length === 0 && selectedProfileIds.size > 0 && (
              <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
                <Sparkles className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  Click "Analyze" to run AI deep matching
                </p>
              </div>
            )}

            {step2Results.length > 0 && !isRunningStep2 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground mb-3">
                  Click a candidate to view detailed insights
                </p>
                {step2Results
                  .sort((a, b) => b.matchScore - a.matchScore)
                  .map((analysis) => (
                    <Card
                      key={analysis.resumeId}
                      className={`cursor-pointer transition-colors hover:border-primary dark:hover:border-primary ${
                        selectedResult?.resumeId === analysis.resumeId 
                          ? 'border-primary bg-primary/5 dark:border-primary dark:bg-primary/10' 
                          : ''
                      }`}
                      onClick={() => onSelectResult(analysis)}
                      data-testid={`card-step2-result-${analysis.resumeId}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <User className="w-5 h-5 text-muted-foreground" />
                            <span className="font-medium text-foreground">{analysis.candidateName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={analysis.matchScore >= 70 ? "default" : "secondary"}>
                              <Award className="w-3 h-3 mr-1" />
                              {analysis.matchScore}
                            </Badge>
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

interface CandidateInsightPanelProps {
  selectedResult: MappedStep2Result | null;
  onOpenTailor: (analysis: MappedStep2Result) => void;
}

function CandidateInsightPanel({ selectedResult, onOpenTailor }: CandidateInsightPanelProps) {
  if (!selectedResult) {
    return (
      <div className="flex items-center justify-center h-full min-h-[300px]" data-testid="panel-insight-empty">
        <div className="text-center">
          <User className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-muted-foreground">Select a candidate to view AI insights</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="panel-candidate-insight">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-foreground" data-testid="text-candidate-name">
            {selectedResult.candidateName}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <Award className="w-5 h-5 text-primary" />
            <span className="text-2xl font-bold text-primary" data-testid="text-ai-score">
              {selectedResult.matchScore}
            </span>
            <span className="text-sm text-muted-foreground">/100</span>
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-foreground mb-2">Summary</h4>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {selectedResult.summary}
        </p>
      </div>

      {selectedResult.strengths.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
            <h4 className="text-sm font-medium text-green-600 dark:text-green-400">Strengths</h4>
          </div>
          <ul className="space-y-2">
            {selectedResult.strengths.map((strength, idx) => (
              <li key={idx} className="text-sm text-foreground flex items-start gap-2">
                <span className="text-green-600 dark:text-green-400 mt-0.5">•</span>
                <span>{strength}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {selectedResult.concerns.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <h4 className="text-sm font-medium text-amber-600 dark:text-amber-400">Concerns</h4>
          </div>
          <ul className="space-y-2">
            {selectedResult.concerns.map((concern, idx) => (
              <li key={idx} className="text-sm text-foreground flex items-start gap-2">
                <span className="text-amber-600 dark:text-amber-400 mt-0.5">•</span>
                <span>{concern}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {selectedResult.evidence.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-foreground mb-3">Evidence</h4>
          <div className="space-y-4">
            {selectedResult.evidence.map((item, idx) => (
              <div key={idx} className="text-sm space-y-2 border-l-2 border-border pl-3">
                <Badge variant="outline" className="text-xs">{item.category}</Badge>
                <div className="space-y-1">
                  <p className="text-muted-foreground italic text-xs">
                    <span className="font-medium text-foreground not-italic">Job:</span> "{item.jobQuote}"
                  </p>
                  <p className="text-muted-foreground italic text-xs">
                    <span className="font-medium text-foreground not-italic">Resume:</span> "{item.resumeQuote}"
                  </p>
                </div>
                <p className="text-foreground text-xs">{item.assessment}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <Separator />

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Confidence: {Math.round(selectedResult.confidence * 100)}%
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onOpenTailor(selectedResult)}
          data-testid="button-open-tailor"
        >
          <FileText className="w-4 h-4 mr-2" />
          Open Tailoring
        </Button>
      </div>
    </div>
  );
}
