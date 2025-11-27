import OpenAI from "openai";
import { codexManager } from "./codexManager";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

interface TailorResumeParams {
  resumeJson: any;
  jobCardJson: any;
  language?: "en" | "da";
  style?: "conservative" | "modern" | "impact";
}

interface TailoredResumeBundle {
  tailored_resume: {
    meta: {
      language: string;
      style: string;
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
}

interface TailorResult {
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

async function runTailorPass(
  resumeJson: any,
  jobCardJson: any,
  coverage: TailoredResumeBundle["coverage"],
  language: string,
  style: string,
  prompts: any
): Promise<{ tailored_resume: TailoredResumeBundle["tailored_resume"] | null; errors: string[] }> {
  const errors: string[] = [];
  
  try {
    console.log("[TAILOR PASS 2] Running Tailor pass...");
    
    const systemPrompt = prompts.tailor_system || 
      "You tailor the resume for the target role WITHOUT changing facts. Reorder, merge, and rewrite for relevance and clarity. Keep employers, titles, dates identical. Quote IDs from coverage where you used evidence. Respect style profile.";
    
    const styleGuides = {
      conservative: "Use simple verbs, neutral tone, max 5 bullets per role",
      modern: "Use impact verbs, confident tone, max 6 bullets per role",
      impact: "Use strong verbs, energetic tone, max 7 bullets per role"
    };
    
    const userPrompt = `Original Resume JSON:
${JSON.stringify(resumeJson, null, 2)}

Job Card JSON:
${JSON.stringify(jobCardJson, null, 2)}

Coverage Matrix:
${JSON.stringify(coverage, null, 2)}

Language: ${language}
Style: ${style}
Style Guide: ${styleGuides[style as keyof typeof styleGuides] || styleGuides.modern}

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
The summary MUST be a compelling, sales-focused pitch that:
- Opens with a strong value proposition statement (e.g., "Results-driven [role] with X+ years delivering [key outcome]")
- Highlights 2-3 of the candidate's STRONGEST differentiators that match the job requirements
- Includes specific achievements or metrics from their career that demonstrate value
- Emphasizes industry expertise relevant to the target role
- Uses confident, active language that positions them as the ideal candidate
- Should be 3-5 sentences, approximately 50-100 words
- Must read like a pitch that answers "Why should we hire this person?"

Example of a GOOD summary:
"Seasoned IT Project Manager with 15+ years orchestrating complex digital transformations across manufacturing and logistics sectors. Proven track record of delivering multi-million dollar SAP implementations on time and under budget, while leading cross-functional teams of 20+ members. Expert in vendor management and stakeholder alignment for enterprise-scale integrations, with particular strength in regulated environments requiring rigorous governance."

Example of a WEAK summary (avoid this):
"Project manager with experience in IT projects. Has worked with various systems and led teams."

Return a JSON object with this structure:
{
  "tailored_resume": {
    "meta": {
      "language": "${language}",
      "style": "${style}",
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

export async function tailorResume({
  resumeJson,
  jobCardJson,
  language = "en",
  style = "modern"
}: TailorResumeParams): Promise<TailorResult> {
  const allErrors: string[] = [];
  
  try {
    console.log("[TAILOR] Starting 3-pass resume tailoring pipeline...");
    console.log("[TAILOR] Language:", language, "Style:", style);
    
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
      language,
      style,
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
    
    const bundle: TailoredResumeBundle = {
      tailored_resume: tailorResult.tailored_resume,
      coverage: alignerResult.coverage,
      diff: finalizerResult.diff,
      warnings: finalizerResult.warnings,
      ats_report: finalizerResult.ats_report
    };
    
    console.log("[TAILOR] Pipeline complete. Coverage score:", bundle.coverage.coverage_score);
    console.log("[TAILOR] Warnings:", bundle.warnings.length);
    console.log("[TAILOR] Keywords covered:", bundle.ats_report.keyword_coverage?.length || 0);
    
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
