// @ts-ignore - @vercel/node provided at build time
import type { VercelRequest, VercelResponse } from '@vercel/node';
// @ts-ignore - pg types optional
import { Pool } from 'pg';
// @ts-ignore - bcrypt types optional
import * as bcrypt from 'bcrypt';
import crypto from 'crypto';

// ── 전역 커넥션 풀 (서버리스 인스턴스 재사용 시 유지) ──
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

// ── 암호화 유틸 (crypto.util.ts 와 동일 로직) ──
function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (hex && /^[0-9a-fA-F]{64}$/.test(hex)) {
    return Buffer.from(hex, 'hex');
  }
  return crypto
    .createHash('sha256')
    .update(process.env.FALLBACK_SECRET || 'onlyteaching-dev-key')
    .digest();
}

function encrypt(plaintext: string | null | undefined): string | null {
  if (plaintext == null || plaintext === '') return null;
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(String(plaintext), 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

function searchHash(plaintext: string | null | undefined): string | null {
  if (!plaintext) return null;
  return crypto
    .createHash('sha256')
    .update(String(plaintext).trim().toLowerCase())
    .digest('hex');
}

// ── NestJS 부팅 없는 초경량 회원가입 핸들러 (100~500ms) ──
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  try {
    let body: any = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }

    const { schoolCode, teacherCode, name, phone, email, schoolName } = body || {};

    if (!schoolCode || !teacherCode) {
      return res.status(400).json({ message: '아이디와 비밀번호를 입력해주세요.' });
    }

    const db = getPool();

    // 아이디 중복 체크
    const dupCheck = await db.query(
      'SELECT id FROM users WHERE "schoolCode" = $1 LIMIT 1',
      [schoolCode],
    );
    if (dupCheck.rows.length > 0) {
      return res.status(400).json({ message: '이미 등록된 아이디입니다' });
    }

    // 이메일 중복 체크
    const eHash = searchHash(email);
    if (eHash) {
      const dupEmail = await db.query(
        'SELECT id FROM users WHERE "emailHash" = $1 LIMIT 1',
        [eHash],
      );
      if (dupEmail.rows.length > 0) {
        return res.status(400).json({ message: '이미 등록된 이메일입니다' });
      }
    }

    // 비밀번호 해시
    const passwordHash = await bcrypt.hash(teacherCode, 10);

    // 개인정보 암호화
    const nameEnc = encrypt(name);
    const emailEnc = encrypt(email);
    const phoneEnc = encrypt(phone);

    // 저장
    const result = await db.query(
      `INSERT INTO users (id, "schoolCode", "teacherCode", "passwordHash",
        "nameEnc", "emailEnc", "emailHash", "phoneEnc", "schoolName",
        status, "createdAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, 'PENDING', NOW())
       RETURNING id, status`,
      [schoolCode, '__hashed__', passwordHash, nameEnc, emailEnc, eHash, phoneEnc, schoolName || null],
    );

    const user = result.rows[0];
    return res.status(201).json({
      status: user.status,
      userId: user.id,
      message: '가입 완료. 교사 인증을 진행해주세요.',
    });
  } catch (err) {
    console.error('register handler error:', err);
    return res.status(500).json({ message: '회원가입 처리 중 오류가 발생했습니다.' });
  }
}
