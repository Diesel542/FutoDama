import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from 'multer';
import { storage } from "./storage";
import { extractJobData, validateAndEnhanceJobCard } from "./services/openai";
import { parseDocument, parseTextInput } from "./services/documentParser";
import { codexManager } from "./services/codexManager";
import { randomUUID } from "crypto";

const upload = multer({ dest: 'uploads/' });

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize default codex
  await codexManager.initializeDefaultCodex();

  // Upload and process job description
  app.post('/api/jobs/upload', upload.single('file'), async (req, res) => {
    try {
      let documentText = '';
      let documentType = 'text';

      // Parse document or text
      if (req.file) {
        const parsed = await parseDocument(req.file.path, req.file.mimetype);
        documentText = parsed.text;
        documentType = req.file.mimetype.includes('pdf') ? 'pdf' : 'docx';
      } else if (req.body.text) {
        const parsed = parseTextInput(req.body.text);
        documentText = parsed.text;
        documentType = 'text';
      } else {
        return res.status(400).json({ error: 'No file or text provided' });
      }

      // Create job record
      const job = await storage.createJob({
        status: 'processing',
        originalText: documentText,
        documentType,
        jobCard: null,
        codexId: 'job-card-v1'
      });

      // Start async processing
      processJobDescription(job.id, documentText);

      res.json({ jobId: job.id, status: 'processing' });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'Failed to process upload' });
    }
  });

  // Get job status and results
  app.get('/api/jobs/:id', async (req, res) => {
    try {
      const job = await storage.getJob(req.params.id);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }
      res.json(job);
    } catch (error) {
      console.error('Get job error:', error);
      res.status(500).json({ error: 'Failed to get job' });
    }
  });

  // Get all codexes
  app.get('/api/codex', async (req, res) => {
    try {
      const codexes = await codexManager.getAllCodexes();
      res.json(codexes);
    } catch (error) {
      console.error('Get codexes error:', error);
      res.status(500).json({ error: 'Failed to get codexes' });
    }
  });

  // Get specific codex
  app.get('/api/codex/:id', async (req, res) => {
    try {
      const codex = await codexManager.getCodex(req.params.id);
      if (!codex) {
        return res.status(404).json({ error: 'Codex not found' });
      }
      res.json(codex);
    } catch (error) {
      console.error('Get codex error:', error);
      res.status(500).json({ error: 'Failed to get codex' });
    }
  });

  // Export codex
  app.get('/api/codex/:id/export', async (req, res) => {
    try {
      const codex = await codexManager.exportCodex(req.params.id);
      if (!codex) {
        return res.status(404).json({ error: 'Codex not found' });
      }
      
      res.setHeader('Content-Disposition', `attachment; filename="${codex.id}.json"`);
      res.setHeader('Content-Type', 'application/json');
      res.json(codex);
    } catch (error) {
      console.error('Export codex error:', error);
      res.status(500).json({ error: 'Failed to export codex' });
    }
  });

  // Create new codex
  app.post('/api/codex', async (req, res) => {
    try {
      const codex = await codexManager.createCodex(req.body);
      res.status(201).json(codex);
    } catch (error) {
      console.error('Create codex error:', error);
      res.status(500).json({ error: 'Failed to create codex' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Async job processing function
async function processJobDescription(jobId: string, text: string) {
  try {
    // Get the codex for processing
    const codex = await codexManager.getCodex('job-card-v1');
    if (!codex) {
      throw new Error('Codex not found');
    }

    // Update status to extracting
    await storage.updateJob(jobId, { status: 'extracting' });

    // Extract job data using AI
    const prompts = codex.prompts as { system: string; user: string };
    const extractedData = await extractJobData({
      text,
      schema: codex.schema,
      systemPrompt: prompts.system,
      userPrompt: prompts.user
    });

    // Update status to validating
    await storage.updateJob(jobId, { status: 'validating' });

    // Validate and enhance the job card
    const validatedJobCard = await validateAndEnhanceJobCard(extractedData, codex.schema);

    // Normalize the job card structure immediately
    const finalJobCard = validatedJobCard.jobCard || validatedJobCard;

    // Apply missing rules from codex
    if (codex.missingRules && Array.isArray(codex.missingRules)) {
      finalJobCard.missing_fields = finalJobCard.missing_fields || [];
      
      // Add codex-defined missing field rules
      for (const rule of codex.missingRules) {
        const fieldExists = getNestedValue(finalJobCard, rule.path);
        if (!fieldExists) {
          finalJobCard.missing_fields.push({
            path: rule.path,
            severity: rule.severity,
            message: rule.message
          });
        }
      }
    }

    // Update job with final results
    await storage.updateJob(jobId, {
      status: 'completed',
      jobCard: finalJobCard
    });

  } catch (error) {
    console.error('Job processing error:', error);
    await storage.updateJob(jobId, {
      status: 'error',
      jobCard: { error: (error as Error).message }
    });
  }
}

// Helper function to get nested object values
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current && current[key], obj);
}
