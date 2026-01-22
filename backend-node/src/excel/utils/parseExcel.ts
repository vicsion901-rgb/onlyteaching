// src/excel/utils/parseExcel.ts
import * as XLSX from 'xlsx';

export type Matrix = string[][];

/**
 * 엑셀을 2차원 배열(Matrix)로 파싱한다.
 * - header:1 사용 → 컬럼 헤더 깨짐 방지
 * - 빈 행 제거
 * - 모든 셀을 문자열로 정규화
 */
export function parseExcelToMatrix(
  buffer: Buffer,
): { sheetName: string; matrix: Matrix } {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  const raw = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    raw: false,
    defval: '',
    blankrows: false,
  }) as any[][];

  const matrix: Matrix = raw
    .map((row) =>
      row.map((cell) => (cell ?? '').toString().trim()),
    )
    // 완전히 빈 행 제거
    .filter((row) => row.some((cell) => cell !== ''));

  return { sheetName, matrix };
}          