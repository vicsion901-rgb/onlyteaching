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
      const userId = req.query.userId as string;
      const month = req.query.month as string;

      // 인덱스 생성 (1회)
      try { await db.query('CREATE INDEX IF NOT EXISTS idx_schedules_user_date ON schedules("userId", date)'); } catch {}

      if (userId && month) {
        const { rows } = await db.query(
          'SELECT * FROM schedules WHERE "userId" = $1 AND date BETWEEN $2 AND $3 ORDER BY date ASC, id ASC',
          [userId, `${month}-01`, `${month}-31`],
        );
        return res.status(200).json(rows);
      }

      if (userId) {
        const { rows } = await db.query('SELECT * FROM schedules WHERE "userId" = $1 ORDER BY date ASC, id ASC', [userId]);
        return res.status(200).json(rows);
      }

      // 하위호환: userId 없으면 전체 조회
      const { rows } = await db.query('SELECT * FROM schedules ORDER BY date ASC, id ASC');
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      // userId 컬럼 없으면 추가
      try { await db.query('ALTER TABLE schedules ADD COLUMN IF NOT EXISTS "userId" VARCHAR'); } catch {}

      // bulk insert
      if (Array.isArray(body?.events)) {
        const userId = body.userId || null;
        const valid = body.events.filter((ev: any) => ev.title && ev.date);
        const skipped = body.events.length - valid.length;

        if (valid.length === 0) {
          return res.status(200).json({ inserted: 0, skipped, total: body.events.length, results: [] });
        }

        // 단일 multi-row INSERT (10건 → 1 쿼리)
        try {
          const values: any[] = [];
          const placeholders: string[] = [];
          valid.forEach((ev: any, i: number) => {
            const offset = i * 4;
            placeholders.push(`($${offset+1}, $${offset+2}, $${offset+3}, $${offset+4}, NOW(), NOW())`);
            values.push(ev.title, ev.date, ev.memo || null, userId);
          });
          const { rows } = await db.query(
            `INSERT INTO schedules (title, date, memo, "userId", "createdAt", "updatedAt") VALUES ${placeholders.join(', ')} RETURNING *`,
            values,
          );
          return res.status(201).json({ inserted: rows.length, skipped, total: body.events.length, results: rows });
        } catch (bulkErr: any) {
          // multi-row 실패 시 개별 fallback
          let inserted = 0;
          const results: any[] = [];
          for (const ev of valid) {
            try {
              const { rows } = await db.query(
                'INSERT INTO schedules (title, date, memo, "userId", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *',
                [ev.title, ev.date, ev.memo || null, userId],
              );
              results.push(rows[0]);
              inserted++;
            } catch { /* skip */ }
          }
          return res.status(201).json({ inserted, skipped: skipped + (valid.length - inserted), total: body.events.length, results, fallback: true });
        }
      }

      // 단일 insert (하위호환)
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
