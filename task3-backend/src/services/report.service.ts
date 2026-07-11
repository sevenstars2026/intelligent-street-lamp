import { DatabaseService } from './database.service';
import type { FaultReport } from '../types/database.types';

export class ReportService {
  static async submit(data: {
    name: string; phone: string; lampId: string;
    description: string; photos: string[];
  }) {
    const report: Omit<FaultReport, 'id'> = {
      alarmId: 0,
      reporterName: data.name,
      reporterPhone: data.phone,
      lampId: data.lampId,
      description: data.description,
      photoUrls: data.photos.map(f => String(f)),
      status: 'active',
      createdAt: new Date(),
      resolvedAt: null,
      resolveNote: null,
    };
    return DatabaseService.addFaultReport(report);
  }

  static async list(
    filters: { status?: string; lampId?: string } = {},
    page = 1,
    pageSize = 20
  ): Promise<{ reports: FaultReport[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } }> {
    const allReports = await DatabaseService.getFaultReports(filters);
    const total = allReports.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const startIndex = (page - 1) * pageSize;
    const reports = allReports.slice(startIndex, startIndex + pageSize);

    return {
      reports,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
    };
  }

  static async getById(id: number): Promise<FaultReport | null> {
    return DatabaseService.getFaultReport(id);
  }

  static async resolve(id: number, note?: string): Promise<any> {
    const report = await DatabaseService.getFaultReport(id);
    if (!report) {
      throw new Error('REPORT_NOT_FOUND');
    }
    if (report.status === 'resolved') {
      throw new Error('REPORT_ALREADY_RESOLVED');
    }

    const updated = await DatabaseService.resolveFaultReport(id, note || null);
    if (!updated) {
      throw new Error('REPORT_RESOLVE_FAILED');
    }

    return {
      id,
      resolvedAt: new Date().toISOString(),
      note: note || null,
    };
  }
}
