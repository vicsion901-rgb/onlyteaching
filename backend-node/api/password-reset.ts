// @ts-ignore
import type { VercelRequest, VercelResponse } from '@vercel/node';
// @ts-ignore
import { Pool } from 'pg';
// @ts-ignore
import * as bcrypt from 'bcrypt';

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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  try {
    let body: any = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const { token, newPassword } = body || {};

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ message: '유효하지 않은 요청입니다.' });
    }
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({ message: '비밀번호는 8자 이상이어야 합니다.' });
    }

    const db = getPool();

    // 토큰으로 유저 조회 + 만료 확인
    const { rows } = await db.query(
      `SELECT id, "resetTokenExpiry" FROM users WHERE "resetToken" = $1 LIMIT 1`,
      [token],
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: '유효하지 않거나 만료된 링크입니다.' });
    }

    const user = rows[0];
    const expiry = new Date(user.resetTokenExpiry);
    if (expiry < new Date()) {
      return res.status(400).json({ message: '링크가 만료되었습니다. 다시 요청해주세요.' });
    }

    // 비밀번호 업데이트 + 토큰 삭제
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.query(
      `UPDATE users SET "passwordHash" = $1, "teacherCode" = '__hashed__', "resetToken" = NULL, "resetTokenExpiry" = NULL WHERE id = $2`,
      [passwordHash, user.id],
    );

    return res.status(200).json({ message: '비밀번호가 변경되었습니다. 로그인해주세요.' });
  } catch (err: any) {
    console.error('password-reset error:', err);
    return res.status(500).json({ message: '처리 중 오류가 발생했습니다.' });
  }
}
