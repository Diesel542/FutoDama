import OpenAI from "openai";
import { codexManager } from "./codexManager";
import type { TailoringOptions, ResumeCard, JobCard } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export interface TailorResumeParams {
  resumeJson: ResumeCard;
  jobCardJson: JobCard;
  tailoring: TailoringOptions;
}

export interface TailoredResumeBundle {
  tailored_resume: {
    meta: {
      language: string;
      style: string;
      narrative_voice?: string;
      tone_intensity?: number;
      target_title?: string;
      target_company?: string;
    };
    summary: string;
    skills: {
      core?: string[];
      tools?: string[];
      methodologies?: string[];
      languages?: string[];
    };
    experience: Array<{
      employer: string;
      title: string;
      location?: string;
      start_date: string;
      end_date?: string;
      is_current?: boolean;
      description: string[];
      evidence_links?: string[];
    }>;
    education: Array<{
      institution: string;
      degree: string;
      year?: string;
      details?: string;
    }>;
    certifications?: string[];
    extras?: string[];
  };
  cover_letter?: {
    content: string;
    meta: {
      language: string;
      tone: string;
      voice: string;
      focus: string;
      word_count: number;
    };
  };
  coverage: {
    matrix: Array<{
      jd_item: string;
      resume_evidence: string;
      resume_ref?: string;
      confidence: number;
      notes?: string;
    }>;
    coverage_score: number;
  };
  diff: {
    added?: string[];
    removed?: string[];
    reordered?: string[];
    rephrased?: string[];
  };
  warnings: Array<{
    severity: "info" | "warn" | "error";
    message: string;
    path?: string;
  }>;
  ats_report: {
    keyword_coverage?: string[];
    missing_keywords?: string[];
    format_warnings?: string[];
  };
  rationales?: TailorRationales;
}

export interface RationaleContent {
  short: string;
  detailed?: string;
}

export interface TailorRationales {
  summary?: RationaleContent;
  skills?: RationaleContent;
  experiences?: Array<{
    employer: string;
    title: string;
    rationale: RationaleContent;
  }>;
}

export interface TailorResult {
  ok: boolean;
  errors: string[];
  bundle: TailoredResumeBundle | null;
}

function extractJobKeywords(jobCardJson: any): string[] {
  const keywords: string[] = [];
  
  if (jobCardJson.requirements) {
    if (jobCardJson.requirements.technical_skills) {
      keywords.push(...jobCardJson.requirements.technical_skills);
    }
    if (jobCardJson.requirements.soft_skills) {
      keywords.push(...jobCardJson.requirements.soft_skills);
    }
    if (jobCardJson.requirements.must_have) {
      keywords.push(...jobCardJson.requirements.must_have);
    }
    if (jobCardJson.requirements.nice_to_have) {
      keywords.push(...jobCardJson.requirements.nice_to_have);
    }
  }
  
  if (jobCardJson.competencies) {
    for (const category of Object.values(jobCardJson.competencies)) {
      if (Array.isArray(category)) {
        keywords.push(...category as string[]);
      }
    }
  }
  
  if (jobCardJson.basics?.title) {
    keywords.push(jobCardJson.basics.title);
  }
  
  return Array.from(new Set(keywords));
}

