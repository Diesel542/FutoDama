import { storage } from "../storage";
import { parseDocument, parseTextInput } from "./documentParser";
import { logStream } from "./logStream";
import { processResume } from "./processingFlows";
import { extractJobDescriptionFromImages } from "./openai";
import { notFound, badRequest } from "../utils/errors";
import { logger } from "../utils/logger";
import type { Resume } from "@shared/schema";

export interface CreateResumeFromFileInput {
  filePath: string;
  mimeType: string;
  originalName: string;
  fileSize: number;
  codexId?: string;
}

export interface CreateResumeFromTextInput {
  text: string;
  codexId?: string;
}

export interface VisionExtractInput {
  images: string[];
  codexId?: string;
  resumeId?: string;
}

export interface ResumeResult {
  resumeId: string;
  status: string;
  needsVision?: boolean;
  message?: string;
}

export async function createResumeFromFile(input: CreateResumeFromFileInput): Promise<ResumeResult> {
  const { filePath, mimeType, originalName, fileSize, codexId = 'resume-card-v1' } = input;
  const timer = logger.startTimer();
  
  const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);
  logger.info(`Processing resume file upload: ${originalName}`, { fileSizeMB, mimeType });
  
  const parsed = await parseDocument(filePath, mimeType);
  const documentType = mimeType.includes('pdf') ? 'pdf' : 'docx';
  const documentPath = `/${filePath}`;
  
  const needsVisionProcessing = mimeType.includes('pdf') && parsed.text.trim().length < 100;
  
  if (needsVisionProcessing) {
    logger.info('Insufficient text extracted, will need vision processing', { 
      textLength: parsed.text.length 
    });
  }
  
  const resume = await storage.createResume({
    status: 'processing',
    originalText: parsed.text,
    documentType: needsVisionProcessing ? 'pdf-vision' : documentType,
    documentPath,
    resumeCard: null,
    codexId
  });
  
  const resumeLog = logger.withContext({ resumeId: resume.id });
  resumeLog.info('Resume created from file upload', { 
    documentType, 
    textLength: parsed.text.length,
    needsVision: needsVisionProcessing,
    duration: timer()
  });
  
  logStream.sendDetailedLog(resume.id, {
    step: 'SERVER RECEIVED',
    message: `Resume document received on server: ${documentType.toUpperCase()}`,
    details: {
      documentType,
      textLength: parsed.text.length,
      codexId
    },
    type: 'info'
  });
  
  logStream.sendDetailedLog(resume.id, {
    step: 'DOCUMENT PARSED',
    message: `Successfully parsed ${originalName}`,
    details: {
      filename: originalName,
      fileSizeMB,
      extractedChars: parsed.text.length
    },
    type: 'info'
  });
  
  logStream.sendDetailedLog(resume.id, {
    step: 'INITIALIZING',
    message: `Loading resume codex and preparing AI extraction pipeline...`,
    details: { codexId, resumeId: resume.id },
    type: 'info'
  });
  
  if (needsVisionProcessing) {
    return { 
      resumeId: resume.id, 
      status: 'processing',
      needsVision: true,
      message: 'Image-based PDF detected. Please use vision processing.'
    };
  }
  
  processResume(resume.id, parsed.text);
  return { resumeId: resume.id, status: 'processing' };
}

export async function createResumeFromText(input: CreateResumeFromTextInput): Promise<ResumeResult> {
  const { text, codexId = 'resume-card-v1' } = input;
  const timer = logger.startTimer();
  
  if (!text || text.trim().length === 0) {
    throw badRequest('Text input is required');
  }
  
  logger.info(`Processing resume text input: ${text.length} characters`);
  
  const parsed = parseTextInput(text);
  
  const resume = await storage.createResume({
    status: 'processing',
    originalText: parsed.text,
    documentType: 'text',
    documentPath: '',
    resumeCard: null,
    codexId
  });
  
  const resumeLog = logger.withContext({ resumeId: resume.id });
  resumeLog.info('Resume created from text input', { 
    textLength: parsed.text.length,
    duration: timer()
  });
  
  logStream.sendDetailedLog(resume.id, {
    step: 'SERVER RECEIVED',
    message: `Resume document received on server: TEXT`,
    details: {
      documentType: 'text',
      textLength: parsed.text.length,
      codexId
    },
    type: 'info'
  });
  
  logStream.sendDetailedLog(resume.id, {
    step: 'TEXT PARSED',
    message: `Resume text input parsed successfully`,
    details: {
      inputLength: text.length,
      parsedLength: parsed.text.length
    },
    type: 'info'
  });
  
  logStream.sendDetailedLog(resume.id, {
    step: 'INITIALIZING',
    message: `Loading resume codex and preparing AI extraction pipeline...`,
    details: { codexId, resumeId: resume.id },
    type: 'info'
  });
  
  processResume(resume.id, parsed.text);
  return { resumeId: resume.id, status: 'processing' };
}

export async function processVisionExtraction(input: VisionExtractInput): Promise<ResumeResult> {
  const { images, codexId = 'resume-card-v1', resumeId } = input;
  const timer = logger.startTimer();
  
  if (!images || images.length === 0) {
    throw badRequest('No images provided');
  }
  
  let resume: Resume;
  
  if (resumeId) {
    const existing = await storage.getResume(resumeId);
    if (!existing) {
      throw notFound('Resume', resumeId);
    }
    resume = existing;
  } else {
    resume = await storage.createResume({
      status: 'processing',
      originalText: '',
      documentType: 'pdf-vision',
      documentPath: '',
      resumeCard: null,
      codexId
    });
  }
  
  const resumeLog = logger.withContext({ resumeId: resume.id });
  resumeLog.info('Starting vision extraction', { 
    pageCount: images.length,
    duration: timer()
  });
  
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
    details: { extractedLength: extractedText.length },
    type: 'info'
  });
  
  resumeLog.info('Vision extraction complete', { 
    extractedLength: extractedText.length,
    duration: timer()
  });
  
  processResume(resume.id, extractedText);
  
  return { resumeId: resume.id, status: 'processing' };
}

export async function getResume(resumeId: string): Promise<Resume> {
  const resume = await storage.getResume(resumeId);
  if (!resume) {
    throw notFound('Resume', resumeId);
  }
  return resume;
}

export async function deleteResume(resumeId: string): Promise<void> {
  const resume = await storage.getResume(resumeId);
  if (!resume) {
    throw notFound('Resume', resumeId);
  }
  
  const deleted = await storage.deleteResume(resumeId);
  if (!deleted) {
    throw new Error('Failed to delete resume');
  }
  
  logger.info('Resume deleted', { resumeId });
}

export interface ResumeFilters {
  status?: string;
  codexId?: string;
  jobId?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResumesResult {
  resumes: Resume[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function listResumes(filters: ResumeFilters): Promise<PaginatedResumesResult> {
  const page = filters.page || 1;
  const limit = filters.limit || 12;
  
  const resumes = await storage.getAllResumes(filters);
  
  const countFilters: Pick<ResumeFilters, 'status' | 'codexId' | 'jobId'> = {};
  if (filters.status) countFilters.status = filters.status;
  if (filters.codexId) countFilters.codexId = filters.codexId;
  if (filters.jobId) countFilters.jobId = filters.jobId;
  
  const total = await storage.countResumes(countFilters);
  
  return {
    resumes,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}
