/**
 * Step 1 Matching Service: Systematic skill-based matching
 * 
 * Compares job required skills vs candidate skills using structured data
 * Returns ranked candidates with overlap scores and matched/missing skills
 */

import { storage } from "../storage";
import type { SkillInstance, Skill } from "@shared/schema";

export interface MatchedSkill {
  canonicalName: string;
  category: string;
  rawLabel: string;
  priority: string;
}

export interface MissingSkill {
  canonicalName: string;
  category: string;
  priority: string;
  severity: 'critical' | 'preferred'; // critical for must_have, preferred for nice_to_have
}

export interface CandidateMatch {
  resumeId: string; // Changed from profileId to match frontend expectations
  candidateName: string;
  overlapScore: number; // 0-100
  matchedSkills: string[]; // Array of matched skill names
  missingSkills: string[]; // Array of missing skill names
  location?: string;
  availability?: string;
  mustHaveMatches: number;
  mustHaveRequired: number;
  niceToHaveMatches: number;
  niceToHaveTotal: number;
}

/**
 * Calculates weighted overlap score based on priority
 * Must-have skills are weighted more heavily than nice-to-have
 * CRITICAL: Returns 0 if candidate doesn't meet 100% of must-have requirements
 */
function calculateOverlapScore(
  mustHaveMatches: number,
  mustHaveRequired: number,
  niceToHaveMatches: number,
  niceToHaveTotal: number
): number {
  // CRITICAL FIX: Require 100% must-have coverage
  // If there are must-haves and candidate doesn't have ALL of them, score is 0
  if (mustHaveRequired > 0 && mustHaveMatches < mustHaveRequired) {
    return 0; // Immediate filter - missing critical skills
  }

  // If there are must-have requirements, they account for 70% of score
  // Nice-to-have accounts for 30%
  let score = 0;

  if (mustHaveRequired > 0) {
    const mustHaveScore = (mustHaveMatches / mustHaveRequired) * 70;
    score += mustHaveScore;
  } else {
    // If no must-haves, give full weight to nice-to-haves
    score += 70; // max out must-have portion
  }

  if (niceToHaveTotal > 0) {
    const niceToHaveScore = (niceToHaveMatches / niceToHaveTotal) * 30;
    score += niceToHaveScore;
  } else {
    score += 30; // max out nice-to-have portion
  }

  return Math.round(score);
}

/**
 * Finds matching candidates for a given job
 */
export async function findMatchingCandidates(jobId: string): Promise<CandidateMatch[]> {
  // Get job skill instances with details
  const jobSkillInstances = await storage.getSkillInstancesWithDetails('job', jobId);
  
  if (jobSkillInstances.length === 0) {
    console.log(`No skills found for job ${jobId}`);
    return [];
  }

  // Separate must-have and nice-to-have skills
  const mustHaveSkills = jobSkillInstances.filter(
    si => si.priority === 'must_have' || si.priority === 'core'
  );
  const niceToHaveSkills = jobSkillInstances.filter(
    si => si.priority === 'nice_to_have' || si.priority === 'preferred'
  );

  console.log(`Job ${jobId} requires:`);
  console.log(`  - ${mustHaveSkills.length} must-have skills`);
  console.log(`  - ${niceToHaveSkills.length} nice-to-have skills`);

  // Get all profiles (resumes)
  let page = 1;
  const limit = 50;
  let allProfiles: string[] = [];
  let hasMore = true;

  while (hasMore) {
    const resumes = await storage.getAllResumes({ page, limit, status: 'completed' });
    allProfiles.push(...resumes.map(r => r.id));
    hasMore = resumes.length === limit;
    page++;
  }

  console.log(`Comparing against ${allProfiles.length} profiles...`);

  const matches: CandidateMatch[] = [];

  // Compare each profile
  for (const profileId of allProfiles) {
    const profileSkillInstances = await storage.getSkillInstancesWithDetails('profile', profileId);
    
    if (profileSkillInstances.length === 0) {
      continue; // Skip profiles with no skills
    }

    // Get resume data for candidate info
    const resume = await storage.getResume(profileId);
    if (!resume || !resume.resumeCard) {
      continue;
    }

    const resumeCard = resume.resumeCard as any;
    const candidateName = resumeCard.basics?.name || 'Candidate Name Not Available';
    const location = resumeCard.basics?.location || undefined;
    const availability = resumeCard.basics?.availability || undefined;

    // Create set of canonical skill IDs for quick lookup
    const profileSkillIds = new Set(profileSkillInstances.map(si => si.canonicalSkillId));

    // Find matched must-have skills
    const mustHaveMatched = mustHaveSkills.filter(jobSkill =>
      profileSkillIds.has(jobSkill.canonicalSkillId)
    );

    // Find matched nice-to-have skills
    const niceToHaveMatched = niceToHaveSkills.filter(jobSkill =>
      profileSkillIds.has(jobSkill.canonicalSkillId)
    );

    // Calculate overlap score
    const overlapScore = calculateOverlapScore(
      mustHaveMatched.length,
      mustHaveSkills.length,
      niceToHaveMatched.length,
      niceToHaveSkills.length
    );

    // Only include candidates with at least some overlap
    if (overlapScore < 10) {
      continue; // Filter out very low matches
    }

    // Find missing must-have skills
    const missingMustHave = mustHaveSkills.filter(jobSkill =>
      !profileSkillIds.has(jobSkill.canonicalSkillId)
    );

    // Find missing nice-to-have skills
    const missingNiceToHave = niceToHaveSkills.filter(jobSkill =>
      !profileSkillIds.has(jobSkill.canonicalSkillId)
    );

    // Build matched skills array (simple string array)
    const matchedSkills: string[] = [
      ...mustHaveMatched.map(si => si.skill.canonicalName),
      ...niceToHaveMatched.map(si => si.skill.canonicalName),
    ];

    // Build missing skills array (simple string array)
    const missingSkills: string[] = [
      ...missingMustHave.map(si => si.skill.canonicalName),
      ...missingNiceToHave.map(si => si.skill.canonicalName),
    ];

    matches.push({
      resumeId: profileId,
      candidateName,
      overlapScore,
      matchedSkills,
      missingSkills,
      location,
      availability,
      mustHaveMatches: mustHaveMatched.length,
      mustHaveRequired: mustHaveSkills.length,
      niceToHaveMatches: niceToHaveMatched.length,
      niceToHaveTotal: niceToHaveSkills.length,
    });
  }

  // Sort by overlap score (highest first)
  matches.sort((a, b) => b.overlapScore - a.overlapScore);

  console.log(`Found ${matches.length} matching profiles`);

  return matches;
}

/**
 * Get match details for a specific candidate-job pair
 */
export async function getMatchDetails(jobId: string, profileId: string): Promise<CandidateMatch | null> {
  const matches = await findMatchingCandidates(jobId);
  return matches.find(m => m.resumeId === profileId) || null;
}
