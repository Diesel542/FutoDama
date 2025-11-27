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

    const resumeCodex = await this.getCodex('resume-card-v1');
    if (!resumeCodex) {
      await this.createResumeCodex();
    }

    const resumeTailorCodex = await this.getCodex('resume-tailor-v1');
    if (!resumeTailorCodex) {
      await this.createResumeTailorCodex();
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

  async createResumeCodex(): Promise<Codex> {
    const resumeCodex: InsertCodex = {
      id: 'resume-card-v1',
      version: '1.0.0',
      name: 'Comprehensive Resume Extractor with Two-Pass System',
      description: 'Intelligent resume extraction with two-pass classification, evidence tracking, and anti-hallucination safeguards for comprehensive candidate profiles',
      schema: this.getResumeSchema(),
      prompts: {
        system: `You are a precision resume/CV extractor using a TWO-PASS INTELLIGENT SYSTEM:

PASS 1: Extract raw candidate information verbatim with source quotes
PASS 2: Intelligently organize and classify information with validation

CORE PRINCIPLES:
1. NEVER invent or assume information not in the resume
2. ALWAYS cite source text for extracted items
3. ORGANIZE experience chronologically (most recent first)
4. SEPARATE technical skills from soft skills clearly
5. EXTRACT achievement metrics and quantifiable results
6. FLAG uncertainty with confidence scores
7. PRESERVE exact job titles, company names, and dates`,
        user: `Extract and organize candidate information from the following resume/CV into the specified JSON schema format.

Be comprehensive yet precise - only include information clearly stated in the resume.

Extract:
- Personal information (name, contact, location, links, years of experience)
- Professional summary/objective
- Work experience (chronologically, with achievements and metrics)
- Education (degrees, institutions, dates)
- Technical and soft skills (with proficiency when stated)
- Certifications and credentials
- Projects/portfolio items (with technologies used)
- Languages with proficiency levels
- Client reviews/testimonials (if present)
- Availability and rate information (if stated)

Verify all extractions against source text and flag low-confidence items.`
      },
      normalizationRules: [
        {
          field: "personal_info.email",
          validation: "EMAIL"
        },
        {
          field: "personal_info.website",
          validation: "URL"
        },
        {
          field: "personal_info.linkedin",
          validation: "URL"
        },
        {
          field: "personal_info.github",
          validation: "URL"
        },
        {
          field: "technical_skills.*.skill",
          aliases: {
            "reactjs": "React",
            "react.js": "React",
            "nodejs": "Node.js",
            "node": "Node.js",
            "typescript": "TypeScript",
            "javascript": "JavaScript",
            "python": "Python",
            "java": "Java",
            "dotnet": ".NET",
            "csharp": "C#",
            "aws": "AWS",
            "azure": "Microsoft Azure",
            "gcp": "Google Cloud Platform"
          }
        }
      ],
      missingRules: [
        { path: "personal_info.name", severity: "error", message: "Candidate name is required" },
        { path: "personal_info.email", severity: "warn", message: "Contact email not found" },
        { path: "personal_info.title", severity: "warn", message: "Professional title not specified" },
        { path: "work_experience", severity: "warn", message: "No work experience found" },
        { path: "education", severity: "info", message: "No education information found" },
        { path: "technical_skills", severity: "info", message: "No specific technical skills identified" }
      ]
    };

    return await storage.createCodex(resumeCodex);
  }

  async createResumeTailorCodex(): Promise<Codex> {
    const resumeTailorCodex: InsertCodex = {
      id: 'resume-tailor-v1',
      version: '1.0.0',
      name: 'Resume Tailor Agent',
      description: 'Given a Parsed Resume and a Job Card, produce a tailored resume draft + coverage matrix without inventing facts.',
      schema: this.getResumeTailorSchema(),
      prompts: {
        aligner_system: "You align a parsed resume with a job card and produce a coverage matrix. NEVER invent information. Evidence must be quoted from the original resume.",
        aligner_user: "Resume JSON:\\n<<RESUME_JSON>>\\nJob Card JSON:\\n<<JOB_JSON>>\\nReturn coverage.matrix[] items mapping JD requirements to resume evidence, with confidence 0..1, and a coverage_score overall.",
        tailor_system: "You tailor the resume for the target role WITHOUT changing facts. Reorder, merge, and rewrite for relevance and clarity. Keep employers, titles, dates identical. Quote IDs from coverage where you used evidence. Respect style profile.",
        tailor_user: "Original Resume JSON:\\n<<RESUME_JSON>>\\nJob Card JSON:\\n<<JOB_JSON>>\\nCoverage JSON:\\n<<COVERAGE_JSON>>\\nLanguage: <<LANG>>\\nStyle: <<STYLE>>\\nProduce tailored_resume respecting rewriting_policies and validation settings.",
        finalizer_system: "You finalize: validate against schema, generate diff (added/removed/reordered/rephrased), warnings (e.g., confidence below threshold, missing keywords), and an ATS report. Do not change facts.",
        finalizer_user: "Schema:\\n<<SCHEMA_JSON>>\\nDraft tailored_resume:\\n<<TAILORED_JSON>>\\nCoverage:\\n<<COVERAGE_JSON>>\\nJob keywords (from JD):\\n<<JD_KEYWORDS_JSON>>\\nReturn TailoredResumeBundle with diff, warnings, ats_report."
      },
      normalizationRules: [
        { field: "skills", aliases: { "js": "JavaScript", "nodejs": "Node.js", "react.js": "React", "jira": "JIRA" } },
        { field: "dates", parse: "DATE_ISO" },
        { field: "locations", normalize: "CITY_COUNTRY" },
        { field: "languages", aliases: { "Dansk": "Danish", "Engelsk": "English" } }
      ],
      missingRules: [
        { path: "tailored_resume.summary", severity: "warn", message: "Professional summary is missing" },
        { path: "tailored_resume.skills", severity: "warn", message: "Skills section is empty" },
        { path: "coverage.matrix", severity: "error", message: "Coverage matrix could not be generated" }
      ]
    };

    return await storage.createCodex(resumeTailorCodex);
  }

  private getResumeTailorSchema(): any {
    return {
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      "title": "TailoredResumeBundle",
      "type": "object",
      "required": ["tailored_resume", "coverage", "diff", "warnings", "ats_report"],
      "properties": {
        "tailored_resume": {
          "type": "object",
          "required": ["meta", "summary", "skills", "experience", "education"],
          "properties": {
            "meta": {
              "type": "object",
              "required": ["language", "style"],
              "properties": {
                "language": { "type": "string", "enum": ["en", "da"] },
                "style": { "type": "string", "enum": ["conservative", "modern", "impact"] },
                "target_title": { "type": "string" },
                "target_company": { "type": "string" }
              }
            },
            "summary": { "type": "string" },
            "skills": {
              "type": "object",
              "properties": {
                "core": { "type": "array", "items": { "type": "string" } },
                "tools": { "type": "array", "items": { "type": "string" } },
                "methodologies": { "type": "array", "items": { "type": "string" } },
                "languages": { "type": "array", "items": { "type": "string" } }
              }
            },
            "experience": {
              "type": "array",
              "items": {
                "type": "object",
                "required": ["employer", "title", "start_date", "description"],
                "properties": {
                  "employer": { "type": "string" },
                  "title": { "type": "string" },
                  "location": { "type": "string" },
                  "start_date": { "type": "string" },
                  "end_date": { "type": "string" },
                  "is_current": { "type": "boolean" },
                  "description": { "type": "array", "items": { "type": "string" } },
                  "evidence_links": { "type": "array", "items": { "type": "string" } }
                }
              }
            },
            "education": {
              "type": "array",
              "items": {
                "type": "object",
                "required": ["institution", "degree"],
                "properties": {
                  "institution": { "type": "string" },
                  "degree": { "type": "string" },
                  "year": { "type": "string" },
                  "details": { "type": "string" }
                }
              }
            },
            "certifications": { "type": "array", "items": { "type": "string" } },
            "extras": { "type": "array", "items": { "type": "string" } }
          }
        },
        "coverage": {
          "type": "object",
          "required": ["matrix", "coverage_score"],
          "properties": {
            "matrix": {
              "type": "array",
              "items": {
                "type": "object",
                "required": ["jd_item", "resume_evidence", "confidence"],
                "properties": {
                  "jd_item": { "type": "string" },
                  "resume_evidence": { "type": "string" },
                  "resume_ref": { "type": "string" },
                  "confidence": { "type": "number", "minimum": 0, "maximum": 1.0 },
                  "notes": { "type": "string" }
                }
              }
            },
            "coverage_score": { "type": "number", "minimum": 0, "maximum": 1.0 }
          }
        },
        "diff": {
          "type": "object",
          "properties": {
            "added": { "type": "array", "items": { "type": "string" } },
            "removed": { "type": "array", "items": { "type": "string" } },
            "reordered": { "type": "array", "items": { "type": "string" } },
            "rephrased": { "type": "array", "items": { "type": "string" } }
          }
        },
        "warnings": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["severity", "message"],
            "properties": {
              "severity": { "type": "string", "enum": ["info", "warn", "error"] },
              "message": { "type": "string" },
              "path": { "type": "string" }
            }
          }
        },
        "ats_report": {
          "type": "object",
          "properties": {
            "keyword_coverage": { "type": "array", "items": { "type": "string" } },
            "missing_keywords": { "type": "array", "items": { "type": "string" } },
            "format_warnings": { "type": "array", "items": { "type": "string" } }
          }
        }
      }
    };
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

  private getResumeSchema(): any {
    return {
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      "title": "ResumeCard",
      "type": "object",
      "required": ["personal_info"],
      "properties": {
        "personal_info": {
          "type": "object",
          "required": ["name", "title"],
          "properties": {
            "name": { "type": "string" },
            "title": { "type": "string" },
            "email": { "type": "string", "format": "email" },
            "phone": { "type": "string" },
            "location": { "type": "string" },
            "website": { "type": "string", "format": "uri" },
            "linkedin": { "type": "string", "format": "uri" },
            "github": { "type": "string", "format": "uri" },
            "photo_url": { "type": "string", "format": "uri" },
            "years_experience": { "type": "integer" },
            "rating": { "type": "number", "minimum": 0, "maximum": 5 }
          }
        },
        "professional_summary": { "type": "string" },
        "availability": {
          "type": "object",
          "properties": {
            "status": { "type": "string" },
            "commitment": { "type": "string" },
            "timezone": { "type": "string" }
          }
        },
        "certifications": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "name": { "type": "string" },
              "issuer": { "type": "string" },
              "date": { "type": "string" }
            }
          }
        },
        "languages": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "language": { "type": "string" },
              "proficiency": { "type": "string" }
            }
          }
        },
        "work_experience": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "title": { "type": "string" },
              "company": { "type": "string" },
              "location": { "type": "string" },
              "start_date": { "type": "string" },
              "end_date": { "type": "string" },
              "current": { "type": "boolean" },
              "description": { "type": "string" },
              "achievements": { "type": "array", "items": { "type": "string" } }
            }
          }
        },
        "education": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "degree": { "type": "string" },
              "institution": { "type": "string" },
              "location": { "type": "string" },
              "graduation_date": { "type": "string" },
              "gpa": { "type": "string" }
            }
          }
        },
        "portfolio": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "title": { "type": "string" },
              "description": { "type": "string" },
              "url": { "type": "string", "format": "uri" },
              "technologies": { "type": "array", "items": { "type": "string" } }
            }
          }
        },
        "technical_skills": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "skill": { "type": "string" },
              "proficiency": { "type": "integer", "minimum": 0, "maximum": 100 }
            }
          }
        },
        "soft_skills": { "type": "array", "items": { "type": "string" } },
        "all_skills": { "type": "array", "items": { "type": "string" } },
        "reviews": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "rating": { "type": "integer", "minimum": 1, "maximum": 5 },
              "project": { "type": "string" },
              "comment": { "type": "string" },
              "reviewer_name": { "type": "string" },
              "reviewer_title": { "type": "string" },
              "reviewer_company": { "type": "string" }
            }
          }
        },
        "rate": {
          "type": "object",
          "properties": {
            "amount": { "type": "number" },
            "currency": { "type": "string" },
            "unit": { "type": "string", "enum": ["hour", "day", "month", "year"] }
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
