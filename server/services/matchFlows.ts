import { storage } from "../storage";
import { findMatchingCandidates, type CandidateMatch } from "../skills/matcher";
import { analyzeMultipleCandidates, type AIMatchResult } from "../skills/ai-matcher";
import { notFound, badRequest, forbidden } from "../utils/errors";
import { logger } from "../utils/logger";
import type { MatchSession, Step1ResultPayload, Step2SelectionsPayload, Step2ResultPayload } from "@shared/schema";

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

function mapAiResultToMapped(result: AIMatchResult): MappedAnalysisResult {
  return {
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
  };
}

function validateProfileIdsAgainstStep1(
  profileIds: string[],
  step1Results: Step1ResultPayload | null,
  matchLog: ReturnType<typeof logger.withContext>
): string[] {
  if (!step1Results || step1Results.length === 0) {
    return profileIds;
  }
  
  const step1ResumeIds = new Set(step1Results.map(r => r.resumeId));
  const validIds: string[] = [];
  const invalidIds: string[] = [];
  
  for (const id of profileIds) {
    if (step1ResumeIds.has(id)) {
      validIds.push(id);
    } else {
      invalidIds.push(id);
    }
  }
  
  if (invalidIds.length > 0) {
    matchLog.warn('Some profileIds were not in Step 1 results - filtering out', {
      invalidIds,
      validCount: validIds.length,
      invalidCount: invalidIds.length
    });
  }
  
  return validIds;
}

export async function runMatchStep1(jobId: string): Promise<MatchStep1Result> {
  const timer = logger.startTimer();
  const matchLog = logger.withContext({ flow: 'match', jobId, step: 'step1' });
  
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
  
  const step1Payload: Step1ResultPayload = matches;
  
  if (existingSessions.length > 0) {
    session = existingSessions[0];
    session = await storage.updateMatchSession(session.id, {
      status: 'step1_complete',
      step1Results: step1Payload,
    });
  } else {
    session = await storage.createMatchSession({
      jobId,
      status: 'step1_complete',
      step1Results: step1Payload,
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
  const matchLog = logger.withContext({ flow: 'match', jobId, step: 'step2' });
  
  if (!profileIds || profileIds.length === 0) {
    throw badRequest('profileIds array is required');
  }
  
  const job = await storage.getJob(jobId);
  if (!job) {
    throw notFound('Job', jobId);
  }
  
  let session: MatchSession | undefined;
  let validatedProfileIds = profileIds;
  
  if (sessionId) {
    const existingSession = await storage.getMatchSession(sessionId);
    if (!existingSession) {
      throw notFound('Match session', sessionId);
    }
    if (existingSession.jobId !== jobId) {
      throw forbidden('Session does not belong to this job');
    }
    session = existingSession;
    
    validatedProfileIds = validateProfileIdsAgainstStep1(
      profileIds,
      session.step1Results as Step1ResultPayload | null,
      matchLog
    );
    
    if (validatedProfileIds.length === 0) {
      throw badRequest('No valid profileIds found in Step 1 results');
    }
  }
  
  matchLog.info('Starting Step 2 AI analysis', { 
    candidateCount: validatedProfileIds.length,
    originalCount: profileIds.length
  });
  
  const aiResults = await analyzeMultipleCandidates(jobId, validatedProfileIds);
  
  matchLog.info('Step 2 AI analysis complete', { 
    analyzedCount: aiResults.length,
    duration: timer()
  });
  
  const step2SelectionsPayload: Step2SelectionsPayload = validatedProfileIds;
  const step2ResultsPayload: Step2ResultPayload = aiResults;
  
  if (session) {
    session = await storage.updateMatchSession(session.id, {
      status: 'completed',
      step2Selections: step2SelectionsPayload,
      step2Results: step2ResultsPayload,
    });
  } else {
    session = await storage.createMatchSession({
      jobId,
      status: 'completed',
      step1Results: null,
      step2Selections: step2SelectionsPayload,
      step2Results: step2ResultsPayload,
      userNotes: null,
    });
  }
  
  const mappedResults = aiResults.map(mapAiResultToMapped);
  
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
