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

export async function extractTextFromPdfWithVision(
  filePath: string, 
  jobId: string
): Promise<VisionExtractionResult> {
  const visionLog = logger.withContext({ jobId, operation: 'vision-fallback' });
  
  try {
    visionLog.info('TEXT_EXTRACTION_TOO_SHORT → USING_VISION', { filePath });
    
    logStream.sendDetailedLog(jobId, {
      step: 'VISION FALLBACK',
      message: 'Text extraction too short, switching to OCR/vision processing',
      type: 'info'
    });

    let pdf2pic;
    try {
      const module = await import('pdf2pic');
      pdf2pic = module.default;
    } catch (importError) {
      const errorMsg = (importError as Error).message;
      visionLog.error('PDF2PIC_IMPORT_FAILED', { error: errorMsg });
      
      logStream.sendDetailedLog(jobId, {
        step: 'VISION_SYSTEM_DEPS_MISSING',
        message: 'PDF to image conversion requires system dependencies (ImageMagick, Ghostscript) that are not available.',
        type: 'error'
      });
      
      throw new Error('VISION_SYSTEM_DEPS_MISSING: PDF to image conversion requires ImageMagick and Ghostscript which are not installed. Please paste the job description text directly instead of uploading this PDF.');
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
      visionLog.error('PDF2PIC_INIT_FAILED', { error: errorMsg });
      
      if (errorMsg.includes('ImageMagick') || 
          errorMsg.includes('Ghostscript') || 
          errorMsg.includes('convert') ||
          errorMsg.includes('poppler')) {
        logStream.sendDetailedLog(jobId, {
          step: 'VISION_SYSTEM_DEPS_MISSING',
          message: 'PDF to image conversion requires system dependencies (ImageMagick, Ghostscript) that are not available.',
          type: 'error'
        });
        
        throw new Error('VISION_SYSTEM_DEPS_MISSING: PDF to image conversion requires ImageMagick and Ghostscript which are not installed. Please paste the job description text directly.');
      }
      
      throw initError;
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
          visionLog.warn(`Page ${pageNum} conversion failed, stopping`, { error: errorMsg });
          break;
        }
        
        visionLog.warn(`Page ${pageNum} conversion failed, continuing`, { error: errorMsg });
      }
    }
    
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
      logStream.sendDetailedLog(jobId, {
        step: 'VISION FALLBACK FAILED',
        message: 'Could not convert PDF pages to images. System may be missing required dependencies (ImageMagick, Ghostscript).',
        type: 'error'
      });
      
      throw new Error('VISION_CONVERSION_FAILED: Could not convert PDF to images for OCR processing');
    }
    
    logStream.sendDetailedLog(jobId, {
      step: 'VISION OCR START',
      message: `Processing ${base64Images.length} page(s) with OpenAI Vision`,
      details: { pageCount: base64Images.length },
      type: 'info'
    });
    
    const extractedText = await extractJobDescriptionFromImages(base64Images, jobId);
    const trimmedText = extractedText.trim();
    
    if (trimmedText.length < 50) {
      logStream.sendDetailedLog(jobId, {
        step: 'VISION_EXTRACTION_FAILED',
        message: `Vision extraction returned insufficient text (${trimmedText.length} chars)`,
        details: { extractedLength: trimmedText.length },
        type: 'error'
      });
      
      throw new Error(`VISION_EXTRACTION_FAILED: Could not extract meaningful text from PDF images (only ${trimmedText.length} characters extracted)`);
    }
    
    visionLog.info('VISION_EXTRACTION_SUCCESS', { 
      extractedLength: trimmedText.length,
      pageCount: base64Images.length
    });
    
    logStream.sendDetailedLog(jobId, {
      step: 'VISION_EXTRACTION_SUCCESS',
      message: `Successfully extracted ${trimmedText.length} characters using OCR`,
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
    visionLog.error('Vision fallback failed', { error: errorMsg });
    throw error;
  }
}
