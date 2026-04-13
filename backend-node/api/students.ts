// @ts-ignore
import type { VercelRequest, VercelResponse } from '@vercel/node';
// @ts-ignore
import { Pool } from 'pg';

let pool: Pool | null = null;
function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.POSTGRES_URL,
      ssl: { rejectUnauthorized: false },
      max: 3,
      connectionTimeoutMillis: 5000,
    });
  }
  return pool;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const db = getPool();

  // GET - 학생 목록 조회
  if (req.method === 'GET') {
    try {
      const { rows } = await db.query(
        'SELECT id, number, name, "residentNumber", "birthDate", address, sponsor, remark FROM student_records ORDER BY number ASC',
      );
      return res.status(200).json(rows);
    } catch (err: any) {
      console.error('student-records list error:', err);
      return res.status(500).json({ message: '학생 목록 조회 실패' });
    }
  }

  // POST - 학생 일괄 저장 (upsert)
  if (req.method === 'POST') {
    try {
      let body: any = req.body;
      if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = []; } }
      const students = Array.isArray(body) ? body : [];

      // 기존 데이터 전체 삭제 후 재삽입 (replace 모드)
      await db.query('DELETE FROM student_records');

      if (!students.length) {
        return res.status(200).json([]);
      }

      const saved: any[] = [];
      for (const s of students) {
        const num = Number(s.number) || 0;
        const name = String(s.name || '').trim();
        if (!name) continue;

        const result = await db.query(
          `INSERT INTO student_records (number, name, "residentNumber", "birthDate", address, sponsor, remark)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [
            num,
            name,
            String(s.residentNumber || '').trim(),
            String(s.birthDate || '').trim(),
            String(s.address || '').trim(),
            String(s.sponsor || '').trim(),
            String(s.remark || '').trim(),
          ],
        );
        saved.push(result.rows[0]);
      }

      return res.status(200).json(saved);
    } catch (err: any) {
      console.error('student-records bulk error:', err);
      return res.status(500).json({ message: '학생 저장 실패' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
