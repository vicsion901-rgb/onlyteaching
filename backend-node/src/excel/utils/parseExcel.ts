import * as XLSX from 'xlsx';

export function parseExcelToMatrix(buffer: Buffer): { matrix: string[][] } {
  const wb = XLSX.read(buffer, { type: 'buffer' });

  // 첫 시트 고정 (NEIS도 보통 첫 시트)
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];

  // ✅ 핵심: header:1 => 2D 배열로 받기 / defval:'' => 빈칸도 유지
  const matrix = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: '',
    raw: false,
    blankrows: false,
  }) as any[][];

  // string[][]로 정리 (trim)
  const normalized = matrix.map((row) =>
    (row ?? []).map((cell) => (cell ?? '').toString().trim()),
  );

  return { matrix: normalized };
}