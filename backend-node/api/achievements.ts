// @ts-ignore
import type { VercelRequest, VercelResponse } from '@vercel/node';
// @ts-ignore
import { Pool } from 'pg';
import { ACHIEVEMENT_SEED } from './_achievement_seed';

let pool: Pool | null = null;
function getPool(): Pool {
  if (!pool) { pool = new Pool({ connectionString: process.env.POSTGRES_URL, ssl: { rejectUnauthorized: false }, max: 3, connectionTimeoutMillis: 5000 }); }
  return pool;
}

const INIT_SQL = `
CREATE TABLE IF NOT EXISTS achievement_standards (
  id SERIAL PRIMARY KEY,
  subject TEXT NOT NULL,
  grade_group TEXT NOT NULL,
  area TEXT NOT NULL,
  code TEXT UNIQUE,
  standard TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ach_subject ON achievement_standards(subject, grade_group, area);
`;

let initialized = false;
async function ensureTableAndSeed(db: Pool) {
  if (initialized) return;
  await db.query(INIT_SQL);
  const { rows } = await db.query('SELECT COUNT(*)::int AS cnt FROM achievement_standards');
  if (rows[0].cnt === 0 && ACHIEVEMENT_SEED.length > 0) {
    // bulk insert with ON CONFLICT DO NOTHING (code UNIQUE)
    const placeholders: string[] = [];
    const values: (string | number)[] = [];
    ACHIEVEMENT_SEED.forEach((r, i) => {
      const base = i * 5;
      placeholders.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`);
      values.push(r.subject, r.grade_group, r.area, r.code, r.standard);
    });
    await db.query(
      `INSERT INTO achievement_standards (subject, grade_group, area, code, standard) VALUES ${placeholders.join(', ')} ON CONFLICT (code) DO NOTHING`,
      values,
    );
  }
  initialized = true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const _origin = req.headers?.origin || ""; const _allowed = ["https://www.onlyteaching.kr","https://onlyteaching.kr","http://localhost:5173","http://localhost:3000"].includes(_origin) ? _origin : "https://www.onlyteaching.kr"; res.setHeader("Access-Control-Allow-Origin", _allowed); res.setHeader("Access-Control-Allow-Credentials", "true"); res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS"); res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization"); if (req.method === "OPTIONS") return res.status(204).end();

  const db = getPool();
  try {
    await ensureTableAndSeed(db);
  } catch (err: any) {
    console.error('achievements ensure failed:', err);
  }

  try {
    const { subject, grade_group, area } = req.query as { subject?: string; grade_group?: string; area?: string };
    let query = 'SELECT id, subject, grade_group, area, code, standard FROM achievement_standards';
    const vals: (string | number | boolean | null)[] = [];
    const conds: string[] = [];
    if (subject) { conds.push(`subject = $${vals.length + 1}`); vals.push(subject); }
    if (grade_group) { conds.push(`grade_group = $${vals.length + 1}`); vals.push(grade_group); }
    if (area) { conds.push(`area = $${vals.length + 1}`); vals.push(area); }
    if (conds.length) query += ' WHERE ' + conds.join(' AND ');
    query += ' ORDER BY subject, grade_group, area, code ASC';
    const { rows } = await db.query(query, vals);

    // meta는 전체 데이터셋에서 derive해서 함께 반환
    const metaRes = await db.query('SELECT DISTINCT subject, grade_group, area FROM achievement_standards');
    const subjects = [...new Set(metaRes.rows.map((r: any) => r.subject))].sort();
    const grade_groups = [...new Set(metaRes.rows.map((r: any) => String(r.grade_group)))].sort();
    const areas = [...new Set(metaRes.rows.map((r: any) => r.area))].sort();

    return res.status(200).json({
      items: rows,
      meta: { subjects, grade_groups, areas },
    });
  } catch (err: any) {
    console.error('achievements error:', err);
    return res.status(500).json({ message: '조회 실패' });
  }
}
