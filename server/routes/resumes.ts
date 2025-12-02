import { Router, Request, Response, NextFunction } from "express";
import multer from 'multer';
import path from 'path';
import { randomUUID } from "crypto";
import { z } from "zod";
import { 
  createResumeFromFile, 
  createResumeFromText, 
  processVisionExtraction,
  getResume,
  deleteResume,
  listResumes
} from "../services/resumeFlows";
import { tailorResumeToJob } from "../services/tailorFlows";

const router = Router();

const multerStorage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    const uniqueId = randomUUID().replace(/-/g, '');
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueId}${ext}`);
  }
});

const upload = multer({ storage: multerStorage });

router.post('/vision-extract', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { images, codexId, resumeId } = req.body;
    const result = await processVisionExtraction({ images, codexId, resumeId });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/upload', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    let result;

    if (req.file) {
      result = await createResumeFromFile({
        filePath: req.file.path,
        mimeType: req.file.mimetype,
        originalName: req.file.originalname,
        fileSize: req.file.size,
        codexId: req.body.codexId
      });
    } else if (req.body.text) {
      result = await createResumeFromText({
        text: req.body.text,
        codexId: req.body.codexId
      });
    } else {
      return res.status(400).json({ error: 'No file or text provided' });
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const resume = await getResume(req.params.id);
    res.json(resume);
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await listResumes({
      status: req.query.status as string | undefined,
      codexId: req.query.codexId as string | undefined,
      jobId: req.query.jobId as string | undefined,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await deleteResume(req.params.id);
    res.json({ success: true, message: 'Resume deleted successfully' });
  } catch (error) {
    next(error);
  }
});

const tailorResumeSchema = z.object({
  resumeJson: z.record(z.any()),
  jobCardJson: z.record(z.any()),
  language: z.enum(['en', 'da']).optional().default('en'),
  style: z.enum(['conservative', 'modern', 'impact']).optional().default('modern')
});

router.post('/tailor', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parseResult = tailorResumeSchema.safeParse(req.body);
    
    if (!parseResult.success) {
      return res.status(400).json({ 
        ok: false,
        errors: parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
        bundle: null
      });
    }
    
    const result = await tailorResumeToJob(parseResult.data);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
