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

type EnsureReport = {
  tableCreated: boolean;
  rowCountBefore: number;
  rowCountAfter: number;
  inserted: number;
  errors: string[];
};

async function ensureTableAndSeed(db: Pool): Promise<EnsureReport> {
  const report: EnsureReport = { tableCreated: false, rowCountBefore: -1, rowCountAfter: -1, inserted: 0, errors: [] };

  try {
    await db.query(INIT_SQL);
    report.tableCreated = true;
  } catch (err: any) {
    report.errors.push(`INIT_SQL: ${String(err?.message || err).slice(0, 200)}`);
    return report;
  }

  try {
    const before = await db.query('SELECT COUNT(*)::int AS cnt FROM achievement_standards');
    report.rowCountBefore = before.rows[0].cnt;
  } catch (err: any) {
    report.errors.push(`COUNT before: ${String(err?.message || err).slice(0, 200)}`);
  }

  if (report.rowCountBefore === 0 && ACHIEVEMENT_SEED.length > 0) {
    try {
      const placeholders: string[] = [];
      const values: (string | number)[] = [];
      ACHIEVEMENT_SEED.forEach((r, i) => {
        const base = i * 5;
        placeholders.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`);
        values.push(r.subject, r.grade_group, r.area, r.code, r.standard);
      });
      const insertRes = await db.query(
        `INSERT INTO achievement_standards (subject, grade_group, area, code, standard) VALUES ${placeholders.join(', ')} ON CONFLICT (code) DO NOTHING`,
        values,
      );
      report.inserted = insertRes.rowCount ?? 0;
    } catch (err: any) {
      report.errors.push(`INSERT seed: ${String(err?.message || err).slice(0, 200)}`);
    }
  }

  try {
    const after = await db.query('SELECT COUNT(*)::int AS cnt FROM achievement_standards');
    report.rowCountAfter = after.rows[0].cnt;
  } catch (err: any) {
    report.errors.push(`COUNT after: ${String(err?.message || err).slice(0, 200)}`);
  }

  return report;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const _origin = req.headers?.origin || ""; const _allowed = ["https://www.onlyteaching.kr","https://onlyteaching.kr","http://localhost:5173","http://localhost:3000"].includes(_origin) ? _origin : "https://www.onlyteaching.kr"; res.setHeader("Access-Control-Allow-Origin", _allowed); res.setHeader("Access-Control-Allow-Credentials", "true"); res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS"); res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization"); if (req.method === "OPTIONS") return res.status(204).end();

  const isDebug = req.query?.debug === '1';

  // POSTGRES_URL 환경변수 확인
  if (!process.env.POSTGRES_URL) {
    return res.status(500).json({
      message: 'POSTGRES_URL 환경변수가 설정되지 않았어요',
      stage: 'env',
      hasPostgresUrl: false,
    });
  }

  let db: Pool;
  try {
    db = getPool();
  } catch (err: any) {
    return res.status(500).json({ message: 'DB pool 초기화 실패', stage: 'pool', error: String(err?.message || err).slice(0, 200) });
  }

  // 매 호출 시 ensureTableAndSeed (멱등 — IF NOT EXISTS + ON CONFLICT)
  const ensure = await ensureTableAndSeed(db);

  if (isDebug) {
    let sampleFirst: any = null;
    try {
      const s = await db.query('SELECT subject, grade_group, area, code, standard FROM achievement_standards LIMIT 2');
      sampleFirst = s.rows;
    } catch (err: any) {
      ensure.errors.push(`sample: ${String(err?.message || err).slice(0, 200)}`);
    }
    return res.status(200).json({
      debug: true,
      seedSize: ACHIEVEMENT_SEED.length,
      ensure,
      sampleFirst,
    });
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
    return res.status(500).json({
      message: '조회 실패',
      stage: 'query',
      error: String(err?.message || err).slice(0, 200),
      ensure,
    });
  }
}
