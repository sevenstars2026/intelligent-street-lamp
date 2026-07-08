import { Request, Response } from 'express';
import { ReportService } from '../services/report.service';

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export class ReportController {
  static async createFaultReport(req: Request, res: Response): Promise<void> {
    try {
      const reporterName = normalizeString(req.body.reporterName);
      const reporterPhone = normalizeString(req.body.reporterPhone);
      const lampId = normalizeString(req.body.lampId);
      const description = normalizeString(req.body.description);

      if (!reporterName || !reporterPhone || !lampId || !description) {
        res.status(400).json({
          code: 400,
          message: '请填写完整的上报信息',
          data: null,
        });
        return;
      }

      const files = (req.files || []) as Express.Multer.File[];
      const photoUrls = files.map(file => `/uploads/reports/${file.filename}`);

      const result = await ReportService.createFaultReport({
        reporterName,
        reporterPhone,
        lampId,
        description,
        photoUrls,
      });

      res.status(200).json({
        code: 200,
        message: '上报成功，工作人员将尽快处理',
        data: result,
      });
    } catch (error: any) {
      if (error.message === 'DEVICE_NOT_FOUND') {
        res.status(404).json({
          code: 404,
          message: '路灯不存在',
          data: null,
        });
        return;
      }

      console.error('[ReportController] createFaultReport error:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null,
      });
    }
  }
}

