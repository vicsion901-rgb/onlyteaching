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
  birth_date: ['생년월일', '출생일', '출생일자', 'DOB', 'Birth'],
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

  const header = (rows[0] || []).map((h) => String(h ?? '').trim());
  const fieldToCol: Partial<Record<FieldKey, { col: number; header: string; score: number }>> = {};

  // compute best header per field
  for (const field of Object.keys(DICT) as FieldKey[]) {
    let best = { col: -1, header: '', score: 0 };
    for (let i = 0; i < header.length; i += 1) {
      const h = header[i];
      const score = bestMatch(h, DICT[field]);
      if (score > best.score) best = { col: i, header: h, score };
    }
    // threshold: allow partial/messy headers but ignore very weak matches
    if (best.col >= 0 && best.score >= 0.75) {
      fieldToCol[field] = best;
    }
  }

  const mapping = Object.fromEntries(
    (Object.keys(DICT) as FieldKey[]).map((k) => [
      k,
      fieldToCol[k]
        ? { source: fieldToCol[k]!.header, col: fieldToCol[k]!.col, score: fieldToCol[k]!.score }
        : null,
    ]),
  );

  const students: StudentUploadRow[] = [];
  for (let r = 1; r < rows.length; r += 1) {
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
    const student_number = numDigits ? String(Number(numDigits)) : String(r); // fallback to row index

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


