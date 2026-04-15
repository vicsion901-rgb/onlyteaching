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

  // userId 컬럼 없으면 추가 (마이그레이션)
  try {
    await db.query('ALTER TABLE student_records ADD COLUMN IF NOT EXISTS "userId" VARCHAR');
  } catch { /* 이미 있으면 무시 */ }

  // GET - 학생 목록 조회 (userId 격리)
  if (req.method === 'GET') {
    try {
      const userId = req.query.userId as string;
      let rows;
      if (userId) {
        ({ rows } = await db.query(
          'SELECT id, number, name, "residentNumber", "birthDate", address, sponsor, remark FROM student_records WHERE "userId" = $1 ORDER BY number ASC',
          [userId],
        ));
      } else {
        ({ rows } = await db.query(
          'SELECT id, number, name, "residentNumber", "birthDate", address, sponsor, remark FROM student_records ORDER BY number ASC',
        ));
      }
      return res.status(200).json(rows);
    } catch (err: any) {
      console.error('student-records list error:', err);
      return res.status(500).json({ message: '학생 목록 조회 실패' });
    }
  }

  // POST - 학생 일괄 저장 (userId 격리)
  if (req.method === 'POST') {
    try {
      let body: any = req.body;
      if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }

      const students = Array.isArray(body) ? body : (body.students || []);
      const userId = body.userId || '';

      // 본인 데이터만 삭제 (다른 교사 데이터 안 건드림)
      if (userId) {
        await db.query('DELETE FROM student_records WHERE "userId" = $1', [userId]);
      } else {
        await db.query('DELETE FROM student_records WHERE "userId" IS NULL');
      }

      if (!students.length) {
        return res.status(200).json([]);
      }

      // 배치 INSERT
      const values: any[] = [];
      const placeholders: string[] = [];
      let idx = 1;

      for (const s of students) {
        const name = String(s.name || '').trim();
        if (!name) continue;
        placeholders.push(`($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++})`);
        values.push(
          Number(s.number) || 0,
          name,
          String(s.residentNumber || '').trim(),
          String(s.birthDate || '').trim(),
          String(s.address || '').trim(),
          String(s.sponsor || '').trim(),
          String(s.remark || '').trim(),
          userId || null,
        );
      }

      if (placeholders.length === 0) {
        return res.status(200).json([]);
      }

      const { rows: saved } = await db.query(
        `INSERT INTO student_records (number, name, "residentNumber", "birthDate", address, sponsor, remark, "userId")
         VALUES ${placeholders.join(', ')}
         RETURNING *`,
        values,
      );

      return res.status(200).json(saved);
    } catch (err: any) {
      console.error('student-records bulk error:', err);
      return res.status(500).json({ message: '학생 저장 실패' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
