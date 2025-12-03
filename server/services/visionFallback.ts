import fs from 'fs';
import path from 'path';
import { extractJobDescriptionFromImages } from './openai';
import { logStream } from './logStream';
import { logger } from '../utils/logger';

export interface VisionExtractionResult {
  text: string;
  source: 'vision' | 'text-layer';
  pageCount?: number;
}

// Generic user-facing error message - no technical details exposed
const GENERIC_OCR_ERROR = "We couldn't extract readable text from this job description. If this is a scanned image or screenshot, please upload a text-based PDF or paste the job description text directly.";

export async function extractTextFromPdfWithVision(
  filePath: string, 
  jobId: string
): Promise<VisionExtractionResult> {
  const visionLog = logger.withContext({ jobId, operation: 'vision-fallback' });
  
  try {
    visionLog.info('TEXT_EXTRACTION_TOO_SHORT → USING_VISION', { filePath });
    
    logStream.sendDetailedLog(jobId, {
      step: 'VISION FALLBACK',
      message: 'Text extraction too short, attempting OCR processing',
      type: 'info'
    });

    let pdf2pic;
    try {
      const module = await import('pdf2pic');
      pdf2pic = module.default;
    } catch (importError) {
      const errorMsg = (importError as Error).message;
      // Internal log for developers - keep technical details here
      visionLog.error('VISION_FALLBACK_SKIPPED: missing ImageMagick/Ghostscript (pdf2pic import failed)', { error: errorMsg });
      
      logStream.sendDetailedLog(jobId, {
        step: 'VISION_FALLBACK_SKIPPED',
        message: 'OCR processing unavailable - system dependencies not installed',
        type: 'error'
      });
      
      // Throw with generic message for user
      throw new Error(GENERIC_OCR_ERROR);
    }
    
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    let convert;
    try {
      convert = pdf2pic.fromPath(filePath, {
        density: 300,
        saveFilename: `vision-${jobId}`,
        savePath: tempDir,
        format: 'png',
        width: 2000,
        height: 2000
      });
    } catch (initError) {
      const errorMsg = (initError as Error).message;
      // Internal log for developers
      visionLog.error('VISION_FALLBACK_SKIPPED: pdf2pic initialization failed (likely missing ImageMagick/Ghostscript)', { error: errorMsg });
      
      logStream.sendDetailedLog(jobId, {
        step: 'VISION_FALLBACK_SKIPPED',
        message: 'OCR processing unavailable - initialization failed',
        type: 'error'
      });
      
      // Throw with generic message for user
      throw new Error(GENERIC_OCR_ERROR);
    }
    
    const maxPages = 5;
    const base64Images: string[] = [];
    
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      try {
        visionLog.debug(`Converting PDF page ${pageNum} to image`);
        
        const convertResult = await convert(pageNum, { responseType: 'base64' });
        
        if (convertResult && convertResult.base64) {
          base64Images.push(convertResult.base64);
          visionLog.debug(`Page ${pageNum} converted successfully`, { 
            imageLength: convertResult.base64.length 
          });
        }
      } catch (pageError) {
        const errorMsg = (pageError as Error).message;
        
        if (errorMsg.includes('ImageMagick') || 
            errorMsg.includes('Ghostscript') || 
            errorMsg.includes('convert') ||
            errorMsg.includes('poppler') ||
            errorMsg.includes('Invalid page')) {
          // Internal log for developers
          visionLog.warn(`VISION_FALLBACK_SKIPPED: Page ${pageNum} conversion failed (system dep issue)`, { error: errorMsg });
          break;
        }
        
        visionLog.warn(`Page ${pageNum} conversion failed, continuing`, { error: errorMsg });
      }
    }
    
    // Cleanup temp files
    try {
      if (fs.existsSync(tempDir)) {
        const tempFiles = fs.readdirSync(tempDir);
        for (const file of tempFiles) {
          if (file.startsWith(`vision-${jobId}`)) {
            fs.unlinkSync(path.join(tempDir, file));
          }
        }
      }
    } catch (cleanupError) {
      visionLog.warn('Failed to clean up temp files', { error: (cleanupError as Error).message });
    }
    
    if (base64Images.length === 0) {
      // Internal log for developers
      visionLog.error('VISION_FALLBACK_FAILED: No images converted from PDF');
      
      logStream.sendDetailedLog(jobId, {
        step: 'VISION_FALLBACK_FAILED',
        message: 'Could not process PDF for text extraction',
        type: 'error'
      });
      
      // Throw with generic message for user
      throw new Error(GENERIC_OCR_ERROR);
    }
    
    logStream.sendDetailedLog(jobId, {
      step: 'VISION OCR START',
      message: `Processing ${base64Images.length} page(s) with OCR`,
      details: { pageCount: base64Images.length },
      type: 'info'
    });
    
    let extractedText: string;
    try {
      extractedText = await extractJobDescriptionFromImages(base64Images, jobId);
    } catch (visionApiError) {
      const errorMsg = (visionApiError as Error).message;
      // Internal log for developers
      visionLog.error('VISION_API_FAILED: OpenAI vision extraction error', { error: errorMsg });
      
      logStream.sendDetailedLog(jobId, {
        step: 'VISION_API_FAILED',
        message: 'OCR text extraction failed',
        type: 'error'
      });
      
      // Throw with generic message for user
      throw new Error(GENERIC_OCR_ERROR);
    }
    
    const trimmedText = extractedText.trim();
    
    if (trimmedText.length < 50) {
      // Internal log for developers
      visionLog.error('VISION_EXTRACTION_FAILED: Insufficient text extracted', { extractedLength: trimmedText.length });
      
      logStream.sendDetailedLog(jobId, {
        step: 'VISION_EXTRACTION_FAILED',
        message: 'Could not extract enough readable text from this document',
        type: 'error'
      });
      
      // Throw with generic message for user
      throw new Error(GENERIC_OCR_ERROR);
    }
    
    visionLog.info('VISION_EXTRACTION_SUCCESS', { 
      extractedLength: trimmedText.length,
      pageCount: base64Images.length
    });
    
    logStream.sendDetailedLog(jobId, {
      step: 'VISION_EXTRACTION_SUCCESS',
      message: `Successfully extracted ${trimmedText.length} characters`,
      details: { 
        extractedLength: trimmedText.length,
        pageCount: base64Images.length 
      },
      type: 'info'
    });
    
    return {
      text: trimmedText,
      source: 'vision',
      pageCount: base64Images.length
    };
    
  } catch (error) {
    const errorMsg = (error as Error).message;
    
    // If it's already our generic message, just re-throw
    if (errorMsg === GENERIC_OCR_ERROR) {
      throw error;
    }
    
    // Internal log for any unexpected errors
    visionLog.error('VISION_FALLBACK_UNEXPECTED_ERROR', { error: errorMsg });
    
    // Wrap unexpected errors with generic message
    throw new Error(GENERIC_OCR_ERROR);
  }
}