async function runAlignerPass(
  resumeJson: any,
  jobCardJson: any,
  prompts: any
): Promise<{ coverage: TailoredResumeBundle["coverage"]; errors: string[] }> {
  const errors: string[] = [];
  
  try {
    console.log("[TAILOR PASS 1] Running Aligner pass...");
    
    const systemPrompt = prompts.aligner_system || 
      "You align a parsed resume with a job card and produce a coverage matrix. NEVER invent information. Evidence must be quoted from the original resume.";
    
    const userPrompt = `Resume JSON:
${JSON.stringify(resumeJson, null, 2)}

Job Card JSON:
${JSON.stringify(jobCardJson, null, 2)}

Instructions:
1. Analyze the job requirements from the Job Card
2. Find matching evidence in the Resume for each requirement
3. Create a coverage matrix mapping JD requirements to resume evidence
4. Quote exact or near-exact text from the resume as evidence
5. Assign confidence scores (0.0-1.0) based on how well the resume addresses each requirement
6. Calculate an overall coverage_score

Return a JSON object with this structure:
{
  "coverage": {
    "matrix": [
      {
        "jd_item": "<job requirement>",
        "resume_evidence": "<exact quote from resume>",
        "resume_ref": "<section reference like 'work_experience[0].achievements[1]'>",
        "confidence": 0.85,
        "notes": "<optional explanation>"
      }
    ],
    "coverage_score": 0.75
  }
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    console.log("[TAILOR PASS 1] Aligner pass complete, coverage items:", result.coverage?.matrix?.length || 0);
    
    return {
      coverage: result.coverage || { matrix: [], coverage_score: 0 },
      errors
    };
  } catch (error) {
    const errorMsg = `Aligner pass failed: ${(error as Error).message}`;
    console.error("[TAILOR PASS 1]", errorMsg);
    errors.push(errorMsg);
    return {
      coverage: { matrix: [], coverage_score: 0 },
      errors
    };
  }
}

function buildStyleGuide(tailoring: TailoringOptions): string {
  const toneGuides = {
    conservative: "Use measured language, focus on stability and reliability",
    modern: "Use dynamic, action-oriented language with confidence",
    executive: "Use strategic, high-level language focusing on business impact",
    energetic: "Use vibrant, enthusiastic language that shows passion"
  };
  
  const intensityGuides = {
    1: "Keep claims modest and understated",
    2: "Balance between confident and measured",
    3: "Use bold, impactful statements and strong action verbs"
  };
  
  const voiceGuides = {
    first_direct: "Write in first person (e.g., 'I led...', 'I developed...')",
    first_implicit: "Write in implied first person (e.g., 'Led...', 'Developed...')",
    third_person: "Write in third person using the candidate's name"
  };
  
  const lengthGuides = {
    concise: "Keep experience bullets to 3-4 per role, summary to 100-150 words",
    standard: "Keep experience bullets to 4-6 per role, summary to 200-300 words",
    extended: "Allow up to 7 bullets per role, summary up to 400 words"
  };
  
  const emphasisGuide = Object.entries(tailoring.skillEmphasis)
    .filter(([_, level]) => level === 'high')
    .map(([skill]) => skill.replace(/([A-Z])/g, ' $1').toLowerCase().trim())
    .join(', ');
  
  return `
Tone: ${toneGuides[tailoring.toneProfile]}
Intensity: ${intensityGuides[tailoring.toneIntensity]}
Voice: ${voiceGuides[tailoring.narrativeVoice]}
Length: ${lengthGuides[tailoring.resumeLength]}
${emphasisGuide ? `Emphasize: ${emphasisGuide}` : ''}
${tailoring.experience.limitToRecentYears ? `Focus on last ${tailoring.experience.limitToRecentYears} years of experience` : ''}
Experience mode: ${tailoring.experience.mode}
`.trim();
}

async function runTailorPass(
  resumeJson: any,
  jobCardJson: any,
  coverage: TailoredResumeBundle["coverage"],
  tailoring: TailoringOptions,
  prompts: any
): Promise<{ tailored_resume: TailoredResumeBundle["tailored_resume"] | null; errors: string[] }> {
  const errors: string[] = [];
  
  try {
    console.log("[TAILOR PASS 2] Running Tailor pass...");
    
    const systemPrompt = prompts.tailor_system || 
      "You tailor the resume for the target role WITHOUT changing facts. Reorder, merge, and rewrite for relevance and clarity. Keep employers, titles, dates identical. Quote IDs from coverage where you used evidence. Respect style profile.";
    
    const styleGuide = buildStyleGuide(tailoring);
    
    const userPrompt = `Original Resume JSON:
${JSON.stringify(resumeJson, null, 2)}

Job Card JSON:
${JSON.stringify(jobCardJson, null, 2)}

Coverage Matrix:
${JSON.stringify(coverage, null, 2)}

Language: ${tailoring.language}
Style Guide:
${styleGuide}

REWRITING POLICIES:
- DO NOT CHANGE: employer names, employment dates, job titles, education facts
- ALLOWED: reorder bullets for relevance, merge overlapping bullets, rewrite to foreground quantified outcomes ONLY if present in resume text, tense harmonization and clarity edits, deduplicate skills mentioned elsewhere
- FORBIDDEN: fabricating employers/roles/dates/certifications, inventing numbers/metrics not in resume, adding tools/tech not present

Instructions:
1. Create a tailored resume optimized for the target job
2. Prioritize experience and skills that match the coverage matrix
3. Rewrite bullet points to emphasize relevant achievements (facts only!)
4. Organize skills by relevance to the job requirements
5. Keep all factual information unchanged

PROFESSIONAL SUMMARY REQUIREMENTS - VERY IMPORTANT:
The summary MUST be a comprehensive, compelling sales pitch (200-300 words, 2-3 paragraphs) that:

PARAGRAPH 1 (Opening - 80-100 words):
- Opens with a powerful value proposition statement (e.g., "Results-driven [role] with X+ years delivering [key outcome]")
- Highlights their most impressive career achievements with specific metrics and outcomes
- Establishes their seniority level and breadth of experience
- Positions them as a proven expert in their domain

PARAGRAPH 2 (Expertise & Achievements - 80-120 words):
- Details their industry expertise relevant to the target role
- Highlights 3-5 of their STRONGEST differentiators that match the job requirements
- Includes specific examples of complex projects, major initiatives, or transformations they've led
- Emphasizes quantified results (budget sizes, team sizes, revenue impact, efficiency gains, etc.)
- Showcases technical competencies and methodologies they excel at

PARAGRAPH 3 (Closing - 40-80 words):
- Reinforces why they're the ideal candidate for THIS specific role
- Highlights soft skills and leadership qualities (stakeholder management, team building, etc.)
- Ends with a confident statement about their ability to deliver value
- Uses active, confident language throughout

CRITICAL REQUIREMENTS:
- Total length: 200-300 words (measure the word count!)
- Must read like a compelling pitch that answers "Why should we hire this person over everyone else?"
- Include specific numbers, metrics, and achievements from their actual experience
- Tailor the content to emphasize skills and experiences that match the job requirements
- Use industry-specific terminology and demonstrate deep domain knowledge
- Avoid generic statements - every sentence should add concrete value

Example of a GOOD summary (227 words):
"Seasoned IT Project Manager with 15+ years orchestrating complex digital transformations across manufacturing, logistics, and public sector environments. Led end-to-end delivery of 20+ enterprise-scale SAP implementations with combined budgets exceeding €50M, consistently achieving on-time, on-budget outcomes while managing cross-functional teams of 20-40 stakeholders across multiple geographies. Proven track record includes spearheading a €12M supply chain digitalization initiative that reduced operational costs by 23% and improved delivery accuracy to 99.2% within 18 months.

Expert in vendor and system integrator management, with particular strength in navigating complex governance frameworks within regulated industries. Demonstrated excellence in stakeholder alignment and change management, successfully driving adoption of new systems among 3,000+ end users while maintaining business continuity. Deep technical fluency spans SAP modules (MM, SD, WM), integration platforms, and agile methodologies (Scrum, SAFe), enabling effective collaboration with both business leaders and technical teams.

Recognized for building high-performing teams and fostering collaborative cultures that deliver exceptional results under pressure. Skilled at translating technical complexities into executive-level insights, securing buy-in from C-suite stakeholders for strategic initiatives. Known for rigorous risk management and proactive issue resolution that keeps projects on track even in challenging, ambiguous environments."

Example of a WEAK summary (avoid this):
"Project manager with experience in IT projects. Has worked with various systems and led teams. Good communication skills and team player."

Return a JSON object with this structure:
{
  "tailored_resume": {
    "meta": {
      "language": "${tailoring.language}",
      "style": "${tailoring.toneProfile}",
      "narrative_voice": "${tailoring.narrativeVoice}",
      "tone_intensity": ${tailoring.toneIntensity},
      "target_title": "<from job card>",
      "target_company": "<from job card>"
    },
    "summary": "<tailored professional summary>",
    "skills": {
      "core": ["<most relevant skills>"],
      "tools": ["<relevant tools>"],
      "methodologies": ["<relevant methodologies>"],
      "languages": ["<programming/spoken languages>"]
    },
    "experience": [
      {
        "employer": "<unchanged>",
        "title": "<unchanged>",
        "location": "<unchanged>",
        "start_date": "<unchanged>",
        "end_date": "<unchanged>",
        "is_current": false,
        "description": ["<rewritten bullets>"],
        "evidence_links": ["<coverage matrix references>"]
      }
    ],
    "education": [
      {
        "institution": "<unchanged>",
        "degree": "<unchanged>",
        "year": "<unchanged>",
        "details": "<relevant details>"
      }
    ],
    "certifications": ["<from resume>"],
    "extras": ["<other relevant info>"]
  }
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    console.log("[TAILOR PASS 2] Tailor pass complete");
    
    return {
      tailored_resume: result.tailored_resume || null,
      errors
    };
  } catch (error) {
    const errorMsg = `Tailor pass failed: ${(error as Error).message}`;
    console.error("[TAILOR PASS 2]", errorMsg);
    errors.push(errorMsg);
    return {
      tailored_resume: null,
      errors
    };
  }
}

async function runFinalizerPass(
  tailoredResume: TailoredResumeBundle["tailored_resume"],
  coverage: TailoredResumeBundle["coverage"],
  jobKeywords: string[],
  schema: any,
  prompts: any
): Promise<{ diff: TailoredResumeBundle["diff"]; warnings: TailoredResumeBundle["warnings"]; ats_report: TailoredResumeBundle["ats_report"]; errors: string[] }> {
  const errors: string[] = [];
  
  try {
    console.log("[TAILOR PASS 3] Running Finalizer pass...");
    
    const systemPrompt = prompts.finalizer_system || 
      "You finalize: validate against schema, generate diff (added/removed/reordered/rephrased), warnings (e.g., confidence below threshold, missing keywords), and an ATS report. Do not change facts.";
    
    const userPrompt = `Schema:
${JSON.stringify(schema, null, 2)}

Draft Tailored Resume:
${JSON.stringify(tailoredResume, null, 2)}

Coverage Matrix:
${JSON.stringify(coverage, null, 2)}

Job Keywords (from JD):
${JSON.stringify(jobKeywords, null, 2)}

Instructions:
1. Validate the tailored resume against the schema
2. Generate a diff showing what was added/removed/reordered/rephrased
3. Create warnings for:
   - Coverage items with confidence < 0.8
   - Missing required schema fields
   - Potential issues with the tailored content
4. Generate an ATS report showing:
   - Keywords from the JD that are now covered
   - Keywords that are still missing
   - Any formatting issues that might affect ATS parsing

Return a JSON object with this structure:
{
  "diff": {
    "added": ["<new content added>"],
    "removed": ["<content removed>"],
    "reordered": ["<sections/bullets reordered>"],
    "rephrased": ["<content rephrased for impact>"]
  },
  "warnings": [
    {
      "severity": "warn",
      "message": "<warning message>",
      "path": "<optional field path>"
    }
  ],
  "ats_report": {
    "keyword_coverage": ["<JD keywords found in resume>"],
    "missing_keywords": ["<JD keywords NOT found in resume>"],
    "format_warnings": ["<any ATS format concerns>"]
  }
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    console.log("[TAILOR PASS 3] Finalizer pass complete");
    
    return {
      diff: result.diff || { added: [], removed: [], reordered: [], rephrased: [] },
      warnings: result.warnings || [],
      ats_report: result.ats_report || { keyword_coverage: [], missing_keywords: [], format_warnings: [] },
      errors
    };
  } catch (error) {
    const errorMsg = `Finalizer pass failed: ${(error as Error).message}`;
    console.error("[TAILOR PASS 3]", errorMsg);
    errors.push(errorMsg);
    return {
      diff: { added: [], removed: [], reordered: [], rephrased: [] },
      warnings: [{ severity: "error", message: errorMsg }],
      ats_report: { keyword_coverage: [], missing_keywords: [], format_warnings: [] },
      errors
    };
  }
}

async function runCoverLetterPass(
  resumeJson: any,
  jobCardJson: any,
  tailoredResume: TailoredResumeBundle["tailored_resume"],
  tailoring: TailoringOptions,
  prompts: any
): Promise<{ cover_letter: TailoredResumeBundle["cover_letter"] | null; errors: string[] }> {
  const errors: string[] = [];
  
  if (!tailoring.coverLetter.enabled) {
    return { cover_letter: null, errors };
  }
  
  try {
    console.log("[TAILOR PASS 4] Running Cover Letter pass...");
    
    const clOptions = tailoring.coverLetter;
    const voice = clOptions.narrativeVoice || tailoring.narrativeVoice;
    const tone = clOptions.toneProfile || tailoring.toneProfile;
    
    const lengthGuides = {
      short: "Keep the letter to approximately 150 words (3-4 paragraphs)",
      medium: "Write approximately 250 words (4-5 paragraphs)",
      long: "Write approximately 400 words (5-6 paragraphs)"
    };
    
    const focusGuides = {
      standard: "Write a standard job application letter highlighting fit for the role",
      transformation: "Focus on career transformation narrative and how past experience translates",
      leadership: "Emphasize leadership achievements, strategic thinking, and team impact"
    };
    
    const voiceGuides = {
      first_direct: "Write in first person (e.g., 'I am excited to...')",
      first_implicit: "Write with implied subject (e.g., 'Excited to bring my expertise...')",
      third_person: "Write referring to the candidate by name"
    };
    
    const userPrompt = `Resume Summary:
${tailoredResume.summary}

Job Card:
${JSON.stringify(jobCardJson, null, 2)}

Tailored Resume Highlights:
- Key Skills: ${tailoredResume.skills.core?.join(', ') || 'N/A'}
- Recent Role: ${tailoredResume.experience[0]?.title || 'N/A'} at ${tailoredResume.experience[0]?.employer || 'N/A'}

Instructions:
Language: ${tailoring.language}
${lengthGuides[clOptions.length]}
${focusGuides[clOptions.focus]}
${voiceGuides[voice]}
Tone: ${tone}

Write a compelling cover letter that:
1. Opens with a strong hook about the candidate's fit for this specific role
2. Highlights 2-3 key achievements that directly match job requirements
3. Shows genuine enthusiasm for the company and role
4. Closes with a clear call to action

IMPORTANT: Only include facts that appear in the resume. Do not fabricate achievements or experiences.

Return a JSON object:
{
  "cover_letter": {
    "content": "<the full cover letter text>",
    "meta": {
      "language": "${tailoring.language}",
      "tone": "${tone}",
      "voice": "${voice}",
      "focus": "${clOptions.focus}",
      "word_count": <actual word count>
    }
  }
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You write professional cover letters that are compelling yet truthful. Never fabricate information." },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    console.log("[TAILOR PASS 4] Cover Letter pass complete");
    
    return {
      cover_letter: result.cover_letter || null,
      errors
    };
  } catch (error) {
    const errorMsg = `Cover Letter pass failed: ${(error as Error).message}`;
    console.error("[TAILOR PASS 4]", errorMsg);
    errors.push(errorMsg);
    return {
      cover_letter: null,
      errors
    };
  }
}

async function generateRationales(
  resumeJson: ResumeCard,
  jobCardJson: JobCard,
  tailoredResume: TailoredResumeBundle["tailored_resume"] | null | undefined
): Promise<TailorRationales | null> {
  if (!tailoredResume) {
    console.log("[TAILOR PASS 5] Skipping rationale generation - no tailored resume");
    return null;
  }
  
  try {
    console.log("[TAILOR PASS 5] Starting rationale generation...");

    const normalizeToString = (val: unknown): string => {
      if (val === null || val === undefined) return "";
      if (typeof val === 'string') return val;
      if (typeof val === 'object' && 'skill' in (val as object)) return String((val as { skill: unknown }).skill);
      return String(val);
    };

    const normalizeSkillsArray = (skills: unknown): string[] => {
      if (!skills) return [];
      if (Array.isArray(skills)) {
        return skills.map(s => normalizeToString(s)).filter(s => s && s !== "[object Object]");
      }
      if (typeof skills === 'object') {
        const obj = skills as Record<string, unknown>;
        const result: string[] = [];
        ['core', 'tools', 'methodologies', 'languages'].forEach(key => {
          const arr = obj[key];
          if (Array.isArray(arr)) {
            result.push(...arr.map(s => normalizeToString(s)).filter(s => s && s !== "[object Object]"));
          }
        });
        return result;
      }
      return [];
    };

    const jobTitle = normalizeToString(jobCardJson.basics?.title) || "Unknown Role";
    const jobCompany = normalizeToString(jobCardJson.basics?.company) || "Unknown Company";
    const jobKeySkills = [
      ...(jobCardJson.requirements?.technical_skills?.slice(0, 5) || []),
      ...(jobCardJson.requirements?.nice_to_have?.slice(0, 3) || [])
    ].map(s => normalizeToString(s)).filter(Boolean);
    const jobOverview = normalizeToString(jobCardJson.overview)?.slice(0, 200) || "";

    const originalSummary = normalizeToString(resumeJson.professional_summary);
    const tailoredSummary = normalizeToString(tailoredResume.summary);
    
    const originalSkills = [
      ...(resumeJson.technical_skills?.map(s => normalizeToString(s)) || []),
      ...(resumeJson.soft_skills?.map(s => normalizeToString(s)) || [])
    ].filter(Boolean).slice(0, 10);
    
    const tailoredSkills = normalizeSkillsArray(tailoredResume.skills).slice(0, 10);

    const experience = tailoredResume.experience ?? [];
    const experienceChanges = experience.slice(0, 3).map(exp => {
      const rawEmployer = normalizeToString(exp.employer) || "Unknown";
      const rawTitle = normalizeToString(exp.title) || "Unknown";
      return {
        employer: rawEmployer,
        title: rawTitle,
        bulletCount: Array.isArray(exp.description) ? exp.description.length : 0
      };
    });

    const experienceSection = experienceChanges.length > 0 
      ? `Experience entries tailored: ${experienceChanges.map(e => `${e.title} at ${e.employer}`).join(", ")}`
      : "No experience entries to tailor";

    const summarySnippetOrig = originalSummary.slice(0, 150).replace(/"/g, "'");
    const summarySnippetNew = tailoredSummary.slice(0, 150).replace(/"/g, "'");

    const promptData = {
      job: {
        title: jobTitle,
        company: jobCompany,
        skills: jobKeySkills.join(", ") || "Not specified",
        overview: jobOverview || "Not specified"
      },
      changes: {
        summaryFrom: summarySnippetOrig,
        summaryTo: summarySnippetNew,
        originalSkills: originalSkills.join(", ") || "None",
        tailoredSkills: tailoredSkills.join(", ") || "None",
        experience: experienceSection
      },
      experienceKeys: experienceChanges.map(e => ({ employer: e.employer, title: e.title }))
    };

    const userPrompt = `Explain why a resume was tailored for a job.

JOB:
- Role: ${promptData.job.title} at ${promptData.job.company}
- Key Skills: ${promptData.job.skills}
- Overview: ${promptData.job.overview}

CHANGES:
- Summary: "${promptData.changes.summaryFrom}..." → "${promptData.changes.summaryTo}..."
- Original Skills: ${promptData.changes.originalSkills}
- Tailored Skills: ${promptData.changes.tailoredSkills}
- ${promptData.changes.experience}

For each section, provide TWO explanations:
1. "short": One sentence (under 25 words) - the key reason for the change
2. "detailed": 2-4 sentences (50-100 words) - deeper explanation of the reasoning and benefits

Return JSON with exactly this structure:
{
  "summary": { "short": "...", "detailed": "..." },
  "skills": { "short": "...", "detailed": "..." }${experienceChanges.length > 0 ? `,
  "experiences": [${experienceChanges.map(e => `{"employer":"${e.employer.replace(/"/g, "'")}","title":"${e.title.replace(/"/g, "'")}","rationale":{"short":"...","detailed":"..."}}`).join(",")}]` : ''}
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { 
          role: "system", 
          content: "You explain AI decisions clearly and concisely. Focus on HOW changes align with job requirements. For 'short': one punchy sentence. For 'detailed': expand with specific examples and benefits. Return valid JSON only." 
        },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    console.log("[TAILOR PASS 5] Rationale generation complete");
    
    const parseRationale = (val: unknown): RationaleContent | undefined => {
      if (!val) return undefined;
      if (typeof val === 'string') return { short: val };
      if (typeof val === 'object' && 'short' in val) {
        const obj = val as Record<string, unknown>;
        return {
          short: String(obj.short || ''),
          detailed: obj.detailed ? String(obj.detailed) : undefined
        };
      }
      return undefined;
    };

    return {
      summary: parseRationale(result.summary),
      skills: parseRationale(result.skills),
      experiences: Array.isArray(result.experiences) ? result.experiences
        .filter((e: unknown) => e && typeof e === 'object' && 'employer' in e && 'title' in e && 'rationale' in e)
        .map((e: { employer: string; title: string; rationale: unknown }) => ({
          employer: e.employer,
          title: e.title,
          rationale: parseRationale(e.rationale) || { short: '' }
        }))
      : undefined
    };
  } catch (error) {
    console.error("[TAILOR PASS 5] Rationale generation failed:", (error as Error).message);
    return null;
  }
}

export async function tailorResume({
  resumeJson,
  jobCardJson,
  tailoring
}: TailorResumeParams): Promise<TailorResult> {
  const allErrors: string[] = [];
  
  try {
    console.log("[TAILOR] Starting resume tailoring pipeline...");
    console.log("[TAILOR] Options:", {
      language: tailoring.language,
      toneProfile: tailoring.toneProfile,
      toneIntensity: tailoring.toneIntensity,
      narrativeVoice: tailoring.narrativeVoice,
      coverLetterEnabled: tailoring.coverLetter.enabled
    });
    
    const codex = await codexManager.getCodex("resume-tailor-v1");
    const prompts = codex?.prompts || {};
    const schema = codex?.schema || {};
    
    const alignerResult = await runAlignerPass(resumeJson, jobCardJson, prompts);
    allErrors.push(...alignerResult.errors);
    
    if (alignerResult.coverage.matrix.length === 0) {
      allErrors.push("Aligner pass produced no coverage matrix");
    }
    
    const tailorResult = await runTailorPass(
      resumeJson,
      jobCardJson,
      alignerResult.coverage,
      tailoring,
      prompts
    );
    allErrors.push(...tailorResult.errors);
    
    if (!tailorResult.tailored_resume) {
      return {
        ok: false,
        errors: [...allErrors, "Tailor pass failed to produce a tailored resume"],
        bundle: null
      };
    }
    
    const jobKeywords = extractJobKeywords(jobCardJson);
    
    const finalizerResult = await runFinalizerPass(
      tailorResult.tailored_resume,
      alignerResult.coverage,
      jobKeywords,
      schema,
      prompts
    );
    allErrors.push(...finalizerResult.errors);
    
    const coverLetterResult = await runCoverLetterPass(
      resumeJson,
      jobCardJson,
      tailorResult.tailored_resume,
      tailoring,
      prompts
    );
    allErrors.push(...coverLetterResult.errors);
    
    const rationales = await generateRationales(
      resumeJson,
      jobCardJson,
      tailorResult.tailored_resume
    );
    
    const bundle: TailoredResumeBundle = {
      tailored_resume: tailorResult.tailored_resume,
      cover_letter: coverLetterResult.cover_letter || undefined,
      coverage: alignerResult.coverage,
      diff: finalizerResult.diff,
      warnings: finalizerResult.warnings,
      ats_report: finalizerResult.ats_report,
      rationales: rationales || undefined
    };
    
    console.log("[TAILOR] Pipeline complete. Coverage score:", bundle.coverage.coverage_score);
    console.log("[TAILOR] Warnings:", bundle.warnings.length);
    console.log("[TAILOR] Keywords covered:", bundle.ats_report.keyword_coverage?.length || 0);
    console.log("[TAILOR] Cover letter generated:", !!bundle.cover_letter);
    console.log("[TAILOR] Rationales generated:", !!bundle.rationales);
    
    return {
      ok: allErrors.length === 0,
      errors: allErrors,
      bundle
    };
  } catch (error) {
    const errorMsg = `Resume tailoring failed: ${(error as Error).message}`;
    console.error("[TAILOR]", errorMsg);
    return {
      ok: false,
      errors: [...allErrors, errorMsg],
      bundle: null
    };
  }
}
