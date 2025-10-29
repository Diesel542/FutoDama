/**
 * Step 2 AI Analysis Service: In-depth AI-powered matching
 * 
 * Uses GPT-4 to perform contextual analysis of job-candidate fit
 * Returns detailed scores, explanations, evidence, and concerns
 */

import OpenAI from "openai";
import { storage } from "../storage";
import type { Job, Resume, JobCard, ResumeCard } from "@shared/schema";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface AIMatchResult {
  profileId: string;
  profileName: string;
  aiScore: number; // 0-100
  explanation: string;
  evidence: Array<{
    category: string;
    jobQuote: string;
    resumeQuote: string;
    assessment: string;
  }>;
  concerns: string[];
  strengths: string[];
  confidence: number; // 0.0-1.0
}

/**
 * Analyzes a single candidate against a job using GPT-4
 */
async function analyzeCandidate(job: Job, resume: Resume): Promise<AIMatchResult> {
  const jobCard = job.jobCard as JobCard;
  const resumeCard = resume.resumeCard as ResumeCard;

  // Build comprehensive prompt
  const systemPrompt = `You are an expert technical recruiter and talent matcher. Your job is to deeply analyze how well a candidate fits a job requirement.

You must provide:
1. A match score (0-100) where:
   - 90-100: Exceptional fit, rare to find better
   - 75-89: Strong fit, highly recommended
   - 60-74: Good fit, worth interviewing
   - 40-59: Moderate fit, has gaps but potential
   - 0-39: Poor fit, significant misalignment

2. Detailed explanation analyzing:
   - Technical skills alignment
   - Experience level match
   - Domain expertise fit
   - Soft skills compatibility
   - Cultural fit indicators

3. Evidence: Specific quotes from both job description and resume that support your assessment

4. Concerns: Red flags or gaps that could be issues

5. Strengths: Key reasons why this candidate stands out

6. Confidence: How confident you are in this assessment (0.0-1.0)

Be honest, specific, and cite evidence. Don't be overly optimistic - highlight real concerns.`;

  const userPrompt = `
**JOB DESCRIPTION**

Title: ${jobCard.basics?.title || 'N/A'}
Company: ${jobCard.basics?.company || 'N/A'}
Location: ${jobCard.basics?.location || 'N/A'} (${jobCard.basics?.work_mode || 'N/A'})

Overview: ${jobCard.overview || 'N/A'}

Requirements:
- Experience Required: ${jobCard.requirements?.experience_required || 'N/A'}
- Technical Skills: ${jobCard.requirements?.technical_skills?.join(', ') || 'N/A'}
- Soft Skills: ${jobCard.requirements?.soft_skills?.join(', ') || 'N/A'}
- Nice to Have: ${jobCard.requirements?.nice_to_have?.join(', ') || 'N/A'}

Project Details:
- Start Date: ${jobCard.project_details?.start_date || 'N/A'}
- Duration: ${jobCard.project_details?.duration || 'N/A'}
- Rate Band: ${jobCard.project_details?.rate_band || 'N/A'}

Original Job Text:
${job.originalText.substring(0, 2000)}

---

**CANDIDATE RESUME**

Name: ${resumeCard.personal_info?.name || 'N/A'}
Title: ${resumeCard.personal_info?.title || 'N/A'}
Location: ${resumeCard.personal_info?.location || 'N/A'}
Years Experience: ${resumeCard.personal_info?.years_experience || 'N/A'}

Professional Summary:
${resumeCard.professional_summary || 'N/A'}

Technical Skills:
${resumeCard.technical_skills?.map(s => `- ${s.skill}${s.proficiency ? ` (${s.proficiency}%)` : ''}`).join('\n') || 'N/A'}

Work Experience:
${resumeCard.work_experience?.map(exp => 
  `- ${exp.title} at ${exp.company} (${exp.start_date || '?'} - ${exp.end_date || 'present'})\n  ${exp.description || ''}`
).join('\n\n') || 'N/A'}

Availability:
${resumeCard.availability?.status || 'N/A'} - ${resumeCard.availability?.commitment || 'N/A'}

Original Resume Text:
${resume.originalText.substring(0, 2000)}

---

Provide your analysis in this JSON format:
{
  "match_score": number (0-100),
  "explanation": "detailed explanation",
  "evidence": [
    {
      "category": "technical_skills" | "experience" | "domain" | "soft_skills" | "availability",
      "job_quote": "exact quote from job",
      "resume_quote": "exact quote from resume",
      "assessment": "how this evidence impacts the match"
    }
  ],
  "concerns": ["concern 1", "concern 2"],
  "strengths": ["strength 1", "strength 2"],
  "confidence": number (0.0-1.0)
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    const result = JSON.parse(content);

    return {
      profileId: resume.id,
      profileName: resumeCard.personal_info?.name || 'Unknown',
      aiScore: result.match_score || 0,
      explanation: result.explanation || '',
      evidence: result.evidence || [],
      concerns: result.concerns || [],
      strengths: result.strengths || [],
      confidence: result.confidence || 0.5,
    };
  } catch (error) {
    console.error(`Error analyzing candidate ${resume.id}:`, error);
    
    // Return fallback result on error
    return {
      profileId: resume.id,
      profileName: resumeCard.personal_info?.name || 'Unknown',
      aiScore: 0,
      explanation: 'Analysis failed due to an error.',
      evidence: [],
      concerns: ['AI analysis unavailable'],
      strengths: [],
      confidence: 0,
    };
  }
}

/**
 * Analyzes multiple candidates for a job in parallel (batched)
 */
export async function analyzeMultipleCandidates(
  jobId: string,
  profileIds: string[]
): Promise<AIMatchResult[]> {
  const job = await storage.getJob(jobId);
  if (!job || !job.jobCard) {
    throw new Error(`Job ${jobId} not found or has no job card`);
  }

  console.log(`🤖 Starting AI analysis for ${profileIds.length} candidates...`);

  const results: AIMatchResult[] = [];

  // Process in batches of 5 to avoid rate limits
  const batchSize = 5;
  for (let i = 0; i < profileIds.length; i += batchSize) {
    const batch = profileIds.slice(i, i + batchSize);
    console.log(`  Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(profileIds.length / batchSize)}...`);

    const batchPromises = batch.map(async (profileId) => {
      const resume = await storage.getResume(profileId);
      if (!resume || !resume.resumeCard) {
        console.warn(`  ⚠ Skipping ${profileId}: no resume card`);
        return null;
      }

      return analyzeCandidate(job, resume);
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults.filter(r => r !== null) as AIMatchResult[]);
  }

  // Sort by AI score (highest first)
  results.sort((a, b) => b.aiScore - a.aiScore);

  console.log(`✅ AI analysis complete. Scores range: ${results[0]?.aiScore || 0}-${results[results.length - 1]?.aiScore || 0}`);

  return results;
}

/**
 * Analyzes a single candidate for a job
 */
export async function analyzeSingleCandidate(
  jobId: string,
  profileId: string
): Promise<AIMatchResult> {
  const job = await storage.getJob(jobId);
  if (!job || !job.jobCard) {
    throw new Error(`Job ${jobId} not found or has no job card`);
  }

  const resume = await storage.getResume(profileId);
  if (!resume || !resume.resumeCard) {
    throw new Error(`Resume ${profileId} not found or has no resume card`);
  }

  return analyzeCandidate(job, resume);
}
