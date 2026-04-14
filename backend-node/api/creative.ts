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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const db = getPool();
  let body: any = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }

  const studentId = req.query.studentId as string | undefined;
  const id = req.query.id as string | undefined;

  try {
    // GET /api/creative?studentId=123
    if (req.method === 'GET' && studentId) {
      const { rows } = await db.query(
        'SELECT * FROM creative_activities WHERE student_record_id = $1 AND deleted_at IS NULL ORDER BY academic_year DESC, start_date DESC, id DESC',
        [studentId],
      );
      return res.status(200).json(rows);
    }

    // POST /api/creative
    if (req.method === 'POST') {
      const { studentRecordId, academicYear, grade, semester, area, title, content, startDate, endDate, hours, location, organizer, role } = body;
      const result = await db.query(
        `INSERT INTO creative_activities (student_record_id, academic_year, grade, semester, area, title, content, start_date, end_date, hours, location, organizer, role, sentence_status, template_version, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'DRAFT',1,NOW(),NOW()) RETURNING *`,
        [studentRecordId, academicYear, grade, semester || null, area, title || null, content || null, startDate || null, endDate || null, hours || null, location || null, organizer || null, role || null],
      );
      return res.status(201).json(result.rows[0]);
    }

    // DELETE /api/creative?id=123
    if (req.method === 'DELETE' && id) {
      await db.query("UPDATE creative_activities SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL", [id]);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (err: any) {
    console.error('creative error:', err);
    return res.status(500).json({ message: '처리 중 오류' });
  }
}
