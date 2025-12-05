import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Briefcase, 
  MapPin, 
  Building2, 
  User, 
  Sparkles, 
  Loader2, 
  Copy,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  Target,
  ClipboardList,
  Mail,
  Download,
  Gauge,
  Eye,
  Image,
  FileDown
} from "lucide-react";
import type { Job, Resume, TailoringOptions } from "@shared/schema";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { TailoringOptionsPanel } from "./TailoringOptionsPanel";
import { CvPreview } from "./CvPreview";
import { CV_TEMPLATES, TEMPLATE_OPTIONS, getTemplateWithLogo, type CvTemplateId, type CvTemplateConfig } from "@shared/cvTemplates";

interface JobSnapshotPanelProps {
  job: Job;
}

export function JobSnapshotPanel({ job }: JobSnapshotPanelProps) {
  const jobCard = job.jobCard as any;
  const basics = jobCard?.basics || {};
  const requirements = jobCard?.requirements || {};
  
  const mustHave = requirements.must_have || [];
  const niceToHave = requirements.nice_to_have || [];
  const technicalSkills = requirements.technical_skills || [];
  const softSkills = requirements.soft_skills || [];

  return (
    <Card className="h-full" data-testid="panel-job-snapshot">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">Target Job</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-semibold text-foreground" data-testid="text-job-title">
            {basics.title || 'Untitled Position'}
          </h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
            {basics.company && (
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {basics.company}
              </span>
            )}
            {basics.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {basics.location}
              </span>
            )}
          </div>
        </div>

        {basics.seniority && (
          <Badge variant="secondary" className="text-xs">
            {basics.seniority}
          </Badge>
        )}

        {jobCard?.overview && (
          <div>
            <h4 className="text-xs font-medium text-muted-foreground uppercase mb-1">Overview</h4>
            <p className="text-sm text-foreground line-clamp-3">
              {jobCard.overview}
            </p>
          </div>
        )}

        {mustHave.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">Must Have</h4>
            <div className="flex flex-wrap gap-1.5">
              {mustHave.slice(0, 6).map((skill: string, idx: number) => (
                <Badge key={idx} variant="default" className="text-xs px-2 py-0.5">
                  {skill}
                </Badge>
              ))}
              {mustHave.length > 6 && (
                <Badge variant="outline" className="text-xs px-2 py-0.5">
                  +{mustHave.length - 6} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {niceToHave.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">Nice to Have</h4>
            <div className="flex flex-wrap gap-1.5">
              {niceToHave.slice(0, 4).map((skill: string, idx: number) => (
                <Badge key={idx} variant="secondary" className="text-xs px-2 py-0.5">
                  {skill}
                </Badge>
              ))}
              {niceToHave.length > 4 && (
                <Badge variant="outline" className="text-xs px-2 py-0.5">
                  +{niceToHave.length - 4} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {(technicalSkills.length > 0 || softSkills.length > 0) && (
          <div>
            <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">Skills</h4>
            <div className="flex flex-wrap gap-1.5">
              {technicalSkills.slice(0, 5).map((skill: string, idx: number) => (
                <Badge key={`tech-${idx}`} variant="outline" className="text-xs px-2 py-0.5 border-blue-500/50">
                  {skill}
                </Badge>
              ))}
              {softSkills.slice(0, 3).map((skill: string, idx: number) => (
                <Badge key={`soft-${idx}`} variant="outline" className="text-xs px-2 py-0.5 border-green-500/50">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface CandidatePanelProps {
  resume: Resume;
  options: TailoringOptions;
  onOptionsChange: (options: TailoringOptions) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

export function CandidatePanel({ 
  resume, 
  options,
  onOptionsChange,
  onGenerate,
  isGenerating
}: CandidatePanelProps) {
  const resumeCard = resume.resumeCard as any;
  const personalInfo = resumeCard?.personal_info || resumeCard?.contact || {};
  const summary = resumeCard?.professional_summary || '';
  
  const name = personalInfo.name || 'Unknown Candidate';
  const title = personalInfo.title || '';
  const location = personalInfo.location || '';
  
  const technicalSkills = resumeCard?.technical_skills?.map((s: any) => 
    typeof s === 'string' ? s : s.skill
  ) || [];
  const allSkills = resumeCard?.all_skills || technicalSkills;
  const displaySkills = allSkills.slice(0, 8);

  return (
    <Card className="h-full flex flex-col" data-testid="panel-candidate">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">Candidate</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full px-6 pb-6">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-foreground" data-testid="text-candidate-name">
                {name}
              </h3>
              {title && (
                <p className="text-sm text-muted-foreground">{title}</p>
              )}
              {location && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3" />
                  {location}
                </p>
              )}
            </div>

            {summary && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase mb-1">Summary</h4>
                <p className="text-sm text-foreground line-clamp-3">
                  {summary}
                </p>
              </div>
            )}

            {displaySkills.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">Top Skills</h4>
                <div className="flex flex-wrap gap-1.5">
                  {displaySkills.map((skill: string, idx: number) => (
                    <Badge key={idx} variant="secondary" className="text-xs px-2 py-0.5">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-border pt-4 space-y-3">
              <h4 className="text-sm font-medium text-foreground">Tailoring Options</h4>
              
              <TailoringOptionsPanel 
                options={options}
                onChange={onOptionsChange}
              />

              <Button 
                className="w-full" 
                onClick={onGenerate} 
                disabled={isGenerating}
                data-testid="button-generate"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Tailoring...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Tailored Resume
                  </>
                )}
              </Button>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

interface CoverageItem {
  jd_item?: string;
  resume_evidence?: string;
  resume_ref?: string;
  requirement?: string;
  evidence?: string;
  source_section?: string;
  confidence?: number;
  notes?: string;
}

export interface SectionAlignment {
  score: number;
  level: 'low' | 'medium' | 'high';
  comment: string;
}

export interface AlignmentSummary {
  overallScore: number;
  overallComment: string;
  summary?: SectionAlignment;
  skills?: SectionAlignment;
  experience?: SectionAlignment;
}

export interface TailoredResumeBundle {
  tailored_resume: {
    meta?: {
      name?: string;
      title?: string;
      target_title?: string;
      target_company?: string;
      language?: string;
      style?: string;
      narrative_voice?: string;
      tone_intensity?: number;
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
  cover_letter?: {
    content: string;
    meta: {
      language: string;
      tone: string;
      voice: string;
      focus: string;
      word_count: number;
    };
  };
  coverage: CoverageItem[] | {
    matrix?: CoverageItem[];
    coverage_score?: number;
  };
  diff: {
    added?: string[];
    removed?: string[];
    reordered?: string[];
    rephrased?: Array<string | { original: string; new: string }>;
  };
  warnings: Array<string | { severity?: string; message: string; path?: string }>;
  ats_report: {
    keyword_coverage?: number | string[];
    missing_keywords?: string[];
    format_warnings?: string[];
    recommendations?: string[];
  };
  rationales?: {
    summary?: { short: string; detailed?: string };
    skills?: { short: string; detailed?: string };
    experiences?: Array<{
      employer: string;
      title: string;
      rationale: { short: string; detailed?: string };
    }>;
  };
  alignment?: AlignmentSummary;
}

export type TailorOutputTab = 'resume' | 'letter' | 'coverage' | 'ats' | 'preview';

interface TailoredOutputPanelProps {
  bundle: TailoredResumeBundle | null;
  isLoading: boolean;
  errors: string[] | null;
  candidateName: string;
  jobTitle: string;
  activeTab?: TailorOutputTab;
  onTabChange?: (tab: TailorOutputTab) => void;
  selectedTemplateId?: CvTemplateId;
  onTemplateChange?: (id: CvTemplateId) => void;
  logoUrl?: string;
  onLogoUrlChange?: (url: string) => void;
}

function getLevelColor(level: 'low' | 'medium' | 'high'): string {
  switch (level) {
    case 'high': return 'text-green-600 dark:text-green-400';
    case 'medium': return 'text-amber-600 dark:text-amber-400';
    case 'low': return 'text-red-600 dark:text-red-400';
  }
}

function getLevelBgColor(level: 'low' | 'medium' | 'high'): string {
  switch (level) {
    case 'high': return 'bg-green-500/10 border-green-500/20';
    case 'medium': return 'bg-amber-500/10 border-amber-500/20';
    case 'low': return 'bg-red-500/10 border-red-500/20';
  }
}

function scoreToLevel(score: number): 'low' | 'medium' | 'high' {
  if (score >= 75) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
}

function AlignmentHeader({ alignment }: { alignment?: AlignmentSummary }) {
  if (!alignment) return null;
  
  const level = scoreToLevel(alignment.overallScore);
  const levelText = level === 'high' ? 'High alignment' : level === 'medium' ? 'Medium alignment' : 'Low alignment';
  
  return (
    <div 
      className={`p-4 rounded-lg border ${getLevelBgColor(level)} mb-4`}
      data-testid="alignment-header"
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Gauge className={`w-5 h-5 ${getLevelColor(level)}`} />
          <span className="font-medium text-foreground">Job Alignment</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xl font-bold ${getLevelColor(level)}`} data-testid="alignment-score">
            {alignment.overallScore}
          </span>
          <span className="text-muted-foreground">/ 100</span>
          <Badge variant="outline" className={`ml-2 ${getLevelColor(level)} border-current`}>
            {levelText}
          </Badge>
        </div>
      </div>
      {alignment.overallComment && (
        <p className="text-sm text-muted-foreground mt-2" data-testid="alignment-comment">
          {alignment.overallComment}
        </p>
      )}
    </div>
  );
}

function SectionAlignmentBadge({ section }: { section?: SectionAlignment }) {
  if (!section) return null;
  
  return (
    <span 
      className={`inline-flex items-center gap-1 text-xs ${getLevelColor(section.level)}`}
      title={section.comment}
      data-testid="section-alignment"
    >
      <span className="capitalize">{section.level}</span>
      <span className="text-muted-foreground">({section.score}/100)</span>
    </span>
  );
}

export function TailoredOutputPanel({ 
  bundle, 
  isLoading, 
  errors, 
  candidateName, 
  jobTitle,
  activeTab: externalActiveTab,
  onTabChange,
  selectedTemplateId: externalTemplateId,
  onTemplateChange,
  logoUrl: externalLogoUrl,
  onLogoUrlChange
}: TailoredOutputPanelProps) {
  const { toast } = useToast();
  const [internalActiveTab, setInternalActiveTab] = useState<TailorOutputTab>('resume');
  const [isExporting, setIsExporting] = useState(false);
  const [internalTemplateId, setInternalTemplateId] = useState<CvTemplateId>('classic');
  const [internalLogoUrl, setInternalLogoUrl] = useState<string>('');
  
  const activeTab = externalActiveTab ?? internalActiveTab;
  const setActiveTab = (tab: TailorOutputTab) => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalActiveTab(tab);
    }
  };
  
  const selectedTemplateId = externalTemplateId ?? internalTemplateId;
  const setSelectedTemplateId = (id: CvTemplateId) => {
    if (onTemplateChange) {
      onTemplateChange(id);
    } else {
      setInternalTemplateId(id);
    }
  };
  
  const logoUrl = externalLogoUrl ?? internalLogoUrl;
  const setLogoUrl = (url: string) => {
    if (onLogoUrlChange) {
      onLogoUrlChange(url);
    } else {
      setInternalLogoUrl(url);
    }
  };
  
  const currentTemplate = getTemplateWithLogo(selectedTemplateId, logoUrl || undefined);

  const getResumeText = () => {
    if (!bundle) return '';
    
    const resume = bundle.tailored_resume;
    let text = '';
    
    if (resume.meta?.name) text += `${resume.meta.name}\n`;
    if (resume.meta?.title) text += `${resume.meta.title}\n`;
    text += '\n';
    
    if (resume.summary) {
      text += `PROFESSIONAL SUMMARY\n${resume.summary}\n\n`;
    }
    
    const skills = getSkillsArray(resume.skills);
    if (skills.length > 0) {
      text += `SKILLS\n${skills.join(', ')}\n\n`;
    }
    
    if (resume.experience && resume.experience.length > 0) {
      text += 'EXPERIENCE\n';
      for (const exp of resume.experience) {
        text += `${exp.title || ''} at ${exp.company || exp.employer || ''}\n`;
        const bullets = exp.bullets || exp.description || [];
        for (const bullet of bullets) {
          text += `• ${bullet}\n`;
        }
        text += '\n';
      }
    }
    
    if (resume.education && resume.education.length > 0) {
      text += 'EDUCATION\n';
      for (const edu of resume.education) {
        text += `${edu.degree} - ${edu.institution}`;
        if (edu.year) text += ` (${edu.year})`;
        text += '\n';
      }
    }
    
    return text;
  };

  const handleCopy = async () => {
    const text = activeTab === 'letter' && bundle?.cover_letter 
      ? bundle.cover_letter.content 
      : getResumeText();
    
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: activeTab === 'letter' ? "Cover letter copied to clipboard" : "Tailored resume copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleExportPdf = async (type: 'resume' | 'cover' | 'ats') => {
    if (!bundle) return;
    
    setIsExporting(true);
    try {
      const response = await fetch('/api/tailor/export-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          candidateName,
          jobTitle,
          bundle,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate PDF');
      }
      
      const blob = await response.blob();
      const safeName = candidateName.replace(/\s+/g, '_');
      const safeJob = jobTitle.replace(/\s+/g, '_');
      const filename = `${safeName}_${safeJob}_${type}.pdf`;
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      
      toast({ 
        title: "PDF Exported!", 
        description: `Downloaded ${type === 'resume' ? 'tailored resume' : type === 'cover' ? 'cover letter' : 'ATS report'} as PDF` 
      });
    } catch (err) {
      console.error('PDF export error:', err);
      toast({ 
        title: "Export Failed", 
        description: err instanceof Error ? err.message : 'Could not generate PDF',
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportCv = async (format: 'pdf' | 'docx') => {
    if (!bundle) return;
    
    setIsExporting(true);
    try {
      const response = await fetch('/api/tailor/export-cv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resume: bundle.tailored_resume,
          templateId: selectedTemplateId,
          logoUrl: logoUrl || undefined,
          format,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to generate ${format.toUpperCase()}`);
      }
      
      const blob = await response.blob();
      const safeName = candidateName.replace(/\s+/g, '-');
      const safeJob = jobTitle.replace(/\s+/g, '-');
      const ext = format === 'pdf' ? 'pdf' : 'docx';
      const filename = `${safeName}-${safeJob}-Futodama-CV.${ext}`;
      
      downloadBlob(blob, filename);
      
      toast({ 
        title: `${format.toUpperCase()} Exported!`, 
        description: `Downloaded CV as ${format.toUpperCase()}` 
      });
    } catch (err) {
      console.error(`${format} export error:`, err);
      toast({ 
        title: "Export Failed", 
        description: err instanceof Error ? err.message : `Could not generate ${format.toUpperCase()}`,
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const getSkillsArray = (skills: TailoredResumeBundle['tailored_resume']['skills']): string[] => {
    if (!skills) return [];
    if (Array.isArray(skills)) return skills;
    const allSkills: string[] = [];
    if (skills.core) allSkills.push(...skills.core);
    if (skills.tools) allSkills.push(...skills.tools);
    if (skills.methodologies) allSkills.push(...skills.methodologies);
    if (skills.languages) allSkills.push(...skills.languages);
    return allSkills;
  };

  const getCoverageItems = (): CoverageItem[] => {
    if (!bundle?.coverage) return [];
    if (Array.isArray(bundle.coverage)) return bundle.coverage;
    return bundle.coverage.matrix || [];
  };

  const getCoverageScore = (): number | undefined => {
    if (!bundle?.coverage) return undefined;
    if (Array.isArray(bundle.coverage)) return undefined;
    return bundle.coverage.coverage_score;
  };

  if (isLoading) {
    return (
      <Card className="h-full" data-testid="panel-output">
        <CardContent className="h-full flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
            <p className="text-lg font-medium text-foreground">Tailoring resume...</p>
            <p className="text-sm text-muted-foreground mt-1">
              Analyzing {candidateName}'s profile
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (errors && errors.length > 0) {
    return (
      <Card className="h-full" data-testid="panel-output">
        <CardContent className="h-full flex items-center justify-center">
          <div className="text-center max-w-md">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <p className="text-lg font-medium text-foreground mb-2">
              We couldn't generate a tailored resume
            </p>
            <div className="text-sm text-muted-foreground space-y-1">
              {errors.map((err, idx) => (
                <p key={idx}>{err}</p>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!bundle) {
    return (
      <Card className="h-full" data-testid="panel-output">
        <CardContent className="h-full flex items-center justify-center">
          <div className="text-center max-w-sm">
            <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium text-foreground">
              Ready to tailor
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Select your options and click "Generate Tailored Resume" to see results here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const resume = bundle.tailored_resume;
  const skills = getSkillsArray(resume.skills);
  const coverageItems = getCoverageItems();
  const coverageScore = getCoverageScore();

  return (
    <Card className="h-full flex flex-col" data-testid="panel-output">
      <CardHeader className="pb-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Tailored Output</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy} data-testid="button-copy">
              <Copy className="w-4 h-4 mr-1" />
              Copy
            </Button>
            <div className="relative group">
              <Button variant="outline" size="sm" disabled={isExporting} data-testid="button-export">
                {isExporting ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-1" />
                )}
                Export PDF
              </Button>
              <div className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 min-w-[140px]">
                <button 
                  onClick={() => handleExportPdf('resume')} 
                  className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                  data-testid="export-resume-pdf"
                  disabled={isExporting}
                >
                  <FileText className="w-3 h-3" />
                  Resume PDF
                </button>
                {bundle?.cover_letter && (
                  <button 
                    onClick={() => handleExportPdf('cover')} 
                    className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                    data-testid="export-cover-pdf"
                    disabled={isExporting}
                  >
                    <Mail className="w-3 h-3" />
                    Cover Letter PDF
                  </button>
                )}
                <button 
                  onClick={() => handleExportPdf('ats')} 
                  className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                  data-testid="export-ats-pdf"
                  disabled={isExporting}
                >
                  <ClipboardList className="w-3 h-3" />
                  ATS Report PDF
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex gap-1 mt-2 flex-wrap">
          <Button
            variant={activeTab === 'resume' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('resume')}
            className="text-xs h-7"
            data-testid="tab-resume"
          >
            <FileText className="w-3 h-3 mr-1" />
            Resume
          </Button>
          {bundle?.cover_letter && (
            <Button
              variant={activeTab === 'letter' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('letter')}
              className="text-xs h-7"
              data-testid="tab-letter"
            >
              <Mail className="w-3 h-3 mr-1" />
              Letter
            </Button>
          )}
          <Button
            variant={activeTab === 'coverage' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('coverage')}
            className="text-xs h-7"
            data-testid="tab-coverage"
          >
            <Target className="w-3 h-3 mr-1" />
            Coverage
          </Button>
          <Button
            variant={activeTab === 'ats' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('ats')}
            className="text-xs h-7"
            data-testid="tab-ats"
          >
            <ClipboardList className="w-3 h-3 mr-1" />
            ATS
          </Button>
          <Button
            variant={activeTab === 'preview' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('preview')}
            className={`text-xs h-7 ${!bundle ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={!bundle}
            data-testid="tab-preview"
          >
            <Eye className="w-3 h-3 mr-1" />
            Preview
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full px-6 pb-6">
          {activeTab === 'resume' && (
            <div className="space-y-4 pt-2">
              <AlignmentHeader alignment={bundle.alignment} />
              
              {resume.meta && (
                <div>
                  <h3 className="font-semibold text-foreground">
                    {resume.meta.name || candidateName}
                  </h3>
                  {resume.meta.title && (
                    <p className="text-sm text-muted-foreground">{resume.meta.title}</p>
                  )}
                </div>
              )}

              {resume.summary && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase">Summary</h4>
                    <SectionAlignmentBadge section={bundle.alignment?.summary} />
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{resume.summary}</p>
                  {bundle.alignment?.summary?.comment && (
                    <p className="text-xs text-muted-foreground mt-1 italic">{bundle.alignment.summary.comment}</p>
                  )}
                </div>
              )}

              {skills.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase">Skills</h4>
                    <SectionAlignmentBadge section={bundle.alignment?.skills} />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {skills.map((skill, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                  {bundle.alignment?.skills?.comment && (
                    <p className="text-xs text-muted-foreground mt-2 italic">{bundle.alignment.skills.comment}</p>
                  )}
                </div>
              )}

              {resume.experience && resume.experience.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase">Experience</h4>
                    <SectionAlignmentBadge section={bundle.alignment?.experience} />
                  </div>
                  {bundle.alignment?.experience?.comment && (
                    <p className="text-xs text-muted-foreground mb-2 italic">{bundle.alignment.experience.comment}</p>
                  )}
                  <div className="space-y-4">
                    {resume.experience.map((exp, idx) => (
                      <div key={idx} className="border-l-2 border-primary/30 pl-3">
                        <h5 className="font-medium text-sm">{exp.title}</h5>
                        <p className="text-xs text-muted-foreground">
                          {exp.company || exp.employer}
                          {exp.dates && ` • ${exp.dates}`}
                          {!exp.dates && exp.start_date && (
                            ` • ${exp.start_date}${exp.end_date ? ` - ${exp.end_date}` : (exp.is_current ? ' - Present' : '')}`
                          )}
                        </p>
                        {(exp.bullets || exp.description) && (
                          <ul className="mt-1 space-y-0.5 text-xs text-foreground">
                            {(exp.bullets || exp.description || []).slice(0, 4).map((bullet, bidx) => (
                              <li key={bidx} className="flex items-start gap-1">
                                <span className="text-primary mt-0.5">•</span>
                                <span>{bullet}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {resume.education && resume.education.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">Education</h4>
                  <div className="space-y-2">
                    {resume.education.map((edu, idx) => (
                      <div key={idx}>
                        <p className="text-sm font-medium">{edu.degree}</p>
                        <p className="text-xs text-muted-foreground">
                          {edu.institution}{edu.year && ` • ${edu.year}`}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'letter' && bundle?.cover_letter && (
            <div className="space-y-4 pt-2">
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-foreground">Cover Letter</h4>
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {bundle.cover_letter.meta.word_count} words
                    </Badge>
                    <Badge variant="outline" className="text-xs capitalize">
                      {bundle.cover_letter.meta.focus}
                    </Badge>
                  </div>
                </div>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {bundle.cover_letter.content.split('\n\n').map((paragraph, idx) => (
                    <p key={idx} className="text-sm text-foreground leading-relaxed mb-3">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">Settings:</span>{' '}
                {bundle.cover_letter.meta.language.toUpperCase()} | {bundle.cover_letter.meta.tone} tone | {bundle.cover_letter.meta.voice.replace('_', ' ')} voice
              </div>
            </div>
          )}

          {activeTab === 'coverage' && (
            <div className="space-y-3 pt-2">
              {coverageScore !== undefined && (
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <Target className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium">Overall Coverage:</span>
                  <Badge variant="default">{Math.round(coverageScore * 100)}%</Badge>
                </div>
              )}
              
              {coverageItems.length > 0 ? (
                <div className="space-y-2">
                  {coverageItems.map((item, idx) => (
                    <div 
                      key={idx} 
                      className="p-3 border border-border rounded-lg"
                      data-testid={`coverage-item-${idx}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {(item.confidence ?? 0) >= 0.8 ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                            ) : (item.confidence ?? 0) >= 0.5 ? (
                              <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                            )}
                            <span className="text-sm font-medium truncate">
                              {item.jd_item || item.requirement || 'Requirement'}
                            </span>
                          </div>
                          {(item.resume_evidence || item.evidence) && (
                            <p className="text-xs text-muted-foreground ml-6 line-clamp-2">
                              {item.resume_evidence || item.evidence}
                            </p>
                          )}
                        </div>
                        <Badge 
                          variant={(item.confidence ?? 0) >= 0.8 ? "default" : "secondary"}
                          className="flex-shrink-0"
                        >
                          {Math.round((item.confidence ?? 0) * 100)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No coverage data available
                </p>
              )}
            </div>
          )}

          {activeTab === 'ats' && (
            <div className="space-y-4 pt-2">
              {bundle.ats_report && (
                <>
                  {bundle.ats_report.missing_keywords && bundle.ats_report.missing_keywords.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">Missing Keywords</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {bundle.ats_report.missing_keywords.map((keyword, idx) => (
                          <Badge key={idx} variant="destructive" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {bundle.ats_report.format_warnings && bundle.ats_report.format_warnings.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">Format Warnings</h4>
                      <ul className="space-y-1">
                        {bundle.ats_report.format_warnings.map((warning, idx) => (
                          <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                            <AlertTriangle className="w-3 h-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                            {warning}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {bundle.ats_report.recommendations && bundle.ats_report.recommendations.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">Recommendations</h4>
                      <ul className="space-y-1">
                        {bundle.ats_report.recommendations.map((rec, idx) => (
                          <li key={idx} className="text-xs text-foreground flex items-start gap-2">
                            <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {!bundle.ats_report.missing_keywords?.length && 
                   !bundle.ats_report.format_warnings?.length && 
                   !bundle.ats_report.recommendations?.length && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No ATS report data available
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="space-y-4 pt-2">
              <div className="flex flex-wrap items-end gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex-1 min-w-[150px]">
                  <Label htmlFor="template-select" className="text-xs text-muted-foreground mb-1 block">
                    Template
                  </Label>
                  <Select 
                    value={selectedTemplateId} 
                    onValueChange={(value) => setSelectedTemplateId(value as CvTemplateId)}
                  >
                    <SelectTrigger id="template-select" className="h-9" data-testid="select-template">
                      <SelectValue placeholder="Select template" />
                    </SelectTrigger>
                    <SelectContent>
                      {TEMPLATE_OPTIONS.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex-1 min-w-[200px]">
                  <Label htmlFor="logo-url" className="text-xs text-muted-foreground mb-1 block">
                    Logo URL (optional)
                  </Label>
                  <div className="flex gap-2">
                    <Input 
                      id="logo-url"
                      placeholder="https://example.com/logo.png"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      className="h-9 text-sm"
                      data-testid="input-logo-url"
                    />
                    {logoUrl && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setLogoUrl('')}
                        className="h-9 px-2"
                        data-testid="button-clear-logo"
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExportCv('pdf')}
                    disabled={isExporting}
                    className="h-9"
                    data-testid="button-export-cv-pdf"
                  >
                    {isExporting ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <FileDown className="w-4 h-4 mr-1" />
                    )}
                    PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExportCv('docx')}
                    disabled={isExporting}
                    className="h-9"
                    data-testid="button-export-cv-docx"
                  >
                    {isExporting ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <FileDown className="w-4 h-4 mr-1" />
                    )}
                    Word
                  </Button>
                </div>
              </div>

              <CvPreview 
                bundle={bundle} 
                template={currentTemplate}
                candidateName={candidateName}
              />
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
