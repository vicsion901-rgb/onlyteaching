// @ts-ignore
import type { VercelRequest, VercelResponse } from '@vercel/node';
// @ts-ignore
import OpenAI from 'openai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const _origin = req.headers?.origin || ""; const _allowed = ["https://www.onlyteaching.kr","https://onlyteaching.kr","http://localhost:5173","http://localhost:3000"].includes(_origin) ? _origin : "https://www.onlyteaching.kr"; res.setHeader("Access-Control-Allow-Origin", _allowed); res.setHeader("Access-Control-Allow-Credentials", "true"); res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS"); res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization"); if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  try {
    let body: any = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const { title, content } = body || {};
    const prompt = content || title || '';
    if (!prompt) return res.status(400).json({ message: '프롬프트를 입력해주세요.' });

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: '당신은 초등학교 교사를 도와주는 AI 어시스턴트입니다. 한국어로 답변하세요.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 2000,
      temperature: 0.7,
    });

    const result = completion.choices[0]?.message?.content || '';
    return res.status(200).json({
      result,
      model: completion.model,
      usage: completion.usage,
    });
  } catch (err: any) {
    console.error('prompts error:', err);
    return res.status(500).json({ message: 'AI 생성 실패' });
  }
}
