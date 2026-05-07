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
CREATE TABLE IF NOT EXISTS care_classroom_records (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  record_date DATE NOT NULL,
  mood VARCHAR(30),
  custom_mood TEXT,
  positive_emotion_score SMALLINT,
  negative_emotion_score SMALLINT,
  emotion_reason_tags TEXT[] DEFAULT '{}',
  todo_items JSONB DEFAULT '[]',
  key_scene TEXT,
  support_source VARCHAR(30),
  support_memo TEXT,
  free_memo TEXT,
  linked_student_ids INTEGER[] DEFAULT '{}',
  linked_context_summary JSONB,
  computed_emotion_label VARCHAR(50),
  computed_emotion_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, record_date)
);
CREATE INDEX IF NOT EXISTS idx_care_user_date ON care_classroom_records(user_id, record_date);
`;

let initialized = false;
async function ensureTable(db: Pool) {
  if (initialized) return;
  await db.query(INIT_SQL);
  initialized = true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const db = getPool();
  await ensureTable(db);

  try {
    // GET /api/care-classroom?userId=X&month=2026-05
    if (req.method === 'GET') {
      const userId = req.query.userId as string;
      const month = req.query.month as string;
      const date = req.query.date as string;

      if (!userId) return res.status(400).json({ message: 'userId 필요' });

      if (date) {
        const { rows } = await db.query(
          'SELECT * FROM care_classroom_records WHERE user_id = $1 AND record_date = $2',
          [userId, date],
        );
        return res.status(200).json(rows[0] || null);
      }

      if (month) {
        const startDate = `${month}-01`;
        const endDate = `${month}-31`;
        const { rows } = await db.query(
          'SELECT * FROM care_classroom_records WHERE user_id = $1 AND record_date BETWEEN $2 AND $3 ORDER BY record_date',
          [userId, startDate, endDate],
        );
        return res.status(200).json(rows);
      }

      return res.status(400).json({ message: 'month 또는 date 필요' });
    }

    // POST /api/care-classroom — upsert
    if (req.method === 'POST') {
      let body: any = req.body;
      if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }

      const { userId, recordDate, mood, customMood, positiveEmotionScore, negativeEmotionScore, emotionReasonTags, todoItems, keyScene, supportSource, supportMemo, freeMemo, linkedStudentIds, linkedContextSummary, computedEmotionLabel, computedEmotionSummary } = body;

      if (!userId || !recordDate) return res.status(400).json({ message: 'userId, recordDate 필요' });

      const { rows } = await db.query(`
        INSERT INTO care_classroom_records (user_id, record_date, mood, custom_mood, positive_emotion_score, negative_emotion_score, emotion_reason_tags, todo_items, key_scene, support_source, support_memo, free_memo, linked_student_ids, linked_context_summary, computed_emotion_label, computed_emotion_summary, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())
        ON CONFLICT (user_id, record_date)
        DO UPDATE SET mood=$3, custom_mood=$4, positive_emotion_score=$5, negative_emotion_score=$6, emotion_reason_tags=$7, todo_items=$8, key_scene=$9, support_source=$10, support_memo=$11, free_memo=$12, linked_student_ids=$13, linked_context_summary=$14, computed_emotion_label=$15, computed_emotion_summary=$16, updated_at=NOW()
        RETURNING *
      `, [userId, recordDate, mood || null, customMood || null, positiveEmotionScore ?? null, negativeEmotionScore ?? null, emotionReasonTags || [], JSON.stringify(todoItems || []), keyScene || null, supportSource || null, supportMemo || null, freeMemo || null, linkedStudentIds || [], linkedContextSummary ? JSON.stringify(linkedContextSummary) : null, computedEmotionLabel || null, computedEmotionSummary || null]);

      // Upsert daily digest
      try {
        const tags = emotionReasonTags || [];
        const summary = [computedEmotionLabel, keyScene?.slice(0, 50)].filter(Boolean);
        await db.query(`
          INSERT INTO daily_digests (user_id, digest_date, source_type, summary_lines, tags, emotion_hints, related_chapter_hints, updated_at)
          VALUES ($1, $2, 'care', $3, $4, $5, $6, NOW())
          ON CONFLICT (user_id, digest_date, source_type)
          DO UPDATE SET summary_lines=$3, tags=$4, emotion_hints=$5, related_chapter_hints=$6, updated_at=NOW()
        `, [userId, recordDate, summary, tags, [computedEmotionLabel].filter(Boolean), []]);
      } catch { /* digest table might not exist yet */ }

      return res.status(200).json(rows[0]);
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (err: any) {
    console.error('care-classroom error:', err);
    return res.status(500).json({ message: '처리 중 오류' });
  }
}
