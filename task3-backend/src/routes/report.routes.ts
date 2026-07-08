import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { ReportController } from '../controllers/report.controller';

const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, '../../uploads'),
    filename: (_req, file, cb) => {
      const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, unique + path.extname(file.originalname));
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 3 },
});

const router = Router();

router.post('/reports', upload.array('photos', 3), ReportController.submitReport);

export default router;
