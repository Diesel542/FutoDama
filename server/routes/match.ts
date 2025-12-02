import { Router } from "express";
import { storage } from "../storage";
import { findMatchingCandidates } from "../skills/matcher";
import { analyzeMultipleCandidates } from "../skills/ai-matcher";

const router = Router({ mergeParams: true });

router.post('/step1', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    const job = await storage.getJob(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    console.log(`Starting Step 1 matching for job ${jobId}...`);
    
    const matches = await findMatchingCandidates(jobId);
    
    const existingSessions = await storage.getMatchSessionsForJob(jobId);
    let session;
    
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
    
    res.json({
      sessionId: session?.id,
      matches,
      totalMatches: matches.length,
    });
  } catch (error) {
    console.error('Step 1 matching error:', error);
    res.status(500).json({ error: 'Failed to run Step 1 matching' });
  }
});

router.post('/step2', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { profileIds, sessionId } = req.body;
    
    if (!profileIds || !Array.isArray(profileIds) || profileIds.length === 0) {
      return res.status(400).json({ error: 'profileIds array is required' });
    }
    
    const job = await storage.getJob(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    let session;
    if (sessionId) {
      const existingSession = await storage.getMatchSession(sessionId);
      if (!existingSession) {
        return res.status(404).json({ error: 'Match session not found' });
      }
      if (existingSession.jobId !== jobId) {
        return res.status(403).json({ error: 'Session does not belong to this job' });
      }
      session = existingSession;
    }
    
    console.log(`Starting Step 2 AI analysis for ${profileIds.length} candidates...`);
    
    const aiResults = await analyzeMultipleCandidates(jobId, profileIds);
    
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
    
    const mappedResults = aiResults.map(result => ({
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
    
    res.json({
      sessionId: session?.id,
      results: mappedResults,
      totalAnalyzed: mappedResults.length,
    });
  } catch (error) {
    console.error('Step 2 matching error:', error);
    res.status(500).json({ error: 'Failed to run Step 2 matching' });
  }
});

export default router;
