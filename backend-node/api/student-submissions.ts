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

const INIT_SQL = `
CREATE TABLE IF NOT EXISTS student_activity_submissions (
  id VARCHAR(20) PRIMARY KEY,
  session_id VARCHAR(20),
  teacher_id VARCHAR NOT NULL,
  class_id VARCHAR(20),
  student_id INTEGER,
  student_name VARCHAR(50),
  activity_type VARCHAR(30) NOT NULL,
  source_type VARCHAR(20) NOT NULL DEFAULT 'morning',
  title VARCHAR(200),
  content TEXT,
  original_text TEXT,
  feeling TEXT,
  accuracy SMALLINT,
  metadata JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'submitted',
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sub_teacher_date ON student_activity_submissions(teacher_id, submitted_at);
CREATE INDEX IF NOT EXISTS idx_sub_student ON student_activity_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_sub_session ON student_activity_submissions(session_id);
CREATE INDEX IF NOT EXISTS idx_sub_type ON student_activity_submissions(activity_type);

CREATE TABLE IF NOT EXISTS student_activity_summaries (
  id SERIAL PRIMARY KEY,
  teacher_id VARCHAR NOT NULL,
  class_id VARCHAR(20),
  student_id INTEGER,
  summary_date DATE NOT NULL,
  total_count INTEGER DEFAULT 0,
  submitted_count INTEGER DEFAULT 0,
  morning_count INTEGER DEFAULT 0,
  manuscript_count INTEGER DEFAULT 0,
  avg_accuracy SMALLINT,
  type_distribution JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, student_id, summary_date)
);
CREATE INDEX IF NOT EXISTS idx_summary_teacher_date ON student_activity_summaries(teacher_id, summary_date);
`;

