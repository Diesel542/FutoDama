import { Router } from "express";
import { storage } from "../storage";
import { extractJobDescriptionFromImages } from "../services/openai";
import { logStream } from "../services/logStream";
import { processJobDescription } from "../services/processingFlows";

const router = Router();

router.post('/extract', async (req, res) => {
  try {
    const { images, codexId } = req.body;
    
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: 'No images provided' });
    }

    const jobCodexId = codexId || 'job-card-v2.1';

    const job = await storage.createJob({
      status: 'processing',
      originalText: '',
      documentType: 'pdf-vision',
      jobCard: null,
      codexId: jobCodexId
    });

    logStream.sendDetailedLog(job.id, {
      step: 'VISION OCR START',
      message: `Starting OCR extraction for PDF with ${images.length} pages`,
      details: {
        totalPages: images.length,
        processingPages: Math.min(images.length, 5)
      },
      type: 'info'
    });

    const extractedText = await extractJobDescriptionFromImages(images, job.id);
    
    await storage.updateJob(job.id, { originalText: extractedText });

    logStream.sendDetailedLog(job.id, {
      step: 'VISION OCR COMPLETE',
      message: `Successfully extracted ${extractedText.length} characters from PDF`,
      details: {
        extractedLength: extractedText.length
      },
      type: 'info'
    });

    processJobDescription(job.id, extractedText);

    res.json({ jobId: job.id, status: 'processing' });
  } catch (error) {
    console.error('Vision extraction error:', error);
    res.status(500).json({ error: 'Failed to process vision extraction' });
  }
});

export default router;
