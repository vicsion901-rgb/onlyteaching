// @ts-ignore
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'POST only' });

  let body: any = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }

  const { texts, contentType = 'autobiography', protectedTokens = [] } = body;

  if (!Array.isArray(texts) || texts.length === 0) {
    return res.status(400).json({ message: 'texts 배열 필요: [{ id, text }]' });
  }

  if (texts.length > 30) {
    return res.status(400).json({ message: '한 번에 최대 30개 블록까지 점검 가능' });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ message: 'AI API 키 미설정' });
  }

  const { default: OpenAI } = await import('openai');
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.PROOFREAD_MODEL || 'gpt-4o-mini';

  const instructions = buildInstructions(contentType, protectedTokens);

  try {
    const results = await Promise.all(
      texts.map(async ({ id, text }: { id: string; text: string }) => {
        if (!text || text.trim().length < 5) {
          return { id, original: text, revised: text, hasChanges: false };
        }
        try {
          const completion = await openai.chat.completions.create({
            model,
            messages: [
              { role: 'system', content: instructions },
              { role: 'user', content: text.trim() },
            ],
            max_tokens: 2000,
            temperature: 0.1,
          });
          const revised = completion.choices[0]?.message?.content?.trim() || text;
          return { id, original: text.trim(), revised, hasChanges: revised !== text.trim() };
        } catch {
          return { id, original: text, revised: text, hasChanges: false };
        }
      }),
    );

    return res.status(200).json({ results, model });
  } catch (err: any) {
    console.error('proofread error:', err);
    return res.status(500).json({ message: '교정 처리 중 오류 발생' });
  }
}

function buildInstructions(contentType: string, protectedTokens: string[]): string {
  const contentGuide =
    contentType === 'life-record'
      ? '생활기록부 문체를 유지하고 평가 의미를 바꾸지 마세요.'
      : contentType === 'autobiography'
      ? '자서전 문체를 유지하되 감상적 재창작 없이 문장 흐름만 다듬으세요.'
      : '행정 문서/교사 업무 문체를 유지하세요.';

  const protectedGuide =
    protectedTokens.length > 0
      ? `보호 토큰(반드시 그대로 유지): ${protectedTokens.join(', ')}`
      : '의미·사실·고유명사는 그대로 유지하세요.';

  return [
    '다음 한국어 문장을 의미 변경 없이 교정하세요.',
    '수정 범위: 문장 호응, 맞춤법, 띄어쓰기, 문장부호, 어색한 연결 표현.',
    '이름, 숫자, 날짜, 점수, 고유명사, URL, 이메일은 절대 바꾸지 마세요.',
    '문장을 새로 쓰지 말고 최소 수정만 하세요.',
    '이미 자연스러우면 원문 그대로 반환하세요.',
    '설명 없이 교정된 본문만 반환하세요.',
    contentGuide,
    protectedGuide,
  ].join('\n');
}
