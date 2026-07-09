import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { ReportController } from '../controllers/report.controller';

const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, '../../uploads'),
    filename: (_req: any, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
      const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, unique + path.extname(file.originalname));
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 3 },
});

const router = Router();

router.post('/reports', upload.array('photos', 3), ReportController.submitReport);
router.get('/reports', ReportController.listReports);
router.get('/reports/:id', ReportController.getReport);
router.put('/reports/:id/resolve', ReportController.resolveReport);

export default router;
