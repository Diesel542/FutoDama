import { type Job, type InsertJob, type Codex, type InsertCodex, type JobCard } from "@shared/schema";
import { randomUUID } from "crypto";

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

export class MemStorage implements IStorage {
  private jobs: Map<string, Job>;
  private codexes: Map<string, Codex>;

  constructor() {
    this.jobs = new Map();
    this.codexes = new Map();
  }

  async createJob(insertJob: InsertJob): Promise<Job> {
    const id = randomUUID();
    const job: Job = { 
      ...insertJob, 
      id,
      status: insertJob.status || 'pending',
      jobCard: insertJob.jobCard || null,
      codexId: insertJob.codexId || 'job-card-v1',
      createdAt: new Date().toISOString()
    };
    this.jobs.set(id, job);
    return job;
  }

  async getJob(id: string): Promise<Job | undefined> {
    return this.jobs.get(id);
  }

  async updateJob(id: string, updates: Partial<Job>): Promise<Job | undefined> {
    const existing = this.jobs.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...updates };
    this.jobs.set(id, updated);
    return updated;
  }

  async createCodex(insertCodex: InsertCodex): Promise<Codex> {
    const codex: Codex = {
      ...insertCodex,
      description: insertCodex.description || null,
      normalizationRules: insertCodex.normalizationRules || null,
      missingRules: insertCodex.missingRules || null,
      createdAt: new Date().toISOString()
    };
    this.codexes.set(codex.id, codex);
    return codex;
  }

  async getCodex(id: string): Promise<Codex | undefined> {
    return this.codexes.get(id);
  }

  async getAllCodexes(): Promise<Codex[]> {
    return Array.from(this.codexes.values());
  }

  async updateCodex(id: string, updates: Partial<Codex>): Promise<Codex | undefined> {
    const existing = this.codexes.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...updates };
    this.codexes.set(id, updated);
    return updated;
  }

  async deleteCodex(id: string): Promise<boolean> {
    return this.codexes.delete(id);
  }
}

export const storage = new MemStorage();
