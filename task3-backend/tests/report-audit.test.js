const { MockDatabase } = require('../dist/mock/mock-database');

function pending(overrides = {}) {
  return {
    reportName: '张三', reportPhone: '13800138000', lampId: 'lamp_001',
    faultContent: '路灯连续多日无法正常点亮', photoUrls: ['one.jpg'], auditPass: 1,
    auditReason: '内容合规', maxkbResponse: '{}', reviewStatus: 'pending_review',
    reviewerId: null, reviewer: null, reviewTime: null, reviewAction: null,
    reviewReason: null, faultReportId: null, alarmId: null, createTime: new Date(),
    ...overrides,
  };
}

describe('MockDatabase report audit workflow', () => {
  beforeEach(() => { MockDatabase.reset(); MockDatabase.init(); });

  test('finds duplicates within 24 hours and excludes manually rejected records', () => {
    const created = MockDatabase.addReportAuditLog(pending());
    expect(MockDatabase.findDuplicateAuditLog(created.reportPhone, created.lampId, created.faultContent, new Date(Date.now() - 86400000)).id).toBe(created.id);
    MockDatabase.rejectReportAudit(created.id, 1, '审核员', '信息不准确');
    expect(MockDatabase.findDuplicateAuditLog(created.reportPhone, created.lampId, created.faultContent, new Date(Date.now() - 86400000))).toBeNull();
  });

  test('approval creates linked alarm and fault report exactly once', () => {
    const created = MockDatabase.addReportAuditLog(pending());
    const result = MockDatabase.approveReportAudit(created.id, 7, '市政审核员');
    expect(result.auditLog.reviewStatus).toBe('approved');
    expect(result.report.alarmId).toBe(result.alarm.id);
    expect(result.auditLog.faultReportId).toBe(result.report.id);
    expect(result.auditLog.alarmId).toBe(result.alarm.id);
    expect(() => MockDatabase.approveReportAudit(created.id, 7, '市政审核员')).toThrow('AUDIT_ALREADY_REVIEWED');
  });

  test('filters audit logs by status and AI result', () => {
    MockDatabase.addReportAuditLog(pending());
    MockDatabase.addReportAuditLog(pending({ auditPass: 2, auditReason: '服务超时' }));
    MockDatabase.addReportAuditLog(pending({ auditPass: 0, reviewStatus: 'ai_rejected' }));
    expect(MockDatabase.getReportAuditLogs({ reviewStatus: 'pending_review' })).toHaveLength(2);
    expect(MockDatabase.getReportAuditLogs({ auditPass: 2 })).toHaveLength(1);
  });
});
