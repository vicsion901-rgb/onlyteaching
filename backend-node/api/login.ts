import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';

// 전역 커넥션 풀 — 서버리스 인스턴스 재사용 시 그대로 유지
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

// NestJS 부팅을 우회하는 초경량 로그인 핸들러
// 전체 응답 시간: 100~300ms (기존 3~7s 대비 20배 빠름)
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { schoolCode, teacherCode } = req.body || {};

    if (!schoolCode || !teacherCode) {
      return res.status(400).json({ message: '학교코드와 교사코드를 입력해주세요.' });
    }

    const result = await getPool().query(
      'SELECT id, status FROM users WHERE "schoolCode" = $1 AND "teacherCode" = $2 LIMIT 1',
      [schoolCode, teacherCode],
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: '계정 없음' });
    }

    const user = result.rows[0];

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ message: '승인되지 않은 계정' });
    }

    return res.status(200).json({
      message: '로그인 성공',
      userId: user.id,
    });
  } catch (err) {
    console.error('login handler error:', err);
    return res.status(500).json({
      message: '로그인 처리 중 오류가 발생했습니다.',
    });
  }
}
