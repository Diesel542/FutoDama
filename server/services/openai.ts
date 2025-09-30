import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

interface ExtractJobDataParams {
  text: string;
  schema: any;
  systemPrompt: string;
  userPrompt: string;
}

export async function extractJobData(params: ExtractJobDataParams): Promise<any> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: params.systemPrompt
        },
        {
          role: "user",
          content: JSON.stringify({
            schema: params.schema,
            text: params.text,
            instructions: params.userPrompt + " Please return the extracted data as a valid JSON object."
          })
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result;
  } catch (error) {
    console.error("OpenAI extraction error:", error);
    throw new Error(`Failed to extract job data: ${(error as Error).message}`);
  }
}

export async function validateAndEnhanceJobCard(jobCard: any, schema: any): Promise<any> {
  try {
    console.log('[DEBUG] Starting validation for job card...');
    
    // Add timeout wrapper to prevent hanging
    const validationPromise = openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "You are a data validation and enhancement specialist. Review the extracted job card data and identify missing or incomplete fields based on the schema. Return the enhanced job card as a JSON object with a missing_fields array containing objects with path, severity, and message properties."
        },
        {
          role: "user",
          content: JSON.stringify({
            jobCard,
            schema,
            instructions: "Validate this job card against the schema and add missing_fields array with detailed information about what's missing or incomplete. Return the result as a JSON object."
          })
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 2000 // Add reasonable limit
    });

    // Add 30-second timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Validation timeout after 30 seconds')), 30000);
    });

    const response = await Promise.race([validationPromise, timeoutPromise]) as any;
    console.log('[DEBUG] Validation completed successfully');
    
    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result;
  } catch (error) {
    console.error("OpenAI validation error:", error);
    
    // Fallback: return original job card with basic structure if validation fails
    console.log('[DEBUG] Validation failed, using fallback...');
    return {
      jobCard: jobCard,
      missing_fields: [{
        path: "validation",
        severity: "warn",
        message: "Validation could not be completed, using basic extraction"
      }]
    };
  }
}

export async function extractJobDescriptionFromImage(base64Image: string): Promise<string> {
  try {
    // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract all text content from this image. Focus specifically on job description information including job title, company name, requirements, responsibilities, qualifications, salary, location, and any other relevant job posting details. Return the extracted text as plain text, preserving the structure and formatting as much as possible."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_completion_tokens: 4000
    });

    const extractedText = response.choices[0].message.content || "";
    console.log("[DEBUG] Vision API extracted text length:", extractedText.length);
    
    if (!extractedText.trim()) {
      throw new Error("No text content could be extracted from the image");
    }
    
    return extractedText;
  } catch (error) {
    console.error("OpenAI vision extraction error:", error);
    throw new Error(`Failed to extract text from image: ${(error as Error).message}`);
  }
}

/**
 * PASS 1: Extract raw requirements verbatim with source quotes
 * Anti-hallucination: Extract ONLY what is explicitly stated
 */
export async function extractRawRequirements(jobDescriptionText: string): Promise<any[]> {
  try {
    console.log('[PASS 1] Starting raw requirements extraction...');
    console.log('[PASS 1] Input text length:', jobDescriptionText.length);
    console.log('[PASS 1] Input text preview (first 500 chars):', jobDescriptionText.substring(0, 500));
    
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `You are a PASS 1 extraction agent. Your ONLY job is to extract ALL requirement statements VERBATIM from the job description text.

RULES:
1. Extract ONLY what is explicitly written - NO interpretation
2. Include the exact source quote for each requirement
3. Extract everything in the requirements/qualifications section as separate items
4. Do NOT classify or categorize - just extract
5. Do NOT invent, assume, or infer information
6. If a sentence contains multiple requirements, split them into separate items

Return a JSON object with:
{
  "raw_requirements": [
    {
      "text": "<extracted requirement>",
      "source_quote": "<exact quote from job description>"
    }
  ]
}`
        },
        {
          role: "user",
          content: `Extract ALL requirement statements from this job description. Include exact source quotes.

Job Description Text:
${jobDescriptionText}

Return JSON with raw_requirements array containing text and source_quote for each item.`
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 3000
    });

    const content = response.choices[0].message.content || "{}";
    console.log('[PASS 1] OpenAI response length:', content.length);
    console.log('[PASS 1] OpenAI response:', content.substring(0, 1000));
    
    const result = JSON.parse(content);
    console.log('[PASS 1] Extracted', result.raw_requirements?.length || 0, 'raw requirements');
    
    if (result.raw_requirements && result.raw_requirements.length > 0) {
      console.log('[PASS 1] First few requirements:', JSON.stringify(result.raw_requirements.slice(0, 3), null, 2));
    }
    
    return result.raw_requirements || [];
  } catch (error) {
    console.error("Pass 1 extraction error:", error);
    throw new Error(`Failed to extract raw requirements: ${(error as Error).message}`);
  }
}

