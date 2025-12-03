import { useState } from "react";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Input } from "@/components/ui/input";
import { 
  Volume2, 
  Palette, 
  Gauge, 
  FileText, 
  Target, 
  Briefcase, 
  Mail,
  ChevronDown
} from "lucide-react";
import type { 
  TailoringOptions, 
  NarrativeVoice, 
  ToneProfile, 
  ToneIntensity, 
  SummaryLength, 
  ResumeLength,
  EmphasisLevel,
  ExperienceMode,
  CoverLetterLength,
  CoverLetterFocus
} from "@shared/schema";

interface TailoringOptionsPanelProps {
  options: TailoringOptions;
  onChange: (options: TailoringOptions) => void;
}

function LevelToggle({ 
  value, 
  onChange,
  testId
}: { 
  value: EmphasisLevel; 
  onChange: (value: EmphasisLevel) => void;
  testId?: string;
}) {
  return (
    <ToggleGroup 
      type="single" 
      value={value} 
      onValueChange={(v) => v && onChange(v as EmphasisLevel)}
      className="justify-start"
      data-testid={testId}
    >
      <ToggleGroupItem value="low" className="text-xs px-2 h-7 data-[state=on]:bg-blue-100 data-[state=on]:text-blue-700 dark:data-[state=on]:bg-blue-900 dark:data-[state=on]:text-blue-300">
        Low
      </ToggleGroupItem>
      <ToggleGroupItem value="normal" className="text-xs px-2 h-7 data-[state=on]:bg-green-100 data-[state=on]:text-green-700 dark:data-[state=on]:bg-green-900 dark:data-[state=on]:text-green-300">
        Normal
      </ToggleGroupItem>
      <ToggleGroupItem value="high" className="text-xs px-2 h-7 data-[state=on]:bg-orange-100 data-[state=on]:text-orange-700 dark:data-[state=on]:bg-orange-900 dark:data-[state=on]:text-orange-300">
        High
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

export function TailoringOptionsPanel({ options, onChange }: TailoringOptionsPanelProps) {
  const updateOption = <K extends keyof TailoringOptions>(key: K, value: TailoringOptions[K]) => {
    onChange({ ...options, [key]: value });
  };

  const updateSkillEmphasis = (key: keyof TailoringOptions['skillEmphasis'], value: EmphasisLevel) => {
    onChange({
      ...options,
      skillEmphasis: { ...options.skillEmphasis, [key]: value }
    });
  };

  const updateExperience = <K extends keyof TailoringOptions['experience']>(
    key: K, 
    value: TailoringOptions['experience'][K]
  ) => {
    onChange({
      ...options,
      experience: { ...options.experience, [key]: value }
    });
  };

  const updateCoverLetter = <K extends keyof TailoringOptions['coverLetter']>(
    key: K, 
    value: TailoringOptions['coverLetter'][K]
  ) => {
    onChange({
      ...options,
      coverLetter: { ...options.coverLetter, [key]: value }
    });
  };

  return (
    <div className="space-y-3" data-testid="tailoring-options-panel">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Language</Label>
          <Select 
            value={options.language} 
            onValueChange={(v) => updateOption('language', v)}
          >
            <SelectTrigger className="h-9" data-testid="select-language">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="da">Danish</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Tone</Label>
          <Select 
            value={options.toneProfile} 
            onValueChange={(v) => updateOption('toneProfile', v as ToneProfile)}
          >
            <SelectTrigger className="h-9" data-testid="select-tone">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="conservative">Conservative</SelectItem>
              <SelectItem value="modern">Modern</SelectItem>
              <SelectItem value="executive">Executive</SelectItem>
              <SelectItem value="energetic">Energetic</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Accordion type="multiple" className="w-full" defaultValue={[]}>
        <AccordionItem value="voice-tone" className="border-b-0">
          <AccordionTrigger className="py-2 text-sm hover:no-underline" data-testid="accordion-voice-tone">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-muted-foreground" />
              <span>Voice & Intensity</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-3">
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Narrative Voice</Label>
                <Select 
                  value={options.narrativeVoice} 
                  onValueChange={(v) => updateOption('narrativeVoice', v as NarrativeVoice)}
                >
                  <SelectTrigger className="h-9" data-testid="select-voice">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="first_direct">"I lead teams..."</SelectItem>
                    <SelectItem value="first_implicit">"Leads teams..."</SelectItem>
                    <SelectItem value="third_person">"[Name] leads..."</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Tone Intensity</Label>
                <ToggleGroup 
                  type="single" 
                  value={String(options.toneIntensity)}
                  onValueChange={(v) => v && updateOption('toneIntensity', Number(v) as ToneIntensity)}
                  className="justify-start"
                  data-testid="toggle-intensity"
                >
                  <ToggleGroupItem value="1" className="text-xs px-3 h-8">
                    Modest
                  </ToggleGroupItem>
                  <ToggleGroupItem value="2" className="text-xs px-3 h-8">
                    Balanced
                  </ToggleGroupItem>
                  <ToggleGroupItem value="3" className="text-xs px-3 h-8">
                    Bold
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="length" className="border-b-0">
          <AccordionTrigger className="py-2 text-sm hover:no-underline" data-testid="accordion-length">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span>Length Settings</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Summary</Label>
                <Select 
                  value={options.summaryLength} 
                  onValueChange={(v) => updateOption('summaryLength', v as SummaryLength)}
                >
                  <SelectTrigger className="h-9" data-testid="select-summary-length">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Short</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="long">Long</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Resume</Label>
                <Select 
                  value={options.resumeLength} 
                  onValueChange={(v) => updateOption('resumeLength', v as ResumeLength)}
                >
                  <SelectTrigger className="h-9" data-testid="select-resume-length">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="concise">Concise</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="extended">Extended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="skills" className="border-b-0">
          <AccordionTrigger className="py-2 text-sm hover:no-underline" data-testid="accordion-skills">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-muted-foreground" />
              <span>Skill Emphasis</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-3">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Leadership</Label>
                <LevelToggle 
                  value={options.skillEmphasis.leadership} 
                  onChange={(v) => updateSkillEmphasis('leadership', v)}
                  testId="toggle-leadership"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Delivery</Label>
                <LevelToggle 
                  value={options.skillEmphasis.delivery} 
                  onChange={(v) => updateSkillEmphasis('delivery', v)}
                  testId="toggle-delivery"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Change Mgmt</Label>
                <LevelToggle 
                  value={options.skillEmphasis.changeManagement} 
                  onChange={(v) => updateSkillEmphasis('changeManagement', v)}
                  testId="toggle-change-mgmt"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Technical</Label>
                <LevelToggle 
                  value={options.skillEmphasis.technical} 
                  onChange={(v) => updateSkillEmphasis('technical', v)}
                  testId="toggle-technical"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Domain</Label>
                <LevelToggle 
                  value={options.skillEmphasis.domain} 
                  onChange={(v) => updateSkillEmphasis('domain', v)}
                  testId="toggle-domain"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="experience" className="border-b-0">
          <AccordionTrigger className="py-2 text-sm hover:no-underline" data-testid="accordion-experience">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-muted-foreground" />
              <span>Experience Format</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-3">
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Format Mode</Label>
                <Select 
                  value={options.experience.mode} 
                  onValueChange={(v) => updateExperience('mode', v as ExperienceMode)}
                >
                  <SelectTrigger className="h-9" data-testid="select-experience-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (skip experience)</SelectItem>
                    <SelectItem value="light">Light (brief descriptions)</SelectItem>
                    <SelectItem value="focused">Focused (key achievements)</SelectItem>
                    <SelectItem value="star">STAR (detailed stories)</SelectItem>
                    <SelectItem value="executive">Executive (high-level impact)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Only rewrite last X years (optional)
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    placeholder="All years"
                    value={options.experience.limitToRecentYears || ''}
                    onChange={(e) => {
                      const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                      updateExperience('limitToRecentYears', val && val > 0 ? val : undefined);
                    }}
                    className="h-9 w-24"
                    data-testid="input-recent-years"
                  />
                  <span className="text-xs text-muted-foreground">years</span>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="cover-letter" className="border-b-0">
          <AccordionTrigger className="py-2 text-sm hover:no-underline" data-testid="accordion-cover-letter">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span>Cover Letter</span>
              {options.coverLetter.enabled && (
                <span className="text-xs text-primary ml-1">ON</span>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-3">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Generate Cover Letter</Label>
                <Switch
                  checked={options.coverLetter.enabled}
                  onCheckedChange={(v) => updateCoverLetter('enabled', v)}
                  data-testid="switch-cover-letter"
                />
              </div>
              
              {options.coverLetter.enabled && (
                <>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Length</Label>
                    <Select 
                      value={options.coverLetter.length} 
                      onValueChange={(v) => updateCoverLetter('length', v as CoverLetterLength)}
                    >
                      <SelectTrigger className="h-9" data-testid="select-cover-length">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="short">Short (~150 words)</SelectItem>
                        <SelectItem value="medium">Medium (~250 words)</SelectItem>
                        <SelectItem value="long">Long (~400 words)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Focus</Label>
                    <Select 
                      value={options.coverLetter.focus} 
                      onValueChange={(v) => updateCoverLetter('focus', v as CoverLetterFocus)}
                    >
                      <SelectTrigger className="h-9" data-testid="select-cover-focus">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard Introduction</SelectItem>
                        <SelectItem value="transformation">Transformation Story</SelectItem>
                        <SelectItem value="leadership">Leadership Narrative</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-2">
                      Override voice/tone (leave empty to use main settings)
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <Select 
                        value={options.coverLetter.narrativeVoice || ''} 
                        onValueChange={(v) => updateCoverLetter('narrativeVoice', v as NarrativeVoice || undefined)}
                      >
                        <SelectTrigger className="h-8 text-xs" data-testid="select-cover-voice">
                          <SelectValue placeholder="Voice (inherit)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="first_direct">First person</SelectItem>
                          <SelectItem value="first_implicit">Implicit</SelectItem>
                          <SelectItem value="third_person">Third person</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Select 
                        value={options.coverLetter.toneProfile || ''} 
                        onValueChange={(v) => updateCoverLetter('toneProfile', v as ToneProfile || undefined)}
                      >
                        <SelectTrigger className="h-8 text-xs" data-testid="select-cover-tone">
                          <SelectValue placeholder="Tone (inherit)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="conservative">Conservative</SelectItem>
                          <SelectItem value="modern">Modern</SelectItem>
                          <SelectItem value="executive">Executive</SelectItem>
                          <SelectItem value="energetic">Energetic</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
