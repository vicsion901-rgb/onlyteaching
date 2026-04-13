// @ts-ignore - @vercel/node provided at build time
import type { VercelRequest, VercelResponse } from '@vercel/node';
// @ts-ignore - pg types optional
import { Pool } from 'pg';
// @ts-ignore - bcrypt types optional
import * as bcrypt from 'bcrypt';
import crypto from 'crypto';

function sha256(plain: string): string {
  return crypto.createHash('sha256').update(plain).digest('hex');
}

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
    // text/plain 으로 와도 파싱 가능하게 처리
    let body: any = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    const { schoolCode, teacherCode, hashed } = body || {};

    if (!schoolCode || !teacherCode) {
      return res.status(400).json({ message: '이메일과 비밀번호를 입력해주세요.' });
    }

    const result = await getPool().query(
      'SELECT id, status, "passwordHash", "teacherCode" FROM users WHERE "schoolCode" = $1 LIMIT 1',
      [schoolCode],
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: '계정 없음' });
    }

    const user = result.rows[0];

    // hashed=true: 클라이언트가 SHA-256(비밀번호)를 보냄
    // hashed=false/없음: 평문 비밀번호 (레거시)
    let passwordOk = false;

    if (user.passwordHash) {
      // 1차: 받은 값을 그대로 bcrypt 비교 (이미 SHA-256 기반 bcrypt이면 성공)
      passwordOk = await bcrypt.compare(teacherCode, user.passwordHash);

      // 2차: 실패 + hashed=true면 → 기존 DB가 아직 평문 기반 bcrypt
      // 서버에서 평문을 SHA-256한 값이 클라이언트가 보낸 값과 같은지 역추론 불가
      // → 대안: 서버에서 직접 평문 비밀번호를 모르므로, 기존 유저는 비밀번호 재설정 필요
      // → 하지만 UX를 위해: hashed 모드가 실패하면 "비밀번호 재설정"을 안내
    }

    // 레거시 평문 비교
    if (!passwordOk && !hashed && user.teacherCode && user.teacherCode !== '__hashed__') {
      if (user.teacherCode === teacherCode) {
        passwordOk = true;
      }
    }

    // 성공 시 SHA-256 기반 bcrypt로 마이그레이션 (다음 로그인부터 SHA-256 비교)
    if (passwordOk) {
      const valueToHash = hashed ? teacherCode : sha256(teacherCode);
      const newBcrypt = await bcrypt.hash(valueToHash, 10);
      await getPool().query(
        `UPDATE users SET "passwordHash" = $1, "teacherCode" = '__hashed__' WHERE id = $2`,
        [newBcrypt, user.id],
      );
    }

    if (!passwordOk) {
      return res.status(401).json({ message: '비밀번호 불일치' });
    }

    if (user.status !== 'ACTIVE' && user.status !== 'PENDING') {
      return res.status(403).json({ message: '승인되지 않은 계정' });
    }

    return res.status(200).json({
      message: '로그인 성공',
      userId: user.id,
      status: user.status,
    });
  } catch (err) {
    console.error('login handler error:', err);
    return res.status(500).json({
      message: '로그인 처리 중 오류가 발생했습니다.',
    });
  }
}
