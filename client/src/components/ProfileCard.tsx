import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapPin, Clock, DollarSign, Mail, Phone, Sparkles, Loader2, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Resume } from "@shared/schema";

interface MatchResult {
  resumeId: string;
  candidateName: string;
  overlapScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  mustHaveMatches: number;
  mustHaveRequired: number;
  niceToHaveMatches: number;
  niceToHaveTotal: number;
}

interface AIAnalysisResult {
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

interface ProfileCardProps {
  resume: Resume;
  onViewProfile: (resumeId: string) => void;
  matchResult?: MatchResult;
  hasJobSelected?: boolean;
  selectedJobId?: string;
  sessionId?: string | null;
}

export default function ProfileCard({ resume, onViewProfile, matchResult, hasJobSelected, selectedJobId, sessionId }: ProfileCardProps) {
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiResult, setAIResult] = useState<AIAnalysisResult | null>(null);
  const [aiError, setAIError] = useState<string | null>(null);
  
  const resumeCard = resume.resumeCard as any;
  
  // Mutation for Step 2 AI analysis
  const aiMutation = useMutation({
    mutationFn: async () => {
      if (!selectedJobId) throw new Error('No job selected');
      const payload: { profileIds: string[]; sessionId?: string } = {
        profileIds: [resume.id],
      };
      if (sessionId) {
        payload.sessionId = sessionId;
      }
      const response = await apiRequest('POST', `/api/jobs/${selectedJobId}/match/step2`, payload);
      return response.json();
    },
    onSuccess: (data) => {
      setAIError(null);
      if (data.results && data.results.length > 0) {
        setAIResult(data.results[0]);
        setShowAIModal(true);
      } else {
        setAIError('No analysis results returned');
      }
    },
    onError: (error) => {
      console.error('AI analysis failed:', error);
      setAIError(error instanceof Error ? error.message : 'AI analysis failed');
    },
  });
  
  // Extract key information
  const name = resumeCard?.personal_info?.name || "Unknown";
  const title = resumeCard?.personal_info?.title || "No title";
  const location = resumeCard?.personal_info?.location || "Location not specified";
  const summary = resumeCard?.professional_summary || "";
  const availability = resumeCard?.availability?.status || resumeCard?.availability?.commitment || "Available now";
  
  // Format rate
  const rate = resumeCard?.rate;
  const rateDisplay = rate?.amount 
    ? `${rate.amount} ${rate.currency || 'USD'}/${rate.unit || 'hr'}`
    : "Rate not specified";
  
  // Get all skills (combine technical and soft skills)
  const technicalSkills = resumeCard?.technical_skills?.map((s: any) => 
    typeof s === 'string' ? s : s.skill
  ) || [];
  const softSkills = resumeCard?.soft_skills || [];
  const allSkills = resumeCard?.all_skills || [...technicalSkills, ...softSkills];
  
  // Display max 5 skills on card
  const displaySkills = allSkills.slice(0, 5);
  const remainingSkills = allSkills.length - displaySkills.length;
  
  // Truncate summary to ~150 characters
  const truncatedSummary = summary.length > 150 
    ? summary.substring(0, 150) + "..." 
    : summary;
  
  // Use actual match result if available, otherwise show placeholder or hide
  const matchPercent = matchResult?.overlapScore ?? null;

