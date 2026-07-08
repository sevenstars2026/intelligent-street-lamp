import { DatabaseService } from './database.service';

export interface CreateFaultReportInput {
  reporterName: string;
  reporterPhone: string;
  lampId: string;
  description: string;
  photoUrls: string[];
}

export class ReportService {
  static async createFaultReport(input: CreateFaultReportInput) {
    const device = await DatabaseService.getDevice(input.lampId);
    if (!device) {
      throw new Error('DEVICE_NOT_FOUND');
    }

    const alarm = await DatabaseService.addAlarm({
      deviceId: input.lampId,
      deviceName: device.name || input.lampId,
      alarmType: 'fault_report',
      alarmLevel: 'medium',
      status: 'active',
      message: `游客 ${input.reporterName}(${input.reporterPhone}) 上报故障: ${input.description}`,
      createdAt: new Date(),
      handledAt: null,
      handlerId: null,
      handlerName: null,
    });

    const report = await DatabaseService.addFaultReport({
      alarmId: alarm.id,
      reporterName: input.reporterName,
      reporterPhone: input.reporterPhone,
      lampId: input.lampId,
      description: input.description,
      photoUrls: input.photoUrls,
      createdAt: new Date(),
    });

    return {
      reportId: report.id,
      alarmId: alarm.id,
      photoUrls: report.photoUrls,
      createdAt: report.createdAt,
    };
  }
}

