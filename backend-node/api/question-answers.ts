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
CREATE TABLE IF NOT EXISTS question_answers (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  project_type VARCHAR(10) DEFAULT 'teacher',
  academic_year INTEGER DEFAULT 2026,
  question_id VARCHAR(20) NOT NULL,
  chapter_index SMALLINT NOT NULL,
  question_text TEXT,
  answer_text TEXT,
  selected_choices TEXT[] DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'unanswered',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, project_type, academic_year, question_id)
);
CREATE INDEX IF NOT EXISTS idx_qa_user_project ON question_answers(user_id, project_type, academic_year);
CREATE INDEX IF NOT EXISTS idx_qa_chapter ON question_answers(user_id, project_type, academic_year, chapter_index);
`;

let initialized = false;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const _origin = req.headers?.origin || ""; const _allowed = ["https://www.onlyteaching.kr","https://onlyteaching.kr","http://localhost:5173","http://localhost:3000"].includes(_origin) ? _origin : "https://www.onlyteaching.kr"; res.setHeader("Access-Control-Allow-Origin", _allowed); res.setHeader("Access-Control-Allow-Credentials", "true"); res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS"); res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization"); if (req.method === "OPTIONS") return res.status(204).end();

  const db = getPool();
  if (!initialized) { await db.query(INIT_SQL); initialized = true; }

  try {
    // GET — 조회
    if (req.method === 'GET') {
      const userId = req.query.userId as string;
      const projectType = (req.query.projectType as string) || 'teacher';
      const year = Number(req.query.year) || 2026;
      const chapter = req.query.chapter as string;

      if (!userId) return res.status(400).json({ message: 'userId 필요' });

      let sql = 'SELECT * FROM question_answers WHERE user_id = $1 AND project_type = $2 AND academic_year = $3';
      const vals: any[] = [userId, projectType, year];

      if (chapter !== undefined && chapter !== '') {
        sql += ' AND chapter_index = $4';
        vals.push(Number(chapter));
      }

      sql += ' ORDER BY chapter_index, question_id';
      const { rows } = await db.query(sql, vals);
      return res.status(200).json({ success: true, data: rows });
    }

    // POST — bulk upsert
    if (req.method === 'POST') {
      let body: any = req.body;
      if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }

      const { userId, projectType = 'teacher', academicYear = 2026, answers } = body;
      if (!userId || !Array.isArray(answers)) return res.status(400).json({ success: false, message: 'userId, answers[] 필요', errors: [{ reason: 'invalid_payload' }] });

      const results = [];
      const errors: any[] = [];
      for (const a of answers) {
        if (!a.questionId) { errors.push({ reason: 'invalid_payload', target: 'questionId missing' }); continue; }
        try {
          const { rows } = await db.query(`
            INSERT INTO question_answers (user_id, project_type, academic_year, question_id, chapter_index, question_text, answer_text, selected_choices, status, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
            ON CONFLICT (user_id, project_type, academic_year, question_id)
            DO UPDATE SET answer_text=$7, selected_choices=$8, status=$9, updated_at=NOW()
            RETURNING *
          `, [userId, projectType, academicYear, a.questionId, a.chapterIndex ?? 0, a.questionText || '', a.answerText || '', a.selectedChoices || [], a.answerText?.trim() ? 'completed' : 'unanswered']);
          results.push(rows[0]);
        } catch (e: any) {
          errors.push({ reason: e.code === '23505' ? 'duplicate' : 'db_error', target: a.questionId, detail: e.message?.slice(0, 80) });
        }
      }

      return res.status(200).json({ success: true, saved: results.length, skipped: errors.length, total: answers.length, data: results, errors });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (err: any) {
    console.error('question-answers error:', err);
    return res.status(500).json({ message: '처리 중 오류' });
  }
}
