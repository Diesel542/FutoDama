import { storage } from "../storage";
import { findMatchingCandidates, type CandidateMatch } from "../skills/matcher";
import { analyzeMultipleCandidates, type AIMatchResult } from "../skills/ai-matcher";
import { notFound, badRequest, forbidden } from "../utils/errors";
import { logger } from "../utils/logger";
import type { MatchSession } from "@shared/schema";

export interface MatchStep1Result {
  sessionId: string;
  matches: CandidateMatch[];
  totalMatches: number;
}

export interface MatchStep2Input {
  jobId: string;
  profileIds: string[];
  sessionId?: string;
}

export interface MappedAnalysisResult {
  resumeId: string;
  candidateName: string;
  matchScore: number;
  summary: string;
  strengths: string[];
  concerns: string[];
  evidence: Array<{
    category: string;
    jobQuote: string;
    resumeQuote: string;
    assessment: string;
  }>;
  confidence: number;
}

export interface MatchStep2Result {
  sessionId: string;
  results: MappedAnalysisResult[];
  totalAnalyzed: number;
}

export async function runMatchStep1(jobId: string): Promise<MatchStep1Result> {
  const timer = logger.startTimer();
  const matchLog = logger.withContext({ jobId, step: 'step1' });
  
  const job = await storage.getJob(jobId);
  if (!job) {
    throw notFound('Job', jobId);
  }
  
  matchLog.info('Starting Step 1 matching');
  
  const matches = await findMatchingCandidates(jobId);
  
  matchLog.info('Step 1 matching complete', { 
    matchCount: matches.length,
    duration: timer()
  });
  
  const existingSessions = await storage.getMatchSessionsForJob(jobId);
  let session: MatchSession | undefined;
  
  if (existingSessions.length > 0) {
    session = existingSessions[0];
    session = await storage.updateMatchSession(session.id, {
      status: 'step1_complete',
      step1Results: matches as any,
    });
  } else {
    session = await storage.createMatchSession({
      jobId,
      status: 'step1_complete',
      step1Results: matches as any,
      step2Selections: null,
      step2Results: null,
      userNotes: null,
    });
  }
  
  return {
    sessionId: session?.id || '',
    matches,
    totalMatches: matches.length,
  };
}

export async function runMatchStep2(input: MatchStep2Input): Promise<MatchStep2Result> {
  const { jobId, profileIds, sessionId } = input;
  const timer = logger.startTimer();
  const matchLog = logger.withContext({ jobId, step: 'step2' });
  
  if (!profileIds || profileIds.length === 0) {
    throw badRequest('profileIds array is required');
  }
  
  const job = await storage.getJob(jobId);
  if (!job) {
    throw notFound('Job', jobId);
  }
  
  let session: MatchSession | undefined;
  if (sessionId) {
    const existingSession = await storage.getMatchSession(sessionId);
    if (!existingSession) {
      throw notFound('Match session', sessionId);
    }
    if (existingSession.jobId !== jobId) {
      throw forbidden('Session does not belong to this job');
    }
    session = existingSession;
  }
  
  matchLog.info('Starting Step 2 AI analysis', { candidateCount: profileIds.length });
  
  const aiResults = await analyzeMultipleCandidates(jobId, profileIds);
  
  matchLog.info('Step 2 AI analysis complete', { 
    analyzedCount: aiResults.length,
    duration: timer()
  });
  
  if (session) {
    session = await storage.updateMatchSession(session.id, {
      status: 'completed',
      step2Selections: profileIds as any,
      step2Results: aiResults as any,
    });
  } else {
    session = await storage.createMatchSession({
      jobId,
      status: 'completed',
      step1Results: null,
      step2Selections: profileIds as any,
      step2Results: aiResults as any,
      userNotes: null,
    });
  }
  
  const mappedResults: MappedAnalysisResult[] = aiResults.map(result => ({
    resumeId: result.profileId,
    candidateName: result.profileName,
    matchScore: result.aiScore,
    summary: result.explanation,
    strengths: result.strengths,
    concerns: result.concerns,
    evidence: result.evidence.map(e => ({
      category: e.category,
      jobQuote: e.jobQuote,
      resumeQuote: e.resumeQuote,
      assessment: e.assessment,
    })),
    confidence: result.confidence,
  }));
  
  return {
    sessionId: session?.id || '',
    results: mappedResults,
    totalAnalyzed: mappedResults.length,
  };
}

export async function getMatchSession(sessionId: string): Promise<MatchSession> {
  const session = await storage.getMatchSession(sessionId);
  if (!session) {
    throw notFound('Match session', sessionId);
  }
  return session;
}

export async function getMatchSessionsForJob(jobId: string): Promise<{
  sessions: MatchSession[];
  total: number;
}> {
  const sessions = await storage.getMatchSessionsForJob(jobId);
  return {
    sessions,
    total: sessions.length,
  };
}
