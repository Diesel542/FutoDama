import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ArrowLeft, ChevronDown, ChevronRight, FileText, Briefcase, User, GraduationCap, Info } from "lucide-react";
import { 
  diffText, 
  diffSkills, 
  matchExperienceEntries, 
  diffBullets,
  isSignificantChange,
  computeDiffStats,
  type DiffToken,
  type ExperienceEntry,
  type BulletDiff,
  type SkillsDiffResult,
  type DiffStats,
} from "@/lib/diffUtils";

type ViewMode = "key" | "all";

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

interface RationaleContent {
  short: string;
  detailed?: string;
}

interface TailorRationales {
  summary?: RationaleContent;
  skills?: RationaleContent;
  experiences?: Array<{
    employer: string;
    title: string;
    rationale: RationaleContent;
  }>;
}

interface TailoredBundle {
  tailored_resume: TailoredResume;
  rationales?: TailorRationales;
}

interface DiffViewProps {
  originalResume: ResumeCard;
  tailoredBundle: TailoredBundle;
  candidateName: string;
  jobTitle: string;
  onBack: () => void;
}

function SoftDiffTokenRenderer({ tokens, showDiff = true }: { tokens: DiffToken[]; showDiff?: boolean }) {
  if (!showDiff) {
    return <span>{tokens.map(t => t.text).join("")}</span>;
  }
  
  return (
    <span>
      {tokens.map((token, i) => {
        if (token.type === "added") {
          return (
            <span 
              key={i} 
              className="bg-blue-500/20 dark:bg-blue-400/20 rounded px-0.5"
              data-testid={`diff-token-added-${i}`}
            >
              {token.text}
            </span>
          );
        } else if (token.type === "removed") {
          return (
            <span 
              key={i} 
              className="text-stone-400 dark:text-stone-500 line-through decoration-1"
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

function ChangeSummaryBadge({ text }: { text: string }) {
  return (
    <span className="text-xs text-muted-foreground font-normal">
      {text}
    </span>
  );
}

function RationaleBox({ rationale }: { rationale?: RationaleContent }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!rationale || !rationale.short) return null;
  
  const hasDetailed = Boolean(rationale.detailed);
  
  return (
    <div 
      className="mt-4 p-3 bg-blue-500/5 dark:bg-blue-400/5 border border-blue-500/10 dark:border-blue-400/10 rounded-lg" 
      data-testid="rationale-box"
    >
      <div className="flex items-start gap-2">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-blue-600 dark:text-blue-400 text-xs font-medium">Why this changed</span>
          <Info className="w-3.5 h-3.5 text-gray-400" aria-hidden="true" />
        </div>
      </div>
      
      <p className="text-xs text-muted-foreground leading-relaxed mt-2">{rationale.short}</p>
      
      {hasDetailed && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500/50 rounded px-1 -ml-1"
            data-testid="rationale-toggle"
          >
            {isExpanded ? "Show less" : "Show more"}
          </button>
          
          <div 
            className={`overflow-hidden transition-all duration-200 ease-in-out ${
              isExpanded ? "max-h-96 opacity-100 mt-2" : "max-h-0 opacity-0"
            }`}
          >
            <div className="border-l-2 border-gray-600/30 dark:border-gray-500/30 pl-3">
              <p className="text-sm text-gray-400 dark:text-gray-300 leading-relaxed">
                {rationale.detailed}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DiffSection({ 
  title, 
  icon: Icon, 
  changeSummary, 
  defaultOpen = false,
  children 
}: { 
  title: string; 
  icon: React.ElementType;
  changeSummary: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <Card className="mb-4" data-testid={`diff-section-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isOpen ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
                <Icon className="w-5 h-5 text-primary" />
                <span className="text-lg font-semibold">{title}</span>
              </div>
              <ChangeSummaryBadge text={changeSummary} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {children}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function SummaryDiffContent({ 
  originalSummary, 
  tailoredSummary,
  viewMode,
  rationale,
}: { 
  originalSummary: string; 
  tailoredSummary: string;
  viewMode: ViewMode;
  rationale?: RationaleContent;
}) {
  const tokens = diffText(originalSummary, tailoredSummary);
  const isSignificant = isSignificantChange(originalSummary, tailoredSummary);
  const showDiff = viewMode === "all" || isSignificant;
  
  const leftTokens = tokens.filter(t => t.type !== "added");
  const rightTokens = tokens.filter(t => t.type !== "removed");

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Original</h4>
          <div className="p-4 bg-muted/20 rounded-lg text-sm leading-7 border border-border/50">
            {originalSummary ? (
              <SoftDiffTokenRenderer tokens={leftTokens} showDiff={showDiff} />
            ) : (
              <span className="text-muted-foreground italic">No summary available</span>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Tailored</h4>
          <div className="p-4 bg-muted/20 rounded-lg text-sm leading-7 border border-border/50">
            {tailoredSummary ? (
              <SoftDiffTokenRenderer tokens={rightTokens} showDiff={showDiff} />
            ) : (
              <span className="text-muted-foreground italic">No summary generated</span>
            )}
          </div>
        </div>
      </div>
      <RationaleBox rationale={rationale} />
    </div>
  );
}

function SkillsDiffContent({ 
  originalSkills, 
  tailoredSkills,
  skillsDiff,
  rationale,
}: { 
  originalSkills: string[]; 
  tailoredSkills: string[];
  skillsDiff: SkillsDiffResult;
  rationale?: RationaleContent;
}) {
  const { intersection, added, removed } = skillsDiff;

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Original Skills</h4>
          <div className="p-4 bg-muted/20 rounded-lg border border-border/50">
            <div className="flex flex-wrap gap-2 mb-3">
              {intersection.map((skill, i) => (
                <span 
                  key={`kept-${i}`} 
                  className="px-2.5 py-1 bg-background rounded-md text-sm border border-border"
                >
                  {skill}
                </span>
              ))}
            </div>
            {removed.length > 0 && (
              <div className="pt-3 border-t border-border/50">
                <p className="text-xs text-muted-foreground mb-2">De-emphasized</p>
                <div className="flex flex-wrap gap-2">
                  {removed.map((skill, i) => (
                    <span 
                      key={`rem-${i}`} 
                      className="px-2.5 py-1 bg-muted/50 text-muted-foreground rounded-md text-sm border border-border/50"
                      data-testid={`skill-removed-${i}`}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {originalSkills.length === 0 && (
              <span className="text-muted-foreground italic text-sm">No skills listed</span>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Tailored Skills</h4>
          <div className="p-4 bg-muted/20 rounded-lg border border-border/50">
            <div className="flex flex-wrap gap-2">
              {intersection.map((skill, i) => (
                <span 
                  key={`kept-${i}`} 
                  className="px-2.5 py-1 bg-background rounded-md text-sm border border-border"
                >
                  {skill}
                </span>
              ))}
              {added.map((skill, i) => (
                <span 
                  key={`add-${i}`} 
                  className="px-2.5 py-1 bg-green-500/5 dark:bg-green-400/5 rounded-md text-sm border border-green-500/20 dark:border-green-400/20 text-foreground flex items-center gap-1"
                  data-testid={`skill-added-${i}`}
                >
                  <span className="text-green-600/70 dark:text-green-500/70 text-xs font-medium">+</span>
                  {skill}
                </span>
              ))}
            </div>
            {tailoredSkills.length === 0 && (
              <span className="text-muted-foreground italic text-sm">No skills in tailored version</span>
            )}
          </div>
        </div>
      </div>
      <RationaleBox rationale={rationale} />
    </div>
  );
}

function BulletDiffRenderer({ 
  bulletDiffs, 
  side,
  viewMode,
}: { 
  bulletDiffs: BulletDiff[]; 
  side: "original" | "tailored";
  viewMode: ViewMode;
}) {
  return (
    <ul className="space-y-3">
      {bulletDiffs.map((bd, i) => {
        if (bd.type === "matched") {
          const tokens = bd.diff || [];
          const filteredTokens = side === "original" 
            ? tokens.filter(t => t.type !== "added")
            : tokens.filter(t => t.type !== "removed");
          
          const showDiff = viewMode === "all" || bd.isSignificant;
          
          return (
            <li key={i} className="flex items-start gap-2 text-sm leading-6">
              <span className="text-muted-foreground mt-0.5 shrink-0">•</span>
              <span className="flex-1">
                <SoftDiffTokenRenderer tokens={filteredTokens} showDiff={showDiff} />
              </span>
            </li>
          );
        } else if (bd.type === "removed" && side === "original") {
          return (
            <li key={i} className="flex items-start gap-2 text-sm leading-6" data-testid={`bullet-removed-${i}`}>
              <span className="text-stone-400 dark:text-stone-500 mt-0.5 shrink-0">–</span>
              <span className="flex-1 text-stone-400 dark:text-stone-500 line-through">
                {bd.originalBullet}
              </span>
            </li>
          );
        } else if (bd.type === "added" && side === "tailored") {
          return (
            <li key={i} className="flex items-start gap-2 text-sm leading-6" data-testid={`bullet-added-${i}`}>
              <span className="text-blue-500/70 dark:text-blue-400/70 mt-0.5 shrink-0 font-medium">+</span>
              <span className="flex-1 bg-blue-500/20 dark:bg-blue-400/20 rounded px-1 -mx-1">
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

function ExperienceRationaleBox({ rationale }: { rationale?: RationaleContent }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!rationale || !rationale.short) return null;
  
  const hasDetailed = Boolean(rationale.detailed);
  
  return (
    <div className="px-4 pb-4">
      <div className="p-2.5 bg-blue-500/5 dark:bg-blue-400/5 border border-blue-500/10 dark:border-blue-400/10 rounded-md">
        <div className="flex items-center gap-1.5">
          <span className="text-blue-600 dark:text-blue-400 text-xs font-medium">Why this changed</span>
          <Info className="w-3 h-3 text-gray-400" aria-hidden="true" />
        </div>
        
        <p className="text-xs text-muted-foreground leading-relaxed mt-1.5">{rationale.short}</p>
        
        {hasDetailed && (
          <div className="mt-1.5">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors"
              data-testid="experience-rationale-toggle"
            >
              {isExpanded ? "Show less" : "Show more"}
            </button>
            
            <div 
              className={`overflow-hidden transition-all duration-200 ease-in-out ${
                isExpanded ? "max-h-48 opacity-100 mt-1.5" : "max-h-0 opacity-0"
              }`}
            >
              <div className="border-l-2 border-gray-600/30 dark:border-gray-500/30 pl-2">
                <p className="text-xs text-gray-400 dark:text-gray-300 leading-relaxed">
                  {rationale.detailed}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ExperienceDiffContent({ 
  originalExperience, 
  tailoredExperience,
  viewMode,
  experienceRationales,
}: { 
  originalExperience: ExperienceEntry[]; 
  tailoredExperience: ExperienceEntry[];
  viewMode: ViewMode;
  experienceRationales?: TailorRationales['experiences'];
}) {
  const pairs = matchExperienceEntries(originalExperience, tailoredExperience);

  if (pairs.length === 0) {
    return <p className="text-muted-foreground italic">No experience entries to compare</p>;
  }

  const findRationale = (title: string, company: string): RationaleContent | undefined => {
    if (!experienceRationales) return undefined;
    return experienceRationales.find(
      r => r.title.toLowerCase() === title.toLowerCase() && 
           r.employer.toLowerCase() === company.toLowerCase()
    )?.rationale;
  };

  return (
    <div className="space-y-4">
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
        
        const rationale = findRationale(title, company);

        return (
          <div 
            key={pairIdx} 
            className="border border-border/50 rounded-lg overflow-hidden"
            data-testid={`experience-pair-${pairIdx}`}
          >
            <div className="bg-muted/30 px-4 py-2.5 border-b border-border/50">
              <h4 className="font-semibold text-sm">{title} — {company}</h4>
              <p className="text-xs text-muted-foreground">{dateRange}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
              <div className="p-4 md:border-r border-border/50">
                <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Original</h5>
                {orig ? (
                  <BulletDiffRenderer bulletDiffs={bulletDiffs} side="original" viewMode={viewMode} />
                ) : (
                  <p className="text-sm text-blue-500/70 dark:text-blue-400/70 italic">
                    + New position added
                  </p>
                )}
              </div>
              <div className="p-4 border-t md:border-t-0 border-border/50">
                <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Tailored</h5>
                {tail ? (
                  <BulletDiffRenderer bulletDiffs={bulletDiffs} side="tailored" viewMode={viewMode} />
                ) : (
                  <p className="text-sm text-muted-foreground/60 italic">
                    – Position removed
                  </p>
                )}
              </div>
            </div>
            
            <ExperienceRationaleBox rationale={rationale} />
          </div>
        );
      })}
    </div>
  );
}

function EducationDiffContent({ 
  originalEducation, 
  tailoredEducation 
}: { 
  originalEducation: Array<{ degree: string; institution: string; graduation_date?: string }>;
  tailoredEducation: Array<{ degree: string; institution: string; year?: string }>;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Original</h4>
        <div className="p-4 bg-muted/20 rounded-lg border border-border/50 space-y-3">
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
        <div className="p-4 bg-muted/20 rounded-lg border border-border/50 space-y-3">
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
  );
}

function formatChangeSummary(stats: DiffStats): {
  summary: string;
  skills: string;
  experience: string;
  education: string;
} {
  const summaryText = stats.summaryRewritten ? "1 rewrite" : "No changes";
  
  const skillParts: string[] = [];
  if (stats.skillsAdded > 0) skillParts.push(`${stats.skillsAdded} added`);
  if (stats.skillsDeEmphasized > 0) skillParts.push(`${stats.skillsDeEmphasized} de-emphasized`);
  const skillsText = skillParts.length > 0 ? skillParts.join(" • ") : "No changes";
  
  const expParts: string[] = [];
  if (stats.bulletsUpdated > 0) expParts.push(`${stats.bulletsUpdated} bullets updated`);
  if (stats.bulletsAdded > 0) expParts.push(`${stats.bulletsAdded} added`);
  if (stats.bulletsRemoved > 0) expParts.push(`${stats.bulletsRemoved} removed`);
  const experienceText = expParts.length > 0 ? expParts.join(" • ") : "No changes";
  
  return {
    summary: summaryText,
    skills: skillsText,
    experience: experienceText,
    education: "Side-by-side",
  };
}

function formatOverallSummary(stats: DiffStats): string {
  const parts: string[] = [];
  
  if (stats.summaryRewritten) parts.push("1 summary rewrite");
  if (stats.skillsAdded > 0) parts.push(`${stats.skillsAdded} skills emphasized`);
  if (stats.bulletsUpdated > 0) parts.push(`${stats.bulletsUpdated} bullets updated`);
  if (stats.bulletsAdded > 0) parts.push(`${stats.bulletsAdded} new bullets added`);
  
  return parts.length > 0 ? `Changes: ${parts.join(" • ")}` : "No significant changes detected";
}

export function DiffView({ 
  originalResume, 
  tailoredBundle, 
  candidateName, 
  jobTitle, 
  onBack 
}: DiffViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("key");
  
  const tailored = tailoredBundle.tailored_resume;
  const rationales = tailoredBundle.rationales;
  
  const originalSummary = originalResume.professional_summary || "";
  const tailoredSummary = tailored?.summary || "";
  
  const originalSkills: string[] = useMemo(() => {
    const skills: string[] = [];
    if (originalResume.all_skills) {
      skills.push(...originalResume.all_skills);
    } else {
      if (originalResume.technical_skills) {
        skills.push(...originalResume.technical_skills.map(s => s.skill));
      }
      if (originalResume.soft_skills) {
        skills.push(...originalResume.soft_skills);
      }
    }
    return skills;
  }, [originalResume]);
  
  const tailoredSkills: string[] = useMemo(() => {
    const skills: string[] = [];
    if (tailored?.skills) {
      if (tailored.skills.core) skills.push(...tailored.skills.core);
      if (tailored.skills.tools) skills.push(...tailored.skills.tools);
      if (tailored.skills.methodologies) skills.push(...tailored.skills.methodologies);
      if (tailored.skills.languages) skills.push(...tailored.skills.languages);
    }
    return skills;
  }, [tailored]);
  
  const originalExperience: ExperienceEntry[] = useMemo(() => 
    (originalResume.work_experience || []).map(exp => ({
      title: exp.title,
      company: exp.company,
      startDate: exp.start_date,
      endDate: exp.end_date,
      isCurrent: exp.current,
      bullets: [...(exp.achievements || []), ...(exp.description ? [exp.description] : [])],
    })), [originalResume]);
  
  const tailoredExperience: ExperienceEntry[] = useMemo(() => 
    (tailored?.experience || []).map(exp => ({
      title: exp.title,
      company: exp.employer,
      startDate: exp.start_date,
      endDate: exp.end_date,
      isCurrent: exp.is_current,
      bullets: exp.description || [],
    })), [tailored]);

  const originalEducation = originalResume.education || [];
  const tailoredEducation = tailored?.education || [];
  
  const skillsDiff = useMemo(() => 
    diffSkills(originalSkills, tailoredSkills), [originalSkills, tailoredSkills]);
  
  const allBulletDiffs = useMemo(() => {
    const pairs = matchExperienceEntries(originalExperience, tailoredExperience);
    return pairs.flatMap(pair => 
      diffBullets(pair.original?.bullets || [], pair.tailored?.bullets || [])
    );
  }, [originalExperience, tailoredExperience]);
  
  const stats = useMemo(() => 
    computeDiffStats(originalSummary, tailoredSummary, skillsDiff, allBulletDiffs),
    [originalSummary, tailoredSummary, skillsDiff, allBulletDiffs]);
  
  const changeSummaries = formatChangeSummary(stats);
  const overallSummary = formatOverallSummary(stats);

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
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground mr-2">Change Focus:</span>
              <div className="inline-flex rounded-md border border-border overflow-hidden">
                <button
                  className={`px-3 py-1.5 text-sm transition-colors ${
                    viewMode === "key" 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                  onClick={() => setViewMode("key")}
                  data-testid="toggle-key-changes"
                >
                  Key changes
                </button>
                <button
                  className={`px-3 py-1.5 text-sm transition-colors border-l border-border ${
                    viewMode === "all" 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                  onClick={() => setViewMode("all")}
                  data-testid="toggle-all-changes"
                >
                  All changes
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-5xl mx-auto">
          <div className="mb-6 p-3 bg-muted/30 rounded-lg border border-border/50 text-center">
            <p className="text-sm text-muted-foreground" data-testid="change-summary-bar">
              {overallSummary}
            </p>
          </div>
          
          <DiffSection 
            title="Professional Summary" 
            icon={FileText}
            changeSummary={changeSummaries.summary}
            defaultOpen={true}
          >
            <SummaryDiffContent 
              originalSummary={originalSummary} 
              tailoredSummary={tailoredSummary}
              viewMode={viewMode}
              rationale={rationales?.summary}
            />
          </DiffSection>
          
          <DiffSection 
            title="Skills" 
            icon={Briefcase}
            changeSummary={changeSummaries.skills}
            defaultOpen={true}
          >
            <SkillsDiffContent 
              originalSkills={originalSkills} 
              tailoredSkills={tailoredSkills}
              skillsDiff={skillsDiff}
              rationale={rationales?.skills}
            />
          </DiffSection>
          
          <DiffSection 
            title="Work Experience" 
            icon={User}
            changeSummary={changeSummaries.experience}
            defaultOpen={false}
          >
            <ExperienceDiffContent 
              originalExperience={originalExperience} 
              tailoredExperience={tailoredExperience}
              viewMode={viewMode}
              experienceRationales={rationales?.experiences}
            />
          </DiffSection>

          {(originalEducation.length > 0 || tailoredEducation.length > 0) && (
            <DiffSection 
              title="Education" 
              icon={GraduationCap}
              changeSummary={changeSummaries.education}
              defaultOpen={false}
            >
              <EducationDiffContent 
                originalEducation={originalEducation} 
                tailoredEducation={tailoredEducation} 
              />
            </DiffSection>
          )}
        </div>
      </main>
    </div>
  );
}
