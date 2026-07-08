import { Request, Response } from 'express';
import { ReportService } from '../services/report.service';

export class ReportController {
  static async submitReport(req: Request, res: Response): Promise<void> {
    try {
      const { name, phone, lampId, description } = req.body;
      const files = req.files as Express.Multer.File[] | undefined;

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
}
