export interface AuditResult {
  pass: boolean | null;  // true=通过, false=驳回, null=AI不确定(异常/超时)
  reason: string;
  rawResponse: string | null;
}

export interface AuditParams {
  reportName: string;
  reportPhone: string;
  lampId: string;
  faultContent: string;
}

const MAX_RESPONSE_LENGTH = 100_000;

function unavailable(reason: string, rawResponse: string | null = null): AuditResult {
  return { pass: null, reason, rawResponse };
}

const SYSTEM_PROMPT = `你是一个智慧路灯系统的故障上报审核助手。请审核以下游客提交的故障上报内容是否合规。

审核规则：
1. 必须是真实的路灯故障描述（如：不亮、闪烁、灯杆倾斜、灯罩破损、线路外露等）
2. 不得包含广告、推销、联系方式
3. 不得包含政治敏感、色情、暴力内容
4. 不得是无意义的乱码或灌水文字
5. 如果是描述路灯故障，即使表达不够专业（如"灯坏了""不亮了"），也应判定通过

请严格以 JSON 格式回复，不要包含其他文字：
{ "pass": true/false, "reason": "审核说明（不通过时说明具体原因）" }`;

function parseOutput(rawResponse: string): { pass: boolean; reason: string } | null {
  try {
    // 尝试提取 JSON（可能包裹在 markdown 代码块中）
    let json = rawResponse;
    const codeBlockMatch = rawResponse.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (codeBlockMatch) json = codeBlockMatch[1].trim();
    else {
      const bracketMatch = rawResponse.match(/\{[^{}]*"pass"[^{}]*\}/);
      if (bracketMatch) json = bracketMatch[0];
    }
    const output = JSON.parse(json);
    if (typeof output.pass !== 'boolean') return null;
    return {
      pass: output.pass,
      reason: typeof output.reason === 'string' && output.reason.trim()
        ? output.reason.trim()
        : (output.pass ? 'AI 校验通过' : 'AI 校验未通过'),
    };
  } catch {
    return null;
  }
}

export async function callDeepSeekAudit(params: AuditParams): Promise<AuditResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  const baseUrl = process.env.DEEPSEEK_BASE_URL?.replace(/\/$/, '') || 'https://api.deepseek.com';
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
  if (!apiKey) return unavailable('AI 校验服务未配置（DEEPSEEK_API_KEY 为空）');

  const configuredTimeout = Number.parseInt(process.env.DEEPSEEK_TIMEOUT || '', 10);
  const timeout = Number.isFinite(configuredTimeout) && configuredTimeout > 0 ? configuredTimeout : 15_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `---上报内容---\n上报人：${params.reportName}\n故障路灯：${params.lampId}\n故障描述：${params.faultContent}`,
          },
        ],
        temperature: 0.1,
        max_tokens: 256,
      }),
      signal: controller.signal,
    });

    const rawResponse = (await response.text()).slice(0, MAX_RESPONSE_LENGTH);
    if (!response.ok) return unavailable(`AI 校验服务返回 HTTP ${response.status}`, rawResponse);

    let payload: any;
    try { payload = JSON.parse(rawResponse); } catch {
      return unavailable('AI 校验返回格式异常', rawResponse);
    }

    // OpenAI 兼容格式: { choices: [{ message: { content: "..." } }] }
    const content = payload?.choices?.[0]?.message?.content;
    if (!content) return unavailable('AI 校验返回格式异常', rawResponse);

    const output = parseOutput(content);
    return output ? { ...output, rawResponse: content }
                  : unavailable('AI 校验返回格式异常', content);
  } catch (error: any) {
    return unavailable(
      error?.name === 'AbortError' ? 'AI 校验服务超时' : 'AI 校验服务不可用'
    );
  } finally {
    clearTimeout(timer);
  }
}
