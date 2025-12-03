import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { codexManager } from "../services/codexManager";
import { logStream } from "../services/logStream";
import { tailorResumeToJob } from "../services/tailorFlows";
import { storage } from "../storage";
import type { JobCard, ResumeCard } from "@shared/schema";

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
  language: z.enum(['en', 'da']).optional().default('en'),
  style: z.enum(['conservative', 'modern', 'impact']).optional().default('modern')
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
      
      const { jobId, profileId, language, style } = parseResult.data;
      
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
        language,
        style
      });
      
      res.json(result);
    } catch (error) {
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
