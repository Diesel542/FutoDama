import { storage } from "../storage";
import { type JobCard, type ResumeCard, type Skill, type SkillInstance } from "@shared/schema";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Skill categories for classification
export type SkillCategory = "technical" | "soft_skill" | "domain" | "tool" | "methodology";

interface NormalizedSkill {
  canonicalName: string;
  category: SkillCategory;
  rawLabel: string;
  priority?: string;
  confidence: number;
}

/**
 * Normalizes a skill name by applying cleanup rules
 */
function cleanupSkillName(skill: string): string {
  return skill
    .trim()
    .replace(/\s+/g, ' ') // normalize whitespace
    .replace(/[^\w\s.-]/g, '') // remove special chars except dot, dash
    .toLowerCase();
}

/**
 * Uses OpenAI to categorize an unknown skill and suggest canonical name
 */
async function categorizeSkillWithAI(rawSkill: string): Promise<{ canonicalName: string; category: SkillCategory; confidence: number }> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a skills taxonomy expert. Given a skill name, determine:
1. canonical_name: The standardized name for this skill (e.g., "JavaScript" for "JS", "React" for "ReactJS")
2. category: One of: technical, soft_skill, domain, tool, methodology
3. confidence: 0.0-1.0 how confident you are

Rules:
- Use official names (e.g., "JavaScript" not "JS")
- Keep framework names as-is (e.g., "React", "Vue.js")
- Categorize programming languages as "technical"
- Categorize frameworks/libraries as "tool"
- Categorize communication/leadership as "soft_skill"
- Categorize industry knowledge as "domain"
- Categorize practices (Agile, Scrum) as "methodology"

