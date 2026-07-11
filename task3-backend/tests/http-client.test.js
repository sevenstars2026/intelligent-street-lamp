const ORIGINAL_ENV = process.env;

describe('callMaxKBWorkflow', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...ORIGINAL_ENV,
      MAXKB_BASE_URL: 'http://maxkb.test',
      MAXKB_WORKFLOW_AUDIT_ID: 'workflow-1',
      MAXKB_WORKFLOW_TOKEN: 'secret',
      MAXKB_TIMEOUT: '100',
    };
    global.fetch = jest.fn();
  });

  afterAll(() => { process.env = ORIGINAL_ENV; });

  test.each([
    [{ data: { output: { pass: true, reason: '内容合规' } } }, true],
    [{ data: { output: JSON.stringify({ pass: false, reason: '包含广告' }) } }, false],
  ])('parses workflow output %#', async (payload, expected) => {
    global.fetch.mockResolvedValue({ ok: true, status: 200, text: async () => JSON.stringify(payload) });
    const { callMaxKBWorkflow } = require('../dist/utils/http-client');
    const result = await callMaxKBWorkflow({ reportName: '张三', reportPhone: '13800138000', lampId: 'lamp_001', faultContent: '路灯无法正常点亮' });
    expect(result.pass).toBe(expected);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://maxkb.test/api/v1/workflow/workflow-1/run',
      expect.objectContaining({ method: 'POST' })
    );
  });

  test.each([
    [{ ok: false, status: 503, text: async () => 'down' }, 'AI 校验服务返回 HTTP 503'],
    [{ ok: true, status: 200, text: async () => '{bad json' }, 'AI 校验返回格式异常'],
  ])('falls back for invalid service response %#', async (response, reason) => {
    global.fetch.mockResolvedValue(response);
    const { callMaxKBWorkflow } = require('../dist/utils/http-client');
    const result = await callMaxKBWorkflow({ reportName: '张三', reportPhone: '13800138000', lampId: 'lamp_001', faultContent: '路灯无法正常点亮' });
    expect(result).toEqual(expect.objectContaining({ pass: null, reason }));
  });

  test('falls back when configuration is missing', async () => {
    delete process.env.MAXKB_WORKFLOW_TOKEN;
    const { callMaxKBWorkflow } = require('../dist/utils/http-client');
    const result = await callMaxKBWorkflow({ reportName: '张三', reportPhone: '13800138000', lampId: 'lamp_001', faultContent: '路灯无法正常点亮' });
    expect(result).toEqual({ pass: null, reason: 'AI 校验服务未配置', rawResponse: null });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('falls back when the request times out', async () => {
    process.env.MAXKB_TIMEOUT = '1';
    global.fetch.mockImplementation((_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => {
        const error = new Error('aborted');
        error.name = 'AbortError';
        reject(error);
      });
    }));
    const { callMaxKBWorkflow } = require('../dist/utils/http-client');
    const result = await callMaxKBWorkflow({ reportName: '张三', reportPhone: '13800138000', lampId: 'lamp_001', faultContent: '路灯无法正常点亮' });
    expect(result).toEqual({ pass: null, reason: 'AI 校验服务超时', rawResponse: null });
  });
});
