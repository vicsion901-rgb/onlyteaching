// @ts-ignore
import type { VercelRequest, VercelResponse } from '@vercel/node';
// @ts-ignore
import { Pool } from 'pg';
// @ts-ignore
import crypto from 'crypto';

let pool: Pool | null = null;
function getPool(): Pool {
  if (!pool) { pool = new Pool({ connectionString: process.env.POSTGRES_URL, ssl: { rejectUnauthorized: false }, max: 3, connectionTimeoutMillis: 5000 }); }
  return pool;
}

function cors(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin || '';
  const allowed = ['https://www.onlyteaching.kr', 'http://localhost:5173', 'http://localhost:5174'];
  if (allowed.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

function generateCode(): string {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const db = getPool();
    const { action } = req.query;

    if (req.method === 'POST' && action === 'create') {
      const { teacherId, className, activityType, durationMinutes } = req.body;
      if (!teacherId) return res.status(400).json({ error: 'teacherId required' });

      const joinCode = generateCode();
      const duration = Math.min(Math.max(durationMinutes || 60, 10), 480);
      const expiresAt = new Date(Date.now() + duration * 60000).toISOString();

      const { rows } = await db.query(
        `INSERT INTO qr_sessions (join_code, teacher_id, class_name, activity_type, expires_at)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [joinCode, teacherId, className || '', activityType || null, expiresAt]
      );
      return res.json({ data: rows[0] });
    }

    if (req.method === 'GET' && action === 'lookup') {
      const code = (req.query.code as string || '').toUpperCase().trim();
      if (!code) return res.status(400).json({ error: 'code required' });

      const { rows } = await db.query(
        `SELECT * FROM qr_sessions WHERE join_code = $1 AND is_active = TRUE AND expires_at > NOW()`,
        [code]
      );
      if (rows.length === 0) return res.status(404).json({ error: 'session_not_found', message: '만료되었거나 없는 코드입니다' });
      return res.json({ data: rows[0] });
    }

    if (req.method === 'POST' && action === 'join') {
      const { code, studentName, studentNumber } = req.body;
      if (!code) return res.status(400).json({ error: 'code required' });

      const { rows } = await db.query(
        `UPDATE qr_sessions SET joined_count = joined_count + 1 WHERE join_code = $1 AND is_active = TRUE AND expires_at > NOW() RETURNING *`,
        [(code || '').toUpperCase().trim()]
      );
      if (rows.length === 0) return res.status(404).json({ error: 'session_not_found' });
      return res.json({ data: rows[0], student: { name: studentName, number: studentNumber } });
    }

    if (req.method === 'POST' && action === 'submit') {
      const { code } = req.body;
      if (!code) return res.status(400).json({ error: 'code required' });

      const { rows } = await db.query(
        `UPDATE qr_sessions SET submitted_count = submitted_count + 1 WHERE join_code = $1 AND is_active = TRUE RETURNING submitted_count`,
        [(code || '').toUpperCase().trim()]
      );
      return res.json({ data: rows[0] || {} });
    }

    if (req.method === 'POST' && action === 'close') {
      const { teacherId, joinCode } = req.body;
      if (!teacherId || !joinCode) return res.status(400).json({ error: 'teacherId, joinCode required' });

      await db.query(
        `UPDATE qr_sessions SET is_active = FALSE WHERE join_code = $1 AND teacher_id = $2`,
        [joinCode, teacherId]
      );
      return res.json({ ok: true });
    }

    if (req.method === 'GET' && action === 'status') {
      const code = (req.query.code as string || '').toUpperCase().trim();
      if (!code) return res.status(400).json({ error: 'code required' });

      const { rows } = await db.query(
        `SELECT join_code, class_name, activity_type, activity_date, is_active, expires_at, joined_count, submitted_count FROM qr_sessions WHERE join_code = $1`,
        [code]
      );
      if (rows.length === 0) return res.status(404).json({ error: 'not found' });
      return res.json({ data: rows[0] });
    }

    if (req.method === 'GET' && action === 'my-sessions') {
      const teacherId = req.query.teacherId as string;
      if (!teacherId) return res.status(400).json({ error: 'teacherId required' });

      const { rows } = await db.query(
        `SELECT * FROM qr_sessions WHERE teacher_id = $1 AND activity_date = CURRENT_DATE ORDER BY created_at DESC LIMIT 10`,
        [teacherId]
      );
      return res.json({ data: rows });
    }

    return res.status(400).json({ error: 'unknown action' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
