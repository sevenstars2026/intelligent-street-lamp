import { Request, Response } from 'express';
import { ReportService } from '../services/report.service';

export class ReportController {
  static async submitReport(req: Request, res: Response): Promise<void> {
    try {
      const { name, phone, lampId, description } = req.body;
      const files = (req as any).files as Express.Multer.File[] | undefined;

      // 校验
      if (!name || name.length < 2 || name.length > 20) {
        res.status(400).json({ code: 400, message: '姓名需2-20个字符', data: null });
        return;
      }
      if (!/^1\d{10}$/.test(phone)) {
        res.status(400).json({ code: 400, message: '请输入正确的11位手机号', data: null });
        return;
      }
      if (!/^lamp_\d{3}$/.test(lampId)) {
        res.status(400).json({ code: 400, message: '路灯编号格式为 lamp_XXX', data: null });
        return;
      }
      if (!description || description.length < 10 || description.length > 200) {
        res.status(400).json({ code: 400, message: '故障描述需10-200字', data: null });
        return;
      }

      const report = await ReportService.submit({
        name, phone, lampId, description,
        photos: files?.map(f => f.filename) || [],
      });

      res.json({ code: 200, message: '上报成功，工作人员将尽快处理', data: report });
    } catch (error) {
      console.error('[ReportController] submitReport error:', error);
      res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
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
