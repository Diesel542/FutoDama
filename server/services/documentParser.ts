import fs from 'fs';
import path from 'path';
import { extractJobDescriptionFromImage } from './openai';

export interface ParsedDocument {
  text: string;
  metadata?: {
    pages?: number;
    wordCount?: number;
  };
}

export async function parseDocument(filePath: string, mimeType: string): Promise<ParsedDocument> {
  try {
    // Get file extension as fallback for MIME type detection
    const extension = path.extname(filePath).toLowerCase();
    
    // Check for PDF files
    if (mimeType.includes('pdf') || extension === '.pdf') {
      return await parsePDF(filePath);
    } 
    // Check for DOCX files
    else if (mimeType.includes('document') || mimeType.includes('docx') || extension === '.docx') {
      return await parseDOCX(filePath);
    }
    // Handle text files (.txt, text/plain MIME type)
    else if (mimeType.includes('text/plain') || extension === '.txt') {
      return await parseTextFile(filePath);
    }
    // Handle common misdetected MIME types by checking file extension
    else if (mimeType === 'application/octet-stream') {
      if (extension === '.pdf') {
        return await parsePDF(filePath);
      } else if (extension === '.docx') {
        return await parseDOCX(filePath);
      } else if (extension === '.txt') {
        return await parseTextFile(filePath);
      } else {
        throw new Error(`Unsupported file extension: ${extension}. Supported formats: PDF (.pdf), DOCX (.docx), TXT (.txt)`);
      }
    } 
    else {
      throw new Error(`Unsupported file type: ${mimeType}. Supported formats: PDF, DOCX, TXT`);
    }
  } catch (error) {
    console.error("Document parsing error:", error);
    throw new Error(`Failed to parse document: ${(error as Error).message}`);
  }
}

async function parsePDF(filePath: string): Promise<ParsedDocument> {
  console.log('[DEBUG] Attempting to parse PDF at path:', filePath);
  console.log('[DEBUG] File exists:', fs.existsSync(filePath));
  
  try {
    // Try using pdf-parse
    const { default: pdfParse } = await import('pdf-parse');
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    
    // Return whatever text we extracted (even if minimal)
    // The upload endpoint will check if vision processing is needed
    console.log('[DEBUG] pdf-parse extracted text length:', data.text?.length || 0);
    return {
      text: data.text || '',
      metadata: {
        pages: data.numpages || 0,
        wordCount: data.text ? data.text.split(/\s+/).length : 0
      }
    };
  } catch (pdfError) {
    console.log('[DEBUG] pdf-parse failed:', (pdfError as Error).message);
    
    // Return empty text - let the upload endpoint decide if vision is needed
    return {
      text: '',
      metadata: {
        pages: 0,
        wordCount: 0
      }
    };
  }
}

async function parsePDFWithVision(filePath: string): Promise<ParsedDocument> {
  try {
    console.log('[DEBUG] Starting vision-based PDF processing');
    
    // Convert PDF to images using pdf2pic
    const { default: pdf2pic } = await import('pdf2pic');
    
    // Create temp directory if it doesn't exist
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const convert = pdf2pic.fromPath(filePath, {
      density: 300,           // High DPI for better text recognition
      saveFilename: "page",
      savePath: tempDir,
      format: "png",
      width: 2000,
      height: 2000
    });
    
    // Convert first few pages (limit to avoid excessive API usage)
    const maxPages = 3;
    const extractedTexts: string[] = [];
    
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      try {
        console.log(`[DEBUG] Converting PDF page ${pageNum} to image`);
        const convertResult = await convert(pageNum, { responseType: "base64" });
        
        if (convertResult && convertResult.base64) {
          const base64Image = convertResult.base64;
          console.log(`[DEBUG] Image converted to base64, length: ${base64Image.length}`);
          
          // Extract text using OpenAI Vision
          const extractedText = await extractJobDescriptionFromImage(base64Image);
          console.log(`[DEBUG] Vision API response for page ${pageNum}:`, extractedText.substring(0, 200));
          
          if (extractedText.trim()) {
            extractedTexts.push(extractedText);
            console.log(`[DEBUG] Vision API extracted ${extractedText.length} characters from page ${pageNum}`);
          } else {
            console.log(`[DEBUG] Vision API returned empty text for page ${pageNum}`);
          }
        } else {
          console.log(`[DEBUG] No base64 data returned for page ${pageNum}, convertResult:`, convertResult);
        }
      } catch (pageError) {
        console.log(`[DEBUG] Failed to process page ${pageNum}:`, (pageError as Error).message);
        
        // If this is a system dependency error, provide helpful message
        if ((pageError as Error).message.includes('ImageMagick') || 
            (pageError as Error).message.includes('Ghostscript') || 
            (pageError as Error).message.includes('convert') ||
            (pageError as Error).message.includes('poppler')) {
          throw new Error('PDF image conversion requires system dependencies (ImageMagick, Ghostscript, Poppler) that are not available on this host. Cannot process image-based PDFs.');
        }
        
        // Continue with other pages for other errors
        if (pageNum === 1) {
          console.log('[DEBUG] First page failed, continuing with remaining pages');
        }
      }
    }
    
    // Clean up temp files
    try {
      if (fs.existsSync(tempDir)) {
        const tempFiles = fs.readdirSync(tempDir);
        for (const file of tempFiles) {
          if (file.startsWith('page')) {
            fs.unlinkSync(path.join(tempDir, file));
          }
        }
      }
    } catch (cleanupError) {
      console.log('[DEBUG] Failed to clean up temp files:', (cleanupError as Error).message);
    }
    
    if (extractedTexts.length === 0) {
      throw new Error('No text could be extracted from PDF using vision processing');
    }
    
    // Combine extracted text from all pages
    const combinedText = extractedTexts.join('\n\n--- Page Break ---\n\n');
    
    console.log('[DEBUG] Vision processing completed successfully, total text length:', combinedText.length);
    
    return {
      text: combinedText,
      metadata: {
        pages: extractedTexts.length,
        wordCount: combinedText.split(/\s+/).length
      }
    };
  } catch (error) {
    console.error('[ERROR] Vision-based PDF processing failed:', error);
    throw new Error(`Vision PDF processing failed: ${(error as Error).message}`);
  }
}

async function parseDOCX(filePath: string): Promise<ParsedDocument> {
  try {
    const docxParser = await import('docx-parser');
    const dataBuffer = fs.readFileSync(filePath);
    
    return new Promise((resolve, reject) => {
      (docxParser as any).parseBuffer(dataBuffer, (data: string) => {
        resolve({
          text: data,
          metadata: {
            wordCount: data.split(/\s+/).length
          }
        });
      }, reject);
    });
  } catch (error) {
    throw new Error(`DOCX parsing failed: ${(error as Error).message}`);
  }
}

async function parseTextFile(filePath: string): Promise<ParsedDocument> {
  try {
    const text = fs.readFileSync(filePath, 'utf-8');
    return {
      text: text.trim(),
      metadata: {
        wordCount: text.trim().split(/\s+/).length
      }
    };
  } catch (error) {
    throw new Error(`Text file parsing failed: ${(error as Error).message}`);
  }
}

export function parseTextInput(text: string): ParsedDocument {
  return {
    text: text.trim(),
    metadata: {
      wordCount: text.trim().split(/\s+/).length
    }
  };
}
