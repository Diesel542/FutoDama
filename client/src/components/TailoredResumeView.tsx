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

interface TailoredResumeBundle {
  tailored_resume: {
    meta?: {
      name?: string;
      title?: string;
      contact?: Record<string, string>;
    };
    summary?: string;
    skills?: string[];
    experience?: Array<{
      company?: string;
      title?: string;
      dates?: string;
      bullets?: string[];
    }>;
    education?: Array<{
      institution?: string;
      degree?: string;
      year?: string;
    }>;
  };
  coverage: Array<{
    requirement?: string;
    evidence?: string;
    confidence?: number;
    source_section?: string;
  }>;
  diff: {
    added?: string[];
    removed?: string[];
    reordered?: string[];
    rephrased?: Array<{ original: string; new: string }>;
  };
  warnings: string[];
  ats_report: {
    keyword_coverage?: number;
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
  const coverage = bundle?.coverage || [];
  const diff = bundle?.diff || {};
  const warnings = bundle?.warnings || [];
  const ats_report = bundle?.ats_report || {};

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
          {warnings.length > 0 && (
            <TabsTrigger value="warnings" className="gap-2" data-testid="tab-warnings">
              <AlertTriangle className="w-4 h-4" />
              Warnings ({warnings.length})
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
                    <p className="text-foreground whitespace-pre-wrap">{tailored_resume.summary}</p>
                  </CardContent>
                </Card>
              )}

              {/* Skills */}
              {tailored_resume?.skills && tailored_resume.skills.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Skills</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {tailored_resume.skills.map((skill, idx) => (
                        <Badge key={idx} variant="secondary">{skill}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Experience */}
              {tailored_resume?.experience && tailored_resume.experience.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Experience</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {tailored_resume.experience.map((exp, idx) => (
                      <div key={idx} className="border-l-2 border-primary pl-4">
                        <h4 className="font-semibold">{exp.title}</h4>
                        <p className="text-muted-foreground">{exp.company}</p>
                        {exp.dates && <p className="text-sm text-muted-foreground">{exp.dates}</p>}
                        {exp.bullets && exp.bullets.length > 0 && (
                          <ul className="mt-2 space-y-1 list-disc list-inside text-sm">
                            {exp.bullets.map((bullet, bidx) => (
                              <li key={bidx}>{bullet}</li>
                            ))}
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
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  How well the resume addresses each job requirement
                </p>
              </CardHeader>
              <CardContent>
                {coverage && coverage.length > 0 ? (
                  <div className="space-y-4">
                    {coverage.map((item, idx) => (
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
                              <span className="font-medium">{item.requirement}</span>
                            </div>
                            {item.evidence && (
                              <p className="text-sm text-muted-foreground ml-6">
                                Evidence: {item.evidence}
                              </p>
                            )}
                            {item.source_section && (
                              <p className="text-xs text-muted-foreground ml-6 mt-1">
                                Source: {item.source_section}
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
              {diff?.rephrased && diff.rephrased.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg text-purple-500">Rephrased</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {diff.rephrased.map((item, idx) => (
                        <div key={idx} className="space-y-2">
                          <p className="text-muted-foreground line-through">{item.original}</p>
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
                (!diff.rephrased || diff.rephrased.length === 0)
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
                {ats_report?.keyword_coverage !== undefined && (
                  <div>
                    <h4 className="font-medium mb-2">Keyword Coverage</h4>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${ats_report.keyword_coverage}%` }}
                        />
                      </div>
                      <span className="font-semibold">{ats_report.keyword_coverage}%</span>
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
                  ats_report.keyword_coverage === undefined &&
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
                {warnings.length > 0 ? (
                  <ul className="space-y-3">
                    {warnings.map((warning, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-yellow-500" />
                        <span>{warning}</span>
                      </li>
                    ))}
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