/**
 * PASS 2: Classify requirements with anti-hallucination validation
 * Intelligently categorize into experience/technical/soft skills
 */
export async function classifyRequirements(
  originalText: string,
  rawRequirements: any[]
): Promise<any> {
  try {
    console.log('[PASS 2] Starting intelligent classification...');
    
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `You are a PASS 2 classification agent. Your job is to intelligently classify extracted requirements into the correct categories.

CLASSIFICATION RULES:

1. EXPERIENCE REQUIRED:
   - Contains: 'experience', 'years', 'proven track record', 'background in', 'worked with', 'working with'
   - Indicates seniority: 'senior', 'junior', 'mid-level', 'lead'
   - Describes past work: 'managed', 'led', 'implemented', 'delivered'
   - Examples: '5+ years experience', 'Proven experience as Senior PM', 'Background in SAP implementation'
   - COMBINE all experience statements into ONE coherent string for experience_required field

2. TECHNICAL SKILLS:
   - Software/Tools: SAP, JIRA, MS Project, Excel, Confluence, Azure DevOps
   - Technologies: Cloud, API, Database, ERP, AWS, Azure, GCP
   - Methodologies: Agile, Scrum, Waterfall, Kanban, DevOps, CI/CD
   - Certifications: PMP, SAP Certification, AWS Certified, PRINCE2
   - Programming languages, frameworks, platforms
   - Examples: 'Proficient in SAP IBP', 'Knowledge of Agile methodologies', 'PMP certification'

3. SOFT SKILLS:
   - Interpersonal: communication, stakeholder management, teamwork, collaboration
   - Leadership: management, leadership, mentoring, coaching
   - Analytical: problem-solving, critical thinking, analytical skills
   - Personal: adaptability, creativity, time management
   - Examples: 'Excellent communication skills', 'Strong stakeholder management', 'Leadership abilities'

4. NICE TO HAVE:
   - Explicitly marked as 'preferred', 'nice to have', 'bonus', 'plus'
   - Optional qualifications
   - 'Familiarity with' (unless stated as required)

ANTI-HALLUCINATION SAFEGUARDS:
- VERIFY each item exists in original text before classifying
- CITE exact phrases that justify your classification
- ASSIGN confidence score (0.0-1.0) based on clarity
- FLAG items with confidence < 0.8 for review
- NEVER invent information not in the source text
- If unsure between categories, use the PRIMARY keyword (experience > technical > soft)

Return JSON with classified requirements and evidence tracking.`
        },
        {
          role: "user",
          content: `Classify these extracted requirements into the correct categories. Verify each against the original text.

Original Job Description:
${originalText}

Extracted Requirements (Pass 1):
${JSON.stringify(rawRequirements, null, 2)}

Return JSON with:
{
  "experience_required": "<single string combining all experience>",
  "technical_skills": ["<skill1>", "<skill2>", ...],
  "soft_skills": ["<skill1>", "<skill2>", ...],
  "nice_to_have": ["<item1>", "<item2>", ...],
  "evidence": [
    {"field": "experience_required", "quote": "<source quote>"},
    {"field": "technical_skills[0]", "quote": "<source quote>"}
  ],
  "confidence": {
    "experience_required": 0.95,
    "technical_skills": 0.88
  }
}

Include confidence scores and source verification. Flag any low-confidence classifications.`
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 3000
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    console.log('[PASS 2] Classification complete');
    
    return result;
  } catch (error) {
    console.error("Pass 2 classification error:", error);
    throw new Error(`Failed to classify requirements: ${(error as Error).message}`);
  }
}

