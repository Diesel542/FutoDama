/**
 * Step 1 Matching Service: Semantic skill-based matching
 * 
 * V2: Uses text similarity and fuzzy matching instead of requiring exact canonical skill matches
 * Falls back to raw text comparison when skill_instances are incomplete
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
 * Calculate text similarity between two strings using simple word overlap
 * Returns a score from 0 to 1
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  const words1 = text1.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const words2 = text2.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  
  if (words1.length === 0 || words2.length === 0) return 0;
  
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  
  let matches = 0;
  for (const word of Array.from(set1)) {
    if (set2.has(word)) {
      matches++;
    }
  }
  
  // Jaccard similarity
  const union = new Set([...words1, ...words2]).size;
  return matches / union;
}

/**
 * Check if a skill matches a requirement using fuzzy text matching
 * Returns true if there's strong overlap or known synonyms
 */
function fuzzySkillMatch(requirement: string, candidateSkill: string): boolean {
  const reqLower = requirement.toLowerCase();
  const skillLower = candidateSkill.toLowerCase();
  
  // Exact match
  if (reqLower === skillLower) return true;
  
  // One contains the other
  if (reqLower.includes(skillLower) || skillLower.includes(reqLower)) return true;
  
  // Check for common synonyms and abbreviations
  const synonyms: Record<string, string[]> = {
    'javascript': ['js', 'ecmascript', 'node', 'nodejs', 'react', 'vue', 'angular'],
    'python': ['py', 'django', 'flask', 'fastapi'],
    'sql': ['mysql', 'postgresql', 'mssql', 'oracle', 'database'],
    'agile': ['scrum', 'kanban', 'sprint'],
    'project management': ['pm', 'project manager', 'program management'],
    'sap': ['sap ibp', 'sap s/4hana', 'sap modules', 'sap erp'],
  };
  
  for (const [key, values] of Object.entries(synonyms)) {
    if ((reqLower.includes(key) || values.some(v => reqLower.includes(v))) &&
        (skillLower.includes(key) || values.some(v => skillLower.includes(v)))) {
      return true;
    }
  }
  
  // Calculate word overlap
  const similarity = calculateTextSimilarity(requirement, candidateSkill);
  return similarity > 0.4; // 40% word overlap threshold
}

/**
 * Calculates weighted overlap score based on priority
 * V2: Uses graduated scoring - doesn't require 100% must-have coverage
 * 80%+ must-haves = strong match (70-100% overall)
 * 60-79% must-haves = moderate match (40-69% overall)
 * <60% must-haves = weak match (0-39% overall)
 */
function calculateOverlapScore(
  mustHaveMatches: number,
  mustHaveRequired: number,
  niceToHaveMatches: number,
  niceToHaveTotal: number
): number {
  // Must-haves account for 70% of score, nice-to-haves for 30%
  let score = 0;

  if (mustHaveRequired > 0) {
    const mustHaveRatio = mustHaveMatches / mustHaveRequired;
    const mustHaveScore = mustHaveRatio * 70;
    score += mustHaveScore;
  } else {
    // If no must-haves, give full weight to nice-to-haves
    score += 70;
  }

  if (niceToHaveTotal > 0) {
    const niceToHaveScore = (niceToHaveMatches / niceToHaveTotal) * 30;
    score += niceToHaveScore;
  } else {
    score += 30;
  }

  return Math.round(score);
}

/**
 * Finds matching candidates for a given job using hybrid approach:
 * 1. Fuzzy skill instance matching (if available)
 * 2. Text-based matching against raw job requirements
 */
