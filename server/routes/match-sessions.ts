import { Router, Request, Response, NextFunction } from "express";
import { getMatchSession } from "../services/matchFlows";

const router = Router();

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = await getMatchSession(req.params.id);
    res.json(session);
  } catch (error) {
    next(error);
  }
});

export default router;
