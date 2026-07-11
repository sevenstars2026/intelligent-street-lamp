function auditRow() {
  return {
    id: 9, report_name: '张三', report_phone: '13800138000', lamp_id: 'lamp_001',
    fault_content: '路灯连续多日无法正常点亮', photo_urls: JSON.stringify(['one.jpg']),
    audit_pass: 1, audit_reason: '内容合规', ai_response: '{}',
    review_status: 'pending_review', reviewer_id: null, reviewer: null,
    review_time: null, review_action: null, review_reason: null,
    fault_report_id: null, alarm_id: null, create_time: new Date('2026-07-11T00:00:00Z'),
  };
}

function loadDatabaseService(failReportInsert = false) {
  jest.resetModules();
  const connection = {
    beginTransaction: jest.fn().mockResolvedValue(undefined),
    commit: jest.fn().mockResolvedValue(undefined),
    rollback: jest.fn().mockResolvedValue(undefined),
    release: jest.fn(),
    query: jest.fn(async sql => {
      if (sql.includes('FOR UPDATE')) return [[auditRow()], []];
      if (sql.includes('SELECT name FROM devices')) return [[{ name: '路灯001' }], []];
      if (sql.includes('INSERT INTO alarms')) return [{ insertId: 101 }, []];
      if (sql.includes('INSERT INTO fault_reports')) {
        if (failReportInsert) throw new Error('injected insert failure');
        return [{ insertId: 202 }, []];
      }
      if (sql.includes('UPDATE report_audit_log')) return [{ affectedRows: 1 }, []];
      throw new Error(`unexpected SQL: ${sql}`);
    }),
  };
  const pool = { getConnection: jest.fn().mockResolvedValue(connection) };
  jest.doMock('../dist/config/database', () => ({ getPool: () => pool }));
  const { DatabaseService } = require('../dist/services/database.service');
  return { DatabaseService, connection };
}

describe('DatabaseService approveReportAudit transaction', () => {
  test('commits linked alarm, report and audit update', async () => {
    const { DatabaseService, connection } = loadDatabaseService();
    const result = await DatabaseService.approveReportAudit(9, 7, '市政审核员');
    expect(result.alarm.id).toBe(101);
    expect(result.report.id).toBe(202);
    expect(result.report.alarmId).toBe(101);
    expect(connection.beginTransaction).toHaveBeenCalledTimes(1);
    expect(connection.commit).toHaveBeenCalledTimes(1);
    expect(connection.rollback).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalledTimes(1);
  });

  test('rolls back when a transactional insert fails', async () => {
    const { DatabaseService, connection } = loadDatabaseService(true);
    await expect(DatabaseService.approveReportAudit(9, 7, '市政审核员')).rejects.toThrow('injected insert failure');
    expect(connection.commit).not.toHaveBeenCalled();
    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(connection.release).toHaveBeenCalledTimes(1);
  });
});
