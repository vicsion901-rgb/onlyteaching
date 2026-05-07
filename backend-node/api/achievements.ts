// @ts-ignore
import type { VercelRequest, VercelResponse } from '@vercel/node';
// @ts-ignore
import { Pool } from 'pg';

let pool: Pool | null = null;
function getPool(): Pool {
  if (!pool) { pool = new Pool({ connectionString: process.env.POSTGRES_URL, ssl: { rejectUnauthorized: false }, max: 3, connectionTimeoutMillis: 5000 }); }
  return pool;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const _origin = req.headers?.origin || ""; const _allowed = ["https://www.onlyteaching.kr","https://onlyteaching.kr","http://localhost:5173","http://localhost:3000"].includes(_origin) ? _origin : "https://www.onlyteaching.kr"; res.setHeader("Access-Control-Allow-Origin", _allowed); res.setHeader("Access-Control-Allow-Credentials", "true"); res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS"); res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization"); if (req.method === "OPTIONS") return res.status(204).end();

  try {
    const { subject, grade_group } = req.query;
    let query = 'SELECT * FROM achievement_standards';
    const vals: (string | number | boolean | null)[] = [];
    const conds: string[] = [];
    if (subject) { conds.push(`subject = $${vals.length + 1}`); vals.push(subject); }
    if (grade_group) { conds.push(`grade_group = $${vals.length + 1}`); vals.push(grade_group); }
    if (conds.length) query += ' WHERE ' + conds.join(' AND ');
    query += ' ORDER BY id ASC';
    const { rows } = await getPool().query(query, vals);
    return res.status(200).json(rows);
  } catch (err: any) {
    console.error('achievements error:', err);
    return res.status(500).json({ message: '조회 실패' });
  }
}
