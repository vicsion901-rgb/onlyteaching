// src/excel/excel.mapper.ts
import { FieldKey, MappingResult, StudentNormalized } from './excel.types';
import { normalizeColumnName } from './utils/normalizeColumn';
import { similarity } from './utils/fuzzyMatch';

const FIELD_CANDIDATES: Record<FieldKey, string[]> = {
  name: ['이름', '성명', '학생명', 'Name'],
  birth_date: ['생년월일', '출생일', '출생일자', 'DOB', 'Birth'],
  resident_id: ['주민등록번호', '주민번호', 'RRN', 'ID Number'],
  address: ['주소', '거주지', '집주소', 'Address'],
  student_number: ['번호', '순번', 'No', '학생번호'],
};

export function getAllCandidateTokens(): string[] {
  return Object.values(FIELD_CANDIDATES).flat();
}

function getConfidence(score: number): 'high' | 'medium' | 'low' {
  if (score >= 0.88) return 'high';
  if (score >= 0.72) return 'medium';
  return 'low';
}

export function buildMapping(headers: string[]): MappingResult {
  const cleanedHeaders = headers
    .map((h) => (h ?? '').toString().trim())
    .filter((h) => h !== '');

  const columns = cleanedHeaders.map((excelColumn) => {
    const normalized = normalizeColumnName(excelColumn);

    let bestField: FieldKey | null = null;
    let bestScore = 0;

    (Object.keys(FIELD_CANDIDATES) as FieldKey[]).forEach((field) => {
      const candidates = FIELD_CANDIDATES[field];
      const score = Math.max(...candidates.map((c) => similarity(normalized, c)));
      if (score > bestScore) {
        bestScore = score;
        bestField = field;
      }
    });

    // 너무 낮으면 매핑하지 않음
    const mappedField = bestScore >= 0.65 ? bestField : null;

    return {
      excelColumn,
      normalized,
      mappedField,
      score: Number(bestScore.toFixed(2)),
      candidates: mappedField ? FIELD_CANDIDATES[mappedField] : [],
      confidence: getConfidence(bestScore),
    };
  });

  const unmappedColumns = columns.filter((c) => !c.mappedField).map((c) => c.excelColumn);
  const canAutoApply = columns.some((c) => !!c.mappedField);

  return {
    headerRowIndex: 0, // 서비스에서 최종 세팅
    columns,
    unmappedColumns,
    canAutoApply,
  };
}

function extractBirthFromResidentId(rrn: string): string {
  const digits = (rrn ?? '').replace(/[^0-9]/g, '');
  return digits.length >= 6 ? digits.slice(0, 6) : '';
}

/**
 * rows(엑셀 한 줄 = 객체) + mapping을 받아
 * 통일된 StudentNormalized[]로 변환한다.
 * - 매칭 실패 컬럼은 조용히 무시
 * - 주민번호 있으면 birth_date는 주민번호 앞 6자리로 덮어씀
 */
export function mapRowsToStudents(
  rows: Record<string, string>[],
  mapping: MappingResult,
): StudentNormalized[] {
  const mapTable = new Map<string, FieldKey>();
  mapping.columns.forEach((c) => {
    if (c.mappedField) mapTable.set(c.excelColumn, c.mappedField);
  });

  const result: StudentNormalized[] = [];

  for (const r of rows) {
    const normalized: StudentNormalized = {
      student_number: '',
      name: '',
      birth_date: '',
      resident_id: '',
      address: '',
    };

    for (const [col, value] of Object.entries(r)) {
      const field = mapTable.get(col);
      if (!field) continue;
      normalized[field] = (value ?? '').toString().trim();
    }

    // 주민번호 있으면 birth_date 추출
    if (normalized.resident_id) {
      const bd = extractBirthFromResidentId(normalized.resident_id);
      if (bd) normalized.birth_date = bd;
    }

    // 이름이 없으면 조용히 제외
    if (!normalized.name) continue;

    result.push(normalized);
  }

  return result;
}