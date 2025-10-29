import { type Job, type InsertJob, type BatchJob, type InsertBatchJob, type Codex, type InsertCodex, type Webhook, type InsertWebhook, type Resume, type InsertResume, type JobCard, type Skill, type InsertSkill, type SkillAlias, type InsertSkillAlias, type SkillInstance, type InsertSkillInstance, type MatchSession, type InsertMatchSession, jobs, batchJobs, codexes, webhooks, resumes, skills, skillAliases, skillInstances, matchSessions } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

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
  
  // Skills operations
  createSkill(skill: InsertSkill): Promise<Skill>;
  getSkill(id: string): Promise<Skill | undefined>;
  getSkillByCanonicalName(canonicalName: string): Promise<Skill | undefined>;
  findOrCreateSkillAlias(alias: string, canonicalSkillId: string, confidence: number, source: string): Promise<SkillAlias>;
  getSkillAliasesByAlias(alias: string): Promise<SkillAlias[]>;
  createSkillInstance(instance: InsertSkillInstance): Promise<SkillInstance>;
  getSkillInstancesForEntity(entityType: string, entityId: string): Promise<SkillInstance[]>;
  getSkillInstancesWithDetails(entityType: string, entityId: string): Promise<Array<SkillInstance & { skill: Skill }>>;
  
  // Match session operations
  createMatchSession(session: InsertMatchSession): Promise<MatchSession>;
  updateMatchSession(id: string, updates: Partial<MatchSession>): Promise<MatchSession | undefined>;
  getMatchSession(id: string): Promise<MatchSession | undefined>;
  getMatchSessionsForJob(jobId: string): Promise<MatchSession[]>;
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

  // Skills operations
  async createSkill(insertSkill: InsertSkill): Promise<Skill> {
    const id = randomUUID();
    const [skill] = await db
      .insert(skills)
      .values({
        ...insertSkill,
        id,
        description: insertSkill.description || null,
        embedding: insertSkill.embedding || null,
        metadata: insertSkill.metadata || null,
      })
      .returning();
    return skill;
  }

  async getSkill(id: string): Promise<Skill | undefined> {
    const [skill] = await db.select().from(skills).where(eq(skills.id, id));
    return skill || undefined;
  }

  async getSkillByCanonicalName(canonicalName: string): Promise<Skill | undefined> {
    const [skill] = await db.select().from(skills).where(eq(skills.canonicalName, canonicalName));
    return skill || undefined;
  }

  async findOrCreateSkillAlias(alias: string, canonicalSkillId: string, confidence: number, source: string): Promise<SkillAlias> {
    // Check if alias already exists
    const [existing] = await db
      .select()
      .from(skillAliases)
      .where(and(eq(skillAliases.alias, alias), eq(skillAliases.canonicalSkillId, canonicalSkillId)));
    
    if (existing) {
      return existing;
    }

    // Create new alias
    const id = randomUUID();
    const [newAlias] = await db
      .insert(skillAliases)
      .values({
        id,
        alias,
        canonicalSkillId,
        confidence,
        source,
      })
      .returning();
    return newAlias;
  }

  async getSkillAliasesByAlias(alias: string): Promise<SkillAlias[]> {
    return await db.select().from(skillAliases).where(eq(skillAliases.alias, alias));
  }

  async createSkillInstance(insertInstance: InsertSkillInstance): Promise<SkillInstance> {
    const id = randomUUID();
    const [instance] = await db
      .insert(skillInstances)
      .values({
        ...insertInstance,
        id,
        level: insertInstance.level || null,
        yearsExperience: insertInstance.yearsExperience || null,
        priority: insertInstance.priority || null,
        evidencePointer: insertInstance.evidencePointer || null,
      })
      .returning();
    return instance;
  }

  async getSkillInstancesForEntity(entityType: string, entityId: string): Promise<SkillInstance[]> {
    return await db
      .select()
      .from(skillInstances)
      .where(and(eq(skillInstances.entityType, entityType), eq(skillInstances.entityId, entityId)));
  }

  async getSkillInstancesWithDetails(entityType: string, entityId: string): Promise<Array<SkillInstance & { skill: Skill }>> {
    const instances = await db
      .select()
      .from(skillInstances)
      .leftJoin(skills, eq(skillInstances.canonicalSkillId, skills.id))
      .where(and(eq(skillInstances.entityType, entityType), eq(skillInstances.entityId, entityId)));

    return instances.map(row => ({
      ...row.skill_instances,
      skill: row.skills!,
    }));
  }

  // Match session operations
  async createMatchSession(insertSession: InsertMatchSession): Promise<MatchSession> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const [session] = await db
      .insert(matchSessions)
      .values({
        ...insertSession,
        id,
        status: insertSession.status || 'step1_pending',
        step1Results: insertSession.step1Results || null,
        step2Selections: insertSession.step2Selections || null,
        step2Results: insertSession.step2Results || null,
        userNotes: insertSession.userNotes || null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return session;
  }

  async updateMatchSession(id: string, updates: Partial<MatchSession>): Promise<MatchSession | undefined> {
    const now = new Date().toISOString();
    const [updated] = await db
      .update(matchSessions)
      .set({ ...updates, updatedAt: now })
      .where(eq(matchSessions.id, id))
      .returning();
    return updated || undefined;
  }

  async getMatchSession(id: string): Promise<MatchSession | undefined> {
    const [session] = await db.select().from(matchSessions).where(eq(matchSessions.id, id));
    return session || undefined;
  }

  async getMatchSessionsForJob(jobId: string): Promise<MatchSession[]> {
    return await db.select().from(matchSessions).where(eq(matchSessions.jobId, jobId));
  }
}

export const storage = new DatabaseStorage();
