// @ts-ignore
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  try {
    let body: any = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }

    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = body.prompt || body.content || JSON.stringify(body);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: '당신은 초등학교 자서전 편찬을 도와주는 AI입니다. 학생의 학교생활 데이터를 바탕으로 자연스럽고 따뜻한 자서전 문장을 작성해주세요.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 3000,
      temperature: 0.7,
    });

    return res.status(200).json({ result: completion.choices[0]?.message?.content || '' });
  } catch (err: any) {
    console.error('autobiography error:', err);
    return res.status(500).json({ message: '자서전 생성 실패' });
  }
}
