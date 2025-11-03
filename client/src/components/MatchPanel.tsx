import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { X, Loader2, Download, Save, Sparkles, AlertCircle, TrendingUp, Award } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

interface MatchCandidate {
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

interface AIAnalysis {
  resumeId: string;
  candidateName: string;
  matchScore: number;
  summary: string;
  strengths: string[];
  concerns: string[];
  evidence: string[];
  confidence: number;
}

interface Step1Response {
  sessionId: string;
  matches: MatchCandidate[];
  totalMatches: number;
}

interface Step2Response {
  sessionId: string;
  results: AIAnalysis[];
  totalAnalyzed: number;
}

interface MatchPanelProps {
  jobId: string;
  jobTitle: string;
  onClose: () => void;
}

export default function MatchPanel({ jobId, jobTitle, onClose }: MatchPanelProps) {
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());
  const [step1Results, setStep1Results] = useState<MatchCandidate[] | null>(null);
  const [step2Results, setStep2Results] = useState<AIAnalysis[] | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const { toast } = useToast();

  // Clear Step 2 results when selection changes after analysis has been run
  // This prevents showing stale AI analysis for outdated candidate selections
  useEffect(() => {
    if (step2Results && step2Results.length > 0) {
      // Check if current selection matches the analyzed profiles
      const analyzedIds = new Set(step2Results.map(r => r.resumeId));
      const selectionChanged = 
        selectedCandidates.size !== analyzedIds.size ||
        Array.from(selectedCandidates).some(id => !analyzedIds.has(id));
      
      if (selectionChanged) {
        setStep2Results(null);
      }
    }
  }, [selectedCandidates, step2Results]);

  // Step 1: Run systematic matching
  const step1Mutation = useMutation({
    mutationFn: async (): Promise<Step1Response> => {
      const response = await apiRequest('POST', `/api/jobs/${jobId}/match/step1`);
      return await response.json();
    },
    onSuccess: (data) => {
      setStep1Results(data.matches);
      setSessionId(data.sessionId);
      setSelectedCandidates(new Set()); // Reset selections
      setStep2Results(null); // Clear stale Step 2 results
      toast({
        title: "Step 1 Complete",
        description: `Found ${data.totalMatches} matching candidates based on skill overlap.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Step 1 Failed",
        description: error.message || "Failed to find matching candidates.",
        variant: "destructive",
      });
    },
  });

  // Step 2: Run AI analysis on selected candidates
  const step2Mutation = useMutation({
    mutationFn: async (profileIds: string[]): Promise<Step2Response> => {
      const response = await apiRequest('POST', `/api/jobs/${jobId}/match/step2`, {
        profileIds,
        sessionId,
      });
      return await response.json();
    },
    onSuccess: (data) => {
      setStep2Results(data.results);
      setSessionId(data.sessionId);
      toast({
        title: "AI Analysis Complete",
        description: `Analyzed ${data.totalAnalyzed} candidates with detailed matching.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "AI Analysis Failed",
        description: error.message || "Failed to run AI analysis.",
        variant: "destructive",
      });
    },
  });

  const handleToggleCandidate = (resumeId: string) => {
    const newSelection = new Set(selectedCandidates);
    if (newSelection.has(resumeId)) {
      newSelection.delete(resumeId);
    } else {
      newSelection.add(resumeId);
    }
    setSelectedCandidates(newSelection);
  };

  const handleRunStep2 = () => {
    if (selectedCandidates.size === 0) {
      toast({
        title: "No Candidates Selected",
        description: "Please select at least one candidate for AI analysis.",
        variant: "destructive",
      });
      return;
    }
    step2Mutation.mutate(Array.from(selectedCandidates));
  };