Respond in JSON format: { "canonical_name": string, "category": string, "confidence": number }`
        },
        {
          role: "user",
          content: `Skill: "${rawSkill}"`
        }
      ],
      temperature: 0.3,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    const result = JSON.parse(content);
    return {
      canonicalName: result.canonical_name,
      category: result.category as SkillCategory,
      confidence: result.confidence,
    };
  } catch (error) {
    console.error("Error categorizing skill with AI:", error);
    // Fallback: use cleaned name as canonical and guess category
    return {
      canonicalName: cleanupSkillName(rawSkill),
      category: "technical",
      confidence: 0.5,
    };
  }
}

/**
 * Normalizes a skill: finds or creates canonical skill, creates alias
 */
async function normalizeSkill(rawSkill: string, priority?: string): Promise<NormalizedSkill> {
  const cleanedSkill = cleanupSkillName(rawSkill);
  
  // Check if we have an alias mapping
  const aliases = await storage.getSkillAliasesByAlias(cleanedSkill);
  
  if (aliases.length > 0) {
    // Found existing alias, get the canonical skill
    const skill = await storage.getSkill(aliases[0].canonicalSkillId);
    if (skill) {
      return {
        canonicalName: skill.canonicalName,
        category: skill.category as SkillCategory,
        rawLabel: rawSkill,
        priority,
        confidence: aliases[0].confidence,
      };
    }
  }

  // Check if this exact name is already a canonical skill
  const existingSkill = await storage.getSkillByCanonicalName(cleanedSkill);
  if (existingSkill) {
    return {
      canonicalName: existingSkill.canonicalName,
      category: existingSkill.category as SkillCategory,
      rawLabel: rawSkill,
      priority,
      confidence: 1.0,
    };
  }

  // New skill - use AI to categorize
  const aiResult = await categorizeSkillWithAI(rawSkill);
  
  // Check if AI suggested canonical name already exists
  let canonicalSkill = await storage.getSkillByCanonicalName(aiResult.canonicalName);
  
  if (!canonicalSkill) {
    // Create new canonical skill
    canonicalSkill = await storage.createSkill({
      canonicalName: aiResult.canonicalName,
      category: aiResult.category,
      description: null,
      embedding: null,
      metadata: null,
    });
  }

  // Create alias mapping
  if (cleanedSkill !== aiResult.canonicalName) {
    await storage.findOrCreateSkillAlias(
      cleanedSkill,
      canonicalSkill.id,
      aiResult.confidence,
      'ai'
    );
  }

  return {
    canonicalName: canonicalSkill.canonicalName,
    category: aiResult.category,
    rawLabel: rawSkill,
    priority,
    confidence: aiResult.confidence,
  };
}

/**
 * Extracts and normalizes skills from a job card
 */
export async function normalizeJobSkills(jobId: string, jobCard: JobCard): Promise<SkillInstance[]> {
  const skillInstances: SkillInstance[] = [];
  const skillsToProcess: Array<{ skill: string; priority: string }> = [];

  // Extract must-have technical skills
  if (jobCard.requirements?.technical_skills) {
    for (const skill of jobCard.requirements.technical_skills) {
      skillsToProcess.push({ skill, priority: 'must_have' });
    }
  }

  // Extract nice-to-have skills
  if (jobCard.requirements?.nice_to_have) {
    for (const skill of jobCard.requirements.nice_to_have) {
      skillsToProcess.push({ skill, priority: 'nice_to_have' });
    }
  }

  // Extract soft skills
  if (jobCard.requirements?.soft_skills) {
    for (const skill of jobCard.requirements.soft_skills) {
      skillsToProcess.push({ skill, priority: 'must_have' });
    }
  }

  // Extract preferred skills
  if (jobCard.preferred_skills) {
    for (const skill of jobCard.preferred_skills) {
      skillsToProcess.push({ skill, priority: 'nice_to_have' });
    }
  }

  // Normalize each skill and create instances
  for (const { skill, priority } of skillsToProcess) {
    try {
      const normalized = await normalizeSkill(skill, priority);
      
      // Find the canonical skill ID
      const canonicalSkill = await storage.getSkillByCanonicalName(normalized.canonicalName);
      if (!canonicalSkill) continue;

      const instance = await storage.createSkillInstance({
        entityType: 'job',
        entityId: jobId,
        canonicalSkillId: canonicalSkill.id,
        rawLabel: normalized.rawLabel,
        level: null,
        yearsExperience: null,
        priority: normalized.priority || null,
        extractionConfidence: normalized.confidence,
        evidencePointer: null,
      });

      skillInstances.push(instance);
    } catch (error) {
      console.error(`Error normalizing skill "${skill}":`, error);
    }
  }

  return skillInstances;
}

/**
 * Extracts and normalizes skills from a resume card
 */
export async function normalizeResumeSkills(resumeId: string, resumeCard: ResumeCard): Promise<SkillInstance[]> {
  const skillInstances: SkillInstance[] = [];
  const skillsToProcess: string[] = [];

  // Extract technical skills
  if (resumeCard.technical_skills) {
    for (const skillObj of resumeCard.technical_skills) {
      skillsToProcess.push(skillObj.skill);
    }
  }

  // Extract soft skills
  if (resumeCard.soft_skills) {
    skillsToProcess.push(...resumeCard.soft_skills);
  }

  // Extract all skills
  if (resumeCard.all_skills) {
    skillsToProcess.push(...resumeCard.all_skills);
  }

  // Remove duplicates
  const uniqueSkills = Array.from(new Set(skillsToProcess));

  // Normalize each skill and create instances
  for (const skill of uniqueSkills) {
    try {
      const normalized = await normalizeSkill(skill, 'core');
      
      // Find the canonical skill ID
      const canonicalSkill = await storage.getSkillByCanonicalName(normalized.canonicalName);
      if (!canonicalSkill) continue;

      const instance = await storage.createSkillInstance({
        entityType: 'profile',
        entityId: resumeId,
        canonicalSkillId: canonicalSkill.id,
        rawLabel: normalized.rawLabel,
        level: null,
        yearsExperience: null,
        priority: 'core',
        extractionConfidence: normalized.confidence,
        evidencePointer: null,
      });

      skillInstances.push(instance);
    } catch (error) {
      console.error(`Error normalizing skill "${skill}":`, error);
    }
  }

  return skillInstances;
}
