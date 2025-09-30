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
    
    const v2Codex = await this.getCodex('job-card-v2.1');
    if (!v2Codex) {
      await this.createV2Codex();
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

  async createV2Codex(): Promise<Codex> {
    const v2Codex: InsertCodex = {
      id: 'job-card-v2.1',
      version: '2.1.0',
      name: 'Enhanced Job Card Extractor with Two-Pass + Evidence',
      description: 'Two-pass AI extraction with experience/skills separation, anti-hallucination safeguards, evidence & normalized fields',
      schema: this.getV2Schema(),
      prompts: {
        system: `You are a precision job description extractor using a TWO-PASS SYSTEM:

PASS 1: Extract raw requirements verbatim with source quotes
PASS 2: Intelligently classify requirements with anti-hallucination validation

CORE PRINCIPLES:
1. NEVER invent or assume information
2. ALWAYS cite source text for classifications
3. SEPARATE experience from skills clearly
4. VERIFY every extracted item exists in original text
5. FLAG uncertainty with confidence scores
6. COMBINE experience statements into one coherent description`,
        user: `Extract and classify job information from the following text into the specified JSON schema format.

Be precise and only include information that is clearly stated in the original text.

Apply intelligent classification to separate:
- Experience requirements (years, seniority, background)
- Technical skills (tools, technologies, methodologies)
- Soft skills (communication, leadership, interpersonal)

Verify all extractions against source text and flag low-confidence items.`
      },
      normalizationRules: [
        {
          field: "basics.work_mode",
          mappings: {
            "remote work": "remote",
            "work from home": "remote",
            "working remotely": "remote",
            "on-site": "onsite",
            "on site": "onsite",
            "office": "onsite",
            "in-office": "onsite",
            "hybrid work": "hybrid",
            "flexible": "hybrid"
          }
        },
        {
          field: "requirements.technical_skills",
          aliases: {
            "jira": "JIRA",
            "reactjs": "React",
            "react.js": "React",
            "nodejs": "Node.js",
            "node": "Node.js",
            "typescript": "TypeScript",
            "dotnet": ".NET",
            "csharp": "C#"
          }
        },
        {
          field: "project_details.rate_band",
          parse: "CURRENCY_RANGE"
        },
        {
          field: "project_details.start_date",
          parse: "DATE_ISO"
        },
        {
          field: "project_details.workload",
          parse: "HOURS_PER_WEEK"
        }
      ],
      missingRules: [
        { path: "basics.title", severity: "error", message: "Job title is required" },
        { path: "basics.company", severity: "warn", message: "Company name not specified" },
        { path: "requirements.experience_required", severity: "warn", message: "Experience requirements not clearly stated" },
        { path: "requirements.technical_skills", severity: "info", message: "No specific technical skills identified" },
        { path: "contact.email", severity: "error", message: "Contact email is missing" },
        { path: "project_details.rate_band", severity: "warn", message: "Salary/rate information not provided" },
        { path: "project_details.start_date", severity: "warn", message: "Start date not provided" }
      ]
    };

    return await storage.createCodex(v2Codex);
  }

  private getV2Schema(): any {
    return {
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      "title": "JobCard",
      "type": "object",
      "required": ["basics"],
      "properties": {
        "basics": {
          "type": "object",
          "required": ["title", "company", "location", "work_mode"],
          "properties": {
            "title": { "type": "string" },
            "seniority": { "type": "string" },
            "company": { "type": "string" },
            "location": { "type": "string" },
            "work_mode": { "type": "string", "enum": ["remote", "onsite", "hybrid"] }
          }
        },
        "overview": { "type": "string" },
        "requirements": {
          "type": "object",
          "properties": {
            "experience_required": { "type": "string" },
            "technical_skills": { "type": "array", "items": { "type": "string" } },
            "soft_skills": { "type": "array", "items": { "type": "string" } },
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
        "preferred_skills": { "type": "array", "items": { "type": "string" } },
        "work_culture": { "type": "string" },
        "procurement": {
          "type": "object",
          "properties": {
            "contract_type": { "type": "string" },
            "nda_required": { "type": "boolean" },
            "security_clearance": { "type": "string" },
            "vat_registration": { "type": "string" }
          }
        },
        "contact": {
          "type": "object",
          "properties": {
            "name": { "type": "string" },
            "role": { "type": "string" },
            "email": { "type": "string", "format": "email" },
            "phone": { "type": "string" }
          }
        },
        "project_details": {
          "type": "object",
          "properties": {
            "start_date": { "type": "string" },
            "duration": { "type": "string" },
            "workload": { "type": "string" },
            "work_setup": { "type": "string" },
            "rate_band": { "type": "string" },
            "start_date_iso": { "type": "string" },
            "duration_days": { "type": "integer" },
            "workload_hours_week": { "type": "integer" },
            "rate_min": { "type": "number" },
            "rate_max": { "type": "number" },
            "rate_currency": { "type": "string" },
            "rate_unit": { "type": "string", "enum": ["hour", "day", "month", "year"] }
          }
        },
        "language_requirements": { "type": "array", "items": { "type": "string" } },
        "decision_process": { "type": "string" },
        "stakeholders": { "type": "array", "items": { "type": "string" } },
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
        },
        "evidence": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "field": { "type": "string" },
              "quote": { "type": "string" },
              "page": { "type": "integer" }
            }
          }
        },
        "confidence": {
          "type": "object",
          "additionalProperties": { "type": "number" }
        }
      }
    };
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
