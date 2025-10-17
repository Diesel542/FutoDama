import { type Job, type InsertJob, type BatchJob, type InsertBatchJob, type Codex, type InsertCodex, type Webhook, type InsertWebhook, type Resume, type InsertResume, type JobCard, jobs, batchJobs, codexes, webhooks, resumes } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Job operations
  createJob(job: InsertJob): Promise<Job>;
  getJob(id: string): Promise<Job | undefined>;
  updateJob(id: string, updates: Partial<Job>): Promise<Job | undefined>;
  getJobsByBatch(batchId: string): Promise<Job[]>;
  getAllJobs(filters?: { status?: string; codexId?: string; fromDate?: string; toDate?: string; page?: number; limit?: number }): Promise<Job[]>;
  countJobs(filters?: { status?: string; codexId?: string; fromDate?: string; toDate?: string }): Promise<number>;
  deleteJob(id: string): Promise<boolean>;
  
  // Batch job operations
  createBatchJob(batchJob: InsertBatchJob): Promise<BatchJob>;
  getBatchJob(id: string): Promise<BatchJob | undefined>;
  updateBatchJob(id: string, updates: Partial<BatchJob>): Promise<BatchJob | undefined>;
  
  // Codex operations
  createCodex(codex: InsertCodex): Promise<Codex>;
  getCodex(id: string): Promise<Codex | undefined>;
  getAllCodexes(): Promise<Codex[]>;
  updateCodex(id: string, updates: Partial<Codex>): Promise<Codex | undefined>;
  deleteCodex(id: string): Promise<boolean>;
  
  // Webhook operations  
  createWebhook(webhook: { url: string; events: string[]; secret: string; active: boolean }): Promise<{ id: string; url: string; events: string[]; secret: string; active: boolean }>;
  getAllWebhooks(): Promise<{ id: string; url: string; events: string[]; secret: string; active: boolean }[]>;
  deleteWebhook(id: string): Promise<boolean>;
  
  // Resume operations
  createResume(resume: InsertResume): Promise<Resume>;
  getResume(id: string): Promise<Resume | undefined>;
  updateResume(id: string, updates: Partial<Resume>): Promise<Resume | undefined>;
  getAllResumes(filters?: { status?: string; codexId?: string; jobId?: string; page?: number; limit?: number }): Promise<Resume[]>;
  countResumes(filters?: { status?: string; codexId?: string; jobId?: string }): Promise<number>;
  deleteResume(id: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async createJob(insertJob: InsertJob): Promise<Job> {
    const id = randomUUID();
    const [job] = await db
      .insert(jobs)
      .values({
        ...insertJob,
        id,
        status: insertJob.status || 'pending',
        jobCard: insertJob.jobCard || null,
        codexId: insertJob.codexId || 'job-card-v1',
      })
      .returning();
    return job;
  }

  async getJob(id: string): Promise<Job | undefined> {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    return job || undefined;
  }

  async updateJob(id: string, updates: Partial<Job>): Promise<Job | undefined> {
    const [updated] = await db
      .update(jobs)
      .set(updates)
      .where(eq(jobs.id, id))
      .returning();
    return updated || undefined;
  }

  async getJobsByBatch(batchId: string): Promise<Job[]> {
    return await db.select().from(jobs).where(eq(jobs.batchId, batchId));
  }

  async createBatchJob(insertBatchJob: InsertBatchJob): Promise<BatchJob> {
    const id = randomUUID();
    const [batchJob] = await db
      .insert(batchJobs)
      .values({
        ...insertBatchJob,
        id,
        status: insertBatchJob.status || 'pending',
        totalJobs: insertBatchJob.totalJobs || 0,
        completedJobs: insertBatchJob.completedJobs || 0,
        codexId: insertBatchJob.codexId || 'job-card-v1',
      })
      .returning();
    return batchJob;
  }

  async getBatchJob(id: string): Promise<BatchJob | undefined> {
    const [batchJob] = await db.select().from(batchJobs).where(eq(batchJobs.id, id));
    return batchJob || undefined;
  }

  async updateBatchJob(id: string, updates: Partial<BatchJob>): Promise<BatchJob | undefined> {
    const [updated] = await db
      .update(batchJobs)
      .set(updates)
      .where(eq(batchJobs.id, id))
      .returning();
    return updated || undefined;
  }

  async createCodex(insertCodex: InsertCodex): Promise<Codex> {
    const [codex] = await db
      .insert(codexes)
      .values({
        ...insertCodex,
        description: insertCodex.description || null,
        normalizationRules: insertCodex.normalizationRules || null,
        missingRules: insertCodex.missingRules || null,
      })
      .returning();
    return codex;
  }

  async getCodex(id: string): Promise<Codex | undefined> {
    const [codex] = await db.select().from(codexes).where(eq(codexes.id, id));
    return codex || undefined;
  }

  async getAllCodexes(): Promise<Codex[]> {
    return await db.select().from(codexes);
  }

  async updateCodex(id: string, updates: Partial<Codex>): Promise<Codex | undefined> {
    const [updated] = await db
      .update(codexes)
      .set(updates)
      .where(eq(codexes.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteCodex(id: string): Promise<boolean> {
    const result = await db.delete(codexes).where(eq(codexes.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getAllJobs(filters?: { status?: string; codexId?: string; fromDate?: string; toDate?: string; page?: number; limit?: number }): Promise<Job[]> {
    let query = db.select().from(jobs);
    
    if (filters) {
      const conditions = [];
      
      if (filters.status) {
        conditions.push(eq(jobs.status, filters.status));
      }
      
      if (filters.codexId) {
        conditions.push(eq(jobs.codexId, filters.codexId));
      }
      
      // Note: For date filtering, we'd need to add proper SQL conditions here
      // This is a simplified implementation for demonstration
      
      if (conditions.length > 0) {
        query = query.where(conditions[0]);
      }
    }
    
    // Add pagination
    const page = filters?.page || 1;
    const limit = filters?.limit || 12;
    const offset = (page - 1) * limit;
    
    return await query.limit(limit).offset(offset);
  }

  async countJobs(filters?: { status?: string; codexId?: string; fromDate?: string; toDate?: string }): Promise<number> {
    let query = db.select().from(jobs);
    
    if (filters) {
      const conditions = [];
      
      if (filters.status) {
        conditions.push(eq(jobs.status, filters.status));
      }
      
      if (filters.codexId) {
        conditions.push(eq(jobs.codexId, filters.codexId));
      }
      
      // Note: For date filtering, we'd need to add proper SQL conditions here
      
      if (conditions.length > 0) {
        query = query.where(conditions[0]);
      }
    }
    
    const results = await query;
    return results.length;
  }

  async deleteJob(id: string): Promise<boolean> {
    const result = await db
      .delete(jobs)
      .where(eq(jobs.id, id))
      .returning();
    
    return result.length > 0;
  }

  async createWebhook(webhook: { url: string; events: string[]; secret: string; active: boolean }): Promise<{ id: string; url: string; events: string[]; secret: string; active: boolean }> {
    const id = randomUUID();
    const [created] = await db
      .insert(webhooks)
      .values({
        ...webhook,
        id,
        events: webhook.events,
      })
      .returning();
    
    return {
      id: created.id,
      url: created.url,
      events: created.events as string[],
      secret: created.secret,
      active: created.active,
    };
  }

  async getAllWebhooks(): Promise<{ id: string; url: string; events: string[]; secret: string; active: boolean }[]> {
    const webhookList = await db.select().from(webhooks);
    return webhookList.map(webhook => ({
      id: webhook.id,
      url: webhook.url,
      events: webhook.events as string[],
      secret: webhook.secret,
      active: webhook.active,
    }));
  }

  async deleteWebhook(id: string): Promise<boolean> {
    const result = await db.delete(webhooks).where(eq(webhooks.id, id));
    return (result.rowCount || 0) > 0;
  }

  async createResume(insertResume: InsertResume): Promise<Resume> {
    const id = randomUUID();
    const [resume] = await db
      .insert(resumes)
      .values({
        ...insertResume,
        id,
        status: insertResume.status || 'pending',
        resumeCard: insertResume.resumeCard || null,
        codexId: insertResume.codexId || 'resume-card-v1',
        documentPath: insertResume.documentPath || null,
        jobId: insertResume.jobId || null,
      })
      .returning();
    return resume;
  }

  async getResume(id: string): Promise<Resume | undefined> {
    const [resume] = await db.select().from(resumes).where(eq(resumes.id, id));
    return resume || undefined;
  }

  async updateResume(id: string, updates: Partial<Resume>): Promise<Resume | undefined> {
    const [updated] = await db
      .update(resumes)
      .set(updates)
      .where(eq(resumes.id, id))
      .returning();
    return updated || undefined;
  }

  async getAllResumes(filters?: { status?: string; codexId?: string; jobId?: string; page?: number; limit?: number }): Promise<Resume[]> {
    let query = db.select().from(resumes);
    
    if (filters) {
      const conditions = [];
      
      if (filters.status) {
        conditions.push(eq(resumes.status, filters.status));
      }
      
      if (filters.codexId) {
        conditions.push(eq(resumes.codexId, filters.codexId));
      }
      
      if (filters.jobId) {
        conditions.push(eq(resumes.jobId, filters.jobId));
      }
      
      if (conditions.length > 0) {
        query = query.where(conditions[0]);
      }
    }
    
    // Add pagination
    const page = filters?.page || 1;
    const limit = filters?.limit || 12;
    const offset = (page - 1) * limit;
    
    return await query.limit(limit).offset(offset);
  }

  async countResumes(filters?: { status?: string; codexId?: string; jobId?: string }): Promise<number> {
    let query = db.select().from(resumes);
    
    if (filters) {
      const conditions = [];
      
      if (filters.status) {
        conditions.push(eq(resumes.status, filters.status));
      }
      
      if (filters.codexId) {
        conditions.push(eq(resumes.codexId, filters.codexId));
      }
      
      if (filters.jobId) {
        conditions.push(eq(resumes.jobId, filters.jobId));
      }
      
      if (conditions.length > 0) {
        query = query.where(conditions[0]);
      }
    }
    
    const results = await query;
    return results.length;
  }

  async deleteResume(id: string): Promise<boolean> {
    const result = await db
      .delete(resumes)
      .where(eq(resumes.id, id))
      .returning();
    
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
