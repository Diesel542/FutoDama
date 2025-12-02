import { Router } from "express";
import { storage } from "../storage";
import { batchToCSV, batchToXML } from "./utils";

const router = Router();

router.get('/:id', async (req, res) => {
  try {
    const batchJob = await storage.getBatchJob(req.params.id);
    if (!batchJob) {
      return res.status(404).json({ error: 'Batch job not found' });
    }
    
    const jobs = await storage.getJobsByBatch(req.params.id);
    
    res.json({
      ...batchJob,
      jobs
    });
  } catch (error) {
    console.error('Get batch job error:', error);
    res.status(500).json({ error: 'Failed to get batch job' });
  }
});

router.get('/:id/export', async (req, res) => {
  try {
    const format = req.query.format as string || 'json';
    const batchJob = await storage.getBatchJob(req.params.id);
    
    if (!batchJob) {
      return res.status(404).json({ error: 'Batch job not found' });
    }

    const jobs = await storage.getJobsByBatch(req.params.id);
    const exportData = {
      batch: batchJob,
      jobs
    };

    switch (format.toLowerCase()) {
      case 'json':
        res.setHeader('Content-Disposition', `attachment; filename="batch-${batchJob.id}.json"`);
        res.setHeader('Content-Type', 'application/json');
        res.json(exportData);
        break;
        
      case 'csv':
        const csvContent = batchToCSV(exportData);
        res.setHeader('Content-Disposition', `attachment; filename="batch-${batchJob.id}.csv"`);
        res.setHeader('Content-Type', 'text/csv');
        res.send(csvContent);
        break;
        
      case 'xml':
        const xmlContent = batchToXML(exportData);
        res.setHeader('Content-Disposition', `attachment; filename="batch-${batchJob.id}.xml"`);
        res.setHeader('Content-Type', 'application/xml');
        res.send(xmlContent);
        break;
        
      default:
        res.status(400).json({ error: 'Unsupported format. Use json, csv, or xml' });
    }
  } catch (error) {
    console.error('Export batch error:', error);
    res.status(500).json({ error: 'Failed to export batch' });
  }
});

export default router;
