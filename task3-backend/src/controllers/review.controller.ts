import type { Request, Response } from 'express';
import { unlink } from 'fs/promises';
import path from 'path';
import { ReportAuditService } from '../services/report-audit.service';

async function deletePhotos(photoUrls: string[]): Promise<void> {
  await Promise.all(photoUrls.map(file =>
    unlink(path.join(process.cwd(), 'uploads', path.basename(file))).catch(() => undefined)
  ));
}

function handleReviewError(error: any, res: Response): void {
  if (error?.message === 'AUDIT_NOT_FOUND') {
    res.status(404).json({ code: 404, message: '审核记录不存在', data: null });
  } else if (error?.message === 'AUDIT_ALREADY_REVIEWED') {
    res.status(409).json({ code: 409, message: '该记录已完成审核', data: null });
  } else if (error?.message === 'REVIEW_REASON_INVALID') {
    res.status(400).json({ code: 400, message: '驳回原因需为1-500个字符', data: null });
  } else {
    console.error('[ReviewController] error:', error);
    res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
  }
}

export class ReviewController {
  static async listReview(req: Request, res: Response): Promise<void> {
    try {
      const { reviewStatus, auditPass } = req.query;
      const page = Math.max(1, Number.parseInt(String(req.query.page || '1'), 10) || 1);
      const pageSize = Math.min(100, Math.max(1, Number.parseInt(String(req.query.pageSize || '20'), 10) || 20));
      const allowedStatuses = ['ai_rejected', 'pending_review', 'approved', 'rejected'];
      if (reviewStatus && !allowedStatuses.includes(String(reviewStatus))) {
        res.status(400).json({ code: 400, message: '审核状态无效', data: null }); return;
      }
      let parsedAuditPass: number | undefined;
      if (auditPass !== undefined) {
        parsedAuditPass = Number(auditPass);
        if (![0, 1, 2].includes(parsedAuditPass)) {
          res.status(400).json({ code: 400, message: 'AI校验结果无效', data: null }); return;
        }
      }
      const result = await ReportAuditService.listAuditLogs(
        { reviewStatus: reviewStatus ? String(reviewStatus) : undefined, auditPass: parsedAuditPass }, page, pageSize
      );
      res.json({ code: 200, message: 'success', data: result });
    } catch (error) { handleReviewError(error, res); }
  }

  static async getReview(req: Request, res: Response): Promise<void> {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (!Number.isInteger(id) || id <= 0) {
        res.status(400).json({ code: 400, message: '审核ID无效', data: null }); return;
      }
      const log = await ReportAuditService.getAuditLogById(id);
      if (!log) { res.status(404).json({ code: 404, message: '审核记录不存在', data: null }); return; }
      res.json({ code: 200, message: 'success', data: log });
    } catch (error) { handleReviewError(error, res); }
  }

  static async approveReview(req: Request, res: Response): Promise<void> {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (!Number.isInteger(id) || id <= 0) {
        res.status(400).json({ code: 400, message: '审核ID无效', data: null }); return;
      }
      const user = (req as any).user;
      const result = await ReportAuditService.approveAuditLog(id, { id: user.id, name: user.name });
      res.json({ code: 200, message: '审核通过', data: result });
    } catch (error) { handleReviewError(error, res); }
  }

  static async rejectReview(req: Request, res: Response): Promise<void> {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (!Number.isInteger(id) || id <= 0) {
        res.status(400).json({ code: 400, message: '审核ID无效', data: null }); return;
      }
      const user = (req as any).user;
      const result = await ReportAuditService.rejectAuditLog(id, { id: user.id, name: user.name }, req.body?.reviewReason || '');
      await deletePhotos(result.photoUrls);
      res.json({ code: 200, message: '审核已驳回', data: result });
    } catch (error) { handleReviewError(error, res); }
  }
}