export async function findMatchingCandidates(jobId: string): Promise<CandidateMatch[]> {
  // Get job data
  const job = await storage.getJob(jobId);
  if (!job || !job.jobCard) {
    console.log(`Job ${jobId} not found or has no job card`);
    return [];
  }

  const jobCard = job.jobCard as any;
  
  // Extract requirements from job card
  const mustHaveRequirements: string[] = [];
  const niceToHaveRequirements: string[] = [];
  
  // Get must-have requirements
  if (jobCard.requirements?.must_have) {
    mustHaveRequirements.push(...jobCard.requirements.must_have);
  }
  if (jobCard.requirements?.technical_skills) {
    mustHaveRequirements.push(...jobCard.requirements.technical_skills);
  }
  if (jobCard.requirements?.soft_skills) {
    mustHaveRequirements.push(...jobCard.requirements.soft_skills);
  }
  if (jobCard.requirements?.experience_required) {
    // Split experience text into meaningful phrases
    const expPhrases = jobCard.requirements.experience_required
      .split(/[;,\n]/)
      .map((p: string) => p.trim())
      .filter((p: string) => p.length > 10);
    mustHaveRequirements.push(...expPhrases);
  }
  
  // Get nice-to-have requirements
  if (jobCard.requirements?.nice_to_have) {
    niceToHaveRequirements.push(...jobCard.requirements.nice_to_have);
  }
  if (jobCard.preferred_skills) {
    niceToHaveRequirements.push(...jobCard.preferred_skills);
  }

  console.log(`Job ${jobId} requires:`);
  console.log(`  - ${mustHaveRequirements.length} must-have requirements`);
  console.log(`  - ${niceToHaveRequirements.length} nice-to-have requirements`);

  // Get all completed resumes
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
    const resume = await storage.getResume(profileId);
    if (!resume || !resume.resumeCard) {
      continue;
    }

    const resumeCard = resume.resumeCard as any;
    const candidateName = resumeCard.personal_info?.name || resumeCard.basics?.name || 'Candidate Name Not Available';
    const location = resumeCard.personal_info?.location || resumeCard.basics?.location || undefined;
    const availability = resumeCard.personal_info?.availability || resumeCard.basics?.availability || undefined;

    // Collect all candidate skills and experience text
    const candidateSkills: string[] = [];
    const candidateExperienceText: string[] = [];
    
    // Extract skills
    if (resumeCard.technical_skills) {
      candidateSkills.push(...resumeCard.technical_skills.map((s: any) => 
        typeof s === 'string' ? s : s.skill || s.name
      ));
    }
    if (resumeCard.soft_skills) {
      candidateSkills.push(...resumeCard.soft_skills);
    }
    if (resumeCard.all_skills) {
      candidateSkills.push(...resumeCard.all_skills);
    }
    if (resumeCard.skills?.technical) {
      candidateSkills.push(...resumeCard.skills.technical);
    }
    if (resumeCard.skills?.soft) {
      candidateSkills.push(...resumeCard.skills.soft);
    }
    
    // Extract experience text
    if (resumeCard.work_experience) {
      for (const exp of resumeCard.work_experience) {
        if (exp.position) candidateExperienceText.push(exp.position);
        if (exp.description) candidateExperienceText.push(exp.description);
        if (exp.responsibilities) candidateExperienceText.push(...exp.responsibilities);
      }
    }
    if (resumeCard.experience) {
      for (const exp of resumeCard.experience) {
        if (exp.title) candidateExperienceText.push(exp.title);
        if (exp.description) candidateExperienceText.push(exp.description);
      }
    }
    
    // Combine all candidate text for matching
    const candidateText = [
      ...candidateSkills,
      ...candidateExperienceText,
      resumeCard.personal_info?.title || '',
      resumeCard.professional_summary || resumeCard.summary || ''
    ].join(' ').toLowerCase();

    // Match must-have requirements
    const matchedMustHaves: string[] = [];
    const missingMustHaves: string[] = [];
    
    for (const req of mustHaveRequirements) {
      let matched = false;
      
      // Check against candidate skills first
      for (const skill of candidateSkills) {
        if (fuzzySkillMatch(req, skill)) {
          matchedMustHaves.push(req);
          matched = true;
          break;
        }
      }
      
      // If not matched, check against full candidate text
      if (!matched && candidateText.includes(req.toLowerCase())) {
        matchedMustHaves.push(req);
        matched = true;
      }
      
      if (!matched) {
        missingMustHaves.push(req);
      }
    }

    // Match nice-to-have requirements
    const matchedNiceToHaves: string[] = [];
    const missingNiceToHaves: string[] = [];
    
    for (const req of niceToHaveRequirements) {
      let matched = false;
      
      // Check against candidate skills
      for (const skill of candidateSkills) {
        if (fuzzySkillMatch(req, skill)) {
          matchedNiceToHaves.push(req);
          matched = true;
          break;
        }
      }
      
      // If not matched, check against full text
      if (!matched && candidateText.includes(req.toLowerCase())) {
        matchedNiceToHaves.push(req);
        matched = true;
      }
      
      if (!matched) {
        missingNiceToHaves.push(req);
      }
    }

    // Calculate overlap score
    const overlapScore = calculateOverlapScore(
      matchedMustHaves.length,
      mustHaveRequirements.length,
      matchedNiceToHaves.length,
      niceToHaveRequirements.length
    );

    // Filter out very low matches (less than 20% overall)
    if (overlapScore < 20) {
      continue;
    }

    matches.push({
      resumeId: profileId,
      candidateName,
      overlapScore,
      matchedSkills: [...matchedMustHaves, ...matchedNiceToHaves],
      missingSkills: [...missingMustHaves, ...missingNiceToHaves],
      location,
      availability,
      mustHaveMatches: matchedMustHaves.length,
      mustHaveRequired: mustHaveRequirements.length,
      niceToHaveMatches: matchedNiceToHaves.length,
      niceToHaveTotal: niceToHaveRequirements.length,
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
