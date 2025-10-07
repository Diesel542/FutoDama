import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from 'multer';
import { storage } from "./storage";
import { extractJobData, validateAndEnhanceJobCard, extractJobDescriptionFromImages, extractJobDataTwoPass } from "./services/openai";
import { parseDocument, parseTextInput } from "./services/documentParser";
import { codexManager } from "./services/codexManager";
import { normalizeProjectDetails } from "./services/parsers";
import { randomUUID } from "crypto";
import { logStream } from "./services/logStream";

const upload = multer({ dest: 'uploads/' });

// Format conversion utilities
function jobToCSV(job: any): string {
  const headers = ['id', 'status', 'documentType', 'codexId', 'createdAt'];
  const jobCardHeaders = job.jobCard ? Object.keys(job.jobCard) : [];
  const allHeaders = [...headers, ...jobCardHeaders.map(h => `jobCard_${h}`)];
  
  const csvHeader = allHeaders.join(',');
  const jobData = [
    job.id || '',
    job.status || '',
    job.documentType || '',
    job.codexId || '',
    job.createdAt || ''
  ];
  
  if (job.jobCard) {
    jobCardHeaders.forEach(header => {
      const value = job.jobCard[header];
      jobData.push(typeof value === 'object' ? JSON.stringify(value) : String(value || ''));
    });
  }
  
  const csvRow = jobData.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
  return `${csvHeader}\n${csvRow}`;
}

function jobToXML(job: any): string {
  const escapeXml = (str: string) => str.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "'": return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<job>\n';
  
  Object.entries(job).forEach(([key, value]) => {
    if (typeof value === 'object' && value !== null) {
      xml += `  <${key}>${JSON.stringify(value)}</${key}>\n`;
    } else {
      xml += `  <${key}>${escapeXml(String(value || ''))}</${key}>\n`;
    }
  });
  
  xml += '</job>';
  return xml;
}

function batchToCSV(exportData: any): string {
  const { batch, jobs } = exportData;
  let csv = `Batch Information\n`;
  csv += `ID,Status,Total Jobs,Completed Jobs,Codex ID,Created At\n`;
  csv += `"${batch.id}","${batch.status}","${batch.totalJobs}","${batch.completedJobs}","${batch.codexId}","${batch.createdAt}"\n\n`;
  
  if (jobs.length > 0) {
    csv += `Individual Jobs\n`;
    const headers = ['id', 'status', 'documentType', 'codexId'];
    const firstJob = jobs[0];
    const jobCardHeaders = firstJob.jobCard ? Object.keys(firstJob.jobCard) : [];
    const allHeaders = [...headers, ...jobCardHeaders.map(h => `jobCard_${h}`)];
    
    csv += allHeaders.join(',') + '\n';
    
    jobs.forEach((job: any) => {
      const jobData = [
        job.id || '',
        job.status || '',
        job.documentType || '',
        job.codexId || ''
      ];
      
      if (job.jobCard) {
        jobCardHeaders.forEach(header => {
          const value = job.jobCard[header];
          jobData.push(typeof value === 'object' ? JSON.stringify(value) : String(value || ''));
        });
      }
      
      const csvRow = jobData.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
      csv += csvRow + '\n';
    });
  }
  
  return csv;
}

function batchToXML(exportData: any): string {
  const { batch, jobs } = exportData;
  const escapeXml = (str: string) => str.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "'": return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<batch_export>\n';
  
  xml += '  <batch>\n';
  Object.entries(batch).forEach(([key, value]) => {
    xml += `    <${key}>${escapeXml(String(value || ''))}</${key}>\n`;
  });
  xml += '  </batch>\n';
  
  xml += '  <jobs>\n';
  jobs.forEach((job: any) => {
    xml += '    <job>\n';
    Object.entries(job).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        xml += `      <${key}>${JSON.stringify(value)}</${key}>\n`;
      } else {
        xml += `      <${key}>${escapeXml(String(value || ''))}</${key}>\n`;
      }
    });
    xml += '    </job>\n';
  });
  xml += '  </jobs>\n';
  
  xml += '</batch_export>';
  return xml;
}

function jobsToCSV(jobs: any[]): string {
  if (jobs.length === 0) {
    return 'No jobs to export';
  }
  
  const headers = ['id', 'status', 'documentType', 'codexId', 'createdAt'];
  const firstJob = jobs[0];
  const jobCardHeaders = firstJob.jobCard ? Object.keys(firstJob.jobCard) : [];
  const allHeaders = [...headers, ...jobCardHeaders.map(h => `jobCard_${h}`)];
  
  let csv = allHeaders.join(',') + '\n';
  
  jobs.forEach(job => {
    const jobData = [
      job.id || '',
      job.status || '',
      job.documentType || '',
      job.codexId || '',
      job.createdAt || ''
    ];
    
    if (job.jobCard) {
      jobCardHeaders.forEach(header => {
        const value = job.jobCard[header];
        jobData.push(typeof value === 'object' ? JSON.stringify(value) : String(value || ''));
      });
    }
    
    const csvRow = jobData.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
    csv += csvRow + '\n';
  });
  
  return csv;
}

