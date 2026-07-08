import { DatabaseService } from './database.service';
import { MockDatabase } from '../mock/mock-database';
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
      createdAt: new Date(),
    };
    try { return await DatabaseService.addFaultReport(report); }
    catch { return MockDatabase.addFaultReport(report); }
  }
}
