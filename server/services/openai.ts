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
