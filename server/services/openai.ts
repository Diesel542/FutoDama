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
    const response = await openai.chat.completions.create({
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
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result;
  } catch (error) {
    console.error("OpenAI validation error:", error);
    throw new Error(`Failed to validate job card: ${(error as Error).message}`);
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
