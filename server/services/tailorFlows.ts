import { tailorResume, type TailorResult } from "./tailorResume";
import { logger } from "../utils/logger";
import { z } from "zod";
import type { JobCard, ResumeCard, TailoringOptions } from "@shared/schema";
import { tailoringOptionsSchema, defaultTailoringOptions } from "@shared/schema";

function deepMergeTailoringOptions(
  defaults: TailoringOptions, 
  overrides: Partial<TailoringOptions> | undefined
): TailoringOptions {
  if (!overrides) return { ...defaults };
  
  return {
    language: overrides.language ?? defaults.language,
    narrativeVoice: overrides.narrativeVoice ?? defaults.narrativeVoice,
    toneProfile: overrides.toneProfile ?? defaults.toneProfile,
    toneIntensity: overrides.toneIntensity ?? defaults.toneIntensity,
    summaryLength: overrides.summaryLength ?? defaults.summaryLength,
    resumeLength: overrides.resumeLength ?? defaults.resumeLength,
    skillEmphasis: {
      technicalSkills: overrides.skillEmphasis?.technicalSkills ?? defaults.skillEmphasis.technicalSkills,
      softSkills: overrides.skillEmphasis?.softSkills ?? defaults.skillEmphasis.softSkills,
      industryKnowledge: overrides.skillEmphasis?.industryKnowledge ?? defaults.skillEmphasis.industryKnowledge,
      tools: overrides.skillEmphasis?.tools ?? defaults.skillEmphasis.tools,
    },
    experience: {
      mode: overrides.experience?.mode ?? defaults.experience.mode,
      recentYearsOnly: overrides.experience?.recentYearsOnly ?? defaults.experience.recentYearsOnly,
      yearsToInclude: overrides.experience?.yearsToInclude ?? defaults.experience.yearsToInclude,
    },
    coverLetter: {
      enabled: overrides.coverLetter?.enabled ?? defaults.coverLetter.enabled,
      length: overrides.coverLetter?.length ?? defaults.coverLetter.length,
      focus: overrides.coverLetter?.focus ?? defaults.coverLetter.focus,
      narrativeVoice: overrides.coverLetter?.narrativeVoice,
      toneProfile: overrides.coverLetter?.toneProfile,
    },
  };
}

export const tailorResumeInputSchema = z.object({
  resumeJson: z.custom<ResumeCard>((val) => typeof val === 'object' && val !== null),
  jobCardJson: z.custom<JobCard>((val) => typeof val === 'object' && val !== null),
  tailoring: tailoringOptionsSchema.optional()
});

export type TailorResumeInput = {
  resumeJson: ResumeCard;
  jobCardJson: JobCard;
  tailoring: TailoringOptions;
};

export type TailorResumeResult = TailorResult;

export async function tailorResumeToJob(input: TailorResumeInput): Promise<TailorResumeResult> {
  const timer = logger.startTimer();
  const { resumeJson, jobCardJson, tailoring } = input;
  
  const log = logger.withContext({ 
    flow: 'tailorResume', 
    language: tailoring.language, 
    toneProfile: tailoring.toneProfile,
    toneIntensity: tailoring.toneIntensity,
    narrativeVoice: tailoring.narrativeVoice,
    coverLetterEnabled: tailoring.coverLetter.enabled
  });
  
  log.info('Starting resume tailoring', { 
    hasResumeData: Object.keys(resumeJson).length > 0,
    hasJobData: Object.keys(jobCardJson).length > 0,
    resumeTitle: resumeJson.personal_info?.title || 'unknown',
    jobTitle: jobCardJson.basics?.title || 'unknown',
    experienceMode: tailoring.experience.mode,
    limitToRecentYears: tailoring.experience.limitToRecentYears
  });
  
  const result = await tailorResume({
    resumeJson,
    jobCardJson,
    tailoring
  });
  
  log.info('Resume tailoring complete', { 
    ok: result.ok,
    errorCount: result.errors?.length || 0,
    hasBundle: !!result.bundle,
    hasCoverLetter: !!result.bundle?.cover_letter,
    duration: timer()
  });
  
  return result;
}

export function validateTailorInput(input: unknown): { valid: true; data: TailorResumeInput } | { valid: false; errors: string[] } {
  const parseResult = tailorResumeInputSchema.safeParse(input);
  
  if (!parseResult.success) {
    const errors = parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
    return { valid: false, errors };
  }
  
  const data = parseResult.data;
  const tailoring = deepMergeTailoringOptions(defaultTailoringOptions, data.tailoring);
  
  return { 
    valid: true, 
    data: {
      resumeJson: data.resumeJson,
      jobCardJson: data.jobCardJson,
      tailoring
    } 
  };
}
