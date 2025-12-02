import { Router } from "express";
import { codexManager } from "../services/codexManager";

const router = Router();

router.get('/', async (req, res) => {
  try {
    const codexes = await codexManager.getAllCodexes();
    res.json(codexes);
  } catch (error) {
    console.error('Get codexes error:', error);
    res.status(500).json({ error: 'Failed to get codexes' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const codex = await codexManager.getCodex(req.params.id);
    if (!codex) {
      return res.status(404).json({ error: 'Codex not found' });
    }
    res.json(codex);
  } catch (error) {
    console.error('Get codex error:', error);
    res.status(500).json({ error: 'Failed to get codex' });
  }
});

router.get('/:id/export', async (req, res) => {
  try {
    const codex = await codexManager.exportCodex(req.params.id);
    if (!codex) {
      return res.status(404).json({ error: 'Codex not found' });
    }
    
    res.setHeader('Content-Disposition', `attachment; filename="${codex.id}.json"`);
    res.setHeader('Content-Type', 'application/json');
    res.json(codex);
  } catch (error) {
    console.error('Export codex error:', error);
    res.status(500).json({ error: 'Failed to export codex' });
  }
});

router.post('/', async (req, res) => {
  try {
    const codex = await codexManager.createCodex(req.body);
    res.status(201).json(codex);
  } catch (error) {
    console.error('Create codex error:', error);
    res.status(500).json({ error: 'Failed to create codex' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const codex = await codexManager.updateCodex(req.params.id, req.body);
    if (!codex) {
      return res.status(404).json({ error: 'Codex not found' });
    }
    res.json(codex);
  } catch (error) {
    console.error('Update codex error:', error);
    res.status(500).json({ error: 'Failed to update codex' });
  }
});

export default router;
