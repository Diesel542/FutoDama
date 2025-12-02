import { Router } from "express";
import multer from 'multer';
import path from 'path';
import { randomUUID } from "crypto";
import { z } from "zod";
import { storage } from "../storage";
import { extractJobDescriptionFromImages } from "../services/openai";
import { parseDocument, parseTextInput } from "../services/documentParser";
import { logStream } from "../services/logStream";
import { processResume } from "../services/processingFlows";
import { tailorResume } from "../services/tailorResume";

const router = Router();

const multerStorage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    const uniqueId = randomUUID().replace(/-/g, '');
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueId}${ext}`);
  }
});

const upload = multer({ storage: multerStorage });

router.post('/vision-extract', async (req, res) => {
  try {
    const { images, codexId, resumeId } = req.body;
    
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: 'No images provided' });
    }

    let resume;
    
    if (resumeId) {
      resume = await storage.getResume(resumeId);
      if (!resume) {
        return res.status(404).json({ error: 'Resume not found' });
      }
    } else {
      const resumeCodexId = codexId || 'resume-card-v1';
      resume = await storage.createResume({
        status: 'processing',
        originalText: '',
        documentType: 'pdf-vision',
        documentPath: '',
        resumeCard: null,
        codexId: resumeCodexId
      });
    }

    logStream.sendDetailedLog(resume.id, {
      step: 'VISION OCR START',
      message: `Starting OCR extraction for resume PDF with ${images.length} pages`,
      details: {
        totalPages: images.length,
        processingPages: Math.min(images.length, 5)
      },
      type: 'info'
    });

    const extractedText = await extractJobDescriptionFromImages(images, resume.id);
    
    await storage.updateResume(resume.id, { originalText: extractedText });

    logStream.sendDetailedLog(resume.id, {
      step: 'VISION OCR COMPLETE',
      message: `Successfully extracted ${extractedText.length} characters from resume PDF`,
      details: {
        extractedLength: extractedText.length
      },
      type: 'info'
    });

    processResume(resume.id, extractedText);

    res.json({ resumeId: resume.id, status: 'processing' });
  } catch (error) {
    console.error('Resume vision extraction error:', error);
    res.status(500).json({ error: 'Failed to process resume vision extraction' });
  }
});

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    let documentText = '';
    let documentType = 'text';
    let documentPath = '';
    let resumeId: string = '';
    let needsVisionProcessing = false;

    if (req.file) {
      const fileSizeMB = (req.file.size / (1024 * 1024)).toFixed(2);
      console.log(`[RESUME UPLOAD] File received: ${req.file.originalname} (${fileSizeMB} MB)`);
      
      documentPath = `/${req.file.path}`;
      const parsed = await parseDocument(req.file.path, req.file.mimetype);
      documentText = parsed.text;
      documentType = req.file.mimetype.includes('pdf') ? 'pdf' : 'docx';

      if (req.file.mimetype.includes('pdf') && documentText.trim().length < 100) {
        console.log(`[RESUME UPLOAD] Insufficient text extracted (${documentText.length} chars), will use vision processing`);
        needsVisionProcessing = true;
      }
    } else if (req.body.text) {
      console.log(`[RESUME UPLOAD] Text input received: ${req.body.text.length} characters`);
      
      const parsed = parseTextInput(req.body.text);
      documentText = parsed.text;
      documentType = 'text';
    } else {
      return res.status(400).json({ error: 'No file or text provided' });
    }

    const codexId = req.body.codexId || 'resume-card-v1';

    const resume = await storage.createResume({
      status: 'processing',
      originalText: documentText,
      documentType: needsVisionProcessing ? 'pdf-vision' : documentType,
      documentPath,
      resumeCard: null,
      codexId
    });
    
    resumeId = resume.id;

    logStream.sendDetailedLog(resumeId, {
      step: 'SERVER RECEIVED',
      message: `Resume document received on server: ${documentType.toUpperCase()}`,
      details: {
        documentType,
        textLength: documentText.length,
        codexId
      },
      type: 'info'
    });

    if (req.file) {
      const fileSizeMB = (req.file.size / (1024 * 1024)).toFixed(2);
      logStream.sendDetailedLog(resumeId, {
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
      logStream.sendDetailedLog(resumeId, {
        step: 'TEXT PARSED',
        message: `Resume text input parsed successfully`,
        details: {
          inputLength: req.body.text.length,
          parsedLength: documentText.length
        },
        type: 'info'
      });
    }

    logStream.sendDetailedLog(resumeId, {
      step: 'INITIALIZING',
      message: `Loading resume codex and preparing AI extraction pipeline...`,
      details: {
        codexId,
        resumeId: resume.id
      },
      type: 'info'
    });

    if (needsVisionProcessing) {
      res.json({ 
        resumeId: resume.id, 
        status: 'processing',
        needsVision: true,
        message: 'Image-based PDF detected. Please use vision processing.'
      });
    } else {
      processResume(resume.id, documentText);
      res.json({ resumeId: resume.id, status: 'processing' });
    }
  } catch (error) {
    console.error('Resume upload error:', error);
    res.status(500).json({ error: 'Failed to process resume upload' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const resume = await storage.getResume(req.params.id);
    if (!resume) {
      return res.status(404).json({ error: 'Resume not found' });
    }
    res.json(resume);
  } catch (error) {
    console.error('Get resume error:', error);
    res.status(500).json({ error: 'Failed to get resume' });
  }
});

router.get('/', async (req, res) => {
  try {
    const filters: any = {};
    
    if (req.query.status) filters.status = req.query.status as string;
    if (req.query.codexId) filters.codexId = req.query.codexId as string;
    if (req.query.jobId) filters.jobId = req.query.jobId as string;
    if (req.query.page) filters.page = parseInt(req.query.page as string);
    if (req.query.limit) filters.limit = parseInt(req.query.limit as string);
    
    const resumes = await storage.getAllResumes(filters);
    
    const countFilters: any = {};
    if (filters.status) countFilters.status = filters.status;
    if (filters.codexId) countFilters.codexId = filters.codexId;
    if (filters.jobId) countFilters.jobId = filters.jobId;
    
    const total = await storage.countResumes(countFilters);
    
    res.json({
      resumes,
      pagination: {
        page: filters.page || 1,
        limit: filters.limit || 12,
        total,
        totalPages: Math.ceil(total / (filters.limit || 12))
      }
    });
  } catch (error) {
    console.error('Get all resumes error:', error);
    res.status(500).json({ error: 'Failed to get resumes' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const resume = await storage.getResume(id);
    if (!resume) {
      return res.status(404).json({ error: 'Resume not found' });
    }
    
    const deleted = await storage.deleteResume(id);
    
    if (deleted) {
      res.json({ success: true, message: 'Resume deleted successfully' });
    } else {
      res.status(500).json({ error: 'Failed to delete resume' });
    }
  } catch (error) {
    console.error('Delete resume error:', error);
    res.status(500).json({ error: 'Failed to delete resume' });
  }
});

const tailorResumeSchema = z.object({
  resumeJson: z.record(z.any()),
  jobCardJson: z.record(z.any()),
  language: z.enum(['en', 'da']).optional().default('en'),
  style: z.enum(['conservative', 'modern', 'impact']).optional().default('modern')
});

router.post('/tailor', async (req, res) => {
  try {
    const parseResult = tailorResumeSchema.safeParse(req.body);
    
    if (!parseResult.success) {
      return res.status(400).json({ 
        ok: false,
        errors: parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
        bundle: null
      });
    }
    
    const { resumeJson, jobCardJson, language, style } = parseResult.data;
    
    const result = await tailorResume({
      resumeJson,
      jobCardJson,
      language,
      style
    });
    
    if (!result.ok || !result.bundle) {
      return res.status(422).json(result);
    }
    
    res.json(result);
  } catch (error) {
    console.error('Resume tailor error:', error);
    res.status(500).json({ 
      ok: false,
      errors: [(error as Error).message],
      bundle: null
    });
  }
});

export default router;
