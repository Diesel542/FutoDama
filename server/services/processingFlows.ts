import { storage } from "../storage";
import { extractJobData, validateAndEnhanceJobCard, extractJobDataTwoPass } from "./openai";
import { codexManager } from "./codexManager";
import { normalizeProjectDetails } from "./parsers";
import { logStream } from "./logStream";
import { getNestedValue } from "../utils";

export async function processJobDescription(jobId: string, text: string) {
  try {
    const job = await storage.getJob(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    const codex = await codexManager.getCodex(job.codexId);
    if (!codex) {
      throw new Error(`Codex '${job.codexId}' not found`);
    }

    logStream.sendDetailedLog(jobId, {
      step: 'JOB PROCESSING START',
      message: `Starting job processing with codex: ${codex.id} (${codex.version})`,
      details: {
        jobId,
        codexId: codex.id,
        codexVersion: codex.version,
        textLength: text.length
      },
      type: 'info'
    });

    await storage.updateJob(jobId, { status: 'extracting' });
    
    logStream.sendDetailedLog(jobId, {
      step: 'STATUS UPDATE',
      message: 'Job status updated to: extracting',
      type: 'info'
    });

    const prompts = codex.prompts as { system: string; user: string };
    let extractedData;
    
    if (codex.id === 'job-card-v2.1') {
      console.log('[V2.1] Using two-pass intelligent extraction...');
      extractedData = await extractJobDataTwoPass(text, codex.schema, prompts.system, prompts.user, jobId);
    } else {
      extractedData = await extractJobData({
        text,
        schema: codex.schema,
        systemPrompt: prompts.system,
        userPrompt: prompts.user
      });
    }

    await storage.updateJob(jobId, { status: 'validating' });

    const validatedJobCard = await validateAndEnhanceJobCard(extractedData, codex.schema, jobId);
    const finalJobCard = validatedJobCard.jobCard || validatedJobCard;

    if (codex.id === 'job-card-v2.1' && finalJobCard.project_details) {
      console.log('[V2.1] Applying backend parsers for normalized fields...');
      logStream.sendDetailedLog(jobId, {
        step: 'PARSER NORMALIZATION',
        message: 'Normalizing project details with backend parsers (dates, currency, workload, duration)',
        type: 'info'
      });
      
      const normalized = normalizeProjectDetails(finalJobCard.project_details);
      finalJobCard.project_details = {
        ...finalJobCard.project_details,
        ...normalized
      };
      
      logStream.sendDetailedLog(jobId, {
        step: 'PARSER RESULT',
        message: 'Successfully normalized project details',
        details: normalized,
        type: 'debug'
      });
    }

    if (codex.id === 'job-card-v2.1' && finalJobCard.evidence) {
      console.log('[V2.1] Validating evidence quotes against source text...');
      const lowerText = text.toLowerCase();
      finalJobCard.evidence = finalJobCard.evidence.filter((ev: any) => {
        const quoteExists = lowerText.includes(ev.quote.toLowerCase());
        if (!quoteExists) {
          console.warn(`[HALLUCINATION DETECTED] Quote not found in source: "${ev.quote}"`);
        }
        return quoteExists;
      });
      
      const fieldsWithEvidence = new Set(finalJobCard.evidence.map((ev: any) => ev.field));
      const criticalFields = ['experience_required', 'technical_skills', 'soft_skills'];
      
      for (const field of criticalFields) {
        const fieldPath = `requirements.${field}`;
        const hasData = getNestedValue(finalJobCard, fieldPath);
        if (hasData && !fieldsWithEvidence.has(fieldPath) && !fieldsWithEvidence.has(field)) {
          finalJobCard.missing_fields = finalJobCard.missing_fields || [];
          finalJobCard.missing_fields.push({
            path: fieldPath,
            severity: 'warn',
            message: 'No source evidence found - please verify accuracy'
          });
        }
      }
    }

    if (codex.missingRules && Array.isArray(codex.missingRules)) {
      finalJobCard.missing_fields = finalJobCard.missing_fields || [];
      
      for (const rule of codex.missingRules) {
        const fieldExists = getNestedValue(finalJobCard, rule.path);
        if (!fieldExists) {
          const existingWarning = finalJobCard.missing_fields.find((f: any) => f.path === rule.path);
          if (!existingWarning) {
            finalJobCard.missing_fields.push({
              path: rule.path,
              severity: rule.severity,
              message: rule.message
            });
          }
        }
      }
    }

    if (codex.id === 'job-card-v2.1' && finalJobCard.confidence) {
      console.log('[V2.1] Checking confidence scores...');
      for (const [field, confidence] of Object.entries(finalJobCard.confidence)) {
        if (typeof confidence === 'number' && confidence < 0.8) {
          finalJobCard.missing_fields = finalJobCard.missing_fields || [];
          finalJobCard.missing_fields.push({
            path: field,
            severity: 'warn',
            message: `Low confidence (${Math.round(confidence * 100)}%) - please verify`
          });
        }
      }
    }

    await storage.updateJob(jobId, {
      status: 'completed',
      jobCard: finalJobCard
    });

    console.log(`[SUCCESS] Job ${jobId} completed with ${codex.id}`);
    
    logStream.sendDetailedLog(jobId, {
      step: 'JOB PROCESSING COMPLETE',
      message: `Successfully completed job processing with ${codex.id}`,
      details: {
        status: 'completed',
        codexUsed: codex.id,
        hasJobCard: !!finalJobCard
      },
      type: 'info'
    });

  } catch (error) {
    console.error('Job processing error:', error);
    await storage.updateJob(jobId, {
      status: 'error',
      jobCard: { error: (error as Error).message }
    });
  }
}

export async function processResume(resumeId: string, text: string) {
  try {
    const resume = await storage.getResume(resumeId);
    if (!resume) {
      throw new Error('Resume not found');
    }

    const codex = await codexManager.getCodex(resume.codexId);
    if (!codex) {
      throw new Error(`Codex '${resume.codexId}' not found`);
    }

    logStream.sendDetailedLog(resumeId, {
      step: 'RESUME PROCESSING START',
      message: `Starting resume processing with codex: ${codex.id} (${codex.version})`,
      details: {
        resumeId,
        codexId: codex.id,
        codexVersion: codex.version,
        textLength: text.length
      },
      type: 'info'
    });

    await storage.updateResume(resumeId, { status: 'extracting' });
    
    logStream.sendDetailedLog(resumeId, {
      step: 'STATUS UPDATE',
      message: 'Resume status updated to: extracting',
      type: 'info'
    });

    const prompts = codex.prompts as { system: string; user: string };
    console.log('[RESUME] Using intelligent two-pass extraction...');
    const extractedData = await extractJobDataTwoPass(text, codex.schema, prompts.system, prompts.user, resumeId);

    await storage.updateResume(resumeId, { status: 'validating' });

    const validatedResumeCard = await validateAndEnhanceJobCard(extractedData, codex.schema, resumeId);
    const finalResumeCard = validatedResumeCard.jobCard || validatedResumeCard;

    if (finalResumeCard.evidence) {
      console.log('[RESUME] Validating evidence quotes against source text...');
      const lowerText = text.toLowerCase();
      finalResumeCard.evidence = finalResumeCard.evidence.filter((ev: any) => {
        const quoteExists = lowerText.includes(ev.quote.toLowerCase());
        if (!quoteExists) {
          console.warn(`[HALLUCINATION DETECTED] Quote not found in source: "${ev.quote}"`);
        }
        return quoteExists;
      });
      
      const fieldsWithEvidence = new Set(finalResumeCard.evidence.map((ev: any) => ev.field));
      const criticalFields = ['personal_info.name', 'personal_info.email', 'work_experience', 'technical_skills'];
      
      for (const field of criticalFields) {
        const hasData = getNestedValue(finalResumeCard, field);
        if (hasData && !fieldsWithEvidence.has(field)) {
          finalResumeCard.missing_fields = finalResumeCard.missing_fields || [];
          finalResumeCard.missing_fields.push({
            path: field,
            severity: 'warn',
            message: 'No source evidence found - please verify accuracy'
          });
        }
      }
    }

    if (codex.missingRules && Array.isArray(codex.missingRules)) {
      finalResumeCard.missing_fields = finalResumeCard.missing_fields || [];
      
      for (const rule of codex.missingRules) {
        const fieldExists = getNestedValue(finalResumeCard, rule.path);
        if (!fieldExists) {
          const existingWarning = finalResumeCard.missing_fields.find((f: any) => f.path === rule.path);
          if (!existingWarning) {
            finalResumeCard.missing_fields.push({
              path: rule.path,
              severity: rule.severity,
              message: rule.message
            });
          }
        }
      }
    }

    if (finalResumeCard.confidence) {
      console.log('[RESUME] Checking confidence scores...');
      for (const [field, confidence] of Object.entries(finalResumeCard.confidence)) {
        if (typeof confidence === 'number' && confidence < 0.8) {
          finalResumeCard.missing_fields = finalResumeCard.missing_fields || [];
          finalResumeCard.missing_fields.push({
            path: field,
            severity: 'warn',
            message: `Low confidence (${Math.round(confidence * 100)}%) - please verify`
          });
        }
      }
    }

    await storage.updateResume(resumeId, {
      status: 'completed',
      resumeCard: finalResumeCard
    });

    console.log(`[SUCCESS] Resume ${resumeId} completed with ${codex.id}`);
    
    logStream.sendDetailedLog(resumeId, {
      step: 'RESUME PROCESSING COMPLETE',
      message: `Successfully completed resume processing with ${codex.id}`,
      details: {
        status: 'completed',
        codexUsed: codex.id,
        hasResumeCard: !!finalResumeCard
      },
      type: 'info'
    });

  } catch (error) {
    console.error('Resume processing error:', error);
    await storage.updateResume(resumeId, {
      status: 'error',
      resumeCard: { error: (error as Error).message }
    });
  }
}

export async function processBatchJobs(batchId: string, jobs: any[]): Promise<void> {
  try {
    const batchJob = await storage.getBatchJob(batchId);
    if (!batchJob) {
      throw new Error('Batch job not found');
    }

    await storage.updateBatchJob(batchId, { status: 'processing' });

    const concurrencyLimit = 3;
    
    for (let i = 0; i < jobs.length; i += concurrencyLimit) {
      const batch = jobs.slice(i, i + concurrencyLimit);
      const promises = batch.map(job => processJobDescription(job.id, job.originalText));
      
      await Promise.allSettled(promises);
      
      const currentCompleted = Math.min(i + concurrencyLimit, jobs.length);
      await storage.updateBatchJob(batchId, { 
        completedJobs: currentCompleted 
      });
    }

    await storage.updateBatchJob(batchId, { 
      status: 'completed',
      completedJobs: jobs.length 
    });

  } catch (error) {
    console.error('Batch processing error:', error);
    await storage.updateBatchJob(batchId, {
      status: 'error'
    });
  }
}
