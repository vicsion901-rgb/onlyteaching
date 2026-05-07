// @ts-ignore
import type { VercelRequest, VercelResponse } from '@vercel/node';
// @ts-ignore
import { Pool } from 'pg';

let pool: Pool | null = null;
function getPool(): Pool {
  if (!pool) { pool = new Pool({ connectionString: process.env.POSTGRES_URL, ssl: { rejectUnauthorized: false }, max: 1, connectionTimeoutMillis: 5000 }); }
  return pool;
}

const REQUIRED_COLUMNS = [
  { table: 'schedules', column: 'userId' },
  { table: 'schedules', column: 'title' },
  { table: 'schedules', column: 'date' },
  { table: 'student_records', column: 'userId' },
  { table: 'student_records', column: 'name' },
];

const REQUIRED_TABLES = [
  'users', 'schedules', 'student_records', 'meals',
  'care_classroom_records', 'observation_logs', 'question_answers',
  'daily_digests', 'digest_jobs',
  'autobiography_projects', 'autobiography_chapters', 'autobiography_chapter_entries',
  'schedule_reflections',
];

const REQUIRED_INDEXES = [
  'idx_schedules_user_date',
  'idx_care_user_date',
  'idx_obs_user_date',
  'idx_digest_user_date_source',
  'idx_qa_user_project',
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const _origin = req.headers?.origin || ""; const _allowed = ["https://www.onlyteaching.kr","https://onlyteaching.kr","http://localhost:5173","http://localhost:3000"].includes(_origin) ? _origin : "https://www.onlyteaching.kr"; res.setHeader("Access-Control-Allow-Origin", _allowed); res.setHeader("Access-Control-Allow-Credentials", "true"); res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS"); res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization"); if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ message: 'GET only' });

  const db = getPool();
  const results: any = { tables: {}, columns: {}, indexes: {}, ok: true, issues: [] };

  try {
    // 테이블 존재 확인
    for (const table of REQUIRED_TABLES) {
      try {
        const { rows } = await db.query("SELECT 1 FROM information_schema.tables WHERE table_name=$1", [table]);
        results.tables[table] = rows.length > 0 ? 'ok' : 'missing';
        if (rows.length === 0) { results.ok = false; results.issues.push(`테이블 없음: ${table}`); }
      } catch { results.tables[table] = 'error'; results.ok = false; }
    }

    // 필수 컬럼 확인
    for (const { table, column } of REQUIRED_COLUMNS) {
      const key = `${table}.${column}`;
      try {
        const { rows } = await db.query("SELECT 1 FROM information_schema.columns WHERE table_name=$1 AND column_name=$2", [table, column]);
        results.columns[key] = rows.length > 0 ? 'ok' : 'missing';
        if (rows.length === 0) { results.ok = false; results.issues.push(`컬럼 없음: ${key}`); }
      } catch { results.columns[key] = 'error'; results.ok = false; }
    }

    // 인덱스 확인
    for (const idx of REQUIRED_INDEXES) {
      try {
        const { rows } = await db.query("SELECT 1 FROM pg_indexes WHERE indexname=$1", [idx]);
        results.indexes[idx] = rows.length > 0 ? 'ok' : 'missing';
        if (rows.length === 0) { results.ok = false; results.issues.push(`인덱스 없음: ${idx}`); }
      } catch { results.indexes[idx] = 'error'; results.ok = false; }
    }

    return res.status(results.ok ? 200 : 500).json(results);
  } catch (err: any) {
    return res.status(500).json({ ok: false, message: err.message });
  }
}
