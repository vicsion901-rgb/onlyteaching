// @ts-ignore
import type { VercelRequest, VercelResponse } from '@vercel/node';
// @ts-ignore
import { Pool } from 'pg';
// @ts-ignore
import * as bcrypt from 'bcrypt';
import crypto from 'crypto';

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

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (hex && /^[0-9a-fA-F]{64}$/.test(hex)) return Buffer.from(hex, 'hex');
  return crypto.createHash('sha256').update(process.env.FALLBACK_SECRET || 'onlyteaching-dev-key').digest();
}

function encrypt(plaintext: string | null | undefined): string | null {
  if (plaintext == null || plaintext === '') return null;
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64');
}

function decrypt(payload: string | null | undefined): string | null {
  if (!payload) return null;
  try {
    const key = getKey();
    const buf = Buffer.from(payload, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, buf.subarray(0, 12));
    decipher.setAuthTag(buf.subarray(12, 28));
    return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString('utf8');
  } catch { return null; }
}

let columnsEnsured = false;
async function ensureProfileColumns(db: Pool) {
  if (columnsEnsured) return;
  try {
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS nickname TEXT`);
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS grade_level INTEGER`);
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS class_number INTEGER`);
    columnsEnsured = true;
  } catch (err) {
    console.error('ensureProfileColumns failed', err);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const _origin = req.headers?.origin || ""; const _allowed = ["https://www.onlyteaching.kr","https://onlyteaching.kr","http://localhost:5173","http://localhost:3000"].includes(_origin) ? _origin : "https://www.onlyteaching.kr"; res.setHeader("Access-Control-Allow-Origin", _allowed); res.setHeader("Access-Control-Allow-Credentials", "true"); res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS"); res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization"); if (req.method === "OPTIONS") return res.status(204).end();

  let body: any = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }

  const db = getPool();
  await ensureProfileColumns(db);

  // GET - 현재 정보 조회
  if (req.method === 'GET') {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ message: 'userId 필요' });

    const { rows } = await db.query(
      'SELECT "schoolCode", "nameEnc", "phoneEnc", "schoolName", status, nickname, grade_level, class_number FROM users WHERE id = $1',
      [userId],
    );
    if (rows.length === 0) return res.status(404).json({ message: '사용자 없음' });

    const user = rows[0];
    return res.status(200).json({
      email: user.schoolCode,
      name: decrypt(user.nameEnc) || '',
      phone: decrypt(user.phoneEnc) || '',
      schoolName: user.schoolName || '',
      status: user.status,
      nickname: user.nickname || '',
      gradeLevel: user.grade_level || null,
      classNumber: user.class_number || null,
    });
  }

  // POST - 정보 수정
  if (req.method === 'POST') {
    const { userId, action } = body || {};
    if (!userId) return res.status(400).json({ message: 'userId 필요' });

    try {
      // 비밀번호 변경
      if (action === 'changePassword') {
        const { currentPassword, newPassword } = body;
        if (!currentPassword || !newPassword) return res.status(400).json({ message: '현재 비밀번호와 새 비밀번호를 입력해주세요.' });
        if (newPassword.length < 9) return res.status(400).json({ message: '비밀번호는 9자 이상이어야 합니다.' });
        if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[^a-zA-Z0-9]/.test(newPassword)) {
          return res.status(400).json({ message: '비밀번호는 영문·숫자·특수문자를 모두 포함해야 합니다.' });
        }

        const { rows } = await db.query('SELECT "passwordHash", "teacherCode" FROM users WHERE id = $1', [userId]);
        if (rows.length === 0) return res.status(404).json({ message: '사용자 없음' });

        let ok = false;
        if (rows[0].passwordHash) ok = await bcrypt.compare(currentPassword, rows[0].passwordHash);
        else if (rows[0].teacherCode === currentPassword) ok = true;
        if (!ok) return res.status(400).json({ message: '현재 비밀번호가 일치하지 않습니다.' });

        const hash = await bcrypt.hash(newPassword, 8);
        await db.query('UPDATE users SET "passwordHash" = $1, "teacherCode" = \'__hashed__\' WHERE id = $2', [hash, userId]);
        return res.status(200).json({ message: '비밀번호가 변경되었습니다.' });
      }

      // 이름 변경
      if (action === 'changeName') {
        const { name } = body;
        if (!name || name.trim().length < 2) return res.status(400).json({ message: '이름을 2자 이상 입력해주세요.' });
        const nameEnc = encrypt(name.trim());
        await db.query('UPDATE users SET "nameEnc" = $1 WHERE id = $2', [nameEnc, userId]);
        return res.status(200).json({ message: '이름이 변경되었습니다.' });
      }

      // 전화번호 변경
      if (action === 'changePhone') {
        const { phone } = body;
        if (!phone || !/^01[016789]-?\d{3,4}-?\d{4}$/.test(phone.replace(/\s/g, ''))) {
          return res.status(400).json({ message: '올바른 전화번호를 입력해주세요.' });
        }
        const phoneEnc = encrypt(phone);
        await db.query('UPDATE users SET "phoneEnc" = $1 WHERE id = $2', [phoneEnc, userId]);
        return res.status(200).json({ message: '전화번호가 변경되었습니다.' });
      }

      // 프로필 보완 — nickname / gradeLevel / classNumber
      if (action === 'updateProfile') {
        const { nickname, gradeLevel, classNumber } = body;
        const sets: string[] = [];
        const vals: (string | number | null)[] = [];
        if (nickname !== undefined) {
          const n = String(nickname || '').trim();
          if (n.length === 0 || n.length > 20) return res.status(400).json({ message: '닉네임은 1~20자로 입력해주세요.' });
          sets.push(`nickname = $${sets.length + 1}`); vals.push(n);
        }
        if (gradeLevel !== undefined && gradeLevel !== null && gradeLevel !== '') {
          const g = Number(gradeLevel);
          if (!Number.isFinite(g) || g < 1 || g > 6) return res.status(400).json({ message: '담당 학년은 1~6 사이여야 합니다.' });
          sets.push(`grade_level = $${sets.length + 1}`); vals.push(g);
        }
        if (classNumber !== undefined && classNumber !== null && classNumber !== '') {
          const c = Number(classNumber);
          if (!Number.isFinite(c) || c < 1 || c > 30) return res.status(400).json({ message: '담당 반은 1~30 사이여야 합니다.' });
          sets.push(`class_number = $${sets.length + 1}`); vals.push(c);
        }
        if (sets.length === 0) return res.status(400).json({ message: '입력값이 없습니다.' });
        vals.push(userId);
        await db.query(`UPDATE users SET ${sets.join(', ')} WHERE id = $${sets.length + 1}`, vals);
        const { rows: updated } = await db.query(
          'SELECT nickname, grade_level, class_number FROM users WHERE id = $1',
          [userId],
        );
        const u = updated[0] || {};
        return res.status(200).json({
          message: '프로필이 저장되었습니다.',
          nickname: u.nickname || '',
          gradeLevel: u.grade_level || null,
          classNumber: u.class_number || null,
        });
      }

      return res.status(400).json({ message: '알 수 없는 요청' });
    } catch (err: any) {
      console.error('account handler error:', err);
      return res.status(500).json({ message: '처리 중 오류가 발생했습니다.' });
    }
  }

  // DELETE - 회원 탈퇴
  if (req.method === 'DELETE') {
    const { userId, password } = body || {};
    if (!userId || !password) return res.status(400).json({ message: '비밀번호를 입력해주세요.' });

    try {
      const { rows } = await db.query('SELECT "passwordHash" FROM users WHERE id = $1', [userId]);
      if (rows.length === 0) return res.status(404).json({ message: '사용자 없음' });

      const ok = await bcrypt.compare(password, rows[0].passwordHash);
      if (!ok) return res.status(400).json({ message: '비밀번호가 일치하지 않습니다.' });

      await db.query('DELETE FROM teacher_verifications WHERE "userId" = $1', [userId]);
      await db.query('DELETE FROM users WHERE id = $1', [userId]);
      return res.status(200).json({ message: '회원 탈퇴가 완료되었습니다.' });
    } catch (err: any) {
      console.error('account delete error:', err);
      return res.status(500).json({ message: '처리 중 오류가 발생했습니다.' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
