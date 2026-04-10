// @ts-ignore
import type { VercelRequest, VercelResponse } from '@vercel/node';
// @ts-ignore
import { Pool } from 'pg';
import crypto from 'crypto';
// @ts-ignore
import { Resend } from 'resend';

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
    const { email } = body || {};

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ message: '이메일을 입력해주세요.' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const db = getPool();

    // 이메일로 유저 조회 (schoolCode = 이메일)
    const { rows } = await db.query(
      'SELECT id FROM users WHERE "schoolCode" = $1 LIMIT 1',
      [trimmedEmail],
    );

    // 유저 존재 여부와 관계없이 동일한 응답 (이메일 열거 방지)
    if (rows.length === 0) {
      return res.status(200).json({ message: '등록된 이메일이면 재설정 링크가 발송됩니다.' });
    }

    const userId = rows[0].id;

    // 토큰 생성 (1시간 유효)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1시간

    // 토큰 저장 (users 테이블에 컬럼 추가됨)
    await db.query(
      `UPDATE users SET "resetToken" = $1, "resetTokenExpiry" = $2 WHERE id = $3`,
      [token, expiresAt.toISOString(), userId],
    );

    // 이메일 발송
    const frontendUrl = process.env.FRONTEND_URL || 'https://www.onlyteaching.kr';
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.RESEND_FROM || 'OnlyTeaching <onboarding@resend.dev>',
      to: trimmedEmail,
      subject: '[OnlyTeaching] 비밀번호 재설정',
      html: `
        <div style="font-family: 'Apple SD Gothic Neo', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #6b21a8; margin-bottom: 16px;">비밀번호 재설정</h2>
          <p>아래 버튼을 클릭하여 비밀번호를 재설정해주세요.</p>
          <p style="color: #6b7280; font-size: 14px;">본인이 요청하지 않았다면 이 메일을 무시해주세요.</p>
          <a href="${resetLink}" style="display: inline-block; margin: 24px 0; padding: 12px 32px; background: #6b21a8; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">
            비밀번호 재설정
          </a>
          <p style="color: #9ca3af; font-size: 12px;">이 링크는 1시간 동안 유효합니다.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
          <p style="color: #9ca3af; font-size: 11px;">OnlyTeaching — 오직 가르치기만 하십시오</p>
        </div>
      `,
    });

    return res.status(200).json({ message: '등록된 이메일이면 재설정 링크가 발송됩니다.' });
  } catch (err: any) {
    console.error('password-reset-request error:', err);
    return res.status(500).json({ message: '처리 중 오류가 발생했습니다.' });
  }
}
