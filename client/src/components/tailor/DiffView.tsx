import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, Minus, FileText, Briefcase, User, GraduationCap } from "lucide-react";
import { 
  diffText, 
  diffSkills, 
  matchExperienceEntries, 
  diffBullets,
  type DiffToken,
  type ExperienceEntry,
  type BulletDiff,
} from "@/lib/diffUtils";

interface ResumeCard {
  personal_info?: {
    name?: string;
    title?: string;
  };
  professional_summary?: string;
  work_experience?: Array<{
    title: string;
    company: string;
    location?: string;
    start_date?: string;
    end_date?: string;
    current?: boolean;
    description?: string;
    achievements?: string[];
  }>;
  technical_skills?: Array<{ skill: string; proficiency?: number }>;
  soft_skills?: string[];
  all_skills?: string[];
  education?: Array<{
    degree: string;
    institution: string;
    location?: string;
    graduation_date?: string;
  }>;
}

interface TailoredResume {
  meta?: {
    language?: string;
    style?: string;
    narrative_voice?: string;
    target_title?: string;
    target_company?: string;
  };
  summary?: string;
  skills?: {
    core?: string[];
    tools?: string[];
    methodologies?: string[];
    languages?: string[];
  };
  experience?: Array<{
    employer: string;
    title: string;
    location?: string;
    start_date?: string;
    end_date?: string;
    is_current?: boolean;
    description: string[];
  }>;
  education?: Array<{
    institution: string;
    degree: string;
    year?: string;
    details?: string;
  }>;
  certifications?: string[];
}

interface TailoredBundle {
  tailored_resume: TailoredResume;
}

interface DiffViewProps {
  originalResume: ResumeCard;
  tailoredBundle: TailoredBundle;
  candidateName: string;
  jobTitle: string;
  onBack: () => void;
}

function DiffTokenRenderer({ tokens }: { tokens: DiffToken[] }) {
  return (
    <span>
      {tokens.map((token, i) => {
        if (token.type === "added") {
          return (
            <span 
              key={i} 
              className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 font-medium px-0.5 rounded"
              data-testid={`diff-token-added-${i}`}
            >
              {token.text}
            </span>
          );
        } else if (token.type === "removed") {
          return (
            <span 
              key={i} 
              className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 line-through opacity-70"
              data-testid={`diff-token-removed-${i}`}
            >
              {token.text}
            </span>
          );
        } else {
          return <span key={i}>{token.text}</span>;
        }
      })}
    </span>
  );
}