  return (
    <Card 
      className="h-full flex flex-col hover:shadow-lg transition-shadow duration-200"
      data-testid={`card-profile-${resume.id}`}
    >
      <CardContent className="p-6 flex flex-col flex-1">
        {/* Header: Name, Title, Match */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-foreground" data-testid={`text-name-${resume.id}`}>
              {name}
            </h3>
            <p className="text-sm text-muted-foreground" data-testid={`text-title-${resume.id}`}>
              {title}
            </p>
          </div>
          {matchPercent !== null && (
            <div className="ml-2">
              <Badge variant={matchPercent >= 70 ? "default" : "secondary"} className="text-xs">
                {matchPercent}% match
              </Badge>
            </div>
          )}
        </div>

        {/* Job Match Score Bar - only show when a job is selected */}
        {hasJobSelected && (
          <div className="mb-4">
            <div className="text-xs text-muted-foreground mb-1">Job Match Score</div>
            <div className="w-full bg-secondary rounded-full h-2">
              {matchPercent !== null ? (
                <div 
                  className="bg-primary rounded-full h-2 transition-all duration-300"
                  style={{ width: `${matchPercent}%` }}
                />
              ) : (
                <div className="text-xs text-muted-foreground">No match data</div>
              )}
            </div>
          </div>
        )}

        {/* Summary */}
        {truncatedSummary && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
            {truncatedSummary}
          </p>
        )}

        {/* Key Info */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="truncate">{location}</span>
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <Clock className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="truncate">{availability}</span>
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <DollarSign className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="truncate">{rateDisplay}</span>
          </div>
        </div>

        {/* Skills Tags */}
        {displaySkills.length > 0 && (
          <div className="mb-4 flex-1">
            <div className="flex flex-wrap gap-1.5">
              {displaySkills.map((skill: string, index: number) => (
                <Badge 
                  key={index} 
                  variant="outline" 
                  className="text-xs px-2 py-0.5"
                >
                  {skill}
                </Badge>
              ))}
              {remainingSkills > 0 && (
                <Badge variant="outline" className="text-xs px-2 py-0.5">
                  +{remainingSkills} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* AI Error display */}
        {aiError && (
          <div className="mb-2 p-2 text-xs text-destructive bg-destructive/10 rounded">
            {aiError}
          </div>
        )}

        {/* Actions */}
        <div className="mt-auto pt-4 flex gap-2">
          <Button 
            className="flex-1"
            onClick={() => onViewProfile(resume.id)}
            data-testid={`button-view-profile-${resume.id}`}
          >
            View Full Profile
          </Button>
          {hasJobSelected && matchResult && (
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => {
                setAIError(null);
                aiMutation.mutate();
              }}
              disabled={aiMutation.isPending}
              title="Run AI Analysis"
              data-testid={`button-ai-analysis-${resume.id}`}
            >
              {aiMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
            </Button>
          )}
          <Button 
            variant="outline" 
            size="icon"
            data-testid={`button-contact-${resume.id}`}
          >
            <Mail className="w-4 h-4" />
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            data-testid={`button-phone-${resume.id}`}
          >
            <Phone className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>

      {/* AI Analysis Modal */}
      <Dialog open={showAIModal} onOpenChange={setShowAIModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI Analysis: {name}
            </DialogTitle>
          </DialogHeader>
          
          {aiResult && (
            <div className="space-y-4">
              {/* Match Score */}
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">AI Match Score</p>
                  <p className="text-3xl font-bold text-foreground">{aiResult.matchScore}%</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Confidence</p>
                  <p className="text-lg font-semibold text-foreground">{Math.round(aiResult.confidence * 100)}%</p>
                </div>
              </div>

              {/* Summary */}
              <div>
                <h4 className="font-semibold text-foreground mb-2">Summary</h4>
                <p className="text-sm text-muted-foreground">{aiResult.summary}</p>
              </div>

              {/* Strengths */}
              {aiResult.strengths.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <h4 className="font-semibold text-foreground">Strengths</h4>
                  </div>
                  <ul className="space-y-1">
                    {aiResult.strengths.map((strength, idx) => (
                      <li key={idx} className="text-sm text-foreground flex items-start gap-2">
                        <span className="text-green-600 dark:text-green-400 mt-0.5">•</span>
                        <span>{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Concerns */}
              {aiResult.concerns.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <h4 className="font-semibold text-foreground">Concerns</h4>
                  </div>
                  <ul className="space-y-1">
                    {aiResult.concerns.map((concern, idx) => (
                      <li key={idx} className="text-sm text-foreground flex items-start gap-2">
                        <span className="text-amber-600 dark:text-amber-400 mt-0.5">•</span>
                        <span>{concern}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Evidence */}
              {aiResult.evidence.length > 0 && (
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Evidence</h4>
                  <div className="space-y-3">
                    {aiResult.evidence.map((item, idx) => (
                      <div key={idx} className="p-3 bg-muted/50 rounded-lg space-y-2">
                        <Badge variant="outline" className="text-xs">{item.category}</Badge>
                        <p className="text-xs text-muted-foreground italic pl-3 border-l-2 border-primary/30">
                          Job: "{item.jobQuote}"
                        </p>
                        <p className="text-xs text-muted-foreground italic pl-3 border-l-2 border-green-500/30">
                          Resume: "{item.resumeQuote}"
                        </p>
                        <p className="text-sm text-foreground pl-3">
                          {item.assessment}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
