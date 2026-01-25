import * as XLSX from 'xlsx';

export type StudentUploadRow = {
  student_number: string;
  name: string;
  birth_date: string;
  resident_id: string;
  address: string;
};

type FieldKey = keyof StudentUploadRow;

const DICT: Record<FieldKey, string[]> = {
  student_number: ['번호', '순번', 'No', '학생번호'],
  name: ['이름', '성명', '학생명', 'Name'],
  birth_date: ['생년월일', '생일', '출생일', '출생일자', 'DOB', 'Birth'],
  resident_id: ['주민등록번호', '주민번호', 'RRN', 'ID Number'],
  address: ['주소', '거주지', '집주소', 'Address'],
};

export const normalizeColumnName = (s: unknown) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9가-힣]/g, '')
    .trim();

const levenshtein = (a: string, b: string) => {
  const s = normalizeColumnName(a);
  const t = normalizeColumnName(b);
  if (!s) return t.length;
  if (!t) return s.length;
  const dp = Array.from({ length: s.length + 1 }, () => new Array(t.length + 1).fill(0));
  for (let i = 0; i <= s.length; i += 1) dp[i][0] = i;
  for (let j = 0; j <= t.length; j += 1) dp[0][j] = j;
  for (let i = 1; i <= s.length; i += 1) {
    for (let j = 1; j <= t.length; j += 1) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[s.length][t.length];
};

const similarity = (a: string, b: string) => {
  const s = normalizeColumnName(a);
  const t = normalizeColumnName(b);
  const maxLen = Math.max(s.length, t.length, 1);
  const dist = levenshtein(s, t);
  return 1 - dist / maxLen;
};

const bestMatch = (header: string, candidates: string[]) => {
  const h = normalizeColumnName(header);
  if (!h) return 0;
  let best = 0;
  for (const c of candidates) {
    const cc = normalizeColumnName(c);
    if (!cc) continue;
    const includesScore = h.includes(cc) || cc.includes(h) ? 0.92 : 0;
    const sim = similarity(h, cc);
    best = Math.max(best, includesScore, sim);
  }
  return best;
};

type HeaderDetectResult = {
  headerRowIndex: number;
  header: string[];
  fieldToCol: Partial<Record<FieldKey, { col: number; header: string; score: number }>>;
  matchedFields: number;
  totalScore: number;
};

/**
 * 엑셀 파일은 종종 "제목/안내 문구"가 상단에 1~몇 줄 존재합니다.
 * 기존 로직(0번째 행만 헤더로 가정)에서는 이런 파일에서 자동 매핑이 깨져
 * 이름/주소가 비어버리는 문제가 생깁니다.
 *
 * 따라서 앞부분 N행을 스캔해서 "헤더로 보이는 행"을 자동 탐지합니다.
 */
const detectHeaderRow = (rows: unknown[][], scanLimit = 30): HeaderDetectResult => {
  const limit = Math.min(rows.length, Math.max(1, scanLimit));

  let best: HeaderDetectResult = {
    headerRowIndex: 0,
    header: (rows[0] || []).map((h) => String(h ?? '').trim()),
    fieldToCol: {},
    matchedFields: 0,
    totalScore: 0,
  };

  const isTitleLikeSingleCell = (cells: unknown[]) => {
    const nonEmpty = (cells || [])
      .map((c) => String(c ?? '').trim())
      .filter((s) => s !== '');
    if (nonEmpty.length !== 1) return false;
    const only = nonEmpty[0];
    // "학생명부", "학생", "명부" 같은 제목성 문구는 헤더가 아님
    return /학생|명부/.test(only) && only.length >= 2;
  };

  for (let r = 0; r < limit; r += 1) {
    const row = rows[r] || [];
    const header = row.map((h) => String(h ?? '').trim());

    // 제목성 단일 셀 행은 헤더 후보에서 강하게 제외
    if (isTitleLikeSingleCell(row)) continue;

    const fieldToCol: Partial<Record<FieldKey, { col: number; header: string; score: number }>> = {};
    let matchedFields = 0;
    let totalScore = 0;

    for (const field of Object.keys(DICT) as FieldKey[]) {
      let bestForField = { col: -1, header: '', score: 0 };
      for (let i = 0; i < header.length; i += 1) {
        const h = header[i];
        const score = bestMatch(h, DICT[field]);
        if (score > bestForField.score) bestForField = { col: i, header: h, score };
      }
      if (bestForField.col >= 0 && bestForField.score >= 0.75) {
        fieldToCol[field] = bestForField;
        matchedFields += 1;
        totalScore += bestForField.score;
      }
    }

    // 이름 컬럼이 없으면 헤더로 보기 어렵기 때문에 우선순위를 낮춤
    const nameScore = fieldToCol.name?.score ?? 0;
    const effectiveTotal = totalScore + (nameScore >= 0.75 ? 0.5 : 0);

    const isBetter =
      matchedFields > best.matchedFields ||
      (matchedFields === best.matchedFields && effectiveTotal > best.totalScore);

    if (isBetter) {
      best = {
        headerRowIndex: r,
        header,
        fieldToCol,
        matchedFields,
        totalScore: effectiveTotal,
      };
    }
  }

  // 최소한 2개 이상(예: 이름+번호/주소 등) 매칭이 안 되면 기존(0행)로 폴백
  if (best.matchedFields < 2) {
    return {
      headerRowIndex: 0,
      header: (rows[0] || []).map((h) => String(h ?? '').trim()),
      fieldToCol: {},
      matchedFields: 0,
      totalScore: 0,
    };
  }

  return best;
};

export const extractRrnDigits = (text: unknown) => {
  try {
    const s = String(text ?? '');
    const m = s.match(/(\d{6})[- ]?(\d{7})/);
    if (m) return `${m[1]}${m[2]}`;
    const d = s.replace(/\D/g, '');
    return d.length === 13 ? d : '';
  } catch {
    return '';
  }
};

export const formatRrn = (digits13: string) => {
  const d = String(digits13 || '').replace(/\D/g, '');
  if (d.length !== 13) return '';
  return `${d.slice(0, 6)}-${d.slice(6)}`;
};

export const birthDateFromRrn = (digits13: string) => {
  const d = String(digits13 || '').replace(/\D/g, '');
  if (!/^\d{13}$/.test(d)) return '';
  const yy = Number(d.slice(0, 2));
  const mm = Number(d.slice(2, 4));
  const dd = Number(d.slice(4, 6));
  const g = Number(d[6]); // century/gender digit
  if (!(mm >= 1 && mm <= 12) || !(dd >= 1 && dd <= 31)) return '';
  let century = 1900;
  if (g === 3 || g === 4 || g === 7 || g === 8) century = 2000;
  if (g === 9 || g === 0) century = 1800;
  const yyyy = century + yy;
  return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
};

export const normalizeBirthDateIso = (text: unknown) => {
  try {
    const s = String(text ?? '').trim();
    const asIso = (yyyy: string, mm: string, dd: string) =>
      `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
    const isValidMd = (mm: string, dd: string) => {
      const m = Number(mm);
      const d = Number(dd);
      return Number.isFinite(m) && Number.isFinite(d) && m >= 1 && m <= 12 && d >= 1 && d <= 31;
    };

    const m1 = s.match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
    if (m1 && isValidMd(m1[2], m1[3])) return asIso(m1[1], m1[2], m1[3]);

    const m2 = s.match(/(^|[^0-9])(\d{4})(\d{2})(\d{2})([^0-9]|$)/);
    if (m2 && isValidMd(m2[3], m2[4])) return asIso(m2[2], m2[3], m2[4]);

    const m3 = s.match(/(^|[^0-9])(\d{2})(\d{2})(\d{2})([^0-9]|$)/);
    if (m3 && isValidMd(m3[3], m3[4])) {
      const yy = Number(m3[2]);
      const yyyy = yy <= 29 ? 2000 + yy : 1900 + yy;
      return asIso(String(yyyy), m3[3], m3[4]);
    }

    return '';
  } catch {
    return '';
  }
};

export const parseStudentExcel = (buffer: Buffer) => {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = wb.SheetNames?.[0];
  if (!sheetName) {
    return { mapping: {}, students: [] as StudentUploadRow[] };
  }
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' }) as unknown[][];
  if (!rows || rows.length < 1) {
    return { mapping: {}, students: [] as StudentUploadRow[] };
  }

  // ✅ 헤더 행 자동 탐지 (상단 제목/안내 문구가 있어도 매핑이 유지되도록)
  const detected = detectHeaderRow(rows, 30);
  const headerRowIndex = detected.headerRowIndex;
  const header = detected.header;
  const fieldToCol = detected.fieldToCol;

  const mapping = Object.fromEntries(
    (Object.keys(DICT) as FieldKey[]).map((k) => [
      k,
      fieldToCol[k]
        ? { source: fieldToCol[k]!.header, col: fieldToCol[k]!.col, score: fieldToCol[k]!.score }
        : null,
    ]),
  );
  // 디버깅/검증용 메타(프론트에서 보여주거나 서버 로그로 확인 가능)
  (mapping as any).__meta = { sheetName, headerRowIndex };

  const students: StudentUploadRow[] = [];
  for (let r = headerRowIndex + 1; r < rows.length; r += 1) {
    const row = rows[r] || [];
    const get = (field: FieldKey) => {
      const m = fieldToCol[field];
      if (!m) return '';
      return String(row[m.col] ?? '').trim();
    };

    const residentDigits = extractRrnDigits(get('resident_id'));
    const resident_id = residentDigits ? formatRrn(residentDigits) : '';
    const birth_date = residentDigits
      ? birthDateFromRrn(residentDigits)
      : normalizeBirthDateIso(get('birth_date'));

    const numRaw = get('student_number');
    const numDigits = String(numRaw || '').replace(/\D/g, '');
    // fallback은 "데이터 행 번호"로 (헤더 위치를 고려)
    const fallbackNo = String(Math.max(1, r - headerRowIndex));
    const student_number = numDigits ? String(Number(numDigits)) : fallbackNo;

    const item: StudentUploadRow = {
      student_number,
      name: get('name') || '',
      birth_date: birth_date || '',
      resident_id,
      address: get('address') || '',
    };

    // ignore totally empty rows
    const hasAny = Object.values(item).some((v) => String(v || '').trim() !== '');
    if (!hasAny) continue;
    students.push(item);
  }

  return { mapping, students };
};


