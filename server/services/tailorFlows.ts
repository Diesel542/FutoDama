import { tailorResume, type TailorResult } from "./tailorResume";
import { logger } from "../utils/logger";
import { z } from "zod";
import type { JobCard, ResumeCard } from "@shared/schema";

export const tailorResumeInputSchema = z.object({
  resumeJson: z.record(z.unknown()),
  jobCardJson: z.record(z.unknown()),
  language: z.enum(['en', 'da']).optional().default('en'),
  style: z.enum(['conservative', 'modern', 'impact']).optional().default('modern')
});

export type TailorResumeInput = z.infer<typeof tailorResumeInputSchema>;

export type TailorResumeResult = TailorResult;

export async function tailorResumeToJob(input: TailorResumeInput): Promise<TailorResumeResult> {
  const timer = logger.startTimer();
  
  const parseResult = tailorResumeInputSchema.safeParse(input);
  
  if (!parseResult.success) {
    const errors = parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
    return {
      ok: false,
      errors,
      bundle: null
    };
  }
  
  const { resumeJson, jobCardJson, language, style } = parseResult.data;
  
  logger.info('Starting resume tailoring', { 
    language, 
    style,
    hasResumeData: Object.keys(resumeJson).length > 0,
    hasJobData: Object.keys(jobCardJson).length > 0
  });
  
  const result = await tailorResume({
    resumeJson,
    jobCardJson,
    language,
    style
  });
  
  logger.info('Resume tailoring complete', { 
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
  
  return { valid: true, data: parseResult.data };
}