function jobsToXML(jobs: any[]): string {
  const escapeXml = (str: string) => str.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "'": return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<jobs_export>\n';
  
  jobs.forEach(job => {
    xml += '  <job>\n';
    Object.entries(job).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        xml += `    <${key}>${JSON.stringify(value)}</${key}>\n`;
      } else {
        xml += `    <${key}>${escapeXml(String(value || ''))}</${key}>\n`;
      }
    });
    xml += '  </job>\n';
  });
  
  xml += '</jobs_export>';
  return xml;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize default codex
  await codexManager.initializeDefaultCodex();

  // Batch upload and process multiple job descriptions
  app.post('/api/jobs/batch-upload', upload.array('files', 10), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      const textEntries = req.body.textEntries ? JSON.parse(req.body.textEntries) : [];
      const codexId = req.body.codexId || 'job-card-v1';

      if ((!files || files.length === 0) && (!textEntries || textEntries.length === 0)) {
        return res.status(400).json({ error: 'No files or text entries provided' });
      }

      const totalJobs = (files?.length || 0) + (textEntries?.length || 0);

      // Create batch job record
      const batchJob = await storage.createBatchJob({
        status: 'processing',
        totalJobs,
        completedJobs: 0,
        codexId
      });

      // Process files
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

      // Process text entries
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

      // Start async batch processing
      processBatchJobs(batchJob.id, [...fileJobs, ...textJobs]);

      res.json({ batchId: batchJob.id, status: 'processing', totalJobs });
    } catch (error) {
      console.error('Batch upload error:', error);
      res.status(500).json({ error: 'Failed to process batch upload' });
    }
  });

  // Vision processing endpoint for PDF images
  app.post('/api/vision/extract', async (req, res) => {
    try {
      const { images, codexId } = req.body;
      
      if (!images || !Array.isArray(images) || images.length === 0) {
        return res.status(400).json({ error: 'No images provided' });
      }

      // Get codex ID from request or default to v2.1
      const jobCodexId = codexId || 'job-card-v2.1';

      // Create job record first so we have a jobId for logging
      const job = await storage.createJob({
        status: 'processing',
        originalText: '', // Will be updated after extraction
        documentType: 'pdf-vision',
        jobCard: null,
        codexId: jobCodexId
      });

      // Emit initial logs
      logStream.sendDetailedLog(job.id, {
        step: 'VISION OCR START',
        message: `Starting OCR extraction for PDF with ${images.length} pages`,
        details: {
          totalPages: images.length,
          processingPages: Math.min(images.length, 5)
        },
        type: 'info'
      });

      // Extract text from images using Vision API with jobId for logging
      const extractedText = await extractJobDescriptionFromImages(images, job.id);
      
      // Update job with extracted text
      await storage.updateJob(job.id, { originalText: extractedText });

      logStream.sendDetailedLog(job.id, {
        step: 'VISION OCR COMPLETE',
        message: `Successfully extracted ${extractedText.length} characters from PDF`,
        details: {
          extractedLength: extractedText.length
        },
        type: 'info'
      });

      // Start async processing with extracted text
      processJobDescription(job.id, extractedText);

      res.json({ jobId: job.id, status: 'processing' });
    } catch (error) {
      console.error('Vision extraction error:', error);
      res.status(500).json({ error: 'Failed to process vision extraction' });
    }
  });

  // Upload and process job description
  app.post('/api/jobs/upload', upload.single('file'), async (req, res) => {
    try {
      let documentText = '';
      let documentType = 'text';
      let jobId: string = ''; // Will be set after job creation

      // Parse document or text
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

      // Get codex ID from request or default to v2.1
      const codexId = req.body.codexId || 'job-card-v2.1';

      // Create job record
      const job = await storage.createJob({
        status: 'processing',
        originalText: documentText,
        documentType,
        jobCard: null,
        codexId
      });
      
      jobId = job.id;

      // Emit backend logs (will be buffered until WebSocket connects)
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

  // === RESUME PROCESSING ENDPOINTS ===

  // Vision processing endpoint for resume PDF images
  app.post('/api/resumes/vision-extract', async (req, res) => {
    try {
      const { images, codexId, resumeId } = req.body;
      
      if (!images || !Array.isArray(images) || images.length === 0) {
        return res.status(400).json({ error: 'No images provided' });
      }

      let resume;
      
      if (resumeId) {
        // Update existing resume (from upload endpoint)
        resume = await storage.getResume(resumeId);
        if (!resume) {
          return res.status(404).json({ error: 'Resume not found' });
        }
      } else {
        // Legacy: Create new resume record (for backward compatibility)
        const resumeCodexId = codexId || 'resume-card-v1';
        resume = await storage.createResume({
          status: 'processing',
          originalText: '', // Will be updated after extraction
          documentType: 'pdf-vision',
          documentPath: '',
          resumeCard: null,
          codexId: resumeCodexId
        });
      }

      // Emit initial logs
      logStream.sendDetailedLog(resume.id, {
        step: 'VISION OCR START',
        message: `Starting OCR extraction for resume PDF with ${images.length} pages`,
        details: {
          totalPages: images.length,
          processingPages: Math.min(images.length, 5)
        },
        type: 'info'
      });

      // Extract text from images using Vision API with resumeId for logging
      const extractedText = await extractJobDescriptionFromImages(images, resume.id);
      
      // Update resume with extracted text
      await storage.updateResume(resume.id, { originalText: extractedText });

      logStream.sendDetailedLog(resume.id, {
        step: 'VISION OCR COMPLETE',
        message: `Successfully extracted ${extractedText.length} characters from resume PDF`,
        details: {
          extractedLength: extractedText.length
        },
        type: 'info'
      });

      // Start async processing with extracted text
      processResume(resume.id, extractedText);

      res.json({ resumeId: resume.id, status: 'processing' });
    } catch (error) {
      console.error('Resume vision extraction error:', error);
      res.status(500).json({ error: 'Failed to process resume vision extraction' });
    }
  });

  // Upload and process resume
  app.post('/api/resumes/upload', upload.single('file'), async (req, res) => {
    try {
      let documentText = '';
      let documentType = 'text';
      let documentPath = '';
      let resumeId: string = '';
      let needsVisionProcessing = false;

      // Parse document or text
      if (req.file) {
        const fileSizeMB = (req.file.size / (1024 * 1024)).toFixed(2);
        console.log(`[RESUME UPLOAD] File received: ${req.file.originalname} (${fileSizeMB} MB)`);
        
        documentPath = req.file.path; // Store for embedded viewer
        const parsed = await parseDocument(req.file.path, req.file.mimetype);
        documentText = parsed.text;
        documentType = req.file.mimetype.includes('pdf') ? 'pdf' : 'docx';

        // Check if we got insufficient text from PDF (likely image-based)
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

      // Get codex ID from request or default to resume-card-v1
      const codexId = req.body.codexId || 'resume-card-v1';

      // Create resume record
      const resume = await storage.createResume({
        status: 'processing',
        originalText: documentText,
        documentType: needsVisionProcessing ? 'pdf-vision' : documentType,
        documentPath,
        resumeCard: null,
        codexId
      });
      
      resumeId = resume.id;

      // Emit backend logs
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

      // Start async processing or signal vision processing needed
      if (needsVisionProcessing) {
        // Don't start processing yet - wait for vision extraction
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

  // Get resume status and results
  app.get('/api/resumes/:id', async (req, res) => {
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

  // Get all resumes with optional filtering
  app.get('/api/resumes', async (req, res) => {
    try {
      const filters: any = {};
      
      if (req.query.status) filters.status = req.query.status as string;
      if (req.query.codexId) filters.codexId = req.query.codexId as string;
      if (req.query.jobId) filters.jobId = req.query.jobId as string;
      
      const resumes = await storage.getAllResumes(filters);
      res.json(resumes);
    } catch (error) {
      console.error('Get all resumes error:', error);
      res.status(500).json({ error: 'Failed to get resumes' });
    }
  });

  // Get batch job status and results
  app.get('/api/batch/:id', async (req, res) => {
    try {
      const batchJob = await storage.getBatchJob(req.params.id);
      if (!batchJob) {
        return res.status(404).json({ error: 'Batch job not found' });
      }
      
      // Get all jobs in this batch
      const jobs = await storage.getJobsByBatch(req.params.id);
      
      res.json({
        ...batchJob,
        jobs
      });
    } catch (error) {
      console.error('Get batch job error:', error);
      res.status(500).json({ error: 'Failed to get batch job' });
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

  // Test extraction endpoint for PromptBuilder
  app.post('/api/jobs/test-extraction', async (req, res) => {
    try {
      const { text, codex } = req.body;
      
      if (!text || !codex) {
        return res.status(400).json({ error: 'Text and codex configuration are required' });
      }

      console.log('[DEBUG] Testing extraction with text length:', text.length);
      
      // Use the OpenAI service to extract job information
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

  // === ADVANCED EXPORT API ENDPOINTS ===

  // Export single job in multiple formats (JSON, CSV, XML)
  app.get('/api/jobs/:id/export', async (req, res) => {
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

  // Export batch jobs with all individual jobs
  app.get('/api/batch/:id/export', async (req, res) => {
    try {
      const format = req.query.format as string || 'json';
      const batchJob = await storage.getBatchJob(req.params.id);
      
      if (!batchJob) {
        return res.status(404).json({ error: 'Batch job not found' });
      }

      const jobs = await storage.getJobsByBatch(req.params.id);
      const exportData = {
        batch: batchJob,
        jobs
      };

      switch (format.toLowerCase()) {
        case 'json':
          res.setHeader('Content-Disposition', `attachment; filename="batch-${batchJob.id}.json"`);
          res.setHeader('Content-Type', 'application/json');
          res.json(exportData);
          break;
          
        case 'csv':
          const csvContent = batchToCSV(exportData);
          res.setHeader('Content-Disposition', `attachment; filename="batch-${batchJob.id}.csv"`);
          res.setHeader('Content-Type', 'text/csv');
          res.send(csvContent);
          break;
          
        case 'xml':
          const xmlContent = batchToXML(exportData);
          res.setHeader('Content-Disposition', `attachment; filename="batch-${batchJob.id}.xml"`);
          res.setHeader('Content-Type', 'application/xml');
          res.send(xmlContent);
          break;
          
        default:
          res.status(400).json({ error: 'Unsupported format. Use json, csv, or xml' });
      }
    } catch (error) {
      console.error('Export batch error:', error);
      res.status(500).json({ error: 'Failed to export batch' });
    }
  });

  // Bulk export all jobs with optional filtering
  app.get('/api/jobs/export/bulk', async (req, res) => {
    try {
      const format = req.query.format as string || 'json';
      const status = req.query.status as string;
      const codexId = req.query.codexId as string;
      const fromDate = req.query.fromDate as string;
      const toDate = req.query.toDate as string;
      
      // Get all jobs with optional filters (this would need to be implemented in storage)
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

  // Webhook endpoints for external integration
  app.post('/api/webhooks/register', async (req, res) => {
    try {
      const { url, events, secret } = req.body;
      
      if (!url || !events) {
        return res.status(400).json({ error: 'URL and events are required' });
      }

      // Store webhook configuration (would need webhook storage)
      const webhook = await storage.createWebhook({
        url,
        events: Array.isArray(events) ? events : [events],
        secret: secret || '',
        active: true
      });

      res.status(201).json({ 
        id: webhook.id, 
        message: 'Webhook registered successfully',
        events: webhook.events 
      });
    } catch (error) {
      console.error('Webhook registration error:', error);
      res.status(500).json({ error: 'Failed to register webhook' });
    }
  });

  // List registered webhooks
  app.get('/api/webhooks', async (req, res) => {
    try {
      const webhooks = await storage.getAllWebhooks();
      res.json(webhooks);
    } catch (error) {
      console.error('Get webhooks error:', error);
      res.status(500).json({ error: 'Failed to get webhooks' });
    }
  });

  // Delete webhook
  app.delete('/api/webhooks/:id', async (req, res) => {
    try {
      await storage.deleteWebhook(req.params.id);
      res.json({ message: 'Webhook deleted successfully' });
    } catch (error) {
      console.error('Delete webhook error:', error);
      res.status(500).json({ error: 'Failed to delete webhook' });
    }
  });

  // API documentation endpoint
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

  // Update existing codex
  app.put('/api/codex/:id', async (req, res) => {
    try {
      const codex = await codexManager.updateCodex(req.params.id, req.body);
      if (!codex) {
        return res.status(404).json({ error: 'Codex not found' });
      }
      res.json(codex);
    } catch (error) {
      console.error('Update codex error:', error);
      res.status(500).json({ error: 'Failed to update codex' });
    }
  });

  const httpServer = createServer(app);
  
  // Initialize WebSocket logging service
  logStream.initialize(httpServer);
  
  return httpServer;
}

// Async job processing function
async function processJobDescription(jobId: string, text: string) {
  try {
    // Get the job to retrieve its codex ID
    const job = await storage.getJob(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    // Get the codex for processing
    const codex = await codexManager.getCodex(job.codexId);
    if (!codex) {
      throw new Error(`Codex '${job.codexId}' not found`);
    }

    // Log job start
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

    // Update status to extracting
    await storage.updateJob(jobId, { status: 'extracting' });
    
    logStream.sendDetailedLog(jobId, {
      step: 'STATUS UPDATE',
      message: 'Job status updated to: extracting',
      type: 'info'
    });

    // Extract job data using AI - use two-pass for v2.1, legacy for v1
    const prompts = codex.prompts as { system: string; user: string };
    let extractedData;
    
    if (codex.id === 'job-card-v2.1') {
      console.log('[V2.1] Using two-pass intelligent extraction...');
      extractedData = await extractJobDataTwoPass(text, codex.schema, prompts.system, prompts.user, jobId);
    } else {
      // Legacy single-pass extraction for v1 codex
      extractedData = await extractJobData({
        text,
        schema: codex.schema,
        systemPrompt: prompts.system,
        userPrompt: prompts.user
      });
    }

    // Update status to validating
    await storage.updateJob(jobId, { status: 'validating' });

    // Validate and enhance the job card
    const validatedJobCard = await validateAndEnhanceJobCard(extractedData, codex.schema, jobId);

    // Normalize the job card structure immediately
    const finalJobCard = validatedJobCard.jobCard || validatedJobCard;

    // Apply backend parsers for v2.1 to normalize fields
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

    // Anti-hallucination: Verify evidence quotes exist in source text for v2.1
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
      
      // If key fields have no evidence, flag them
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

    // Apply missing rules from codex
    if (codex.missingRules && Array.isArray(codex.missingRules)) {
      finalJobCard.missing_fields = finalJobCard.missing_fields || [];
      
      // Add codex-defined missing field rules
      for (const rule of codex.missingRules) {
        const fieldExists = getNestedValue(finalJobCard, rule.path);
        if (!fieldExists) {
          // Check if this field already has a low-confidence warning
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

    // Flag low-confidence fields for v2.1
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

    // Update job with final results
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

// Async resume processing function
async function processResume(resumeId: string, text: string) {
  try {
    // Get the resume to retrieve its codex ID
    const resume = await storage.getResume(resumeId);
    if (!resume) {
      throw new Error('Resume not found');
    }

    // Get the codex for processing
    const codex = await codexManager.getCodex(resume.codexId);
    if (!codex) {
      throw new Error(`Codex '${resume.codexId}' not found`);
    }

    // Log resume processing start
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

    // Update status to extracting
    await storage.updateResume(resumeId, { status: 'extracting' });
    
    logStream.sendDetailedLog(resumeId, {
      step: 'STATUS UPDATE',
      message: 'Resume status updated to: extracting',
      type: 'info'
    });

    // Extract resume data using AI (using two-pass system for resume-card-v1)
    const prompts = codex.prompts as { system: string; user: string };
    console.log('[RESUME] Using intelligent two-pass extraction...');
    const extractedData = await extractJobDataTwoPass(text, codex.schema, prompts.system, prompts.user, resumeId);

    // Update status to validating
    await storage.updateResume(resumeId, { status: 'validating' });

    // Validate and enhance the resume card
    const validatedResumeCard = await validateAndEnhanceJobCard(extractedData, codex.schema, resumeId);

    // Normalize the resume card structure
    const finalResumeCard = validatedResumeCard.jobCard || validatedResumeCard;

    // Anti-hallucination: Verify evidence quotes exist in source text
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
      
      // If key fields have no evidence, flag them
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

    // Apply missing rules from codex
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

    // Flag low-confidence fields
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

    // Update resume with final results
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

// Batch job processing function
async function processBatchJobs(batchId: string, jobs: any[]): Promise<void> {
  try {
    const batchJob = await storage.getBatchJob(batchId);
    if (!batchJob) {
      throw new Error('Batch job not found');
    }

    // Update batch status to processing
    await storage.updateBatchJob(batchId, { status: 'processing' });

    // Process jobs concurrently with limited parallelism 
    const concurrencyLimit = 3; // Process 3 jobs at a time to avoid overwhelming the API
    
    for (let i = 0; i < jobs.length; i += concurrencyLimit) {
      const batch = jobs.slice(i, i + concurrencyLimit);
      const promises = batch.map(job => processJobDescription(job.id, job.originalText));
      
      await Promise.allSettled(promises);
      
      // Update progress
      const currentCompleted = Math.min(i + concurrencyLimit, jobs.length);
      await storage.updateBatchJob(batchId, { 
        completedJobs: currentCompleted 
      });
    }

    // Mark batch as completed
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

// Helper function to get nested object values
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current && current[key], obj);
}
