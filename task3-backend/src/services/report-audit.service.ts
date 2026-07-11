import { DatabaseService } from './database.service';
import type { AuditPass, Pagination, ReportAuditLog, ReviewStatus } from '../types/database.types';

export interface CreateAuditLogData {
  reportName: string;
  reportPhone: string;
  lampId: string;
  faultContent: string;
  photoUrls: string[];
  auditPass: AuditPass;
  auditReason: string;
  maxkbResponse?: string | null;
  reviewStatus: Extract<ReviewStatus, 'ai_rejected' | 'pending_review'>;
}

export class ReportAuditService {
  static createAuditLog(data: CreateAuditLogData): Promise<ReportAuditLog> {
    return DatabaseService.addReportAuditLog({
      ...data,
      maxkbResponse: data.maxkbResponse ?? null,
      reviewerId: null,
      reviewer: null,
      reviewTime: null,
      reviewAction: null,
      reviewReason: null,
      faultReportId: null,
      alarmId: null,
      createTime: new Date(),
    });
  }

  static async listAuditLogs(
    filters: { reviewStatus?: string; auditPass?: number }, page: number, pageSize: number
  ): Promise<{ logs: ReportAuditLog[]; pagination: Pagination }> {
    const { logs, total } = await DatabaseService.getReportAuditLogs(filters, page, pageSize);
    return { logs, pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } };
  }

  static getAuditLogById(id: number) {
    return DatabaseService.getReportAuditLog(id);
  }

  static findDuplicateReport(phone: string, lampId: string, description: string) {
    return DatabaseService.findDuplicateAuditLog(
      phone, lampId, description, new Date(Date.now() - 24 * 60 * 60 * 1000)
    );
  }

  static approveAuditLog(id: number, reviewer: { id: number; name: string }) {
    return DatabaseService.approveReportAudit(id, reviewer.id, reviewer.name);
  }

  static rejectAuditLog(id: number, reviewer: { id: number; name: string }, reviewReason: string) {
    const reason = reviewReason.trim();
    if (!reason || reason.length > 500) throw new Error('REVIEW_REASON_INVALID');
    return DatabaseService.rejectReportAudit(id, reviewer.id, reviewer.name, reason);
  }
}
