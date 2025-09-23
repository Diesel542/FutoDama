import { type Job, type InsertJob, type BatchJob, type InsertBatchJob, type Codex, type InsertCodex, type JobCard, jobs, batchJobs, codexes } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Job operations
  createJob(job: InsertJob): Promise<Job>;
  getJob(id: string): Promise<Job | undefined>;
  updateJob(id: string, updates: Partial<Job>): Promise<Job | undefined>;
  getJobsByBatch(batchId: string): Promise<Job[]>;
  
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
}

export const storage = new DatabaseStorage();
