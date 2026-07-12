/**
 * DeepSeek AI 审核手动测试
 * 运行: npx ts-node tests/deepseek-audit-manual.ts
 */
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env') });

const SYSTEM_PROMPT = `你是一个智慧路灯系统的故障上报审核助手。请审核以下游客提交的故障上报内容是否合规。

审核规则：
1. 必须是真实的路灯故障描述（如：不亮、闪烁、灯杆倾斜、灯罩破损、线路外露等）
2. 不得包含广告、推销、联系方式
3. 不得包含政治敏感、色情、暴力内容
4. 不得是无意义的乱码或灌水文字
5. 如果是描述路灯故障，即使表达不够专业（如"灯坏了""不亮了"），也应判定通过

请严格以 JSON 格式回复，不要包含其他文字：
{ "pass": true/false, "reason": "审核说明（不通过时说明具体原因）" }`;

async function audit(reportName: string, lampId: string, description: string) {
  const apiKey = process.env.DEEPSEEK_API_KEY!;
  const baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

  const userMessage = `---上报内容---\n上报人：${reportName}\n故障路灯：${lampId}\n故障描述：${description}`;

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
        { role: 'user', content: userMessage },
      ],
      temperature: 0.1,
      max_tokens: 256,
    }),
  });

  const raw = await response.text();
  const payload = JSON.parse(raw);
  const content = payload?.choices?.[0]?.message?.content;

  // 解析 AI 返回的 JSON
  let aiResult: any = null;
  if (content) {
    try {
      const match = content.match(/\{[\s\S]*"pass"[\s\S]*\}/);
      if (match) aiResult = JSON.parse(match[0]);
    } catch {}
  }

  return {
    input: { reportName, lampId, description },
    rawContent: content,
    pass: aiResult?.pass ?? null,
    reason: aiResult?.reason ?? '解析失败',
  };
}

async function main() {
  console.log('══════════════════════════════════════════════════');
  console.log('  DeepSeek AI 故障上报审核测试');
  console.log('══════════════════════════════════════════════════\n');

  // 测试用例
  const cases = [
    {
      label: '✅ 正常故障: 路灯不亮',
      name: '张三', lamp: 'lamp_001',
      desc: '这个路灯已经两天不亮了，晚上走路什么都看不见，麻烦尽快派人来修一下',
    },
    {
      label: '✅ 正常故障: 灯闪烁',
      name: '李四', lamp: 'lamp_002',
      desc: '路灯一直在闪，一闪一闪的眼睛都花了，感觉是电路接触不良',
    },
    {
      label: '✅ 正常故障: 灯杆倾斜（表达不专业）',
      name: '王五', lamp: 'lamp_001',
      desc: '灯杆歪了，感觉随时要倒下来，很危险',
    },
    {
      label: '✅ 正常故障: 灯泡坏了',
      name: '小红', lamp: 'lamp_003',
      desc: '灯泡坏了不亮了',
    },
    {
      label: '❌ 广告: 加微信推销',
      name: '营销号', lamp: 'lamp_001',
      desc: '加微信xxx12345了解更多优惠信息，免费领取精美礼品，数量有限先到先得',
    },
    {
      label: '❌ 灌水: 无意义重复',
      name: 'test', lamp: 'lamp_001',
      desc: '啊啊啊啊啊啊啊啊啊啊啊啊啊啊啊啊啊啊啊',
    },
    {
      label: '❌ 无关内容: 纯数字标点',
      name: '机器人', lamp: 'lamp_002',
      desc: '12345678901234567890，，，，。。。。。',
    },
    {
      label: '✅ 边界: 表述模糊但真实',
      name: '老人家', lamp: 'lamp_001',
      desc: '那个灯不好了，晚上黑得很，你们快来看看',
    },
    {
      label: '❌ 广告: 办证',
      name: '小广告', lamp: 'lamp_003',
      desc: '专业办证刻章，价格优惠，全国可快递，请联系13800138000',
    },
  ];

  for (const c of cases) {
    console.log(`── ${c.label}`);
    console.log(`   输入: ${c.desc}`);
    try {
      const result = await audit(c.name, c.lamp, c.desc);
      const icon = result.pass === true ? '🟢 通过' : result.pass === false ? '🔴 驳回' : '🟡 异常';
      console.log(`   结果: ${icon} | reason: ${result.reason}`);
      console.log(`   AI原始: ${result.rawContent}`);
    } catch (e: any) {
      console.log(`   ❌ 异常: ${e.message}`);
    }
    console.log();
  }

  console.log('══════════════════════════════════════════════════');
  console.log('  测试完成');
  console.log('══════════════════════════════════════════════════');
}

main().catch(console.error);
