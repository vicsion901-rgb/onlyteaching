import { setCors } from './_cors';
// @ts-ignore
import type { VercelRequest, VercelResponse } from '@vercel/node';
// @ts-ignore
import { Pool } from 'pg';

let pool: Pool | null = null;
function getPool(): Pool {
  if (!pool) { pool = new Pool({ connectionString: process.env.POSTGRES_URL, ssl: { rejectUnauthorized: false }, max: 3, connectionTimeoutMillis: 5000 }); }
  return pool;
}

const INIT_SQL = `
CREATE TABLE IF NOT EXISTS schedule_reflections (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  schedule_id INTEGER NOT NULL,
  event_title VARCHAR(200),
  event_date DATE,
  emotion_tag VARCHAR(30),
  memo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, schedule_id)
);
CREATE INDEX IF NOT EXISTS idx_sched_ref_user ON schedule_reflections(user_id, event_date);
`;

let initialized = false;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (setCors(req, res)) return;

  const db = getPool();
  if (!initialized) { await db.query(INIT_SQL); initialized = true; }

  try {
    if (req.method === 'GET') {
      const userId = req.query.userId as string;
      if (!userId) return res.status(400).json({ message: 'userId 필요' });
      const month = req.query.month as string;

      let sql = 'SELECT * FROM schedule_reflections WHERE user_id = $1';
      const vals: any[] = [userId];
      if (month) {
        sql += ' AND event_date BETWEEN $2 AND $3';
        vals.push(`${month}-01`, `${month}-31`);
      }
      sql += ' ORDER BY event_date';
      const { rows } = await db.query(sql, vals);
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      let body: any = req.body;
      if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
      const { userId, scheduleId, eventTitle, eventDate, emotionTag, memo } = body;
      if (!userId || !scheduleId) return res.status(400).json({ message: 'userId, scheduleId 필요' });

      const { rows } = await db.query(`
        INSERT INTO schedule_reflections (user_id, schedule_id, event_title, event_date, emotion_tag, memo, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6, NOW())
        ON CONFLICT (user_id, schedule_id)
        DO UPDATE SET emotion_tag=$5, memo=$6, updated_at=NOW()
        RETURNING *
      `, [userId, scheduleId, eventTitle || '', eventDate || null, emotionTag || null, memo || null]);

      // digest 갱신
      if (eventDate) {
        try {
          await db.query(`
            INSERT INTO daily_digests (user_id, digest_date, source_type, summary_lines, tags, updated_at)
            VALUES ($1, $2, 'schedule', $3, $4, NOW())
            ON CONFLICT (user_id, digest_date, source_type)
            DO UPDATE SET summary_lines=$3, tags=$4, updated_at=NOW()
          `, [userId, eventDate, [eventTitle].filter(Boolean), [emotionTag].filter(Boolean)]);
        } catch {}
      }

      return res.status(200).json(rows[0]);
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (err: any) {
    console.error('schedule-reflections error:', err);
    return res.status(500).json({ message: '처리 중 오류' });
  }
}
