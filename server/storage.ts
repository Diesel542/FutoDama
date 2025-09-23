import { type Job, type InsertJob, type Codex, type InsertCodex, type JobCard, jobs, codexes } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Job operations
  createJob(job: InsertJob): Promise<Job>;
  getJob(id: string): Promise<Job | undefined>;
  updateJob(id: string, updates: Partial<Job>): Promise<Job | undefined>;
  
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
