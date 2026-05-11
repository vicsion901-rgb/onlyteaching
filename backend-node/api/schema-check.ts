// @ts-ignore
import type { VercelRequest, VercelResponse } from '@vercel/node';
// @ts-ignore
import { Pool } from 'pg';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers?.origin || '';
  const allowed = ['https://www.onlyteaching.kr','https://onlyteaching.kr','http://localhost:5173','http://localhost:3000'].includes(origin) ? origin : '*';
  res.setHeader('Access-Control-Allow-Origin', allowed);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (!process.env.POSTGRES_URL) {
    return res.status(200).json({ ok: false, alive: true, issues: ['env_missing'] });
  }

  const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000));

  try {
    const pool = new Pool({
      connectionString: process.env.POSTGRES_URL,
      ssl: { rejectUnauthorized: false },
      max: 1,
      connectionTimeoutMillis: 3000,
    });

    const result: any = await Promise.race([
      pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'"),
      timeout,
    ]);

    const tableSet = new Set(result.rows.map((r: any) => r.table_name));
    const required = [
      'users','schedules','student_records','care_classroom_records',
      'qr_sessions','activity_metadata','creative_collections',
      'student_activity_submissions','student_activity_summaries',
      'classes','activity_sessions','book_projects',
    ];
    const issues = required.filter(t => !tableSet.has(t)).map(t => `table_missing:${t}`);

    pool.end().catch(() => {});
    return res.status(200).json({ ok: issues.length === 0, alive: true, tables: result.rows.length, issues });
  } catch (err: any) {
    return res.status(200).json({ ok: false, alive: true, message: err.message || 'unknown', issues: ['runtime_error'] });
  }
}
