import { storage } from '../storage';
import { type Codex, type InsertCodex } from '@shared/schema';
import fs from 'fs/promises';
import path from 'path';

export class CodexManager {
  private codexDir: string;

  constructor() {
    this.codexDir = path.resolve('codex');
  }

  async initializeDefaultCodex(): Promise<void> {
    const defaultCodex = await this.getCodex('job-card-v1');
    if (!defaultCodex) {
      await this.createDefaultCodex();
    }
  }

  async createDefaultCodex(): Promise<Codex> {
    const defaultCodex: InsertCodex = {
      id: 'job-card-v1',
      version: '1.0.0',
      name: 'Standard Job Card Extractor',
      description: 'Extracts job descriptions into standardized job cards with comprehensive field mapping',
      schema: await this.loadSchemaFromFile('job-card-v1.schema.json'),
      prompts: {
        system: "You are a precision job description extractor. Convert job descriptions into the provided JSON schema format. Extract only what is explicitly stated in the text. Do not invent or assume information. If information is missing, note it in the missing_fields array.",
        user: "Extract job information from the following text into the specified JSON schema format. Be precise and only include information that is clearly stated in the original text."
      },
      normalizationRules: [
        {
          field: "work_mode",
          mappings: {
            "remote work": "remote",
            "work from home": "remote",
            "on-site": "onsite",
            "office": "onsite",
            "hybrid work": "hybrid"
          }
        }
      ],
      missingRules: [
        { path: "basics.title", severity: "error", message: "Job title is missing" },
        { path: "basics.company", severity: "warn", message: "Company name not specified" },
        { path: "contact.email", severity: "error", message: "Contact email is missing" },
        { path: "project_details.rate_band", severity: "warn", message: "Salary/rate information not provided" }
      ]
    };

    return await storage.createCodex(defaultCodex);
  }

  async loadSchemaFromFile(filename: string): Promise<any> {
    try {
      const schemaPath = path.join(this.codexDir, filename);
      const schemaContent = await fs.readFile(schemaPath, 'utf-8');
      return JSON.parse(schemaContent);
    } catch (error) {
      console.error(`Failed to load schema from ${filename}:`, error);
      return this.getDefaultSchema();
    }
  }

  private getDefaultSchema(): any {
    return {
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      "title": "JobCard",
      "type": "object",
      "properties": {
        "basics": {
          "type": "object",
          "properties": {
            "title": { "type": "string" },
            "seniority": { "type": "string" },
            "company": { "type": "string" },
            "location": { "type": "string" },
            "work_mode": { "type": "string" }
          }
        },
        "overview": { "type": "string" },
        "requirements": {
          "type": "object",
          "properties": {
            "years_experience": { "type": "string" },
            "must_have": { "type": "array", "items": { "type": "string" } },
            "nice_to_have": { "type": "array", "items": { "type": "string" } }
          }
        },
        "competencies": {
          "type": "object",
          "properties": {
            "frontend": { "type": "array", "items": { "type": "string" } },
            "backend": { "type": "array", "items": { "type": "string" } },
            "cloud_architecture": { "type": "array", "items": { "type": "string" } },
            "database": { "type": "array", "items": { "type": "string" } },
            "agile": { "type": "array", "items": { "type": "string" } }
          }
        },
        "missing_fields": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "path": { "type": "string" },
              "severity": { "type": "string", "enum": ["info", "warn", "error"] },
              "message": { "type": "string" }
            }
          }
        }
      }
    };
  }

  async getCodex(id: string): Promise<Codex | undefined> {
    return await storage.getCodex(id);
  }

  async getAllCodexes(): Promise<Codex[]> {
    return await storage.getAllCodexes();
  }

  async createCodex(codex: InsertCodex): Promise<Codex> {
    return await storage.createCodex(codex);
  }

  async updateCodex(id: string, updates: Partial<Codex>): Promise<Codex | undefined> {
    return await storage.updateCodex(id, updates);
  }

  async exportCodex(id: string): Promise<Codex | undefined> {
    return await storage.getCodex(id);
  }
}

export const codexManager = new CodexManager();
