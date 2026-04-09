import crypto from 'crypto';

/**
 * 교사 개인정보 AES-256-GCM 암호화 유틸.
 *
 * 원칙:
 * - KEY는 DB 바깥(환경변수)에만 존재
 * - IV는 매번 랜덤 → 같은 평문도 다른 암호문
 * - Auth Tag로 변조 감지
 * - 반환 포맷: base64(iv(12) | tag(16) | ciphertext)
 */

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (hex && /^[0-9a-fA-F]{64}$/.test(hex)) {
    return Buffer.from(hex, 'hex');
  }
  // 개발 환경 폴백 — 운영에서는 반드시 환경변수 주입
  return crypto
    .createHash('sha256')
    .update(process.env.FALLBACK_SECRET || 'onlyteaching-dev-key')
    .digest();
}

export function encrypt(plaintext: string | null | undefined): string | null {
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

export function decrypt(payload: string | null | undefined): string | null {
  if (!payload) return null;
  try {
    const key = getKey();
    const buf = Buffer.from(payload, 'base64');
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const ct = buf.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString(
      'utf8',
    );
  } catch {
    return null;
  }
}

/** 검색용 해시 (중복 체크에 사용) */
export function searchHash(plaintext: string | null | undefined): string | null {
  if (!plaintext) return null;
  return crypto
    .createHash('sha256')
    .update(String(plaintext).trim().toLowerCase())
    .digest('hex');
}