  return (
    <div 
      className="w-[600px] h-full bg-background border-l border-border shadow-2xl flex flex-col"
      data-testid="panel-match"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">
            Find Matching Candidates
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            data-testid="button-close-panel"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        {/* Job Info */}
        <div className="mb-6">
          <p className="text-sm text-muted-foreground mb-1">Matching candidates for:</p>
          <p className="font-semibold text-foreground">{jobTitle}</p>
        </div>

        {/* Step 1 Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-semibold text-foreground mb-1">Step 1: Skill-Based Filtering</h4>
              <p className="text-sm text-muted-foreground">
                Systematic comparison of required skills vs candidate skills
              </p>
            </div>
          </div>

          {!step1Results ? (
            <div>
              <Button
                onClick={() => step1Mutation.mutate()}
                disabled={step1Mutation.isPending}
                className="w-full"
                data-testid="button-run-step1"
              >
                {step1Mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Run Step 1 Matching
              </Button>
              
              {step1Mutation.isPending && (
                <div className="flex items-center justify-center p-8 mt-4">
                  <div className="text-center">
                    <Loader2 className="w-12 h-12 mx-auto mb-3 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Analyzing skill overlap...</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">
                  {step1Results.length} candidates found
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">
                    {selectedCandidates.size} selected
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => step1Mutation.mutate()}
                    disabled={step1Mutation.isPending}
                    data-testid="button-rerun-step1"
                  >
                    Re-run Step 1
                  </Button>
                </div>
              </div>

              {step1Results.map((candidate) => (
                <Card
                  key={candidate.resumeId}
                  className="p-4 cursor-pointer hover:border-primary transition-colors"
                  onClick={() => handleToggleCandidate(candidate.resumeId)}
                  data-testid={`card-candidate-${candidate.resumeId}`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedCandidates.has(candidate.resumeId)}
                      onCheckedChange={() => handleToggleCandidate(candidate.resumeId)}
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
                        <p className="text-xs text-muted-foreground mb-2">
                          {candidate.location}
                        </p>
                      )}

                      <div className="space-y-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Must-have: </span>
                          <span className="text-foreground font-medium">
                            {candidate.mustHaveMatches}/{candidate.mustHaveRequired}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Nice-to-have: </span>
                          <span className="text-foreground font-medium">
                            {candidate.niceToHaveMatches}/{candidate.niceToHaveTotal}
                          </span>
                        </div>
                      </div>

                      {candidate.matchedSkills.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-muted-foreground mb-1">Matched Skills:</p>
                          <div className="flex flex-wrap gap-1">
                            {candidate.matchedSkills.slice(0, 5).map((skill, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                                {skill}
                              </Badge>
                            ))}
                            {candidate.matchedSkills.length > 5 && (
                              <Badge variant="outline" className="text-xs">
                                +{candidate.matchedSkills.length - 5} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {candidate.missingSkills.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-muted-foreground mb-1">Missing Skills:</p>
                          <div className="flex flex-wrap gap-1">
                            {candidate.missingSkills.slice(0, 3).map((skill, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
                                {skill}
                              </Badge>
                            ))}
                            {candidate.missingSkills.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{candidate.missingSkills.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Step 2 Section */}
        {step1Results && step1Results.length > 0 && (
          <>
            <Separator className="my-6" />
            
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-semibold text-foreground mb-1">Step 2: AI Deep Analysis</h4>
                  <p className="text-sm text-muted-foreground">
                    Contextual analysis with GPT-4 for selected candidates
                  </p>
                </div>
              </div>

              <Button
                onClick={handleRunStep2}
                disabled={step2Mutation.isPending || selectedCandidates.size === 0}
                className="w-full mb-4"
                data-testid="button-run-step2"
              >
                {step2Mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Sparkles className="w-4 h-4 mr-2" />
                Analyze {selectedCandidates.size} Selected Candidate{selectedCandidates.size !== 1 ? 's' : ''}
              </Button>

              {step2Mutation.isPending && (
                <div className="flex items-center justify-center p-8">
                  <div className="text-center">
                    <Loader2 className="w-12 h-12 mx-auto mb-3 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Running AI deep analysis...</p>
                    <p className="text-xs text-muted-foreground mt-1">This may take a few moments</p>
                  </div>
                </div>
              )}

              {!step2Mutation.isPending && !step2Results && selectedCandidates.size > 0 && (
                <div className="text-center p-8 border-2 border-dashed border-border rounded-lg">
                  <Sparkles className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    Select candidates above and click "Analyze" to run AI deep matching
                  </p>
                </div>
              )}

              {step2Results && step2Results.length > 0 && (
                <div className="space-y-4">
                  {step2Results.map((analysis) => (
                    <Card key={analysis.resumeId} className="p-4" data-testid={`card-ai-analysis-${analysis.resumeId}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h5 className="font-semibold text-foreground mb-1">
                            {analysis.candidateName}
                          </h5>
                          <div className="flex items-center gap-2">
                            <Award className="w-4 h-4 text-primary" />
                            <span className="text-2xl font-bold text-primary">
                              {analysis.matchScore}
                            </span>
                            <span className="text-sm text-muted-foreground">/100</span>
                          </div>
                        </div>
                        <Progress value={analysis.confidence * 100} className="w-20 h-2" />
                      </div>

                      <p className="text-sm text-foreground mb-3 leading-relaxed">
                        {analysis.summary}
                      </p>

                      {analysis.strengths.length > 0 && (
                        <div className="mb-3">
                          <div className="flex items-center gap-1 mb-2">
                            <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                            <span className="text-xs font-semibold text-green-600 dark:text-green-400">Strengths</span>
                          </div>
                          <ul className="space-y-1">
                            {analysis.strengths.map((strength, idx) => (
                              <li key={idx} className="text-xs text-foreground flex items-start gap-2">
                                <span className="text-green-600 dark:text-green-400 mt-0.5">•</span>
                                <span className="flex-1">{strength}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {analysis.concerns.length > 0 && (
                        <div className="mb-3">
                          <div className="flex items-center gap-1 mb-2">
                            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Concerns</span>
                          </div>
                          <ul className="space-y-1">
                            {analysis.concerns.map((concern, idx) => (
                              <li key={idx} className="text-xs text-foreground flex items-start gap-2">
                                <span className="text-amber-600 dark:text-amber-400 mt-0.5">•</span>
                                <span className="flex-1">{concern}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {analysis.evidence.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <p className="text-xs font-semibold text-muted-foreground mb-2">Evidence:</p>
                          <div className="space-y-1">
                            {analysis.evidence.slice(0, 2).map((quote, idx) => (
                              <p key={idx} className="text-xs text-muted-foreground italic pl-3 border-l-2 border-muted">
                                "{quote}"
                              </p>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          Confidence: {Math.round(analysis.confidence * 100)}%
                        </span>
                        <Button variant="link" size="sm" className="text-xs h-auto p-0">
                          View Full Profile →
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
