// @ts-ignore
import type { VercelRequest, VercelResponse } from '@vercel/node';
// @ts-ignore
import { Pool } from 'pg';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const _origin = req.headers?.origin || ""; const _allowed = ["https://www.onlyteaching.kr","https://onlyteaching.kr","http://localhost:5173","http://localhost:3000"].includes(_origin) ? _origin : "https://www.onlyteaching.kr"; res.setHeader("Access-Control-Allow-Origin", _allowed); res.setHeader("Access-Control-Allow-Credentials", "true"); res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS"); res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization"); if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ message: 'GET only' });

  if (!process.env.POSTGRES_URL) {
    return res.status(500).json({ ok: false, message: 'POSTGRES_URL not set', issues: ['env_missing'] });
  }

  let db: Pool;
  try {
    db = new Pool({ connectionString: process.env.POSTGRES_URL, ssl: { rejectUnauthorized: false }, max: 1, connectionTimeoutMillis: 3000, idleTimeoutMillis: 3000 });
    await db.query('SELECT 1');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'unknown';
    return res.status(500).json({ ok: false, message: `DB connection failed: ${msg}`, issues: ['db_unreachable'] });
  }

  const issues: string[] = [];

  try {
    // 한 번에 테이블 + 컬럼 + 인덱스 확인 (3쿼리로 축소)
    const { rows: tables } = await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
    const tableSet = new Set(tables.map((r: Record<string, string>) => r.table_name));

    const required = ['users','schedules','student_records','meals','care_classroom_records','observation_logs','question_answers','daily_digests'];
    for (const t of required) {
      if (!tableSet.has(t)) issues.push(`테이블 없음: ${t}`);
    }

    const { rows: cols } = await db.query("SELECT table_name, column_name FROM information_schema.columns WHERE table_schema='public'");
    const colSet = new Set(cols.map((r: Record<string, string>) => `${r.table_name}.${r.column_name}`));

    if (!colSet.has('schedules.userId')) issues.push('컬럼 없음: schedules.userId');
    if (!colSet.has('student_records.userId')) issues.push('컬럼 없음: student_records.userId');

    const { rows: idxs } = await db.query("SELECT indexname FROM pg_indexes WHERE schemaname='public'");
    const idxSet = new Set(idxs.map((r: Record<string, string>) => r.indexname));

    if (!idxSet.has('idx_schedules_user_date')) issues.push('인덱스 없음: idx_schedules_user_date');
    if (!idxSet.has('idx_care_user_date')) issues.push('인덱스 없음: idx_care_user_date');

    await db.end();
    return res.status(issues.length > 0 ? 200 : 200).json({ ok: issues.length === 0, issues });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'unknown';
    try { await db.end(); } catch {}
    return res.status(500).json({ ok: false, message: `Schema check failed: ${msg}`, issues });
  }
}
