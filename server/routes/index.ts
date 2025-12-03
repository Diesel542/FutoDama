import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { codexManager } from "../services/codexManager";
import { logStream } from "../services/logStream";
import { tailorResumeToJob } from "../services/tailorFlows";
import { generatePdf, buildExportFilename, type ExportType } from "../services/pdfGenerator";
import { storage } from "../storage";
import type { JobCard, ResumeCard } from "@shared/schema";
import { tailoringOptionsSchema, defaultTailoringOptions, TailoringOptions } from "@shared/schema";

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
      leadership: overrides.skillEmphasis?.leadership ?? defaults.skillEmphasis.leadership,
      delivery: overrides.skillEmphasis?.delivery ?? defaults.skillEmphasis.delivery,
      changeManagement: overrides.skillEmphasis?.changeManagement ?? defaults.skillEmphasis.changeManagement,
      technical: overrides.skillEmphasis?.technical ?? defaults.skillEmphasis.technical,
      domain: overrides.skillEmphasis?.domain ?? defaults.skillEmphasis.domain,
    },
    experience: {
      mode: overrides.experience?.mode ?? defaults.experience.mode,
      limitToRecentYears: overrides.experience?.limitToRecentYears ?? defaults.experience.limitToRecentYears,
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

import jobsRouter from "./jobs";
import resumesRouter from "./resumes";
import matchSessionsRouter from "./match-sessions";
import codexRouter from "./codex";
import batchRouter from "./batch";
import webhooksRouter from "./webhooks";
import visionRouter from "./vision";

const tailorRequestSchema = z.object({
  jobId: z.string().min(1, "jobId is required"),
  profileId: z.string().min(1, "profileId is required"),
  tailoring: tailoringOptionsSchema.optional()
});

export async function registerRoutes(app: Express): Promise<Server> {
  await codexManager.initializeDefaultCodex();

  app.use('/api/jobs', jobsRouter);
  app.use('/api/resumes', resumesRouter);
  app.use('/api/match-sessions', matchSessionsRouter);
  app.use('/api/codex', codexRouter);
  app.use('/api/batch', batchRouter);
  app.use('/api/webhooks', webhooksRouter);
  app.use('/api/vision', visionRouter);

  app.post('/api/tailor-resume', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parseResult = tailorRequestSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        return res.status(400).json({ 
          ok: false,
          errors: parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
          bundle: null
        });
      }
      
      const { jobId, profileId, tailoring } = parseResult.data;
      
      const options = deepMergeTailoringOptions(defaultTailoringOptions, tailoring);
      
      if (options.coverLetter.enabled) {
        if (!options.coverLetter.narrativeVoice) {
          options.coverLetter.narrativeVoice = options.narrativeVoice;
        }
        if (!options.coverLetter.toneProfile) {
          options.coverLetter.toneProfile = options.toneProfile;
        }
      }
      
      const job = await storage.getJob(jobId);
      if (!job) {
        return res.status(404).json({
          ok: false,
          errors: [`Job not found: ${jobId}`],
          bundle: null
        });
      }
      
      const resume = await storage.getResume(profileId);
      if (!resume) {
        return res.status(404).json({
          ok: false,
          errors: [`Resume/Profile not found: ${profileId}`],
          bundle: null
        });
      }
      
      const jobCardJson = job.jobCard as JobCard;
      const resumeJson = resume.resumeCard as ResumeCard;
      
      if (!jobCardJson) {
        return res.status(400).json({
          ok: false,
          errors: ['Job has not been processed yet - no job card available'],
          bundle: null
        });
      }
      
      if (!resumeJson) {
        return res.status(400).json({
          ok: false,
          errors: ['Resume has not been processed yet - no resume card available'],
          bundle: null
        });
      }
      
      const result = await tailorResumeToJob({
        resumeJson,
        jobCardJson,
        tailoring: options
      });
      
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  const pdfExportSchema = z.object({
    type: z.enum(["resume", "cover", "ats"]),
    candidateName: z.string().min(1, "candidateName is required"),
    jobTitle: z.string().min(1, "jobTitle is required"),
    bundle: z.object({
      tailored_resume: z.object({
        meta: z.object({
          language: z.string().optional(),
          style: z.string().optional(),
          narrative_voice: z.string().optional(),
          tone_intensity: z.number().optional(),
          target_title: z.string().optional(),
          target_company: z.string().optional(),
        }).optional(),
        summary: z.string().optional(),
        skills: z.union([
          z.object({
            core: z.array(z.string()).optional(),
            tools: z.array(z.string()).optional(),
            methodologies: z.array(z.string()).optional(),
            languages: z.array(z.string()).optional(),
          }),
          z.array(z.string()),
        ]).optional(),
        experience: z.array(z.object({
          employer: z.string().optional(),
          company: z.string().optional(),
          title: z.string().optional(),
          location: z.string().optional(),
          start_date: z.string().optional(),
          end_date: z.string().optional(),
          is_current: z.boolean().optional(),
          description: z.array(z.string()).optional(),
          bullets: z.array(z.string()).optional(),
        })).optional(),
        education: z.array(z.object({
          institution: z.string().optional(),
          degree: z.string().optional(),
          year: z.string().optional(),
          details: z.string().optional(),
        })).optional(),
        certifications: z.array(z.string()).optional(),
        extras: z.array(z.string()).optional(),
      }),
      cover_letter: z.object({
        content: z.string(),
        meta: z.object({
          language: z.string().optional(),
          tone: z.string().optional(),
          voice: z.string().optional(),
          focus: z.string().optional(),
          word_count: z.number().optional(),
        }).optional(),
      }).optional(),
      coverage: z.object({
        matrix: z.array(z.object({
          jd_item: z.string().optional(),
          resume_evidence: z.string().optional(),
          resume_ref: z.string().optional(),
          confidence: z.number().optional(),
          notes: z.string().optional(),
        })).optional(),
        coverage_score: z.number().optional(),
      }).optional(),
      diff: z.object({
        added: z.array(z.string()).optional(),
        removed: z.array(z.string()).optional(),
        reordered: z.array(z.string()).optional(),
        rephrased: z.array(z.string()).optional(),
      }).optional(),
      warnings: z.array(z.union([
        z.string(),
        z.object({
          severity: z.string().optional(),
          message: z.string(),
          path: z.string().optional(),
        }),
      ])).optional(),
      ats_report: z.object({
        keyword_coverage: z.array(z.string()).optional(),
        missing_keywords: z.array(z.string()).optional(),
        format_warnings: z.array(z.string()).optional(),
      }).optional(),
    }),
  });

  app.post('/api/tailor/export-pdf', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parseResult = pdfExportSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Invalid request",
          details: parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        });
      }
      
      const { type, candidateName, jobTitle, bundle } = parseResult.data;
      
      const pdfBuffer = await generatePdf({
        type: type as ExportType,
        candidateName,
        jobTitle,
        bundle: bundle as any,
      });
      
      const filename = buildExportFilename(candidateName, jobTitle, type as ExportType);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      res.send(pdfBuffer);
    } catch (error) {
      console.error('PDF export error:', error);
      next(error);
    }
  });

  app.get('/api/docs', (req, res) => {
    const apiDocs = {
      title: 'FUTODAMA Export API',
      version: '1.0.0',
      description: 'Advanced export and integration API for FUTODAMA job processing system',
      endpoints: {
        jobs: {
          'GET /api/jobs/:id/export': {
            description: 'Export single job in multiple formats',
            parameters: {
              format: 'Export format (json, csv, xml) - default: json'
            },
            example: '/api/jobs/123/export?format=csv'
          },
          'GET /api/jobs/export/bulk': {
            description: 'Bulk export all jobs with optional filtering',
            parameters: {
              format: 'Export format (json, csv, xml) - default: json',
              status: 'Filter by job status (pending, processing, completed, error)',
              codexId: 'Filter by codex ID',
              fromDate: 'Filter from date (ISO format)',
              toDate: 'Filter to date (ISO format)'
            },
            example: '/api/jobs/export/bulk?format=csv&status=completed&fromDate=2024-01-01'
          }
        },
        matching: {
          'POST /api/jobs/:jobId/match/step1': {
            description: 'Run systematic skill-based matching for a job',
            example: '/api/jobs/123/match/step1'
          },
          'POST /api/jobs/:jobId/match/step2': {
            description: 'Run AI-powered deep analysis on selected candidates',
            body: {
              profileIds: 'Array of profile/resume IDs to analyze',
              sessionId: 'Optional session ID from step1'
            }
          },
          'GET /api/match-sessions/:id': {
            description: 'Get details of a specific match session'
          },
          'GET /api/jobs/:jobId/match-sessions': {
            description: 'Get match session history for a job'
          }
        },
        batches: {
          'GET /api/batch/:id/export': {
            description: 'Export batch and all associated jobs',
            parameters: {
              format: 'Export format (json, csv, xml) - default: json'
            },
            example: '/api/batch/456/export?format=xml'
          }
        },
        webhooks: {
          'POST /api/webhooks/register': {
            description: 'Register webhook for real-time notifications',
            body: {
              url: 'Webhook endpoint URL',
              events: 'Array of events to subscribe to (job.completed, job.failed, batch.completed)',
              secret: 'Optional secret for payload verification'
            }
          },
          'GET /api/webhooks': {
            description: 'List all registered webhooks'
          },
          'DELETE /api/webhooks/:id': {
            description: 'Delete a webhook registration'
          }
        }
      },
      formats: {
        json: 'Standard JSON format with full data structure',
        csv: 'Comma-separated values for spreadsheet import',
        xml: 'XML format for enterprise integration'
      },
      webhook_events: [
        'job.completed',
        'job.failed', 
        'batch.completed',
        'batch.failed'
      ]
    };
    
    res.json(apiDocs);
  });

  const httpServer = createServer(app);
  
  logStream.initialize(httpServer);
  
  return httpServer;
}
