import { NextFunction, Request, Response, Router } from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { ReportController } from '../controllers/report.controller';

const router = Router();
const uploadDir = path.join(process.cwd(), 'uploads', 'reports');

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '');
    const safeExt = ext && ext.length <= 10 ? ext.toLowerCase() : '';
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 3 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error('UNSUPPORTED_IMAGE_TYPE'));
  },
});

function uploadReportPhotos(req: Request, res: Response, next: NextFunction) {
  upload.array('photos', 3)(req, res, (err: any) => {
    if (!err) {
      next();
      return;
    }

    const isMulterError = err instanceof multer.MulterError;
    const message = err.message === 'UNSUPPORTED_IMAGE_TYPE' || isMulterError
      ? '仅支持 JPG/PNG/WebP 图片，最多 3 张，每张不超过 5MB'
      : '图片上传失败';

    res.status(400).json({
      code: 400,
      message,
      data: null,
    });
  });
}

router.post('/reports', uploadReportPhotos, ReportController.createFaultReport);

export default router;

