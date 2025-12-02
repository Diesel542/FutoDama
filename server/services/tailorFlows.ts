import { tailorResume, type TailorResult } from "./tailorResume";
import { logger } from "../utils/logger";
import { z } from "zod";
import type { JobCard, ResumeCard } from "@shared/schema";

export const tailorResumeInputSchema = z.object({
  resumeJson: z.custom<ResumeCard>((val) => typeof val === 'object' && val !== null),
  jobCardJson: z.custom<JobCard>((val) => typeof val === 'object' && val !== null),
  language: z.enum(['en', 'da']).optional().default('en'),
  style: z.enum(['conservative', 'modern', 'impact']).optional().default('modern')
});

export type TailorResumeInput = {
  resumeJson: ResumeCard;
  jobCardJson: JobCard;
  language: 'en' | 'da';
  style: 'conservative' | 'modern' | 'impact';
};

export type TailorResumeResult = TailorResult;

export async function tailorResumeToJob(input: TailorResumeInput): Promise<TailorResumeResult> {
  const timer = logger.startTimer();
  const { resumeJson, jobCardJson, language, style } = input;
  
  const log = logger.withContext({ flow: 'tailorResume', language, style });
  
  log.info('Starting resume tailoring', { 
    hasResumeData: Object.keys(resumeJson).length > 0,
    hasJobData: Object.keys(jobCardJson).length > 0,
    resumeTitle: resumeJson.personal_info?.title || 'unknown',
    jobTitle: jobCardJson.basics?.title || 'unknown'
  });
  
  const result = await tailorResume({
    resumeJson,
    jobCardJson,
    language,
    style
  });
  
  log.info('Resume tailoring complete', { 
    ok: result.ok,
    errorCount: result.errors?.length || 0,
    hasBundle: !!result.bundle,
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
  
  return { valid: true, data: parseResult.data as TailorResumeInput };
}
