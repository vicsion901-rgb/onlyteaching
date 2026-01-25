import { normalizeColumnName } from './normalizeColumn';

const HEADER_KEYWORDS = [
  '번호',
  '순번',
  '학생번호',
  '이름',
  '성명',
  '학생명',
  '생년월일',
  '출생',
  '주민등록',
  '주민번호',
  '주소',
  '거주지',
  '반',
  '학년',
  '성별',
];

function nonEmptyCount(row: string[]) {
  return row.filter((c) => (c ?? '').toString().trim() !== '').length;
}

function looksLikeTitleRow(row: string[]): boolean {
  const cells = row.map((c) => (c ?? '').toString().trim()).filter(Boolean);
  if (cells.length === 0) return true;

  // 한 셀만 크게 있고(병합제목), 나머지 비어 있으면 제목행
  if (cells.length === 1 && cells[0].length >= 6) return true;

  const joined = cells.join(' ');
  const n = normalizeColumnName(joined);

  // "학생명부/학년도/명부" 포함하면 제목행 취급
  if (n.includes('학생명부') || n.includes('학년도') || n.includes('명부')) return true;

  // 숫자 거의 없고 글자만 긴 경우 제목행 가능성
  const digitCount = joined.replace(/[^0-9]/g, '').length;
  if (digitCount === 0 && joined.length >= 8) return true;

  return false;
}

export function detectHeaderRowIndex(matrix: string[][], _candidateTokens: string[]): number {
  let bestIdx = 0;
  let bestScore = -1e9;

  const scanLimit = Math.min(matrix.length, 40);

  for (let i = 0; i < scanLimit; i++) {
    const row = matrix[i] ?? [];
    if (looksLikeTitleRow(row)) continue;

    const ne = nonEmptyCount(row);
    if (ne < 2) continue; // 최소 2개 이상 채워진 행만 후보

    // 점수 계산
    let score = 0;

    // 헤더는 보통 텍스트가 많음
    for (const cell of row) {
      const v = (cell ?? '').toString().trim();
      if (!v) continue;

      const n = normalizeColumnName(v);

      // 숫자만이면 헤더 가능성 낮음
      if (/^\d+$/.test(v)) score -= 2;

      // 키워드 포함이면 크게 가산
      for (const kw of HEADER_KEYWORDS) {
        const nkw = normalizeColumnName(kw);
        if (n === nkw) score += 12;
        else if (n.includes(nkw) || nkw.includes(n)) score += 8;
      }

      // 한글/영문 포함이면 가산
      if (/[가-힣a-zA-Z]/.test(v)) score += 2;
    }

    // 보너스: 헤더는 보통 3개 이상 채워짐
    if (ne >= 3) score += 5;
    if (ne >= 5) score += 5;

    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }

  return bestIdx;
}