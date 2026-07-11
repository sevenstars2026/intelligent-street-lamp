const ORIGINAL_ENV = process.env;

describe('callDeepSeekAudit', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...ORIGINAL_ENV,
      DEEPSEEK_API_KEY: 'sk-test-key',
      DEEPSEEK_BASE_URL: 'https://api.deepseek.com',
      DEEPSEEK_MODEL: 'deepseek-chat',
      DEEPSEEK_TIMEOUT: '100',
    };
    global.fetch = jest.fn();
  });

  afterAll(() => { process.env = ORIGINAL_ENV; });

  test.each([
    [{ choices: [{ message: { content: '{"pass":true,"reason":"内容合规"}' } }] }, true],
    [{ choices: [{ message: { content: '{"pass":false,"reason":"包含广告"}' } }] }, false],
  ])('parses chat completions output %#', async (payload, expected) => {
    global.fetch.mockResolvedValue({ ok: true, status: 200, text: async () => JSON.stringify(payload) });
    const { callDeepSeekAudit } = require('../dist/utils/http-client');
    const result = await callDeepSeekAudit({ reportName: '张三', reportPhone: '13800138000', lampId: 'lamp_001', faultContent: '路灯无法正常点亮' });
    expect(result.pass).toBe(expected);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.deepseek.com/v1/chat/completions',
      expect.objectContaining({ method: 'POST' })
    );
  });

  test.each([
    [{ ok: false, status: 503, text: async () => 'down' }, 'AI 校验服务返回 HTTP 503'],
    [{ ok: true, status: 200, text: async () => '{bad json' }, 'AI 校验返回格式异常'],
  ])('falls back for invalid service response %#', async (response, reason) => {
    global.fetch.mockResolvedValue(response);
    const { callDeepSeekAudit } = require('../dist/utils/http-client');
    const result = await callDeepSeekAudit({ reportName: '张三', reportPhone: '13800138000', lampId: 'lamp_001', faultContent: '路灯无法正常点亮' });
    expect(result).toEqual(expect.objectContaining({ pass: null, reason }));
  });

  test('falls back when API key is missing', async () => {
    delete process.env.DEEPSEEK_API_KEY;
    const { callDeepSeekAudit } = require('../dist/utils/http-client');
    const result = await callDeepSeekAudit({ reportName: '张三', reportPhone: '13800138000', lampId: 'lamp_001', faultContent: '路灯无法正常点亮' });
    expect(result).toEqual({ pass: null, reason: 'AI 校验服务未配置（DEEPSEEK_API_KEY 为空）', rawResponse: null });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('falls back when the request times out', async () => {
    process.env.DEEPSEEK_TIMEOUT = '1';
    global.fetch.mockImplementation((_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => {
        const error = new Error('aborted');
        error.name = 'AbortError';
        reject(error);
      });
    }));
    const { callDeepSeekAudit } = require('../dist/utils/http-client');
    const result = await callDeepSeekAudit({ reportName: '张三', reportPhone: '13800138000', lampId: 'lamp_001', faultContent: '路灯无法正常点亮' });
    expect(result).toEqual({ pass: null, reason: 'AI 校验服务超时', rawResponse: null });
  });
});
