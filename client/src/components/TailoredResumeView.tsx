import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowLeft, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  FileWarning,
  Target,
  Diff,
  ClipboardList
} from "lucide-react";

// Warning can be either a string or an object with severity/message/path
type WarningItem = string | {
  severity?: "info" | "warn" | "error";
  message: string;
  path?: string;
};

// Coverage item can come in different formats from the backend
interface CoverageItem {
  // New format from backend
  jd_item?: string;
  resume_evidence?: string;
  resume_ref?: string;
  // Old format
  requirement?: string;
  evidence?: string;
  source_section?: string;
  // Common
  confidence?: number;
  notes?: string;
}

// Rephrased item can be string or object
type RephrasedItem = string | { original: string; new: string };

interface TailoredResumeBundle {
  tailored_resume: {
    meta?: {
      name?: string;
      title?: string;
      target_title?: string;
      target_company?: string;
      language?: string;
      style?: string;
      contact?: Record<string, string>;
    };
    summary?: string;
    skills?: string[] | {
      core?: string[];
      tools?: string[];
      methodologies?: string[];
      languages?: string[];
    };
    experience?: Array<{
      company?: string;
      employer?: string;
      title?: string;
      dates?: string;
      start_date?: string;
      end_date?: string;
      is_current?: boolean;
      location?: string;
      bullets?: string[];
      description?: string[];
      evidence_links?: string[];
    }>;
    education?: Array<{
      institution?: string;
      degree?: string;
      year?: string;
      details?: string;
    }>;
    certifications?: string[];
    extras?: string[];
  };
  coverage: CoverageItem[] | {
    matrix?: CoverageItem[];
    coverage_score?: number;
  };
  diff: {
    added?: string[];
    removed?: string[];
    reordered?: string[];
    rephrased?: RephrasedItem[];
  };
  warnings: WarningItem[];
  ats_report: {
    keyword_coverage?: number | string[];
    missing_keywords?: string[];
    format_warnings?: string[];
    recommendations?: string[];
  };
}

interface TailoredResumeViewProps {
  bundle: TailoredResumeBundle;
  jobTitle: string;
  candidateName: string;
  onBack: () => void;
}

