// @ts-ignore - @vercel/node provided at build time
import type { VercelRequest, VercelResponse } from '@vercel/node';
// @ts-ignore - pg types optional
import { Pool } from 'pg';

// NestJS 부팅 없는 초경량 교사인증 상태 조회 (100~300ms)
let pool: Pool | null = null;
function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.POSTGRES_URL,
      ssl: { rejectUnauthorized: false },
      max: 3,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return pool;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });

  try {
    const userId = req.query.userId as string;
    if (!userId) return res.status(200).json({ verifyStatus: 'NONE' });

    const result = await getPool().query(
      `SELECT "verifyStatus", "verifiedName", "verifiedSchool", "verifiedCategory",
              "verifiedPosition", "payPeriod", "verifiedAt", "expiresAt", "rejectReason"
       FROM teacher_verifications
       WHERE "userId" = $1
       ORDER BY "createdDate" DESC
       LIMIT 1`,
      [userId],
    );

    if (result.rows.length === 0) {
      return res.status(200).json({ verifyStatus: 'NONE' });
    }

    const row = result.rows[0];
    return res.status(200).json({
      verifyStatus: row.verifyStatus,
      verifiedName: row.verifiedName,
      verifiedSchool: row.verifiedSchool,
      verifiedCategory: row.verifiedCategory,
      verifiedPosition: row.verifiedPosition,
      payPeriod: row.payPeriod,
      verifiedAt: row.verifiedAt,
      expiresAt: row.expiresAt,
      rejectReason: row.rejectReason,
    });
  } catch (err) {
    console.error('teacher-verification-status error:', err);
    // 테이블이 아직 없으면 NONE 반환 (첫 배포 시)
    return res.status(200).json({ verifyStatus: 'NONE' });
  }
}
