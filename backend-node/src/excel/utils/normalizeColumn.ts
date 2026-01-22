// src/excel/utils/normalizeColumn.ts
export function normalizeColumnName(s: string): string {
    return (s ?? '')
      .toString()
      .toLowerCase()
      .replace(/\u00a0/g, ' ') // NBSP(깨지는 공백)
      .replace(/\s+/g, '') // 모든 공백 제거
      .replace(/[()（）\[\]{}<>]/g, '') // 괄호류 제거
      .replace(/[^a-z0-9가-힣]/g, ''); // 특수문자 제거
  }