export interface AuditWorkflowResult {
  pass: boolean | null;
  reason: string;
  rawResponse: string | null;
}

export interface AuditWorkflowParams {
  reportName: string;
  reportPhone: string;
  lampId: string;
  faultContent: string;
}

const MAX_RESPONSE_LENGTH = 100_000;

function unavailable(reason: string, rawResponse: string | null = null): AuditWorkflowResult {
  return { pass: null, reason, rawResponse };
}

function parseOutput(payload: any): { pass: boolean; reason: string } | null {
  let output = payload?.data?.output ?? payload?.output;
  if (typeof output === 'string') {
    try { output = JSON.parse(output); } catch { return null; }
  }
  if (!output || typeof output.pass !== 'boolean') return null;
  return {
    pass: output.pass,
    reason: typeof output.reason === 'string' && output.reason.trim()
      ? output.reason.trim()
      : (output.pass ? 'AI 校验通过' : 'AI 校验未通过'),
  };
}

export async function callMaxKBWorkflow(params: AuditWorkflowParams): Promise<AuditWorkflowResult> {
  const baseUrl = process.env.MAXKB_BASE_URL?.replace(/\/$/, '');
  const workflowId = process.env.MAXKB_WORKFLOW_AUDIT_ID;
  const token = process.env.MAXKB_WORKFLOW_TOKEN;
  if (!baseUrl || !workflowId || !token) return unavailable('AI 校验服务未配置');

  const configuredTimeout = Number.parseInt(process.env.MAXKB_TIMEOUT || '', 10);
  const timeout = Number.isFinite(configuredTimeout) && configuredTimeout > 0 ? configuredTimeout : 10_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${baseUrl}/api/v1/workflow/${encodeURIComponent(workflowId)}/run`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inputs: {
          report_name: params.reportName,
          report_phone: params.reportPhone,
          lamp_id: params.lampId,
          fault_content: params.faultContent,
        },
      }),
      signal: controller.signal,
    });
    const rawResponse = (await response.text()).slice(0, MAX_RESPONSE_LENGTH);
    if (!response.ok) return unavailable(`AI 校验服务返回 HTTP ${response.status}`, rawResponse);
    let payload: any;
    try { payload = JSON.parse(rawResponse); } catch { return unavailable('AI 校验返回格式异常', rawResponse); }
    const output = parseOutput(payload);
    return output ? { ...output, rawResponse } : unavailable('AI 校验返回格式异常', rawResponse);
  } catch (error: any) {
    return unavailable(error?.name === 'AbortError' ? 'AI 校验服务超时' : 'AI 校验服务不可用');
  } finally {
    clearTimeout(timer);
  }
}
