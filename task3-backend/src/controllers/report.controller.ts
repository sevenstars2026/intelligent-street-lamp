import { Request, Response } from 'express';
import { unlink } from 'fs/promises';
import path from 'path';
import { ReportService } from '../services/report.service';
import { ReportAuditService } from '../services/report-audit.service';
import { callDeepSeekAudit } from '../utils/http-client';

async function deleteUploadedFiles(files: Express.Multer.File[]): Promise<void> {
  await Promise.all(files.map(file =>
    unlink(path.join(process.cwd(), 'uploads', path.basename(file.filename))).catch(() => undefined)
  ));
}

export class ReportController {
  static async submitReport(req: Request, res: Response): Promise<void> {
    const files = ((req as any).files as Express.Multer.File[] | undefined) || [];
    let keepUploads = false;
    try {
      const { name, phone, lampId, description } = req.body;

      // 校验
      if (typeof name !== 'string' || name.length < 2 || name.length > 20) {
        res.status(400).json({ code: 400, message: '姓名需2-20个字符', data: null });
        return;
      }
      if (typeof phone !== 'string' || !/^1\d{10}$/.test(phone)) {
        res.status(400).json({ code: 400, message: '请输入正确的11位手机号', data: null });
        return;
      }
      if (typeof lampId !== 'string' || !/^lamp_\d{3}$/.test(lampId)) {
        res.status(400).json({ code: 400, message: '路灯编号格式为 lamp_XXX', data: null });
        return;
      }
      if (typeof description !== 'string' || description.length < 10 || description.length > 200) {
        res.status(400).json({ code: 400, message: '故障描述需10-200字', data: null });
        return;
      }

      const normalizedDescription = description.trim();
      const duplicate = await ReportAuditService.findDuplicateReport(phone, lampId, normalizedDescription);
      if (duplicate) {
        res.status(409).json({ code: 4002, message: '24小时内已提交过相同上报', data: { auditId: duplicate.id } });
        return;
      }

      const aiResult = await callDeepSeekAudit({
        reportName: name.trim(), reportPhone: phone, lampId, faultContent: normalizedDescription,
      });

      const auditPass = aiResult.pass === false ? 0 : aiResult.pass === true ? 1 : 2;
      const reviewStatus = auditPass === 0 ? 'ai_rejected' : 'pending_review';
      const auditLog = await ReportAuditService.createAuditLog({
        reportName: name.trim(),
        reportPhone: phone,
        lampId,
        faultContent: normalizedDescription,
        photoUrls: auditPass === 0 ? [] : files.map(file => file.filename),
        auditPass,
        auditReason: aiResult.reason,
        aiResponse: aiResult.rawResponse,
        reviewStatus,
      });

      if (auditPass === 0) {
        res.status(400).json({ code: 4001, message: aiResult.reason, data: { auditId: auditLog.id } });
        return;
      }

      keepUploads = true;
      res.json({
        code: 200,
        message: '上报已提交，等待审核',
        data: { auditId: auditLog.id, reviewStatus: auditLog.reviewStatus },
      });
    } catch (error) {
      console.error('[ReportController] submitReport error:', error);
      res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
    } finally {
      if (!keepUploads) await deleteUploadedFiles(files);
    }
  }

  static async listReports(req: Request, res: Response): Promise<void> {
    try {
      const { status, lampId, page = '1', pageSize = '20' } = req.query;
      const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
      const size = Math.min(100, Math.max(1, parseInt(pageSize as string, 10) || 20));

      const result = await ReportService.list(
        { status: status as string, lampId: lampId as string },
        pageNum,
        size
      );

      res.json({ code: 200, message: 'success', data: result });
    } catch (error) {
      console.error('[ReportController] listReports error:', error);
      res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
    }
  }

  static async getReport(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        res.status(400).json({ code: 400, message: '上报ID无效', data: null });
        return;
      }

      const report = await ReportService.getById(id);
      if (!report) {
        res.status(404).json({ code: 404, message: '上报记录不存在', data: null });
        return;
      }

      res.json({ code: 200, message: 'success', data: report });
    } catch (error) {
      console.error('[ReportController] getReport error:', error);
      res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
    }
  }

  static async resolveReport(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        res.status(400).json({ code: 400, message: '上报ID无效', data: null });
        return;
      }

      const { note } = req.body;
      const result = await ReportService.resolve(id, note);

      res.json({ code: 200, message: '故障上报已处理', data: result });
    } catch (error: any) {
      if (error.message === 'REPORT_NOT_FOUND') {
        res.status(404).json({ code: 404, message: '上报记录不存在', data: null });
        return;
      }
      if (error.message === 'REPORT_ALREADY_RESOLVED') {
        res.status(400).json({ code: 400, message: '该上报已处理', data: null });
        return;
      }
      console.error('[ReportController] resolveReport error:', error);
      res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
    }
  }
}
