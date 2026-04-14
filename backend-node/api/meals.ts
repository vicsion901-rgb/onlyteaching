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
  let body: any = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }

  try {
    // GET /api/meals (목록)
    if (req.method === 'GET' && !action) {
      const { schoolCode, mealDate } = req.query;
      let sql = 'SELECT * FROM meals';
      const vals: any[] = [];
      const conds: string[] = [];
      if (schoolCode) { conds.push(`"schoolCode" = $${vals.length + 1}`); vals.push(schoolCode); }
      if (mealDate) { conds.push(`"mealDate" = $${vals.length + 1}`); vals.push(mealDate); }
      if (conds.length) sql += ' WHERE ' + conds.join(' AND ');
      sql += ' ORDER BY "mealDate" DESC LIMIT 50';
      const { rows } = await db.query(sql, vals);
      return res.status(200).json(rows);
    }

    // GET /api/meals?action=leaderboard
    if (req.method === 'GET' && action === 'leaderboard') {
      const { schoolCode } = req.query;
      const { rows } = await db.query(
        'SELECT * FROM meals WHERE "schoolCode" = $1 ORDER BY likes DESC LIMIT 10',
        [schoolCode || ''],
      );
      return res.status(200).json(rows);
    }

    // POST /api/meals (생성)
    if (req.method === 'POST' && !action) {
      const { schoolCode, mealDate, imageUrl, caption, createdByUserId } = body;
      const result = await db.query(
        `INSERT INTO meals ("schoolCode", "mealDate", "imageUrl", caption, "createdByUserId", likes, "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,0,NOW(),NOW()) RETURNING *`,
        [schoolCode, mealDate, imageUrl || '', caption || null, createdByUserId || null],
      );
      return res.status(201).json(result.rows[0]);
    }

    // POST /api/meals?action=like&mealId=123
    if (req.method === 'POST' && action === 'like') {
      const mealId = req.query.mealId as string;
      const { schoolCode, userId } = body;
      // 중복 체크
      const dup = await db.query('SELECT id FROM meal_likes WHERE "mealId" = $1 AND "userId" = $2 LIMIT 1', [mealId, userId]);
      if (dup.rows.length > 0) return res.status(400).json({ message: '이미 좋아요를 눌렀습니다.' });
      await db.query('INSERT INTO meal_likes ("mealId", "userId", "schoolCode", "createdAt") VALUES ($1,$2,$3,NOW())', [mealId, userId, schoolCode]);
      await db.query('UPDATE meals SET likes = likes + 1 WHERE id = $1', [mealId]);
      return res.status(200).json({ success: true });
    }

    // POST /api/meals?action=upload (이미지를 base64로 받아 URL 반환 - 간단 구현)
    if (req.method === 'POST' && action === 'upload') {
      // 현재는 이미지 URL을 직접 받는 구조로 유지
      return res.status(200).json({ imageUrl: body.imageUrl || '' });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (err: any) {
    console.error('meals error:', err);
    return res.status(500).json({ message: '처리 중 오류' });
  }
}
