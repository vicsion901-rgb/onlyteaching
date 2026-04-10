/**
 * 기존 유저의 schoolCode를 이메일로 전환합니다.
 * - 이미 이메일 형식인 유저는 그대로 유지
 * - 이메일이 아닌 유저는 emailEnc를 복호화하여 schoolCode를 이메일로 변경
 * - emailEnc가 없는 유저는 수동 처리 필요 (목록 출력)
 *
 * 실행: npx ts-node scripts/migrate-schoolcode-to-email.ts
 */
import 'dotenv/config';
import { Pool } from 'pg';
import crypto from 'crypto';

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

function decrypt(payload: string | null | undefined): string | null {
  if (!payload) return null;
  try {
    const key = getKey();
    const buf = Buffer.from(payload, 'base64');
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const ct = buf.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}

function searchHash(plaintext: string): string {
  return crypto
    .createHash('sha256')
    .update(plaintext.trim().toLowerCase())
    .digest('hex');
}

async function migrate() {
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const { rows } = await pool.query(
      `SELECT id, "schoolCode", "emailEnc", "emailHash" FROM users`,
    );

    console.log(`전체 유저 ${rows.length}명\n`);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const needsManual: any[] = [];

    for (const user of rows) {
      // 이미 이메일 형식이면 스킵
      if (emailRegex.test(user.schoolCode)) {
        console.log(`✓ ${user.schoolCode} — 이미 이메일 형식 (스킵)`);
        continue;
      }

      // emailEnc 복호화
      const email = decrypt(user.emailEnc);
      if (!email || !emailRegex.test(email)) {
        needsManual.push({ id: user.id, schoolCode: user.schoolCode, email });
        console.log(`⚠ ${user.schoolCode} — 이메일 없음 (수동 처리 필요)`);
        continue;
      }

      // schoolCode를 이메일로 변경 + emailHash 업데이트
      const eHash = searchHash(email);
      await pool.query(
        `UPDATE users SET "schoolCode" = $1, "emailHash" = $2 WHERE id = $3`,
        [email.trim().toLowerCase(), eHash, user.id],
      );
      console.log(`✓ ${user.schoolCode} → ${email} 전환 완료`);
    }

    if (needsManual.length > 0) {
      console.log(`\n⚠ 수동 처리 필요 (${needsManual.length}명):`);
      for (const u of needsManual) {
        console.log(`  - ID: ${u.id}, schoolCode: ${u.schoolCode}, email: ${u.email || '없음'}`);
      }
    }

    console.log(`\n마이그레이션 완료`);
  } finally {
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error('마이그레이션 실패:', err);
  process.exit(1);
});