let initialized = false;
async function ensureTable(db: Pool) {
  if (initialized) return;
  try { await db.query(INIT_SQL); initialized = true; } catch {}
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
    await ensureTable(db);
    const { action } = req.query;

    if (req.method === 'POST' && action === 'submit') {
      const { teacherId, classId, sessionId, studentId, studentName, activityType, sourceType, title, content, originalText, feeling, accuracy, metadata, status } = req.body;
      if (!teacherId || !activityType) return res.status(400).json({ error: 'teacherId, activityType required' });

      const id = genId();
      const { rows } = await db.query(
        `INSERT INTO student_activity_submissions
         (id, session_id, teacher_id, class_id, student_id, student_name, activity_type, source_type, title, content, original_text, feeling, accuracy, metadata, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
        [id, sessionId || null, teacherId, classId || null, studentId || null, studentName || null,
         activityType, sourceType || 'morning', title || '', content || '', originalText || null,
         feeling || null, accuracy ?? null, JSON.stringify(metadata || {}), status || 'submitted']
      );

      if (sessionId) {
        await db.query('UPDATE activity_sessions SET submitted_count = submitted_count + 1 WHERE id = $1', [sessionId]).catch(() => {});
      }

      // summary 자동 갱신
      const src = sourceType || 'morning';
      await db.query(`
        INSERT INTO student_activity_summaries (teacher_id, class_id, student_id, summary_date, total_count, submitted_count, morning_count, manuscript_count)
        VALUES ($1, $2, $3, CURRENT_DATE, 1, 1,
          CASE WHEN $4 = 'morning' THEN 1 ELSE 0 END,
          CASE WHEN $4 = 'manuscript' THEN 1 ELSE 0 END)
        ON CONFLICT (teacher_id, student_id, summary_date)
        DO UPDATE SET
          total_count = student_activity_summaries.total_count + 1,
          submitted_count = student_activity_summaries.submitted_count + 1,
          morning_count = student_activity_summaries.morning_count + CASE WHEN $4 = 'morning' THEN 1 ELSE 0 END,
          manuscript_count = student_activity_summaries.manuscript_count + CASE WHEN $4 = 'manuscript' THEN 1 ELSE 0 END,
          updated_at = NOW()
      `, [teacherId, classId || null, studentId || null, src]).catch(() => {});

      return res.json({ data: rows[0] });
    }

    if (req.method === 'GET' && action === 'list') {
      const { teacherId, classId, studentId, sessionId, sourceType, limit: lim } = req.query as Record<string, string>;
      if (!teacherId && !studentId && !sessionId) return res.status(400).json({ error: 'teacherId, studentId, or sessionId required' });

      const conditions: string[] = [];
      const vals: any[] = [];
      let idx = 1;
      if (teacherId) { conditions.push(`teacher_id = $${idx++}`); vals.push(teacherId); }
      if (classId) { conditions.push(`class_id = $${idx++}`); vals.push(classId); }
      if (studentId) { conditions.push(`student_id = $${idx++}`); vals.push(Number(studentId)); }
      if (sessionId) { conditions.push(`session_id = $${idx++}`); vals.push(sessionId); }
      if (sourceType) { conditions.push(`source_type = $${idx++}`); vals.push(sourceType); }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const limitClause = lim ? `LIMIT ${Math.min(Number(lim), 200)}` : 'LIMIT 100';

      const { rows } = await db.query(
        `SELECT * FROM student_activity_submissions ${where} ORDER BY submitted_at DESC ${limitClause}`,
        vals
      );
      return res.json({ data: rows });
    }

    if (req.method === 'GET' && action === 'get') {
      const id = req.query.id as string;
      if (!id) return res.status(400).json({ error: 'id required' });
      const { rows } = await db.query('SELECT * FROM student_activity_submissions WHERE id = $1', [id]);
      if (rows.length === 0) return res.status(404).json({ error: 'not found' });
      return res.json({ data: rows[0] });
    }

    if (req.method === 'PATCH' && action === 'update') {
      const { id, title, content, feeling, status, metadata } = req.body;
      if (!id) return res.status(400).json({ error: 'id required' });
      const sets: string[] = [];
      const vals: any[] = [];
      let idx = 1;
      if (title !== undefined) { sets.push(`title = $${idx++}`); vals.push(title); }
      if (content !== undefined) { sets.push(`content = $${idx++}`); vals.push(content); }
      if (feeling !== undefined) { sets.push(`feeling = $${idx++}`); vals.push(feeling); }
      if (status !== undefined) { sets.push(`status = $${idx++}`); vals.push(status); }
      if (metadata !== undefined) { sets.push(`metadata = $${idx++}`); vals.push(JSON.stringify(metadata)); }
      sets.push('updated_at = NOW()');
      vals.push(id);
      const { rows } = await db.query(
        `UPDATE student_activity_submissions SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`, vals
      );
      if (rows.length === 0) return res.status(404).json({ error: 'not found' });
      return res.json({ data: rows[0] });
    }

    if (req.method === 'GET' && action === 'summary') {
      const { teacherId, classId, studentId } = req.query as Record<string, string>;
      if (!teacherId && !studentId) return res.status(400).json({ error: 'teacherId or studentId required' });

      const conditions: string[] = [];
      const vals: any[] = [];
      let idx = 1;
      if (teacherId) { conditions.push(`teacher_id = $${idx++}`); vals.push(teacherId); }
      if (classId) { conditions.push(`class_id = $${idx++}`); vals.push(classId); }
      if (studentId) { conditions.push(`student_id = $${idx++}`); vals.push(Number(studentId)); }
      const where = conditions.join(' AND ');

      const { rows } = await db.query(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'submitted') as submitted,
          COUNT(*) FILTER (WHERE source_type = 'morning') as morning_count,
          COUNT(*) FILTER (WHERE source_type = 'manuscript') as manuscript_count,
          ROUND(AVG(accuracy) FILTER (WHERE accuracy IS NOT NULL)) as avg_accuracy,
          jsonb_object_agg(COALESCE(activity_type,'other'), type_count) as type_distribution
        FROM (
          SELECT activity_type, COUNT(*) as type_count, status, source_type, accuracy
          FROM student_activity_submissions WHERE ${where}
          GROUP BY activity_type, status, source_type, accuracy
        ) sub
      `, vals).catch(() => ({ rows: [{}] }));

      return res.json({ data: rows[0] || {} });
    }

    return res.status(400).json({ error: 'unknown action' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
