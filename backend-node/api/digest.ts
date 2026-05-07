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
CREATE TABLE IF NOT EXISTS daily_digests (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  digest_date DATE NOT NULL,
  source_type VARCHAR(30) NOT NULL,
  summary_lines TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  emotion_hints TEXT[] DEFAULT '{}',
  related_chapter_hints SMALLINT[] DEFAULT '{}',
  metadata JSONB,
  digest_status VARCHAR(15) DEFAULT 'fresh',
  source_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, digest_date, source_type)
);
CREATE INDEX IF NOT EXISTS idx_digest_user_date_source ON daily_digests(user_id, digest_date, source_type);
`;

let initialized = false;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const _origin = req.headers?.origin || ""; const _allowed = ["https://www.onlyteaching.kr","https://onlyteaching.kr","http://localhost:5173","http://localhost:3000"].includes(_origin) ? _origin : "https://www.onlyteaching.kr"; res.setHeader("Access-Control-Allow-Origin", _allowed); res.setHeader("Access-Control-Allow-Credentials", "true"); res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS"); res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization"); if (req.method === "OPTIONS") return res.status(204).end();

  const db = getPool();
  if (!initialized) { await db.query(INIT_SQL); initialized = true; }

  try {
    // GET /api/digest?userId=X&date=2026-05-05&sources=schedule,care
    if (req.method === 'GET') {
      const userId = req.query.userId as string;
      const date = req.query.date as string;
      const sources = (req.query.sources as string || '').split(',').filter(Boolean);

      if (!userId || !date) return res.status(400).json({ message: 'userId, date 필요' });

      let sql = 'SELECT * FROM daily_digests WHERE user_id = $1 AND digest_date = $2';
      const vals: (string | number | boolean | null | string[])[] = [userId, date];

      if (sources.length > 0) {
        sql += ' AND source_type = ANY($3)';
        vals.push(sources);
      }

      const { rows } = await db.query(sql, vals);

      const result: Record<string, any> = {};
      for (const row of rows) {
        result[row.source_type] = {
          summaryLines: row.summary_lines,
          tags: row.tags,
          emotionHints: row.emotion_hints,
          relatedChapterHints: row.related_chapter_hints,
          metadata: row.metadata,
        };
      }

      return res.status(200).json({ success: true, date, data: result });
    }

    // POST /api/digest — upsert digest
    if (req.method === 'POST') {
      let body: any = req.body;
      if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }

      const { userId, date, sourceType, summaryLines, tags, emotionHints, relatedChapterHints, metadata } = body;
      if (!userId || !date || !sourceType) return res.status(400).json({ message: 'userId, date, sourceType 필요' });

      const { rows } = await db.query(`
        INSERT INTO daily_digests (user_id, digest_date, source_type, summary_lines, tags, emotion_hints, related_chapter_hints, metadata, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        ON CONFLICT (user_id, digest_date, source_type)
        DO UPDATE SET summary_lines=$4, tags=$5, emotion_hints=$6, related_chapter_hints=$7, metadata=$8, updated_at=NOW()
        RETURNING *
      `, [userId, date, sourceType, summaryLines || [], tags || [], emotionHints || [], relatedChapterHints || [], metadata ? JSON.stringify(metadata) : null]);

      return res.status(200).json(rows[0]);
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (err: any) {
    console.error('digest error:', err);
    return res.status(500).json({ message: '처리 중 오류' });
  }
}
