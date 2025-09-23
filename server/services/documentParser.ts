import fs from 'fs';
import path from 'path';

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
  try {
    // Try using pdf-parse with better error handling
    try {
      const pdfParse = require('pdf-parse');
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      
      return {
        text: data.text,
        metadata: {
          pages: data.numpages,
          wordCount: data.text.split(/\s+/).length
        }
      };
    } catch (pdfError) {
      // Fallback: treat as text file if PDF parsing fails
      // This handles cases where the file isn't a real PDF or pdf-parse has issues
      const text = fs.readFileSync(filePath, 'utf-8');
      return {
        text: text.trim(),
        metadata: {
          wordCount: text.trim().split(/\s+/).length
        }
      };
    }
  } catch (error) {
    throw new Error(`PDF parsing failed: ${(error as Error).message}`);
  }
}

async function parseDOCX(filePath: string): Promise<ParsedDocument> {
  // For now, we'll use a simple implementation
  // In production, you'd use a library like docx-parser
  try {
    const docxParser = await import('docx-parser') as any;
    const dataBuffer = fs.readFileSync(filePath);
    
    return new Promise((resolve, reject) => {
      docxParser.parseBuffer(dataBuffer, (data: string) => {
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
