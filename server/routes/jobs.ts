import { Router } from "express";
import multer from 'multer';
import path from 'path';
import { randomUUID } from "crypto";
import { storage } from "../storage";
import { extractJobDescriptionFromImages } from "../services/openai";
import { parseDocument, parseTextInput } from "../services/documentParser";
import { logStream } from "../services/logStream";
import { processJobDescription, processBatchJobs } from "../services/processingFlows";
import { jobToCSV, jobToXML, jobsToCSV, jobsToXML, batchToCSV, batchToXML } from "./utils";
import matchRouter from "./match";

const router = Router();

router.use('/:jobId/match', matchRouter);

router.get('/:jobId/match-sessions', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    const sessions = await storage.getMatchSessionsForJob(jobId);
    
    res.json({
      sessions,
      total: sessions.length,
    });
  } catch (error) {
    console.error('Get match sessions error:', error);
    res.status(500).json({ error: 'Failed to get match sessions' });
  }
});

const multerStorage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    const uniqueId = randomUUID().replace(/-/g, '');
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueId}${ext}`);
  }
});

const upload = multer({ storage: multerStorage });

router.post('/batch-upload', upload.array('files', 10), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    const textEntries = req.body.textEntries ? JSON.parse(req.body.textEntries) : [];
    const codexId = req.body.codexId || 'job-card-v1';

    if ((!files || files.length === 0) && (!textEntries || textEntries.length === 0)) {
      return res.status(400).json({ error: 'No files or text entries provided' });
    }

    const totalJobs = (files?.length || 0) + (textEntries?.length || 0);

    const batchJob = await storage.createBatchJob({
      status: 'processing',
      totalJobs,
      completedJobs: 0,
      codexId
    });

    const fileJobs = [];
    if (files && files.length > 0) {
      for (const file of files) {
        const parsed = await parseDocument(file.path, file.mimetype);
        const documentType = file.mimetype.includes('pdf') ? 'pdf' : 'docx';
        
        const job = await storage.createJob({
          status: 'pending',
          originalText: parsed.text,
          documentType,
          jobCard: null,
          codexId,
          batchId: batchJob.id
        });
        fileJobs.push(job);
      }
    }

    const textJobs = [];
    if (textEntries && textEntries.length > 0) {
      for (const textEntry of textEntries) {
        const parsed = parseTextInput(textEntry);
        
        const job = await storage.createJob({
          status: 'pending',
          originalText: parsed.text,
          documentType: 'text',
          jobCard: null,
          codexId,
          batchId: batchJob.id
        });
        textJobs.push(job);
      }
    }

    processBatchJobs(batchJob.id, [...fileJobs, ...textJobs]);

    res.json({ batchId: batchJob.id, status: 'processing', totalJobs });
  } catch (error) {
    console.error('Batch upload error:', error);
    res.status(500).json({ error: 'Failed to process batch upload' });
  }
});

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    let documentText = '';
    let documentType = 'text';
    let jobId: string = '';

    if (req.file) {
      const fileSizeMB = (req.file.size / (1024 * 1024)).toFixed(2);
      console.log(`[UPLOAD] File received: ${req.file.originalname} (${fileSizeMB} MB)`);
      
      const parsed = await parseDocument(req.file.path, req.file.mimetype);
      documentText = parsed.text;
      documentType = req.file.mimetype.includes('pdf') ? 'pdf' : 'docx';
    } else if (req.body.text) {
      console.log(`[UPLOAD] Text input received: ${req.body.text.length} characters`);
      
      const parsed = parseTextInput(req.body.text);
      documentText = parsed.text;
      documentType = 'text';
    } else {
      return res.status(400).json({ error: 'No file or text provided' });
    }

    const codexId = req.body.codexId || 'job-card-v2.1';

    const job = await storage.createJob({
      status: 'processing',
      originalText: documentText,
      documentType,
      jobCard: null,
      codexId
    });
    
    jobId = job.id;

    logStream.sendDetailedLog(jobId, {
      step: 'SERVER RECEIVED',
      message: `Document received on server: ${documentType.toUpperCase()}`,
      details: {
        documentType,
        textLength: documentText.length,
        codexId
      },
      type: 'info'
    });

    if (req.file) {
      const fileSizeMB = (req.file.size / (1024 * 1024)).toFixed(2);
      logStream.sendDetailedLog(jobId, {
        step: 'DOCUMENT PARSED',
        message: `Successfully parsed ${req.file.originalname}`,
        details: {
          filename: req.file.originalname,
          fileSizeMB,
          extractedChars: documentText.length
        },
        type: 'info'
      });
    } else {
      logStream.sendDetailedLog(jobId, {
        step: 'TEXT PARSED',
        message: `Text input parsed successfully`,
        details: {
          inputLength: req.body.text.length,
          parsedLength: documentText.length
        },
        type: 'info'
      });
    }

    logStream.sendDetailedLog(jobId, {
      step: 'INITIALIZING',
      message: `Loading codex and preparing AI extraction pipeline...`,
      details: {
        codexId,
        jobId: job.id
      },
      type: 'info'
    });

    processJobDescription(job.id, documentText);

    res.json({ jobId: job.id, status: 'processing' });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to process upload' });
  }
});

router.get('/:id', async (req, res) => {
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

router.get('/', async (req, res) => {
  try {
    const filters: any = {};
    
    if (req.query.status) filters.status = req.query.status as string;
    if (req.query.codexId) filters.codexId = req.query.codexId as string;
    if (req.query.page) filters.page = parseInt(req.query.page as string);
    if (req.query.limit) filters.limit = parseInt(req.query.limit as string);
    
    const jobs = await storage.getAllJobs(filters);
    
    const countFilters: any = {};
    if (filters.status) countFilters.status = filters.status;
    if (filters.codexId) countFilters.codexId = filters.codexId;
    
    const total = await storage.countJobs(countFilters);
    
    res.json({
      jobs,
      pagination: {
        page: filters.page || 1,
        limit: filters.limit || 12,
        total,
        totalPages: Math.ceil(total / (filters.limit || 12))
      }
    });
  } catch (error) {
    console.error('Get all jobs error:', error);
    res.status(500).json({ error: 'Failed to get jobs' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const job = await storage.getJob(id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    const deleted = await storage.deleteJob(id);
    
    if (deleted) {
      res.json({ success: true, message: 'Job deleted successfully' });
    } else {
      res.status(500).json({ error: 'Failed to delete job' });
    }
  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

router.get('/:id/export', async (req, res) => {
  try {
    const format = req.query.format as string || 'json';
    const job = await storage.getJob(req.params.id);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    switch (format.toLowerCase()) {
      case 'json':
        res.setHeader('Content-Disposition', `attachment; filename="job-${job.id}.json"`);
        res.setHeader('Content-Type', 'application/json');
        res.json(job);
        break;
        
      case 'csv':
        const csvContent = jobToCSV(job);
        res.setHeader('Content-Disposition', `attachment; filename="job-${job.id}.csv"`);
        res.setHeader('Content-Type', 'text/csv');
        res.send(csvContent);
        break;
        
      case 'xml':
        const xmlContent = jobToXML(job);
        res.setHeader('Content-Disposition', `attachment; filename="job-${job.id}.xml"`);
        res.setHeader('Content-Type', 'application/xml');
        res.send(xmlContent);
        break;
        
      default:
        res.status(400).json({ error: 'Unsupported format. Use json, csv, or xml' });
    }
  } catch (error) {
    console.error('Export job error:', error);
    res.status(500).json({ error: 'Failed to export job' });
  }
});

router.get('/export/bulk', async (req, res) => {
  try {
    const format = req.query.format as string || 'json';
    const status = req.query.status as string;
    const codexId = req.query.codexId as string;
    const fromDate = req.query.fromDate as string;
    const toDate = req.query.toDate as string;
    
    const jobs = await storage.getAllJobs({ status, codexId, fromDate, toDate });

    switch (format.toLowerCase()) {
      case 'json':
        res.setHeader('Content-Disposition', `attachment; filename="jobs-export-${new Date().toISOString().split('T')[0]}.json"`);
        res.setHeader('Content-Type', 'application/json');
        res.json({ jobs, exported_at: new Date().toISOString(), total: jobs.length });
        break;
        
      case 'csv':
        const csvContent = jobsToCSV(jobs);
        res.setHeader('Content-Disposition', `attachment; filename="jobs-export-${new Date().toISOString().split('T')[0]}.csv"`);
        res.setHeader('Content-Type', 'text/csv');
        res.send(csvContent);
        break;
        
      case 'xml':
        const xmlContent = jobsToXML(jobs);
        res.setHeader('Content-Disposition', `attachment; filename="jobs-export-${new Date().toISOString().split('T')[0]}.xml"`);
        res.setHeader('Content-Type', 'application/xml');
        res.send(xmlContent);
        break;
        
      default:
        res.status(400).json({ error: 'Unsupported format. Use json, csv, or xml' });
    }
  } catch (error) {
    console.error('Bulk export error:', error);
    res.status(500).json({ error: 'Failed to export jobs' });
  }
});

router.post('/test-extraction', async (req, res) => {
  try {
    const { text, codex } = req.body;
    
    if (!text || !codex) {
      return res.status(400).json({ error: 'Text and codex configuration are required' });
    }

    console.log('[DEBUG] Testing extraction with text length:', text.length);
    
    const { extractJobData } = await import('../services/openai');
    const extractedJobCard = await extractJobData({
      text,
      schema: codex.schema,
      systemPrompt: codex.prompts.system,
      userPrompt: codex.prompts.user
    });
    
    res.json({
      success: true,
      extracted: extractedJobCard,
      metadata: {
        textLength: text.length,
        extractionTime: new Date().toISOString(),
        codexUsed: {
          schema: Object.keys(codex.schema?.properties || {}).length + ' fields',
          normalizationRules: codex.normalizationRules?.length || 0,
          missingRules: codex.missingRules?.length || 0
        }
      }
    });
  } catch (error) {
    console.error('Test extraction error:', error);
    res.status(500).json({ 
      error: 'Failed to test extraction',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