function SummaryDiffSection({ 
  originalSummary, 
  tailoredSummary 
}: { 
  originalSummary: string; 
  tailoredSummary: string; 
}) {
  const tokens = diffText(originalSummary, tailoredSummary);
  
  const leftTokens = tokens.filter(t => t.type !== "added");
  const rightTokens = tokens.filter(t => t.type !== "removed");

  return (
    <Card className="mb-6" data-testid="diff-section-summary">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">Professional Summary</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Original</h4>
            <div className="p-4 bg-muted/30 rounded-lg text-sm leading-relaxed border border-border">
              {originalSummary ? (
                <DiffTokenRenderer tokens={leftTokens} />
              ) : (
                <span className="text-muted-foreground italic">No summary available</span>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Tailored</h4>
            <div className="p-4 bg-muted/30 rounded-lg text-sm leading-relaxed border border-border">
              {tailoredSummary ? (
                <DiffTokenRenderer tokens={rightTokens} />
              ) : (
                <span className="text-muted-foreground italic">No summary generated</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SkillsDiffSection({ 
  originalSkills, 
  tailoredSkills 
}: { 
  originalSkills: string[]; 
  tailoredSkills: string[]; 
}) {
  const { intersection, added, removed } = diffSkills(originalSkills, tailoredSkills);

  return (
    <Card className="mb-6" data-testid="diff-section-skills">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">Skills</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Original</h4>
            <div className="p-4 bg-muted/30 rounded-lg border border-border">
              <div className="flex flex-wrap gap-2">
                {intersection.map((skill, i) => (
                  <span 
                    key={`int-${i}`} 
                    className="px-2 py-1 bg-background rounded text-sm border border-border"
                  >
                    {skill}
                  </span>
                ))}
                {removed.map((skill, i) => (
                  <span 
                    key={`rem-${i}`} 
                    className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded text-sm border border-red-200 dark:border-red-800 flex items-center gap-1"
                    data-testid={`skill-removed-${i}`}
                  >
                    <Minus className="w-3 h-3" />
                    {skill}
                  </span>
                ))}
                {originalSkills.length === 0 && (
                  <span className="text-muted-foreground italic text-sm">No skills listed</span>
                )}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Tailored</h4>
            <div className="p-4 bg-muted/30 rounded-lg border border-border">
              <div className="flex flex-wrap gap-2">
                {intersection.map((skill, i) => (
                  <span 
                    key={`int-${i}`} 
                    className="px-2 py-1 bg-background rounded text-sm border border-border"
                  >
                    {skill}
                  </span>
                ))}
                {added.map((skill, i) => (
                  <span 
                    key={`add-${i}`} 
                    className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-sm border border-green-200 dark:border-green-800 flex items-center gap-1"
                    data-testid={`skill-added-${i}`}
                  >
                    <Plus className="w-3 h-3" />
                    {skill}
                  </span>
                ))}
                {tailoredSkills.length === 0 && (
                  <span className="text-muted-foreground italic text-sm">No skills in tailored version</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BulletDiffRenderer({ 
  bulletDiffs, 
  side 
}: { 
  bulletDiffs: BulletDiff[]; 
  side: "original" | "tailored"; 
}) {
  return (
    <ul className="space-y-2">
      {bulletDiffs.map((bd, i) => {
        if (bd.type === "matched") {
          const tokens = bd.diff || [];
          const filteredTokens = side === "original" 
            ? tokens.filter(t => t.type !== "added")
            : tokens.filter(t => t.type !== "removed");
          
          return (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="text-muted-foreground mt-1">•</span>
              <span className="flex-1">
                <DiffTokenRenderer tokens={filteredTokens} />
              </span>
            </li>
          );
        } else if (bd.type === "removed" && side === "original") {
          return (
            <li key={i} className="flex items-start gap-2 text-sm" data-testid={`bullet-removed-${i}`}>
              <span className="inline-flex items-center justify-center w-4 h-4 bg-red-100 dark:bg-red-900/30 rounded text-red-600 dark:text-red-400 mt-0.5">
                <Minus className="w-3 h-3" />
              </span>
              <span className="flex-1 text-red-700 dark:text-red-400 line-through opacity-70">
                {bd.originalBullet}
              </span>
            </li>
          );
        } else if (bd.type === "added" && side === "tailored") {
          return (
            <li key={i} className="flex items-start gap-2 text-sm" data-testid={`bullet-added-${i}`}>
              <span className="inline-flex items-center justify-center w-4 h-4 bg-green-100 dark:bg-green-900/30 rounded text-green-600 dark:text-green-400 mt-0.5">
                <Plus className="w-3 h-3" />
              </span>
              <span className="flex-1 text-green-700 dark:text-green-400 font-medium">
                {bd.tailoredBullet}
              </span>
            </li>
          );
        }
        return null;
      })}
    </ul>
  );
}

function ExperienceDiffSection({ 
  originalExperience, 
  tailoredExperience 
}: { 
  originalExperience: ExperienceEntry[]; 
  tailoredExperience: ExperienceEntry[]; 
}) {
  const pairs = matchExperienceEntries(originalExperience, tailoredExperience);

  return (
    <Card className="mb-6" data-testid="diff-section-experience">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">Work Experience</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {pairs.length === 0 ? (
          <p className="text-muted-foreground italic">No experience entries to compare</p>
        ) : (
          <div className="space-y-6">
            {pairs.map((pair, pairIdx) => {
              const orig = pair.original;
              const tail = pair.tailored;
              const bulletDiffs = diffBullets(
                orig?.bullets || [],
                tail?.bullets || []
              );

              const title = orig?.title || tail?.title || "";
              const company = orig?.company || tail?.company || "";
              const dateRange = orig 
                ? `${orig.startDate || ""} – ${orig.isCurrent ? "Present" : orig.endDate || ""}`
                : `${tail?.startDate || ""} – ${tail?.isCurrent ? "Present" : tail?.endDate || ""}`;

              return (
                <div 
                  key={pairIdx} 
                  className="border border-border rounded-lg overflow-hidden"
                  data-testid={`experience-pair-${pairIdx}`}
                >
                  <div className="bg-muted/50 px-4 py-2 border-b border-border">
                    <h4 className="font-semibold">{title} — {company}</h4>
                    <p className="text-sm text-muted-foreground">{dateRange}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                    <div className="p-4 border-r border-border">
                      <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Original</h5>
                      {orig ? (
                        <BulletDiffRenderer bulletDiffs={bulletDiffs} side="original" />
                      ) : (
                        <p className="text-sm text-muted-foreground italic flex items-center gap-2">
                          <Plus className="w-4 h-4 text-green-600" />
                          New position added
                        </p>
                      )}
                    </div>
                    <div className="p-4">
                      <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Tailored</h5>
                      {tail ? (
                        <BulletDiffRenderer bulletDiffs={bulletDiffs} side="tailored" />
                      ) : (
                        <p className="text-sm text-muted-foreground italic flex items-center gap-2">
                          <Minus className="w-4 h-4 text-red-600" />
                          Position removed
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EducationDiffSection({ 
  originalEducation, 
  tailoredEducation 
}: { 
  originalEducation: Array<{ degree: string; institution: string; graduation_date?: string }>;
  tailoredEducation: Array<{ degree: string; institution: string; year?: string }>;
}) {
  return (
    <Card className="mb-6" data-testid="diff-section-education">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">Education</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Original</h4>
            <div className="p-4 bg-muted/30 rounded-lg border border-border space-y-3">
              {originalEducation.length > 0 ? (
                originalEducation.map((edu, i) => (
                  <div key={i}>
                    <p className="font-medium text-sm">{edu.degree}</p>
                    <p className="text-sm text-muted-foreground">{edu.institution} {edu.graduation_date ? `(${edu.graduation_date})` : ""}</p>
                  </div>
                ))
              ) : (
                <span className="text-muted-foreground italic text-sm">No education listed</span>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Tailored</h4>
            <div className="p-4 bg-muted/30 rounded-lg border border-border space-y-3">
              {tailoredEducation.length > 0 ? (
                tailoredEducation.map((edu, i) => (
                  <div key={i}>
                    <p className="font-medium text-sm">{edu.degree}</p>
                    <p className="text-sm text-muted-foreground">{edu.institution} {edu.year ? `(${edu.year})` : ""}</p>
                  </div>
                ))
              ) : (
                <span className="text-muted-foreground italic text-sm">No education in tailored version</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DiffView({ 
  originalResume, 
  tailoredBundle, 
  candidateName, 
  jobTitle, 
  onBack 
}: DiffViewProps) {
  const tailored = tailoredBundle.tailored_resume;
  
  const originalSummary = originalResume.professional_summary || "";
  const tailoredSummary = tailored?.summary || "";
  
  const originalSkills: string[] = [];
  if (originalResume.all_skills) {
    originalSkills.push(...originalResume.all_skills);
  } else {
    if (originalResume.technical_skills) {
      originalSkills.push(...originalResume.technical_skills.map(s => s.skill));
    }
    if (originalResume.soft_skills) {
      originalSkills.push(...originalResume.soft_skills);
    }
  }
  
  const tailoredSkills: string[] = [];
  if (tailored?.skills) {
    if (tailored.skills.core) tailoredSkills.push(...tailored.skills.core);
    if (tailored.skills.tools) tailoredSkills.push(...tailored.skills.tools);
    if (tailored.skills.methodologies) tailoredSkills.push(...tailored.skills.methodologies);
    if (tailored.skills.languages) tailoredSkills.push(...tailored.skills.languages);
  }
  
  const originalExperience: ExperienceEntry[] = (originalResume.work_experience || []).map(exp => ({
    title: exp.title,
    company: exp.company,
    startDate: exp.start_date,
    endDate: exp.end_date,
    isCurrent: exp.current,
    bullets: [...(exp.achievements || []), ...(exp.description ? [exp.description] : [])],
  }));
  
  const tailoredExperience: ExperienceEntry[] = (tailored?.experience || []).map(exp => ({
    title: exp.title,
    company: exp.employer,
    startDate: exp.start_date,
    endDate: exp.end_date,
    isCurrent: exp.is_current,
    bullets: exp.description || [],
  }));

  const originalEducation = originalResume.education || [];
  const tailoredEducation = tailored?.education || [];

  return (
    <div className="min-h-screen bg-background flex flex-col" data-testid="view-diff">
      <header className="border-b border-border bg-card sticky top-0 z-10 flex-shrink-0">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                data-testid="button-back-to-tailoring"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Tailoring
              </Button>
              <div className="border-l border-border pl-4">
                <h1 className="text-lg font-semibold text-foreground">Before/After Diff</h1>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">{candidateName}</span> → <span className="font-medium">{jobTitle}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <SummaryDiffSection 
            originalSummary={originalSummary} 
            tailoredSummary={tailoredSummary} 
          />
          
          <SkillsDiffSection 
            originalSkills={originalSkills} 
            tailoredSkills={tailoredSkills} 
          />
          
          <ExperienceDiffSection 
            originalExperience={originalExperience} 
            tailoredExperience={tailoredExperience} 
          />

          <EducationDiffSection 
            originalEducation={originalEducation} 
            tailoredEducation={tailoredEducation} 
          />
        </div>
      </main>
    </div>
  );
}
