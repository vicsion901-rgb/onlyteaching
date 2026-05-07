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
      // bulk insert
      if (Array.isArray(body?.events)) {
        const userId = body.userId;
        if (!userId) return res.status(400).json({ success: false, message: '계정 정보가 누락되었습니다.', errors: [{ reason: 'missing_user' }] });

        const valid = body.events.filter((ev: any) => ev.title && ev.date);
        const skipped = body.events.length - valid.length;

        if (valid.length === 0) {
          return res.status(200).json({ success: true, inserted: 0, skipped, total: body.events.length, results: [], errors: [] });
        }

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
          return res.status(201).json({ success: true, inserted: rows.length, skipped, total: body.events.length, results: rows, errors: [] });
        } catch (bulkErr: any) {
          // schema 문제인지 확인
          if (bulkErr.message?.includes('"userId"') && bulkErr.message?.includes('does not exist')) {
            return res.status(500).json({ success: false, message: 'DB migration이 필요합니다. 관리자에게 문의해주세요.', errors: [{ reason: 'schema_not_migrated', detail: 'schedules.userId column missing' }] });
          }
          // 개별 fallback
          let inserted = 0;
          const results: any[] = [];
          const errors: any[] = [];
          for (const ev of valid) {
            try {
              const { rows } = await db.query(
                'INSERT INTO schedules (title, date, memo, "userId", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *',
                [ev.title, ev.date, ev.memo || null, userId],
              );
              results.push(rows[0]);
              inserted++;
            } catch (e: any) {
              const reason = e.code === '23505' ? 'duplicate' : e.code === '23502' ? 'null_field' : 'db_error';
              errors.push({ title: ev.title, date: ev.date, reason, detail: e.message?.slice(0, 80) });
            }
          }
          return res.status(201).json({ success: inserted > 0, inserted, skipped: skipped + errors.length, total: body.events.length, results, errors, fallback: true });
        }
      }

      // 단일 insert
      const { title, date, memo, userId: singleUserId } = body || {};
      if (!title || !date) return res.status(400).json({ success: false, message: 'title, date 필요', errors: [{ reason: 'invalid_payload' }] });
      try {
        const result = await db.query(
          'INSERT INTO schedules (title, date, memo, "userId", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *',
          [title, date, memo || null, singleUserId || null],
        );
        return res.status(201).json({ success: true, saved: 1, data: result.rows[0] });
      } catch (e: any) {
        if (e.message?.includes('"userId"') && e.message?.includes('does not exist')) {
          return res.status(500).json({ success: false, message: 'DB migration이 필요합니다.', errors: [{ reason: 'schema_not_migrated' }] });
        }
        return res.status(500).json({ success: false, message: '저장 실패', errors: [{ reason: 'db_error', detail: e.message?.slice(0, 80) }] });
      }
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
