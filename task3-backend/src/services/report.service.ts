import { DatabaseService } from './database.service';
import { MockDatabase } from '../mock/mock-database';

export class ReportService {
  static async submit(data: {
    name: string; phone: string; lampId: string;
    description: string; photos: string[];
  }) {
    try {
      return await DatabaseService.addFaultReport(data);
    } catch {
      return MockDatabase.addFaultReport(data);
    }
  }
}
