import { storage } from "../storage";
import { parseDocument, parseTextInput } from "./documentParser";
import { logStream } from "./logStream";
import { processJobDescription, processBatchJobs } from "./processingFlows";
import { extractTextFromPdfWithVision } from "./visionFallback";
import { notFound, badRequest } from "../utils/errors";
import { logger } from "../utils/logger";
import type { Job, InsertJob } from "@shared/schema";

const MIN_TEXT_THRESHOLD = 200;

export interface CreateJobFromFileInput {
  filePath: string;
  mimeType: string;
  originalName: string;
  fileSize: number;
  codexId?: string;
}

export interface CreateJobFromTextInput {
  text: string;
  codexId?: string;
}

export interface CreateBatchJobsInput {
  files: Array<{
    path: string;
    mimeType: string;
    originalName: string;
  }>;
  textEntries: string[];
  codexId?: string;
}

export interface JobResult {
  jobId: string;
  status: string;
}

export interface BatchJobResult {
  batchId: string;
  status: string;
  totalJobs: number;
}

export async function createJobFromFile(input: CreateJobFromFileInput): Promise<JobResult> {
  const { filePath, mimeType, originalName, fileSize, codexId = 'job-card-v2.1' } = input;
  const timer = logger.startTimer();
  
  const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);
  logger.info(`Processing file upload: ${originalName}`, { fileSizeMB, mimeType });
  
  const parsed = await parseDocument(filePath, mimeType);
  const isPdf = mimeType.includes('pdf');
  let documentType = isPdf ? 'pdf' : 'docx';
  
  const normalizedText = parsed.text.trim();
  const textLength = normalizedText.length;
  
  let finalText = normalizedText;
  let extractionSource: 'text-layer' | 'vision' = 'text-layer';
  
  const job = await storage.createJob({
    status: 'processing',
    originalText: normalizedText,
    documentType,
    jobCard: null,
    codexId
  });
  
  const jobLog = logger.withContext({ jobId: job.id });
  
  logStream.sendDetailedLog(job.id, {
    step: 'SERVER RECEIVED',
    message: `Document received on server: ${documentType.toUpperCase()}`,
    details: {
      documentType,
      textLength,
      codexId
    },
    type: 'info'
  });
  
  logStream.sendDetailedLog(job.id, {
    step: 'DOCUMENT PARSED',
    message: `Successfully parsed ${originalName}`,
    details: {
      filename: originalName,
      fileSizeMB,
      extractedChars: textLength
    },
    type: 'info'
  });
  
  if (isPdf && textLength < MIN_TEXT_THRESHOLD) {
    jobLog.warn('TEXT_EXTRACTION_TOO_SHORT', { 
      textLength, 
      threshold: MIN_TEXT_THRESHOLD 
    });
    
    logStream.sendDetailedLog(job.id, {
      step: 'TEXT EXTRACTION TOO SHORT',
      message: `Only ${textLength} characters extracted (minimum: ${MIN_TEXT_THRESHOLD}). Attempting vision/OCR fallback...`,
      details: { textLength, threshold: MIN_TEXT_THRESHOLD },
      type: 'info'
    });
    
    try {
      const visionResult = await extractTextFromPdfWithVision(filePath, job.id);
      finalText = visionResult.text;
      extractionSource = 'vision';
      documentType = 'pdf-vision';
      
      await storage.updateJob(job.id, { 
        originalText: finalText,
        documentType: 'pdf-vision'
      });
      
      jobLog.info('Vision fallback successful', { 
        extractedLength: finalText.length,
        pageCount: visionResult.pageCount
      });
      
    } catch (visionError) {
      const errorMsg = (visionError as Error).message;
      jobLog.error('Vision fallback failed', { error: errorMsg });
      
      logStream.sendDetailedLog(job.id, {
        step: 'EXTRACTION FAILED',
        message: `Could not extract text from this document. The file appears to be an image-only PDF that we couldn't process.`,
        details: { error: errorMsg },
        type: 'error'
      });
      
      await storage.updateJob(job.id, {
        status: 'failed',
        processingError: 'Could not extract text from this job description. The file appears to be an image-only PDF. Try uploading a version with selectable text or paste the job description text directly.',
        jobCard: { error: errorMsg }
      });
      
      return { jobId: job.id, status: 'failed' };
    }
  }
  
  jobLog.info('Job created from file upload', { 
    documentType, 
    textLength: finalText.length,
    extractionSource,
    duration: timer()
  });
  
  logStream.sendDetailedLog(job.id, {
    step: 'INITIALIZING',
    message: `Loading codex and preparing AI extraction pipeline...`,
    details: { codexId, jobId: job.id, extractionSource },
    type: 'info'
  });
  
  processJobDescription(job.id, finalText);
  
  return { jobId: job.id, status: 'processing' };
}

