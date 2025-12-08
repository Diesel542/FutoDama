import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { 
  chunkSummary, 
  type ChunkSummaryRequest,
  type ChunkSummaryResponse 
} from "../services/summaryChunker";

const router = Router();

const chunkSummarySchema = z.object({
  summary: z.string().min(1, "summary is required"),
  maxParaLenChars: z.number().int().positive().optional().default(420),
  targetParagraphs: z.number().int().min(1).max(10).optional().default(3),
  tone: z.enum(["neutral", "confident", "warm"]).optional().default("neutral"),
  allowList: z.array(z.string()).optional().default([]),
});

router.post('/chunk', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parseResult = chunkSummarySchema.safeParse(req.body);
    
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: "Invalid request",
        details: parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      });
    }
    
    const request: ChunkSummaryRequest = parseResult.data;
    const result: ChunkSummaryResponse = chunkSummary(request);
    
    return res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
