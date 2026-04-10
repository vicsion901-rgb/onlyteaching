// @ts-ignore
import type { VercelRequest, VercelResponse } from '@vercel/node';
// @ts-ignore
import { Pool } from 'pg';

// ── DB 풀 ──
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

// ── PDF 텍스트 파서 (salary-pdf.parser.ts 로직 인라인) ──
const SCHOOL_BRACKET_RE = /\[([가-힣A-Za-z0-9]+(?:초등학교|중학교|고등학교|학교))\]/;
const CATEGORY_RE = /(국공립교원|사립교원)/;
const POSITION_RE = /\[(?:국공립교원|사립교원)[^\]]*\/\s*([^/]+?)\/\s*\d+호봉/;
const NAME_RE = /성명\s+([가-힣]{2,6})/;
const PAY_PERIOD_RE = /급여지급년월\s+(\d{4})\s*년\s*(\d{1,2})\s*월/;
const ACTIVE_RE = /]\s*재직/;
const FOOTER_RE =
  /([가-힣A-Za-z0-9]+(?:초등학교|중학교|고등학교|학교))\/(\d{4}\.\d{2}\.\d{2}\s+\d{2}:\d{2})\/[\d.*]+\/([가-힣]{2,6})/;

async function extractPdfText(buffer: Buffer): Promise<string> {
  // pdf-parse 지연 로드 (canvas 의존 없이 텍스트만 추출)
  const pdfParseMod: any = require('pdf-parse');
  const PDFParse = pdfParseMod.PDFParse || pdfParseMod.default || pdfParseMod;
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  return result.text || '';
}

function parseSalaryText(text: string) {
  if (!text.includes('급여명세서')) return { ok: false as const, reason: '급여명세서 양식이 아닙니다.' };
  if (!ACTIVE_RE.test(text)) return { ok: false as const, reason: '재직 상태가 확인되지 않습니다.' };

  const nameMatch = NAME_RE.exec(text);
  const schoolMatch = SCHOOL_BRACKET_RE.exec(text);
  const categoryMatch = CATEGORY_RE.exec(text);
  const positionMatch = POSITION_RE.exec(text);
  const payMatch = PAY_PERIOD_RE.exec(text);
  const footerMatch = FOOTER_RE.exec(text);

  if (!nameMatch) return { ok: false as const, reason: '성명을 찾을 수 없습니다.' };
  if (!schoolMatch) return { ok: false as const, reason: '학교명을 찾을 수 없습니다.' };
  if (!categoryMatch) return { ok: false as const, reason: '교원 구분을 찾을 수 없습니다.' };
  if (!payMatch) return { ok: false as const, reason: '지급년월을 찾을 수 없습니다.' };
  if (!footerMatch) return { ok: false as const, reason: '발급 푸터를 찾을 수 없습니다 (위변조 의심).' };

  const name = nameMatch[1];
  const school = schoolMatch[1];
  if (name !== footerMatch[3]) return { ok: false as const, reason: `이름 불일치 (본문 ${name} / 푸터 ${footerMatch[3]})` };
  if (school !== footerMatch[1]) return { ok: false as const, reason: `학교 불일치 (본문 ${school} / 푸터 ${footerMatch[1]})` };

  const payYear = Number(payMatch[1]);
  const payMonth = Number(payMatch[2]);
  const payPeriod = `${payYear}-${String(payMonth).padStart(2, '0')}`;
  const now = new Date();
  const diffMonths = (now.getFullYear() - payYear) * 12 + (now.getMonth() - (payMonth - 1));
  if (diffMonths < 0 || diffMonths > 3) return { ok: false as const, reason: `최근 3개월 이내 급여명세서만 허용됩니다 (제출: ${payPeriod})` };

  return {
    ok: true as const,
    name, school,
    category: categoryMatch[1],
    position: positionMatch?.[1]?.trim() || '',
    payPeriod,
    issuedAt: footerMatch[2],
  };
}

// ── 핸들러 ──
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  try {
    let body: any = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const { userId, fileBase64 } = body || {};

    if (!userId) return res.status(400).json({ message: 'userId가 필요합니다.' });
    if (!fileBase64) return res.status(400).json({ message: 'PDF 파일이 없습니다.' });

    const pdfBuffer = Buffer.from(fileBase64, 'base64');
    if (pdfBuffer.length > 10 * 1024 * 1024) return res.status(400).json({ message: '파일 용량이 너무 큽니다 (최대 10MB).' });

    // PDF 텍스트 추출 + 파싱
    let text: string;
    try {
      text = await extractPdfText(pdfBuffer);
    } catch {
      return res.status(400).json({ message: 'PDF를 읽을 수 없습니다.' });
    }

    const parsed = parseSalaryText(text);
    const db = getPool();

    if (!parsed.ok) {
      // 실패 기록 저장
      await db.query(
        `INSERT INTO teacher_verifications (id, "userId", method, "verifyStatus", "rejectReason", "createdDate", "modifiedDate", status)
         VALUES (DEFAULT, $1, 'SALARY_PDF', 'REJECTED', $2, NOW(), NOW(), 'NORMAL')`,
        [userId, parsed.reason],
      );
      return res.status(400).json({ message: parsed.reason });
    }

    // 성공 — 인증 기록 저장
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const result = await db.query(
      `INSERT INTO teacher_verifications
        (id, "userId", method, "verifyStatus", "verifiedName", "verifiedSchool",
         "verifiedCategory", "verifiedPosition", "payPeriod", "issuedAt",
         "verifiedAt", "expiresAt", "createdDate", "modifiedDate", status)
       VALUES (DEFAULT, $1, 'SALARY_PDF', 'VERIFIED', $2, $3, $4, $5, $6, $7, NOW(), $8, NOW(), NOW(), 'NORMAL')
       RETURNING id, "verifyStatus", "verifiedName", "verifiedSchool", "verifiedCategory", "verifiedPosition", "payPeriod", "verifiedAt", "expiresAt"`,
      [userId, parsed.name, parsed.school, parsed.category, parsed.position, parsed.payPeriod, parsed.issuedAt, expiresAt],
    );

    // users.status → ACTIVE
    await db.query(
      `UPDATE users SET status = 'ACTIVE', "schoolName" = COALESCE("schoolName", $2) WHERE id = $1`,
      [userId, parsed.school],
    );

    const saved = result.rows[0];
    return res.status(200).json(saved);
  } catch (err: any) {
    console.error('salary-pdf handler error:', err);
    return res.status(500).json({ message: '인증 처리 중 오류가 발생했습니다.' });
  }
}
