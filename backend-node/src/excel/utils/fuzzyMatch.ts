// src/excel/utils/fuzzyMatch.ts
import { normalizeColumnName } from './normalizeColumn';

// 레벤슈타인 거리
export function levenshtein(a: string, b: string): number {
  const s = a ?? '';
  const t = b ?? '';
  const n = s.length;
  const m = t.length;

  if (n === 0) return m;
  if (m === 0) return n;

  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array(m + 1).fill(0),
  );

  for (let i = 0; i <= n; i++) dp[i][0] = i;
  for (let j = 0; j <= m; j++) dp[0][j] = j;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // 삭제
        dp[i][j - 1] + 1, // 삽입
        dp[i - 1][j - 1] + cost, // 치환
      );
    }
  }

  return dp[n][m];
}

// similarity score (0 ~ 1)
export function similarity(a: string, b: string): number {
  const x = normalizeColumnName(a);
  const y = normalizeColumnName(b);

  if (!x || !y) return 0;
  if (x === y) return 1;

  // 포함 관계면 가산점
  const includesBoost =
    x.includes(y) || y.includes(x) ? 0.2 : 0;

  const dist = levenshtein(x, y);
  const maxLen = Math.max(x.length, y.length);

  if (maxLen === 0) return 0;

  const baseScore = 1 - dist / maxLen;

  const score = baseScore + includesBoost;

  // 0~1 사이로 클램프
  return Math.max(0, Math.min(1, score));
}