import { sql } from "drizzle-orm";
import { pgTable, text, varchar, json, integer, boolean } from "drizzle-orm/pg-core";
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

// Job Card Schema Types
export const jobCardSchema = z.object({
  basics: z.object({
    title: z.string().optional(),
    seniority: z.string().optional(),
    company: z.string().optional(),
    location: z.string().optional(),
    work_mode: z.string().optional(),
  }).optional(),
  overview: z.string().optional(),
  requirements: z.object({
    years_experience: z.string().optional(),
    must_have: z.array(z.string()).optional(),
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
    email: z.string().optional(),
    phone: z.string().optional(),
  }).optional(),
  project_details: z.object({
    start_date: z.string().optional(),
    duration: z.string().optional(),
    workload: z.string().optional(),
    work_setup: z.string().optional(),
    rate_band: z.string().optional(),
  }).optional(),
  language_requirements: z.array(z.string()).optional(),
  decision_process: z.string().optional(),
  stakeholders: z.array(z.string()).optional(),
  missing_fields: z.array(z.object({
    path: z.string(),
    severity: z.enum(["info", "warn", "error"]),
    message: z.string(),
  })).optional(),
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

export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobs.$inferSelect;
export type InsertBatchJob = z.infer<typeof insertBatchJobSchema>;
export type BatchJob = typeof batchJobs.$inferSelect;
export type JobCard = z.infer<typeof jobCardSchema>;
export type InsertCodex = z.infer<typeof insertCodexSchema>;
export type Codex = typeof codexes.$inferSelect;
