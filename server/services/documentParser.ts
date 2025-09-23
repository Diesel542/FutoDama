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
    if (mimeType.includes('pdf')) {
      return await parsePDF(filePath);
    } else if (mimeType.includes('document') || mimeType.includes('docx')) {
      return await parseDOCX(filePath);
    } else {
      throw new Error(`Unsupported file type: ${mimeType}`);
    }
  } catch (error) {
    console.error("Document parsing error:", error);
    throw new Error(`Failed to parse document: ${(error as Error).message}`);
  }
}

async function parsePDF(filePath: string): Promise<ParsedDocument> {
  // For now, we'll use a simple implementation
  // In production, you'd use a library like pdf-parse
  try {
    const pdf = await import('pdf-parse') as any;
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf.default(dataBuffer);
    
    return {
      text: data.text,
      metadata: {
        pages: data.numpages,
        wordCount: data.text.split(/\s+/).length
      }
    };
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

export function parseTextInput(text: string): ParsedDocument {
  return {
    text: text.trim(),
    metadata: {
      wordCount: text.trim().split(/\s+/).length
    }
  };
}
