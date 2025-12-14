import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { listDecisionEvents, countDecisionEvents } from "../services/decisionEventLogger";

const router = Router();

const querySchema = z.object({
  tenantId: z.string().min(1, "tenantId is required"),
  from: z.string().optional(),
  to: z.string().optional(),
  eventType: z.string().optional(),
  requestId: z.string().optional(),
  format: z.enum(["jsonl", "csv"]).optional().default("jsonl"),
  limit: z.coerce.number().int().min(1).max(10000).optional().default(1000),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

function validateDateRange(from?: string, to?: string): { valid: boolean; error?: string } {
  if (!from || !to) return { valid: true };
  
  const fromDate = new Date(from);
  const toDate = new Date(to);
  
  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return { valid: false, error: "Invalid date format. Use ISO 8601 format." };
  }
  
  const diffDays = (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays > 31) {
    return { valid: false, error: "Date range cannot exceed 31 days." };
  }
  
  return { valid: true };
}

function escapeCSV(value: string): string {
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

router.get('/decision-events', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parseResult = querySchema.safeParse(req.query);
    
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Invalid query parameters",
        details: parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
      });
    }
    
    const { tenantId, from, to, eventType, requestId, format, limit, offset } = parseResult.data;
    
    const rangeCheck = validateDateRange(from, to);
    if (!rangeCheck.valid) {
      return res.status(400).json({ error: rangeCheck.error });
    }
    
    const events = await listDecisionEvents({
      tenantId,
      from,
      to,
      eventType,
      requestId,
      limit,
      offset,
    });
    
    const total = await countDecisionEvents({ tenantId, from, to, eventType, requestId });
    
    if (format === "csv") {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="decision-events.csv"');
      
      const headers = ['id', 'tenantId', 'eventType', 'requestId', 'createdAt', 'payload'];
      res.write(headers.join(',') + '\n');
      
      for (const event of events) {
        const row = [
          escapeCSV(event.id),
          escapeCSV(event.tenantId),
          escapeCSV(event.eventType),
          escapeCSV(event.requestId || ''),
          escapeCSV(event.createdAt || ''),
          escapeCSV(JSON.stringify(event.payload || {})),
        ];
        res.write(row.join(',') + '\n');
      }
      
      res.end();
    } else {
      res.setHeader('Content-Type', 'application/x-ndjson');
      res.setHeader('X-Total-Count', total.toString());
      
      for (const event of events) {
        res.write(JSON.stringify(event) + '\n');
      }
      
      res.end();
    }
  } catch (err) {
    next(err);
  }
});

router.get('/decision-events/count', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parseResult = z.object({
      tenantId: z.string().min(1, "tenantId is required"),
      from: z.string().optional(),
      to: z.string().optional(),
      eventType: z.string().optional(),
      requestId: z.string().optional(),
    }).safeParse(req.query);
    
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Invalid query parameters",
        details: parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
      });
    }
    
    const { tenantId, from, to, eventType, requestId } = parseResult.data;
    
    const count = await countDecisionEvents({ tenantId, from, to, eventType, requestId });
    
    return res.json({ count });
  } catch (err) {
    next(err);
  }
});

export default router;
