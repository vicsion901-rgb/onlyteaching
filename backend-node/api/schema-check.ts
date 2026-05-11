// @ts-ignore
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  const origin = req.headers?.origin || '';
  const allowed = ['https://www.onlyteaching.kr','https://onlyteaching.kr','http://localhost:5173','http://localhost:3000'].includes(origin) ? origin : '*';
  res.setHeader('Access-Control-Allow-Origin', allowed);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  // 즉시 응답 보장 — DB 전에 먼저 체크
  if (!process.env.POSTGRES_URL) {
    return res.status(200).json({ ok: false, alive: true, message: 'POSTGRES_URL not configured', issues: ['env_missing'] });
  }

  try {
    // pg를 동적 import (번들 문제 회피)
    const { Pool } = await import('pg');
    const pool = new Pool({
      connectionString: process.env.POSTGRES_URL,
      ssl: { rejectUnauthorized: false },
      max: 1,
      connectionTimeoutMillis: 3000,
      idleTimeoutMillis: 2000,
    });

    try {
      await pool.query('SELECT 1');
    } catch (connErr) {
      await pool.end().catch(() => {});
      const msg = connErr instanceof Error ? connErr.message : 'unknown';
      return res.status(200).json({ ok: false, alive: true, message: `DB connection failed: ${msg}`, issues: ['db_unreachable'] });
    }

    const issues: string[] = [];

    // 3 쿼리로 전체 확인
    const { rows: tables } = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
    const tableSet = new Set(tables.map((r: { table_name: string }) => r.table_name));
    const requiredTables = [
      'users','schedules','student_records','care_classroom_records',
      'qr_sessions','activity_metadata','creative_collections',
      'student_activity_submissions','student_activity_summaries',
      'classes','activity_sessions','book_projects',
    ];
    for (const t of requiredTables) {
      if (!tableSet.has(t)) issues.push(`table_missing:${t}`);
    }

    const { rows: cols } = await pool.query("SELECT table_name||'.'||column_name as col FROM information_schema.columns WHERE table_schema='public'");
    const colSet = new Set(cols.map((r: { col: string }) => r.col));
    if (!colSet.has('schedules.userId')) issues.push('column_missing:schedules.userId');

    const { rows: idxs } = await pool.query("SELECT indexname FROM pg_indexes WHERE schemaname='public'");
    const idxSet = new Set(idxs.map((r: { indexname: string }) => r.indexname));
    if (!idxSet.has('idx_schedules_user_date')) issues.push('index_missing:idx_schedules_user_date');

    await pool.end().catch(() => {});
    return res.status(200).json({ ok: issues.length === 0, alive: true, issues });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error';
    return res.status(200).json({ ok: false, alive: true, message: msg, issues: ['runtime_error'] });
  }
}
