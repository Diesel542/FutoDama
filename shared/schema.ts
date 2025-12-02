import { sql } from "drizzle-orm";
import { pgTable, text, varchar, json, integer, boolean, vector, real, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const batchJobs = pgTable("batch_jobs", {
  id: varchar("id").primaryKey(),
  status: text("status").notNull().default("pending"),
  totalJobs: integer("total_jobs").notNull().default(0),
  completedJobs: integer("completed_jobs").notNull().default(0),
  codexId: text("codex_id").notNull().default("job-card-v1"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const jobs = pgTable("jobs", {
  id: varchar("id").primaryKey(),
  status: text("status").notNull().default("pending"),
  originalText: text("original_text").notNull(),
  documentType: text("document_type").notNull(),
  jobCard: json("job_card"),
  processingError: text("processing_error"),
  codexId: text("codex_id").notNull().default("job-card-v1"),
  batchId: varchar("batch_id"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const codexes = pgTable("codexes", {
  id: varchar("id").primaryKey(),
  version: text("version").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  schema: json("schema").notNull(),
  prompts: json("prompts").notNull(),
  normalizationRules: json("normalization_rules"),
  missingRules: json("missing_rules"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const webhooks = pgTable("webhooks", {
  id: varchar("id").primaryKey(),
  url: text("url").notNull(),
  events: json("events").notNull(),
  secret: text("secret").notNull().default(""),
  active: boolean("active").notNull().default(true),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const resumes = pgTable("resumes", {
  id: varchar("id").primaryKey(),
  status: text("status").notNull().default("pending"),
  originalText: text("original_text").notNull(),
  documentType: text("document_type").notNull(),
  documentPath: text("document_path"),
  resumeCard: json("resume_card"),
  codexId: text("codex_id").notNull().default("resume-card-v1"),
  jobId: varchar("job_id"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Skills infrastructure for matching system
export const skills = pgTable("skills", {
  id: varchar("id").primaryKey(),
  canonicalName: text("canonical_name").notNull().unique(),
  category: text("category").notNull(), // technical, soft_skill, domain, tool, methodology
  description: text("description"),
  embedding: vector("embedding", { dimensions: 1536 }), // OpenAI text-embedding-3-large
  metadata: json("metadata"), // industry tags, hierarchy, etc.
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  embeddingIdx: index("skills_embedding_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
}));

export const skillAliases = pgTable("skill_aliases", {
  id: varchar("id").primaryKey(),
  alias: text("alias").notNull(),
  canonicalSkillId: varchar("canonical_skill_id").notNull().references(() => skills.id, { onDelete: "cascade" }),
  confidence: real("confidence").notNull().default(1.0), // 0.0-1.0
  source: text("source").notNull().default("manual"), // manual, ai, user_feedback
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  aliasIdx: index("skill_aliases_alias_idx").on(table.alias),
}));

export const skillInstances = pgTable("skill_instances", {
  id: varchar("id").primaryKey(),
  entityType: text("entity_type").notNull(), // "job" or "profile"
  entityId: varchar("entity_id").notNull(),
  canonicalSkillId: varchar("canonical_skill_id").notNull().references(() => skills.id, { onDelete: "cascade" }),
  rawLabel: text("raw_label").notNull(), // original text as extracted
  level: text("level"), // beginner, intermediate, advanced, expert
  yearsExperience: integer("years_experience"),
  priority: text("priority"), // must_have, nice_to_have, core, preferred
  extractionConfidence: real("extraction_confidence").notNull().default(1.0),
  evidencePointer: text("evidence_pointer"), // JSON path or quote
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  entityIdx: index("skill_instances_entity_idx").on(table.entityType, table.entityId),
  skillIdx: index("skill_instances_skill_idx").on(table.canonicalSkillId),
}));

// Match sessions for storing comparison results
export const matchSessions = pgTable("match_sessions", {
  id: varchar("id").primaryKey(),
  jobId: varchar("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("step1_pending"), // step1_pending, step1_complete, step2_in_progress, completed
  step1Results: json("step1_results"), // [{ profileId, overlapScore, matchedSkills, missingSkills }]
  step2Selections: json("step2_selections"), // [profileId1, profileId2, ...]
  step2Results: json("step2_results"), // [{ profileId, aiScore, explanation, evidence, concerns }]
  userNotes: text("user_notes"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  jobIdx: index("match_sessions_job_idx").on(table.jobId),
}));

// Job Card Schema Types - v2.1 with two-pass classification
export const jobCardSchema = z.object({
  basics: z.object({
    title: z.string(),
    seniority: z.string().optional(),
    company: z.string(),
    location: z.string(),
    work_mode: z.enum(["remote", "onsite", "hybrid"]),
  }),
  overview: z.string().optional(),
  requirements: z.object({
    experience_required: z.string().optional(),
    technical_skills: z.array(z.string()).optional(),
    soft_skills: z.array(z.string()).optional(),
    nice_to_have: z.array(z.string()).optional(),
  }).optional(),
  competencies: z.object({
    frontend: z.array(z.string()).optional(),
    backend: z.array(z.string()).optional(),
    cloud_architecture: z.array(z.string()).optional(),
    database: z.array(z.string()).optional(),
    agile: z.array(z.string()).optional(),
  }).optional(),
  preferred_skills: z.array(z.string()).optional(),
  work_culture: z.string().optional(),
  procurement: z.object({
    contract_type: z.string().optional(),
    nda_required: z.boolean().optional(),
    security_clearance: z.string().optional(),
    vat_registration: z.string().optional(),
  }).optional(),
  contact: z.object({
    name: z.string().optional(),
    role: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
  }).optional(),
  project_details: z.object({
    start_date: z.string().optional(),
    duration: z.string().optional(),
    workload: z.string().optional(),
    work_setup: z.string().optional(),
    rate_band: z.string().optional(),
    start_date_iso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    duration_days: z.number().int().min(0).optional(),
    workload_hours_week: z.number().int().min(1).max(80).optional(),
    rate_min: z.number().optional(),
    rate_max: z.number().optional(),
    rate_currency: z.string().length(3).optional(),
    rate_unit: z.enum(["hour", "day", "month", "year"]).optional(),
  }).optional(),
  language_requirements: z.array(z.string()).optional(),
  decision_process: z.string().optional(),
  stakeholders: z.array(z.string()).optional(),
  missing_fields: z.array(z.object({
    path: z.string(),
    severity: z.enum(["info", "warn", "error"]),
    message: z.string(),
  })).optional(),
  evidence: z.array(z.object({
    field: z.string(),
    quote: z.string(),
    page: z.number().int().min(1).optional(),
  })).optional(),
  confidence: z.record(z.number().min(0).max(1)).optional(),
});

// Resume Card Schema Types - comprehensive extraction
export const resumeCardSchema = z.object({
  personal_info: z.object({
    name: z.string(),
    title: z.string(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    location: z.string().optional(),
    website: z.string().url().optional(),
    linkedin: z.string().url().optional(),
    github: z.string().url().optional(),
    photo_url: z.string().url().optional(),
    years_experience: z.number().int().min(0).optional(),
    rating: z.number().min(0).max(5).optional(),
  }),
  professional_summary: z.string().optional(),
  availability: z.object({
    status: z.string().optional(),
    commitment: z.string().optional(),
    timezone: z.string().optional(),
  }).optional(),
  certifications: z.array(z.object({
    name: z.string(),
    issuer: z.string().optional(),
    date: z.string().optional(),
  })).optional(),
  languages: z.array(z.object({
    language: z.string(),
    proficiency: z.string(),
  })).optional(),
  work_experience: z.array(z.object({
    title: z.string(),
    company: z.string(),
    location: z.string().optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    current: z.boolean().optional(),
    description: z.string().optional(),
    achievements: z.array(z.string()).optional(),
  })).optional(),
  education: z.array(z.object({
    degree: z.string(),
    institution: z.string(),
    location: z.string().optional(),
    graduation_date: z.string().optional(),
    gpa: z.string().optional(),
  })).optional(),
  portfolio: z.array(z.object({
    title: z.string(),
    description: z.string().optional(),
    url: z.string().url().optional(),
    technologies: z.array(z.string()).optional(),
  })).optional(),
  technical_skills: z.array(z.object({
    skill: z.string(),
    proficiency: z.number().int().min(0).max(100).optional(),
  })).optional(),
  soft_skills: z.array(z.string()).optional(),
  all_skills: z.array(z.string()).optional(),
  reviews: z.array(z.object({
    rating: z.number().int().min(1).max(5),
    project: z.string().optional(),
    comment: z.string(),
    reviewer_name: z.string().optional(),
    reviewer_title: z.string().optional(),
    reviewer_company: z.string().optional(),
  })).optional(),
  rate: z.object({
    amount: z.number().optional(),
    currency: z.string().length(3).optional(),
    unit: z.enum(["hour", "day", "month", "year"]).optional(),
  }).optional(),
  missing_fields: z.array(z.object({
    path: z.string(),
    severity: z.enum(["info", "warn", "error"]),
    message: z.string(),
  })).optional(),
  evidence: z.array(z.object({
    field: z.string(),
    quote: z.string(),
    page: z.number().int().min(1).optional(),
  })).optional(),
  confidence: z.record(z.number().min(0).max(1)).optional(),
});

export const insertJobSchema = createInsertSchema(jobs).omit({
  id: true,
  createdAt: true,
});

export const insertBatchJobSchema = createInsertSchema(batchJobs).omit({
  id: true,
  createdAt: true,
});

export const insertCodexSchema = createInsertSchema(codexes).omit({
  createdAt: true,
});

export const insertWebhookSchema = createInsertSchema(webhooks).omit({
  id: true,
  createdAt: true,
});

export const insertResumeSchema = createInsertSchema(resumes).omit({
  id: true,
  createdAt: true,
});

export const insertSkillSchema = createInsertSchema(skills).omit({
  id: true,
  createdAt: true,
});

export const insertSkillAliasSchema = createInsertSchema(skillAliases).omit({
  id: true,
  createdAt: true,
});

export const insertSkillInstanceSchema = createInsertSchema(skillInstances).omit({
  id: true,
  createdAt: true,
});

export const insertMatchSessionSchema = createInsertSchema(matchSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobs.$inferSelect;
export type InsertBatchJob = z.infer<typeof insertBatchJobSchema>;
export type BatchJob = typeof batchJobs.$inferSelect;
export type JobCard = z.infer<typeof jobCardSchema>;
export type InsertCodex = z.infer<typeof insertCodexSchema>;
export type Codex = typeof codexes.$inferSelect;
export type InsertWebhook = z.infer<typeof insertWebhookSchema>;
export type Webhook = typeof webhooks.$inferSelect;
export type InsertResume = z.infer<typeof insertResumeSchema>;
export type Resume = typeof resumes.$inferSelect;
export type ResumeCard = z.infer<typeof resumeCardSchema>;
export type InsertSkill = z.infer<typeof insertSkillSchema>;
export type Skill = typeof skills.$inferSelect;
export type InsertSkillAlias = z.infer<typeof insertSkillAliasSchema>;
export type SkillAlias = typeof skillAliases.$inferSelect;
export type InsertSkillInstance = z.infer<typeof insertSkillInstanceSchema>;
export type SkillInstance = typeof skillInstances.$inferSelect;
export type InsertMatchSession = z.infer<typeof insertMatchSessionSchema>;
export type MatchSession = typeof matchSessions.$inferSelect;

export interface MatchSessionStep1Result {
  resumeId: string;
  candidateName: string;
  overlapScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  location?: string;
  availability?: string;
  mustHaveMatches: number;
  mustHaveRequired: number;
  niceToHaveMatches: number;
  niceToHaveTotal: number;
}

export interface MatchSessionStep2Evidence {
  category: string;
  jobQuote: string;
  resumeQuote: string;
  assessment: string;
}

export interface MatchSessionStep2Result {
  profileId: string;
  profileName: string;
  aiScore: number;
  explanation: string;
  evidence: MatchSessionStep2Evidence[];
  concerns: string[];
  strengths: string[];
  confidence: number;
}

export type Step1ResultPayload = MatchSessionStep1Result[];
export type Step2SelectionsPayload = string[];
export type Step2ResultPayload = MatchSessionStep2Result[];

export interface TypedMatchSession extends Omit<MatchSession, 'step1Results' | 'step2Selections' | 'step2Results'> {
  step1Results: Step1ResultPayload | null;
  step2Selections: Step2SelectionsPayload | null;
  step2Results: Step2ResultPayload | null;
}