export default function TailoredResumeView({ 
  bundle, 
  jobTitle, 
  candidateName, 
  onBack 
}: TailoredResumeViewProps) {
  const [activeTab, setActiveTab] = useState("resume");

  // Defensive extraction with defaults
  const tailored_resume = bundle?.tailored_resume || {};
  const diff = bundle?.diff || {};
  const rawWarnings = bundle?.warnings || [];
  const ats_report = bundle?.ats_report || {};

  // Normalize coverage - handle both array and {matrix, coverage_score} formats
  const coverageItems: CoverageItem[] = Array.isArray(bundle?.coverage) 
    ? bundle.coverage 
    : (bundle?.coverage?.matrix || []);
  const coverageScore = !Array.isArray(bundle?.coverage) 
    ? bundle?.coverage?.coverage_score 
    : undefined;

  // Normalize warnings to always be an array of objects with message
  const warnings: WarningItem[] = rawWarnings;
  const warningCount = warnings.length;

  // Helper to get warning message text
  const getWarningText = (warning: WarningItem): string => {
    if (typeof warning === 'string') return warning;
    return warning.message || 'Unknown warning';
  };

  // Helper to get warning severity
  const getWarningSeverity = (warning: WarningItem): string => {
    if (typeof warning === 'string') return 'warn';
    return warning.severity || 'warn';
  };

  // Helper to normalize coverage item fields
  const getCoverageRequirement = (item: CoverageItem): string => {
    return item.jd_item || item.requirement || 'Unknown requirement';
  };
  
  const getCoverageEvidence = (item: CoverageItem): string | undefined => {
    return item.resume_evidence || item.evidence;
  };
  
  const getCoverageSource = (item: CoverageItem): string | undefined => {
    return item.resume_ref || item.source_section;
  };

  // Helper to normalize skills - can be array or object with categories
  const getSkillsArray = (): string[] => {
    const skills = tailored_resume?.skills;
    if (!skills) return [];
    if (Array.isArray(skills)) return skills;
    // It's an object with categories
    const allSkills: string[] = [];
    if (skills.core) allSkills.push(...skills.core);
    if (skills.tools) allSkills.push(...skills.tools);
    if (skills.methodologies) allSkills.push(...skills.methodologies);
    if (skills.languages) allSkills.push(...skills.languages);
    return allSkills;
  };

  // Helper to get experience array with normalized fields
  const getExperience = () => {
    return (tailored_resume?.experience || []).map(exp => ({
      title: exp.title || '',
      company: exp.company || exp.employer || '',
      dates: exp.dates || (exp.start_date ? `${exp.start_date}${exp.end_date ? ` - ${exp.end_date}` : (exp.is_current ? ' - Present' : '')}` : ''),
      bullets: exp.bullets || exp.description || []
    }));
  };

  // Normalize rephrased items
  const getRephrasedItems = (): Array<{ original: string; new: string }> => {
    const rephrased = diff?.rephrased || [];
    return rephrased.map(item => {
      if (typeof item === 'string') {
        return { original: '', new: item };
      }
      return item;
    });
  };

  // Get ATS keyword coverage as a number percentage
  const getKeywordCoveragePercent = (): number | undefined => {
    const kc = ats_report?.keyword_coverage;
    if (typeof kc === 'number') return kc;
    if (Array.isArray(kc)) {
      // If it's an array, calculate coverage relative to missing
      const covered = kc.length;
      const missing = (ats_report?.missing_keywords || []).length;
      const total = covered + missing;
      return total > 0 ? Math.round((covered / total) * 100) : 0;
    }
    return undefined;
  };

  // Helper to identify which skill indices are most relevant
  // The AI tailoring agent already reorders skills by relevance, so the first N skills are most relevant
  const getTopRelevantSkillIndices = (): Set<number> => {
    const skillCount = getSkillsArray().length;
    const topCount = Math.min(7, Math.max(1, Math.ceil(skillCount * 0.4))); // Top 40% of skills, max 7, min 1
    const indices = new Set<number>();
    for (let i = 0; i < topCount; i++) {
      indices.add(i);
    }
    return indices;
  };

  // Helper to identify which experience bullet indices are high-relevance
  // The AI tailoring agent already reorders bullets by relevance, so the first 2-3 bullets per job are most relevant
  const getRelevantBulletIndices = (): Map<number, Set<number>> => {
    const relevantBullets = new Map<number, Set<number>>();
    const experience = getExperience();
    
    experience.forEach((exp, expIdx) => {
      const bulletCount = exp.bullets.length;
      // Mark first 2-3 bullets as most relevant, depending on total count
      const topBulletsCount = bulletCount <= 3 ? Math.min(2, bulletCount) : 3;
      
      const topBulletIndices = new Set<number>();
      for (let i = 0; i < topBulletsCount; i++) {
        topBulletIndices.add(i);
      }
      
      if (topBulletIndices.size > 0) {
        relevantBullets.set(expIdx, topBulletIndices);
      }
    });
    
    return relevantBullets;
  };

  const topRelevantSkillIndices = getTopRelevantSkillIndices();
  const relevantBulletIndices = getRelevantBulletIndices();

  return (
    <div className="flex flex-col h-full" data-testid="tailored-resume-view">
      {/* Header */}
      <div className="flex items-center gap-4 pb-4 border-b border-border mb-4">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onBack}
          data-testid="button-back-to-profile"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Profile
        </Button>
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            Tailored Resume for {candidateName}
          </h2>
          <p className="text-sm text-muted-foreground">
            Optimized for: {jobTitle}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start mb-4">
          <TabsTrigger value="resume" className="gap-2" data-testid="tab-tailored-resume">
            <FileText className="w-4 h-4" />
            Tailored Resume
          </TabsTrigger>
          <TabsTrigger value="coverage" className="gap-2" data-testid="tab-coverage">
            <Target className="w-4 h-4" />
            Coverage Matrix
          </TabsTrigger>
          <TabsTrigger value="diff" className="gap-2" data-testid="tab-diff">
            <Diff className="w-4 h-4" />
            Changes
          </TabsTrigger>
          <TabsTrigger value="ats" className="gap-2" data-testid="tab-ats">
            <ClipboardList className="w-4 h-4" />
            ATS Report
          </TabsTrigger>
          {warningCount > 0 && (
            <TabsTrigger value="warnings" className="gap-2" data-testid="tab-warnings">
              <AlertTriangle className="w-4 h-4" />
              Warnings ({warningCount})
            </TabsTrigger>
          )}
        </TabsList>

        <ScrollArea className="flex-1">
          {/* Tailored Resume Tab */}
          <TabsContent value="resume" className="m-0">
            <div className="space-y-6">
              {/* Header */}
              {tailored_resume?.meta && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      {tailored_resume.meta.name || candidateName}
                    </CardTitle>
                    {tailored_resume.meta.title && (
                      <p className="text-muted-foreground">{tailored_resume.meta.title}</p>
                    )}
                  </CardHeader>
                  {tailored_resume.meta.contact && Object.keys(tailored_resume.meta.contact).length > 0 && (
                    <CardContent>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        {Object.entries(tailored_resume.meta.contact).map(([key, value]) => (
                          <span key={key}>{value}</span>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              )}

              {/* Summary */}
              {tailored_resume?.summary && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Professional Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {tailored_resume.summary.split('\n\n').map((paragraph, idx) => (
                        <p key={idx} className="text-foreground leading-relaxed">
                          {paragraph.trim()}
                        </p>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Skills */}
              {getSkillsArray().length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Skills</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {getSkillsArray().map((skill, idx) => (
                        <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                          {topRelevantSkillIndices.has(idx) && <span className="text-yellow-500">⭐</span>}
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Experience */}
              {getExperience().length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Experience</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {getExperience().map((exp, idx) => (
                      <div key={idx} className="border-l-2 border-primary pl-4">
                        <h4 className="font-semibold">{exp.title}</h4>
                        <p className="text-muted-foreground">{exp.company}</p>
                        {exp.dates && <p className="text-sm text-muted-foreground">{exp.dates}</p>}
                        {exp.bullets && exp.bullets.length > 0 && (
                          <ul className="mt-2 space-y-1 list-none text-sm">
                            {exp.bullets.map((bullet, bidx) => {
                              const isRelevant = relevantBulletIndices.get(idx)?.has(bidx);
                              return (
                                <li key={bidx} className="flex items-start gap-2">
                                  {isRelevant && <span className="text-green-500 flex-shrink-0 mt-0.5">✓</span>}
                                  <span className={isRelevant ? '' : 'ml-5'}>{bullet}</span>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Education */}
              {tailored_resume?.education && tailored_resume.education.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Education</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {tailored_resume.education.map((edu, idx) => (
                      <div key={idx}>
                        <h4 className="font-semibold">{edu.degree}</h4>
                        <p className="text-muted-foreground">{edu.institution}</p>
                        {edu.year && <p className="text-sm text-muted-foreground">{edu.year}</p>}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Coverage Matrix Tab */}
          <TabsContent value="coverage" className="m-0">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Requirement Coverage
                  {coverageScore !== undefined && (
                    <Badge variant="outline" className="ml-2">
                      {Math.round(coverageScore * 100)}% overall
                    </Badge>
                  )}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  How well the resume addresses each job requirement
                </p>
              </CardHeader>
              <CardContent>
                {coverageItems && coverageItems.length > 0 ? (
                  <div className="space-y-4">
                    {coverageItems.map((item, idx) => (
                      <div 
                        key={idx} 
                        className="p-4 border border-border rounded-lg"
                        data-testid={`coverage-item-${idx}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {(item.confidence ?? 0) >= 0.8 ? (
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                              ) : (item.confidence ?? 0) >= 0.5 ? (
                                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                              ) : (
                                <FileWarning className="w-4 h-4 text-red-500" />
                              )}
                              <span className="font-medium">{getCoverageRequirement(item)}</span>
                            </div>
                            {getCoverageEvidence(item) && (
                              <p className="text-sm text-muted-foreground ml-6">
                                Evidence: {getCoverageEvidence(item)}
                              </p>
                            )}
                            {getCoverageSource(item) && (
                              <p className="text-xs text-muted-foreground ml-6 mt-1">
                                Source: {getCoverageSource(item)}
                              </p>
                            )}
                            {item.notes && (
                              <p className="text-xs text-muted-foreground ml-6 mt-1 italic">
                                {item.notes}
                              </p>
                            )}
                          </div>
                          <Badge 
                            variant={(item.confidence ?? 0) >= 0.8 ? "default" : "secondary"}
                          >
                            {Math.round((item.confidence ?? 0) * 100)}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No coverage data available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Diff Tab */}
          <TabsContent value="diff" className="m-0">
            <div className="space-y-4">
              {/* Added */}
              {diff?.added && diff.added.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg text-green-500">Added</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {diff.added.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-green-500">+</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Removed */}
              {diff?.removed && diff.removed.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg text-red-500">Removed</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {diff.removed.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-red-500">-</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Reordered */}
              {diff?.reordered && diff.reordered.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg text-blue-500">Reordered</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {diff.reordered.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-blue-500">↕</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Rephrased */}
              {getRephrasedItems().length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg text-purple-500">Rephrased</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {getRephrasedItems().map((item, idx) => (
                        <div key={idx} className="space-y-2">
                          {item.original && (
                            <p className="text-muted-foreground line-through">{item.original}</p>
                          )}
                          <p className="text-foreground">{item.new}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {(!diff || (
                (!diff.added || diff.added.length === 0) &&
                (!diff.removed || diff.removed.length === 0) &&
                (!diff.reordered || diff.reordered.length === 0) &&
                (getRephrasedItems().length === 0)
              )) && (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No changes recorded
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* ATS Report Tab */}
          <TabsContent value="ats" className="m-0">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="w-5 h-5" />
                  ATS Compatibility Report
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Keyword Coverage */}
                {getKeywordCoveragePercent() !== undefined && (
                  <div>
                    <h4 className="font-medium mb-2">Keyword Coverage</h4>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${getKeywordCoveragePercent()}%` }}
                        />
                      </div>
                      <span className="font-semibold">{getKeywordCoveragePercent()}%</span>
                    </div>
                  </div>
                )}

                {/* Keywords Covered (if array format) */}
                {Array.isArray(ats_report?.keyword_coverage) && ats_report.keyword_coverage.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Keywords Covered</h4>
                    <div className="flex flex-wrap gap-2">
                      {ats_report.keyword_coverage.map((kw, idx) => (
                        <Badge key={idx} variant="default" className="bg-green-600">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          {kw}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Missing Keywords */}
                {ats_report?.missing_keywords && ats_report.missing_keywords.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Missing Keywords</h4>
                    <div className="flex flex-wrap gap-2">
                      {ats_report.missing_keywords.map((kw, idx) => (
                        <Badge key={idx} variant="secondary" className="text-orange-500">
                          {kw}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Format Warnings */}
                {ats_report?.format_warnings && ats_report.format_warnings.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Format Warnings</h4>
                    <ul className="space-y-2">
                      {ats_report.format_warnings.map((warning, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-yellow-500">
                          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>{warning}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommendations */}
                {ats_report?.recommendations && ats_report.recommendations.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Recommendations</h4>
                    <ul className="space-y-2">
                      {ats_report.recommendations.map((rec, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-500" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {(!ats_report || (
                  getKeywordCoveragePercent() === undefined &&
                  (!ats_report.missing_keywords || ats_report.missing_keywords.length === 0) &&
                  (!ats_report.format_warnings || ats_report.format_warnings.length === 0) &&
                  (!ats_report.recommendations || ats_report.recommendations.length === 0)
                )) && (
                  <p className="text-muted-foreground">No ATS data available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Warnings Tab */}
          <TabsContent value="warnings" className="m-0">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-500">
                  <AlertTriangle className="w-5 h-5" />
                  Warnings
                </CardTitle>
              </CardHeader>
              <CardContent>
                {warningCount > 0 ? (
                  <ul className="space-y-3">
                    {warnings.map((warning, idx) => {
                      const severity = getWarningSeverity(warning);
                      const message = getWarningText(warning);
                      const path = typeof warning === 'object' ? warning.path : undefined;
                      
                      return (
                        <li key={idx} className="flex items-start gap-2">
                          <AlertTriangle 
                            className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                              severity === 'error' ? 'text-red-500' : 
                              severity === 'info' ? 'text-blue-500' : 
                              'text-yellow-500'
                            }`} 
                          />
                          <div>
                            <span className="text-foreground">{message}</span>
                            {path && (
                              <span className="text-xs text-muted-foreground block mt-1">
                                Field: {path}
                              </span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">No warnings</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
