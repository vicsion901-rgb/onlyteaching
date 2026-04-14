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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const db = getPool();
  let body: any = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }

  const id = req.query.id as string | undefined;

  try {
    if (req.method === 'GET') {
      const { rows } = await db.query('SELECT * FROM schedules ORDER BY date ASC, id ASC');
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const { title, date, memo } = body || {};
      const result = await db.query(
        'INSERT INTO schedules (title, date, memo, "createdAt", "updatedAt") VALUES ($1, $2, $3, NOW(), NOW()) RETURNING *',
        [title || '', date || '', memo || null],
      );
      return res.status(201).json(result.rows[0]);
    }

    if (req.method === 'PATCH' && id) {
      const sets: string[] = [];
      const vals: any[] = [];
      let idx = 1;
      if (body.title !== undefined) { sets.push(`title = $${idx++}`); vals.push(body.title); }
      if (body.date !== undefined) { sets.push(`date = $${idx++}`); vals.push(body.date); }
      if (body.memo !== undefined) { sets.push(`memo = $${idx++}`); vals.push(body.memo); }
      sets.push(`"updatedAt" = NOW()`);
      vals.push(id);
      const result = await db.query(`UPDATE schedules SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`, vals);
      return res.status(200).json(result.rows[0]);
    }

    if (req.method === 'DELETE' && id) {
      await db.query('DELETE FROM schedules WHERE id = $1', [id]);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (err: any) {
    console.error('schedules error:', err);
    return res.status(500).json({ message: '처리 중 오류' });
  }
}
