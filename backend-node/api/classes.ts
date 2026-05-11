// @ts-ignore
import type { VercelRequest, VercelResponse } from '@vercel/node';
// @ts-ignore
import { Pool } from 'pg';

let pool: Pool | null = null;
function getPool(): Pool {
  if (!pool) { pool = new Pool({ connectionString: process.env.POSTGRES_URL, ssl: { rejectUnauthorized: false }, max: 3, connectionTimeoutMillis: 5000 }); }
  return pool;
}

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function cors(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin || '';
  const allowed = ['https://www.onlyteaching.kr', 'http://localhost:5173', 'http://localhost:5174'];
  if (allowed.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const db = getPool();
    const { action } = req.query;

    if (req.method === 'GET' && action === 'list') {
      const teacherId = req.query.teacherId as string;
      if (!teacherId) return res.status(400).json({ error: 'teacherId required' });
      const { rows } = await db.query(
        'SELECT * FROM classes WHERE teacher_id = $1 ORDER BY school_year DESC, class_name',
        [teacherId]
      );
      return res.json({ data: rows });
    }

    if (req.method === 'POST' && action === 'create') {
      const { teacherId, className, gradeLevel, schoolYear } = req.body;
      if (!teacherId || !className) return res.status(400).json({ error: 'teacherId, className required' });
      const id = genId();
      const { rows } = await db.query(
        `INSERT INTO classes (id, teacher_id, class_name, grade_level, school_year)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [id, teacherId, className, gradeLevel || null, schoolYear || new Date().getFullYear()]
      );
      return res.json({ data: rows[0] });
    }

    if (req.method === 'PATCH' && action === 'update') {
      const { id, className, gradeLevel, studentCount } = req.body;
      if (!id) return res.status(400).json({ error: 'id required' });
      const sets: string[] = [];
      const vals: any[] = [];
      let idx = 1;
      if (className !== undefined) { sets.push(`class_name = $${idx++}`); vals.push(className); }
      if (gradeLevel !== undefined) { sets.push(`grade_level = $${idx++}`); vals.push(gradeLevel); }
      if (studentCount !== undefined) { sets.push(`student_count = $${idx++}`); vals.push(studentCount); }
      sets.push('updated_at = NOW()');
      vals.push(id);
      const { rows } = await db.query(
        `UPDATE classes SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`, vals
      );
      return res.json({ data: rows[0] });
    }

    if (req.method === 'DELETE' && action === 'delete') {
      const id = (req.query.id || req.body?.id) as string;
      if (!id) return res.status(400).json({ error: 'id required' });
      await db.query('DELETE FROM classes WHERE id = $1', [id]);
      return res.json({ ok: true });
    }

    return res.status(400).json({ error: 'unknown action' });
  } catch (err: any) {
    cors(req, res);
    return res.status(500).json({ error: err.message });
  }
}
