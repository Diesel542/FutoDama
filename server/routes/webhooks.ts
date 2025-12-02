import { Router } from "express";
import { storage } from "../storage";

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const { url, events, secret } = req.body;
    
    if (!url || !events) {
      return res.status(400).json({ error: 'URL and events are required' });
    }

    const webhook = await storage.createWebhook({
      url,
      events: Array.isArray(events) ? events : [events],
      secret: secret || '',
      active: true
    });

    res.status(201).json({ 
      id: webhook.id, 
      message: 'Webhook registered successfully',
      events: webhook.events 
    });
  } catch (error) {
    console.error('Webhook registration error:', error);
    res.status(500).json({ error: 'Failed to register webhook' });
  }
});

router.get('/', async (req, res) => {
  try {
    const webhooks = await storage.getAllWebhooks();
    res.json(webhooks);
  } catch (error) {
    console.error('Get webhooks error:', error);
    res.status(500).json({ error: 'Failed to get webhooks' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await storage.deleteWebhook(req.params.id);
    res.json({ message: 'Webhook deleted successfully' });
  } catch (error) {
    console.error('Delete webhook error:', error);
    res.status(500).json({ error: 'Failed to delete webhook' });
  }
});

export default router;
