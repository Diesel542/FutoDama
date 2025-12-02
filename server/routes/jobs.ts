import { Router, Request, Response, NextFunction } from "express";
import multer from 'multer';
import path from 'path';
import { randomUUID } from "crypto";
import { storage } from "../storage";
import { 
  createJobFromFile, 
  createJobFromText, 
  createBatchJobs,
  getJob,
  deleteJob,
  listJobs
} from "../services/jobFlows";
import { extractJobData } from "../services/openai";
import { jobToCSV, jobToXML, jobsToCSV, jobsToXML } from "./utils";
import matchRouter from "./match";

const router = Router();

router.use('/:jobId/match', matchRouter);

router.get('/:jobId/match-sessions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { jobId } = req.params;
    const sessions = await storage.getMatchSessionsForJob(jobId);
    res.json({ sessions, total: sessions.length });
  } catch (error) {
    next(error);
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

router.post('/batch-upload', upload.array('files', 10), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const files = req.files as Express.Multer.File[];
    const textEntries = req.body.textEntries ? JSON.parse(req.body.textEntries) : [];
    const codexId = req.body.codexId || 'job-card-v1';

    const result = await createBatchJobs({
      files: (files || []).map(f => ({
        path: f.path,
        mimeType: f.mimetype,
        originalName: f.originalname
      })),
      textEntries: textEntries || [],
      codexId
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/upload', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    let result;

    if (req.file) {
      result = await createJobFromFile({
        filePath: req.file.path,
        mimeType: req.file.mimetype,
        originalName: req.file.originalname,
        fileSize: req.file.size,
        codexId: req.body.codexId
      });
    } else if (req.body.text) {
      result = await createJobFromText({
        text: req.body.text,
        codexId: req.body.codexId
      });
    } else {
      return res.status(400).json({ error: 'No file or text provided' });
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const job = await getJob(req.params.id);
    res.json(job);
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await listJobs({
      status: req.query.status as string | undefined,
      codexId: req.query.codexId as string | undefined,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await deleteJob(req.params.id);
    res.json({ success: true, message: 'Job deleted successfully' });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/export', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const format = req.query.format as string || 'json';
    const job = await getJob(req.params.id);

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
    next(error);
  }
});

router.get('/export/bulk', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const format = req.query.format as string || 'json';
    const result = await listJobs({
      status: req.query.status as string | undefined,
      codexId: req.query.codexId as string | undefined,
      fromDate: req.query.fromDate as string | undefined,
      toDate: req.query.toDate as string | undefined
    });

    switch (format.toLowerCase()) {
      case 'json':
        res.setHeader('Content-Disposition', `attachment; filename="jobs-export-${new Date().toISOString().split('T')[0]}.json"`);
        res.setHeader('Content-Type', 'application/json');
        res.json({ jobs: result.jobs, exported_at: new Date().toISOString(), total: result.jobs.length });
        break;
        
      case 'csv':
        const csvContent = jobsToCSV(result.jobs);
        res.setHeader('Content-Disposition', `attachment; filename="jobs-export-${new Date().toISOString().split('T')[0]}.csv"`);
        res.setHeader('Content-Type', 'text/csv');
        res.send(csvContent);
        break;
        
      case 'xml':
        const xmlContent = jobsToXML(result.jobs);
        res.setHeader('Content-Disposition', `attachment; filename="jobs-export-${new Date().toISOString().split('T')[0]}.xml"`);
        res.setHeader('Content-Type', 'application/xml');
        res.send(xmlContent);
        break;
        
      default:
        res.status(400).json({ error: 'Unsupported format. Use json, csv, or xml' });
    }
  } catch (error) {
    next(error);
  }
});

router.post('/test-extraction', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { text, codex } = req.body;
    
    if (!text || !codex) {
      return res.status(400).json({ error: 'Text and codex configuration are required' });
    }
    
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
    next(error);
  }
});

export default router;
