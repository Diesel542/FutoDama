import { Router, Request, Response, NextFunction } from "express";
import { runMatchStep1, runMatchStep2 } from "../services/matchFlows";

interface MatchParams {
  jobId: string;
}

const router = Router({ mergeParams: true });

router.post('/step1', async (req: Request<MatchParams>, res: Response, next: NextFunction) => {
  try {
    const { jobId } = req.params;
    const result = await runMatchStep1(jobId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/step2', async (req: Request<MatchParams>, res: Response, next: NextFunction) => {
  try {
    const { jobId } = req.params;
    const { profileIds, sessionId } = req.body;
    
    const result = await runMatchStep2({ jobId, profileIds, sessionId });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
