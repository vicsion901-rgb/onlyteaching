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
CREATE TABLE IF NOT EXISTS activity_metadata (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  activity_key VARCHAR NOT NULL,
  source_type VARCHAR(20) NOT NULL,
  is_favorited BOOLEAN DEFAULT FALSE,
  memo TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, activity_key)
);
CREATE INDEX IF NOT EXISTS idx_actmeta_user ON activity_metadata(user_id);
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

    if (req.method === 'GET' && action === 'list') {
      const userId = req.query.userId as string;
      if (!userId) return res.status(400).json({ error: 'userId required' });

      const { rows } = await db.query(
        'SELECT activity_key, source_type, is_favorited, memo, updated_at FROM activity_metadata WHERE user_id = $1',
        [userId]
      );
      return res.json({ data: rows });
    }

    if (req.method === 'POST' && action === 'upsert') {
      const { userId, activityKey, sourceType, isFavorited, memo } = req.body;
      if (!userId || !activityKey) return res.status(400).json({ error: 'userId, activityKey required' });

      const { rows } = await db.query(
        `INSERT INTO activity_metadata (user_id, activity_key, source_type, is_favorited, memo, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (user_id, activity_key)
         DO UPDATE SET is_favorited = COALESCE($4, activity_metadata.is_favorited),
                       memo = COALESCE($5, activity_metadata.memo),
                       updated_at = NOW()
         RETURNING *`,
        [userId, activityKey, sourceType || 'morning', isFavorited ?? false, memo ?? '']
      );
      return res.json({ data: rows[0] });
    }

    if (req.method === 'POST' && action === 'toggle-favorite') {
      const { userId, activityKey, sourceType } = req.body;
      if (!userId || !activityKey) return res.status(400).json({ error: 'userId, activityKey required' });

      const { rows } = await db.query(
        `INSERT INTO activity_metadata (user_id, activity_key, source_type, is_favorited, updated_at)
         VALUES ($1, $2, $3, TRUE, NOW())
         ON CONFLICT (user_id, activity_key)
         DO UPDATE SET is_favorited = NOT activity_metadata.is_favorited, updated_at = NOW()
         RETURNING *`,
        [userId, activityKey, sourceType || 'morning']
      );
      return res.json({ data: rows[0] });
    }

    return res.status(400).json({ error: 'unknown action' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
