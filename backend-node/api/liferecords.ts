// @ts-ignore
import type { VercelRequest, VercelResponse } from '@vercel/node';
// @ts-ignore
import { Pool } from 'pg';

let pool: Pool | null = null;
function getPool(): Pool {
  if (!pool) { pool = new Pool({ connectionString: process.env.POSTGRES_URL, ssl: { rejectUnauthorized: false }, max: 3, connectionTimeoutMillis: 5000 }); }
  return pool;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const db = getPool();
  const action = req.query.action as string | undefined;

  try {
    // GET /api/liferecords?action=keywords&query=...
    if (req.method === 'GET' && action === 'keywords') {
      const query = (req.query.query as string || '').trim();
      let sql = 'SELECT DISTINCT category AS keyword, subcategory, attribute FROM student_record_comments';
      const vals: any[] = [];
      if (query) { sql += ' WHERE category ILIKE $1 OR subcategory ILIKE $1 OR attribute ILIKE $1'; vals.push(`%${query}%`); }
      sql += ' ORDER BY category, subcategory LIMIT 50';
      const { rows } = await db.query(sql, vals);
      return res.status(200).json(rows);
    }

    // GET /api/liferecords?action=comments&keyword=...
    if (req.method === 'GET' && action === 'comments') {
      const keyword = req.query.keyword as string || '';
      const { rows } = await db.query(
        'SELECT id AS comment_id, category, subcategory, attribute, content FROM student_record_comments WHERE category = $1 OR subcategory = $1 OR attribute = $1 ORDER BY id LIMIT 20',
        [keyword],
      );
      return res.status(200).json(rows);
    }

    // POST /api/liferecords?action=use&commentId=...
    if (req.method === 'POST' && action === 'use') {
      const commentId = req.query.commentId as string;
      // 사용 횟수 기록은 현재 DB에 별도 컬럼 없으므로 단순 조회 반환
      const { rows } = await db.query('SELECT * FROM student_record_comments WHERE id = $1', [commentId]);
      return res.status(200).json(rows[0] || {});
    }

    // POST /api/liferecords?action=generate (AI 생성)
    if (req.method === 'POST' && action === 'generate') {
      let body: any = req.body;
      if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
      const { prompt, studentName, keywords } = body || {};
      const text = prompt || `${studentName || '학생'}에 대해 ${(keywords || []).join(', ')} 키워드로 생활기록부를 작성해주세요.`;

      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: '당신은 초등학교 생활기록부 작성을 도와주는 AI입니다. 교사가 제공한 키워드를 바탕으로 자연스러운 생활기록부 문장을 작성해주세요.' },
          { role: 'user', content: text },
        ],
        max_tokens: 1500,
        temperature: 0.7,
      });
      return res.status(200).json({ result: completion.choices[0]?.message?.content || '' });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (err: any) {
    console.error('liferecords error:', err);
    return res.status(500).json({ message: '처리 중 오류' });
  }
}
