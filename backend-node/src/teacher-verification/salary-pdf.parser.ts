/**
 * NEIS 급여명세서 PDF 텍스트 파서.
 *
 * 개인정보 원칙:
 * - PDF 바이너리는 메모리에서만 처리하고 디스크 저장 금지
 * - 급여 금액·세부 내역은 읽지도 저장하지도 않음
 * - 이름·학교·재직상태·지급년월·푸터만 추출
 *
 * 위변조 방지 핵심 — 푸터 교차검증:
 *   본문 "[학교명]"  ↔  푸터 "학교명/..."  ↔  본문 "성명 XXX"  ↔  푸터 ".../이름"
 */
// CRITICAL: pdf-parse 를 top-level 에서 import 하면 Vercel 서버리스에서
// NestJS bootstrap 단계에 @napi-rs/canvas 초기화가 터져 함수 전체가
// FUNCTION_INVOCATION_FAILED 로 죽는다. 회원가입/로그인 외 모든 NestJS
// 엔드포인트가 사망하는 원인이었으므로, 실제 PDF 요청이 들어올 때만
// 함수 내부에서 require 하도록 지연 로드 처리.
// (2026-04-09 사고 복구 — 자세한 내용은 docs/온리티칭_배포구조_및_에이전트_프롬프트_가이드.*)

export type SalaryParseResult =
  | {
      ok: true;
      name: string;
      school: string;
      category: string;          // 국공립교원 / 사립교원
      position: string;          // 교사(초등) 등
      payPeriod: string;         // YYYY-MM
      issuedAt: string;          // 2026.04.09 17:23
      footerLine: string;        // 원문 푸터 한 줄
    }
  | { ok: false; reason: string };

const SCHOOL_BRACKET_RE = /\[([가-힣A-Za-z0-9]+(?:초등학교|중학교|고등학교|학교))\]/;
const CATEGORY_RE = /(국공립교원|사립교원)/;
const POSITION_RE = /\[(?:국공립교원|사립교원)[^\]]*\/\s*([^/]+?)\/\s*\d+호봉/;
const NAME_RE = /성명\s+([가-힣]{2,6})/;
const PAY_PERIOD_RE = /급여지급년월\s+(\d{4})\s*년\s*(\d{1,2})\s*월/;
const ACTIVE_RE = /]\s*재직/;
// 아산북수초등학교/2026.04.09 17:23/180.81.***.199/이재홍
const FOOTER_RE =
  /([가-힣A-Za-z0-9]+(?:초등학교|중학교|고등학교|학교))\/(\d{4}\.\d{2}\.\d{2}\s+\d{2}:\d{2})\/[\d.*]+\/([가-힣]{2,6})/;

export async function parseSalaryPdf(
  buffer: Buffer,
): Promise<SalaryParseResult> {
  let text = '';
  try {
    // 지연 로드: 이 라인이 실행되는 시점은 실제 업로드 요청이 들어올 때뿐이라
    // NestJS cold-start / 다른 엔드포인트에는 전혀 영향을 주지 않는다.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdfParseMod: any = require('pdf-parse');
    const PDFParse = pdfParseMod.PDFParse || pdfParseMod.default || pdfParseMod;
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    text = result.text || '';
  } catch {
    return { ok: false, reason: 'PDF를 읽을 수 없습니다.' };
  }

  if (!text.includes('급여명세서')) {
    return { ok: false, reason: '급여명세서 양식이 아닙니다.' };
  }

  if (!ACTIVE_RE.test(text)) {
    return { ok: false, reason: '재직 상태가 확인되지 않습니다.' };
  }

  const nameMatch = NAME_RE.exec(text);
  const schoolMatch = SCHOOL_BRACKET_RE.exec(text);
  const categoryMatch = CATEGORY_RE.exec(text);
  const positionMatch = POSITION_RE.exec(text);
  const payMatch = PAY_PERIOD_RE.exec(text);
  const footerMatch = FOOTER_RE.exec(text);

  if (!nameMatch) return { ok: false, reason: '성명을 찾을 수 없습니다.' };
  if (!schoolMatch) return { ok: false, reason: '학교명을 찾을 수 없습니다.' };
  if (!categoryMatch) return { ok: false, reason: '교원 구분을 찾을 수 없습니다.' };
  if (!payMatch) return { ok: false, reason: '지급년월을 찾을 수 없습니다.' };
  if (!footerMatch) return { ok: false, reason: '발급 푸터를 찾을 수 없습니다 (위변조 의심).' };

  const name = nameMatch[1];
  const school = schoolMatch[1];
  const footerSchool = footerMatch[1];
  const footerName = footerMatch[3];

  // 교차 검증
  if (name !== footerName) {
    return { ok: false, reason: `이름 불일치 (본문 ${name} / 푸터 ${footerName})` };
  }
  if (school !== footerSchool) {
    return { ok: false, reason: `학교 불일치 (본문 ${school} / 푸터 ${footerSchool})` };
  }

  // 최근 3개월 이내 지급분만 허용
  const payYear = Number(payMatch[1]);
  const payMonth = Number(payMatch[2]);
  const payPeriod = `${payYear}-${String(payMonth).padStart(2, '0')}`;

  const now = new Date();
  const payDate = new Date(payYear, payMonth - 1, 1);
  const diffMonths =
    (now.getFullYear() - payYear) * 12 + (now.getMonth() - (payMonth - 1));
  if (diffMonths < 0 || diffMonths > 3) {
    return {
      ok: false,
      reason: `최근 3개월 이내 급여명세서만 허용됩니다 (제출: ${payPeriod})`,
    };
  }

  // payDate 사용 (lint 방지)
  void payDate;

  return {
    ok: true,
    name,
    school,
    category: categoryMatch[1],
    position: positionMatch?.[1]?.trim() || '',
    payPeriod,
    issuedAt: footerMatch[2],
    footerLine: footerMatch[0],
  };
}