export async function createJobFromText(input: CreateJobFromTextInput): Promise<JobResult> {
  const { text, codexId = 'job-card-v2.1' } = input;
  const timer = logger.startTimer();
  
  if (!text || text.trim().length === 0) {
    throw badRequest('Text input is required');
  }
  
  logger.info(`Processing text input: ${text.length} characters`);
  
  const parsed = parseTextInput(text);
  
  const job = await storage.createJob({
    status: 'processing',
    originalText: parsed.text,
    documentType: 'text',
    jobCard: null,
    codexId
  });
  
  const jobLog = logger.withContext({ jobId: job.id });
  jobLog.info('Job created from text input', { 
    textLength: parsed.text.length,
    duration: timer()
  });
  
  logStream.sendDetailedLog(job.id, {
    step: 'SERVER RECEIVED',
    message: `Document received on server: TEXT`,
    details: {
      documentType: 'text',
      textLength: parsed.text.length,
      codexId
    },
    type: 'info'
  });
  
  logStream.sendDetailedLog(job.id, {
    step: 'TEXT PARSED',
    message: `Text input parsed successfully`,
    details: {
      inputLength: text.length,
      parsedLength: parsed.text.length
    },
    type: 'info'
  });
  
  logStream.sendDetailedLog(job.id, {
    step: 'INITIALIZING',
    message: `Loading codex and preparing AI extraction pipeline...`,
    details: { codexId, jobId: job.id },
    type: 'info'
  });
  
  processJobDescription(job.id, parsed.text);
  
  return { jobId: job.id, status: 'processing' };
}

export async function createBatchJobs(input: CreateBatchJobsInput): Promise<BatchJobResult> {
  const { files, textEntries, codexId = 'job-card-v1' } = input;
  const timer = logger.startTimer();
  
  if (files.length === 0 && textEntries.length === 0) {
    throw badRequest('No files or text entries provided');
  }
  
  const totalJobs = files.length + textEntries.length;
  
  logger.info(`Creating batch job with ${totalJobs} items`, { 
    fileCount: files.length, 
    textCount: textEntries.length 
  });
  
  const batchJob = await storage.createBatchJob({
    status: 'processing',
    totalJobs,
    completedJobs: 0,
    codexId
  });
  
  const allJobs: Job[] = [];
  
  for (const file of files) {
    const parsed = await parseDocument(file.path, file.mimeType);
    const documentType = file.mimeType.includes('pdf') ? 'pdf' : 'docx';
    
    const job = await storage.createJob({
      status: 'pending',
      originalText: parsed.text,
      documentType,
      jobCard: null,
      codexId,
      batchId: batchJob.id
    });
    allJobs.push(job);
  }
  
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
    allJobs.push(job);
  }
  
  logger.info(`Batch created, starting processing`, { 
    batchId: batchJob.id, 
    jobCount: allJobs.length,
    duration: timer()
  });
  
  processBatchJobs(batchJob.id, allJobs);
  
  return { batchId: batchJob.id, status: 'processing', totalJobs };
}

export async function getJob(jobId: string): Promise<Job> {
  const job = await storage.getJob(jobId);
  if (!job) {
    throw notFound('Job', jobId);
  }
  return job;
}

export async function deleteJob(jobId: string): Promise<void> {
  const job = await storage.getJob(jobId);
  if (!job) {
    throw notFound('Job', jobId);
  }
  
  const deleted = await storage.deleteJob(jobId);
  if (!deleted) {
    throw new Error('Failed to delete job');
  }
  
  logger.info('Job deleted', { jobId });
}

export interface JobFilters {
  status?: string;
  codexId?: string;
  page?: number;
  limit?: number;
  fromDate?: string;
  toDate?: string;
}

export interface PaginatedJobsResult {
  jobs: Job[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function listJobs(filters: JobFilters): Promise<PaginatedJobsResult> {
  const page = filters.page || 1;
  const limit = filters.limit || 12;
  
  const jobs = await storage.getAllJobs(filters);
  
  const countFilters: Pick<JobFilters, 'status' | 'codexId'> = {};
  if (filters.status) countFilters.status = filters.status;
  if (filters.codexId) countFilters.codexId = filters.codexId;
  
  const total = await storage.countJobs(countFilters);
  
  return {
    jobs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}
