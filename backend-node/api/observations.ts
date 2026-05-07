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
CREATE TABLE IF NOT EXISTS observation_logs (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  student_id INTEGER,
  observed_date DATE NOT NULL,
  category VARCHAR(30),
  tags TEXT[] DEFAULT '{}',
  summary TEXT,
  content TEXT,
  emotion_hints TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_obs_user_date ON observation_logs(user_id, observed_date);
CREATE INDEX IF NOT EXISTS idx_obs_student_date ON observation_logs(student_id, observed_date);
`;

let initialized = false;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const db = getPool();
  if (!initialized) { await db.query(INIT_SQL); initialized = true; }

  try {
    if (req.method === 'GET') {
      const userId = req.query.userId as string;
      const month = req.query.month as string;
      const studentId = req.query.studentId as string;
      const date = req.query.date as string;

      if (!userId) return res.status(400).json({ message: 'userId 필요' });

      if (date) {
        const { rows } = await db.query('SELECT * FROM observation_logs WHERE user_id = $1 AND observed_date = $2 ORDER BY created_at', [userId, date]);
        return res.status(200).json(rows);
      }
      if (studentId) {
        const { rows } = await db.query('SELECT * FROM observation_logs WHERE user_id = $1 AND student_id = $2 ORDER BY observed_date DESC LIMIT 50', [userId, studentId]);
        return res.status(200).json(rows);
      }
      if (month) {
        const { rows } = await db.query('SELECT id, observed_date, category, tags, summary FROM observation_logs WHERE user_id = $1 AND observed_date BETWEEN $2 AND $3 ORDER BY observed_date', [userId, `${month}-01`, `${month}-31`]);
        return res.status(200).json(rows);
      }

      return res.status(400).json({ message: 'month, date, 또는 studentId 필요' });
    }

    if (req.method === 'POST') {
      let body: any = req.body;
      if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
      const { userId, studentId, observedDate, category, tags, summary, content, emotionHints } = body;
      if (!userId || !observedDate) return res.status(400).json({ message: 'userId, observedDate 필요' });

      const { rows } = await db.query(`
        INSERT INTO observation_logs (user_id, student_id, observed_date, category, tags, summary, content, emotion_hints)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
      `, [userId, studentId || null, observedDate, category || null, tags || [], summary || null, content || null, emotionHints || []]);

      return res.status(200).json(rows[0]);
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (err: any) {
    console.error('observations error:', err);
    return res.status(500).json({ message: '처리 중 오류' });
  }
}