/**
 * Two-pass extraction orchestrator
 * Combines Pass 1 (verbatim) + Pass 2 (classification) with validation
 */
export async function extractJobDataTwoPass(
  text: string,
  schema: any,
  systemPrompt: string,
  userPrompt: string
): Promise<any> {
  try {
    console.log('[TWO-PASS] Starting intelligent extraction...');
    
    // PASS 1: Extract raw requirements verbatim
    const rawRequirements = await extractRawRequirements(text);
    
    // PASS 2: Classify requirements intelligently
    const classifiedRequirements = await classifyRequirements(text, rawRequirements);
    
    // Now extract the full job card using the original system/user prompts
    // but with enhanced classification awareness
    const enhancedSystemPrompt = systemPrompt + `

IMPORTANT: When extracting requirements, use this intelligent classification:
- Experience Required: ${classifiedRequirements.experience_required || 'Not specified'}
- Technical Skills: ${JSON.stringify(classifiedRequirements.technical_skills || [])}
- Soft Skills: ${JSON.stringify(classifiedRequirements.soft_skills || [])}
- Nice to Have: ${JSON.stringify(classifiedRequirements.nice_to_have || [])}

Include evidence and confidence from the classification.`;

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: enhancedSystemPrompt
        },
        {
          role: "user",
          content: JSON.stringify({
            schema: schema,
            text: text,
            classified_requirements: classifiedRequirements,
            instructions: userPrompt + " Use the provided classified requirements. Return the extracted data as a valid JSON object with evidence and confidence fields."
          })
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 4000
    });

    const jobCard = JSON.parse(response.choices[0].message.content || "{}");
    
    // Ensure classified requirements are properly merged
    if (!jobCard.requirements) jobCard.requirements = {};
    jobCard.requirements.experience_required = classifiedRequirements.experience_required;
    jobCard.requirements.technical_skills = classifiedRequirements.technical_skills;
    jobCard.requirements.soft_skills = classifiedRequirements.soft_skills;
    jobCard.requirements.nice_to_have = classifiedRequirements.nice_to_have;
    
    // Add evidence and confidence
    jobCard.evidence = classifiedRequirements.evidence || [];
    jobCard.confidence = classifiedRequirements.confidence || {};
    
    console.log('[TWO-PASS] Extraction complete with evidence tracking');
    
    return jobCard;
  } catch (error) {
    console.error("Two-pass extraction error:", error);
    throw new Error(`Failed to extract job data with two-pass system: ${(error as Error).message}`);
  }
}

export async function extractJobDescriptionFromImages(base64Images: string[]): Promise<string> {
  try {
    if (!base64Images || base64Images.length === 0) {
      throw new Error("No images provided for processing");
    }

    // Limit to first 5 pages to control costs
    const imagesToProcess = base64Images.slice(0, 5);
    
    // Create content array with text prompt and all images
    const content: Array<{type: "text", text: string} | {type: "image_url", image_url: {url: string}}> = [
      {
        type: "text",
        text: `Extract all text content from these ${imagesToProcess.length} page(s) of a job description document. Read through all pages and combine the information into a single, comprehensive job description. Focus on extracting:\n\n- Job title and company information\n- Job responsibilities and duties\n- Required qualifications and skills\n- Experience requirements\n- Salary/compensation details\n- Location and work setup\n- Application instructions\n- Any other relevant job posting details\n\nReturn the complete extracted text as plain text, preserving the logical structure and formatting as much as possible. Combine content from all pages into a coherent job description.`
      },
      ...imagesToProcess.map(base64Image => ({
        type: "image_url" as const,
        image_url: {
          url: `data:image/png;base64,${base64Image}`
        }
      }))
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "user",
          content
        }
      ],
      max_completion_tokens: 6000 // Increased for multi-page content
    });

    const extractedText = response.choices[0].message.content || "";
    console.log(`[DEBUG] Vision API extracted text from ${imagesToProcess.length} images, length:`, extractedText.length);
    
    if (!extractedText.trim()) {
      throw new Error("No text content could be extracted from the images");
    }
    
    return extractedText;
  } catch (error) {
    console.error("OpenAI multi-image vision extraction error:", error);
    throw new Error(`Failed to extract text from images: ${(error as Error).message}`);
  }
}
