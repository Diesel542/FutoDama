import { Router } from "express";
import { storage } from "../storage";

const router = Router();

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const session = await storage.getMatchSession(id);
    if (!session) {
      return res.status(404).json({ error: 'Match session not found' });
    }
    
    res.json(session);
  } catch (error) {
    console.error('Get match session error:', error);
    res.status(500).json({ error: 'Failed to get match session' });
  }
});

export default router;
