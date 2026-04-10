/**
 * 일회성 마이그레이션: teacherCode에 평문 비밀번호가 저장된 레거시 유저들을
 * bcrypt 해시로 전환합니다.
 *
 * 실행: npx ts-node scripts/migrate-plaintext-passwords.ts
 */
import 'dotenv/config';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

async function migrate() {
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // teacherCode가 '__hashed__'가 아닌 유저 = 평문 비밀번호 저장된 레거시 유저
    const { rows } = await pool.query(
      `SELECT id, "schoolCode", "teacherCode" FROM users WHERE "teacherCode" != '__hashed__'`,
    );

    console.log(`평문 비밀번호 유저 ${rows.length}명 발견`);

    for (const user of rows) {
      const hash = await bcrypt.hash(user.teacherCode, 10);

      await pool.query(
        `UPDATE users SET "passwordHash" = $1, "teacherCode" = '__hashed__' WHERE id = $2`,
        [hash, user.id],
      );

      console.log(`✓ ${user.schoolCode} — 해시화 완료`);
    }

    console.log(`\n마이그레이션 완료: ${rows.length}명 처리`);
  } finally {
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error('마이그레이션 실패:', err);
  process.exit(1);
});
