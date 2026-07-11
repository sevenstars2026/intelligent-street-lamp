const { DatabaseService } = require('../dist/services/database.service');
const { ReportAuditService } = require('../dist/services/report-audit.service');

describe('ReportAuditService', () => {
  afterEach(() => jest.restoreAllMocks());

  test('returns bounded database pagination', async () => {
    jest.spyOn(DatabaseService, 'getReportAuditLogs').mockResolvedValue({ logs: [{ id: 1 }], total: 21 });
    const result = await ReportAuditService.listAuditLogs({ reviewStatus: 'pending_review' }, 2, 10);
    expect(result.pagination).toEqual({ page: 2, pageSize: 10, total: 21, totalPages: 3 });
  });

  test.each(['', '   ', 'x'.repeat(501)])('rejects invalid review reason', reason => {
    expect(() => ReportAuditService.rejectAuditLog(1, { id: 1, name: '审核员' }, reason)).toThrow('REVIEW_REASON_INVALID');
  });
});
