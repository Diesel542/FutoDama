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

function normalizeDateRange(from?: string, to?: string): { from: string; to: string } | { error: string } {
  const now = new Date();
  
  if (from && to) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return { error: "Invalid date format. Use ISO 8601 format." };
    }
    
    const diffDays = (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 31) {
      return { error: "Date range cannot exceed 31 days." };
    }
    if (diffDays < 0) {
      return { error: "'from' date must be before 'to' date." };
    }
    
    return { from, to };
  }
  
  if (from && !to) {
    const fromDate = new Date(from);
    if (isNaN(fromDate.getTime())) {
      return { error: "Invalid 'from' date format. Use ISO 8601 format." };
    }
    const diffDays = (now.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 31) {
      const clampedTo = new Date(fromDate.getTime() + 31 * 24 * 60 * 60 * 1000);
      return { from, to: clampedTo.toISOString() };
    }
    return { from, to: now.toISOString() };
  }
  
  if (!from && to) {
    const toDate = new Date(to);
    if (isNaN(toDate.getTime())) {
      return { error: "Invalid 'to' date format. Use ISO 8601 format." };
    }
    const fromDate = new Date(toDate.getTime() - 31 * 24 * 60 * 60 * 1000);
    return { from: fromDate.toISOString(), to };
  }
  
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return { from: sevenDaysAgo.toISOString(), to: now.toISOString() };
}

function escapeCSV(value: string): string {
  const dangerousPrefixes = ['=', '+', '-', '@'];
  let escaped = value;
  
  if (dangerousPrefixes.some(prefix => value.startsWith(prefix))) {
    escaped = "'" + value;
  }
  
  if (escaped.includes('"') || escaped.includes(',') || escaped.includes('\n')) {
    return `"${escaped.replace(/"/g, '""')}"`;
  }
  return escaped;
}

/**
 * Authentication guard placeholder.
 * When auth is implemented, check req.isAuthenticated() and req.user.tenantId.
 * Return 401 if not authenticated, 403 if tenant mismatch.
 */
function requireAuth(req: Request, res: Response, next: NextFunction) {
  // TODO: Implement when passport auth is added
  // if (!req.isAuthenticated()) {
  //   return res.status(401).json({ error: "Authentication required" });
  // }
  // const userTenantId = (req.user as { tenantId?: string })?.tenantId;
  // const queryTenantId = req.query.tenantId as string;
  // if (userTenantId && queryTenantId && userTenantId !== queryTenantId) {
  //   return res.status(403).json({ error: "Access denied: tenant mismatch" });
  // }
  next();
}

router.get('/decision-events', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parseResult = querySchema.safeParse(req.query);
    
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Invalid query parameters",
        details: parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
      });
    }
    
    const { tenantId, from, to, eventType, requestId, format, limit, offset } = parseResult.data;
    
    const dateRange = normalizeDateRange(from, to);
    if ('error' in dateRange) {
      return res.status(400).json({ error: dateRange.error });
    }
    
    const { from: normalizedFrom, to: normalizedTo } = dateRange;
    
    const events = await listDecisionEvents({
      tenantId,
      from: normalizedFrom,
      to: normalizedTo,
      eventType,
      requestId,
      limit,
      offset,
    });
    
    const total = await countDecisionEvents({ tenantId, from: normalizedFrom, to: normalizedTo, eventType, requestId });
    
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

router.get('/decision-events/count', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
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
    
    const dateRange = normalizeDateRange(from, to);
    if ('error' in dateRange) {
      return res.status(400).json({ error: dateRange.error });
    }
    
    const { from: normalizedFrom, to: normalizedTo } = dateRange;
    
    const count = await countDecisionEvents({ tenantId, from: normalizedFrom, to: normalizedTo, eventType, requestId });
    
    return res.json({ count });
  } catch (err) {
    next(err);
  }
});

export default router;
