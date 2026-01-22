// src/excel/utils/detectHeaderRow.ts
import { normalizeColumnName } from './normalizeColumn';

/**
 * 엑셀에서 "헤더 행"으로 가장 그럴듯한 행을 자동 탐지한다.
 * - 의미 있는 단어 매칭 수
 * - 한글/영문 포함 비율
 * - 숫자-only 셀 비율 (감점)
 */
export function detectHeaderRowIndex(
  matrix: string[][],
  candidateTokens: string[],
): number {
  const tokens = candidateTokens
    .map(normalizeColumnName)
    .filter(Boolean);

  let bestIndex = 0;
  let bestScore = -Infinity;

  const scanLimit = Math.min(matrix.length, 25);

  for (let i = 0; i < scanLimit; i++) {
    const row = matrix[i];
    const normalizedRow = row.map(normalizeColumnName);

    // 의미 토큰 매칭 수
    const hitCount = normalizedRow.reduce((acc, cell) => {
      if (!cell) return acc;
      const matched = tokens.some(
        (t) => cell.includes(t) || t.includes(cell),
      );
      return acc + (matched ? 1 : 0);
    }, 0);

    // 숫자만 있는 셀 개수 (감점 요소)
    const numericOnlyCount = row.reduce(
      (acc, cell) =>
        /^\d+$/.test(cell ?? '') ? acc + 1 : acc,
      0,
    );

    // 한글/영문 포함 셀 개수 (가산점)
    const alphaCount = row.reduce(
      (acc, cell) =>
        /[a-zA-Z가-힣]/.test(cell ?? '') ? acc + 1 : acc,
      0,
    );

    // 점수 계산
    const score =
      hitCount * 3 +
      alphaCount * 0.5 -
      numericOnlyCount * 1.5;

    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  return bestIndex;
}