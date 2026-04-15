import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import * as XLSX from 'xlsx';

// ── 엑셀 파싱 유틸 (브라우저에서 직접 파싱) ──
const FIELD_DICT = {
  student_number: ['번호', '순번', 'No', '학생번호'],
  name: ['이름', '성명', '학생명', 'Name'],
  birth_date: ['생년월일', '생일', '출생일', '출생일자', 'DOB', 'Birth'],
  resident_id: ['주민등록번호', '주민번호', 'RRN', 'ID Number'],
  address: ['주소', '거주지', '집주소', 'Address'],
};

const norm = (s) => String(s ?? '').toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9가-힣]/g, '').trim();

const levenshtein = (a, b) => {
  const s = norm(a), t = norm(b);
  if (!s) return t.length; if (!t) return s.length;
  const dp = Array.from({ length: s.length + 1 }, () => new Array(t.length + 1).fill(0));
  for (let i = 0; i <= s.length; i++) dp[i][0] = i;
  for (let j = 0; j <= t.length; j++) dp[0][j] = j;
  for (let i = 1; i <= s.length; i++)
    for (let j = 1; j <= t.length; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  return dp[s.length][t.length];
};

const similarity = (a, b) => { const s = norm(a), t = norm(b); return 1 - levenshtein(s, t) / Math.max(s.length, t.length, 1); };

const bestMatch = (header, candidates) => {
  const h = norm(header); if (!h) return 0;
  let best = 0;
  for (const c of candidates) {
    const cc = norm(c); if (!cc) continue;
    best = Math.max(best, h.includes(cc) || cc.includes(h) ? 0.92 : 0, similarity(h, cc));
  }
  return best;
};

const extractRrnDigits = (text) => { const s = String(text ?? ''); const m = s.match(/(\d{6})[- ]?(\d{7})/); if (m) return m[1]+m[2]; const d = s.replace(/\D/g, ''); return d.length === 13 ? d : ''; };
const formatRrn = (d13) => { const d = String(d13||'').replace(/\D/g,''); return d.length === 13 ? `${d.slice(0,6)}-${d.slice(6)}` : ''; };
const birthFromRrn = (d13) => {
  const d = String(d13||'').replace(/\D/g,''); if (!/^\d{13}$/.test(d)) return '';
  const yy = Number(d.slice(0,2)), mm = Number(d.slice(2,4)), dd = Number(d.slice(4,6)), g = Number(d[6]);
  if (!(mm>=1&&mm<=12) || !(dd>=1&&dd<=31)) return '';
  let c = 1900; if([3,4,7,8].includes(g)) c=2000; if([9,0].includes(g)) c=1800;
  return `${c+yy}-${String(mm).padStart(2,'0')}-${String(dd).padStart(2,'0')}`;
};
const normBirthIso = (text) => {
  const s = String(text??'').trim();
  // YYYY-MM-DD or YYYY/MM/DD
  const m1 = s.match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
  if (m1) return `${m1[1]}-${m1[2].padStart(2,'0')}-${m1[3].padStart(2,'0')}`;
  // YYYYMMDD (8자리)
  const m2 = s.match(/(^|[^0-9])(\d{4})(\d{2})(\d{2})([^0-9]|$)/);
  if (m2) return `${m2[2]}-${m2[3]}-${m2[4]}`;
  // YYMMDD (6자리) — 엑셀에서 흔한 형식
  const m3 = s.match(/^(\d{6})$/);
  if (m3) {
    const yy = Number(s.slice(0,2));
    const yyyy = yy <= 29 ? 2000 + yy : 1900 + yy;
    return `${yyyy}-${s.slice(2,4)}-${s.slice(4,6)}`;
  }
  return '';
};

function parseExcelInBrowser(arrayBuffer) {
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return { mapping: {}, students: [] };
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
  if (!rows.length) return { mapping: {}, students: [] };

  // 헤더 행 자동 탐지
  let bestH = { idx: 0, header: (rows[0]||[]).map(h=>String(h??'').trim()), fieldToCol: {}, matched: 0, score: 0 };
  for (let r = 0; r < Math.min(rows.length, 30); r++) {
    const row = rows[r]||[], header = row.map(h=>String(h??'').trim());
    const nonEmpty = header.filter(h=>h!=='');
    if (nonEmpty.length===1 && /학생|명부/.test(nonEmpty[0])) continue;
    const ftc = {}; let matched=0, total=0;
    for (const field of Object.keys(FIELD_DICT)) {
      let bf = { col:-1, score:0 };
      for (let i=0; i<header.length; i++) { const sc = bestMatch(header[i], FIELD_DICT[field]); if(sc>bf.score) bf={col:i,score:sc}; }
      if (bf.col>=0 && bf.score>=0.75) { ftc[field]=bf; matched++; total+=bf.score; }
    }
    const eff = total + ((ftc.name?.score??0)>=0.75?0.5:0);
    if (matched > bestH.matched || (matched===bestH.matched && eff>bestH.score))
      bestH = { idx:r, header, fieldToCol:ftc, matched, score:eff };
  }
  if (bestH.matched < 2) bestH = { idx:0, header:(rows[0]||[]).map(h=>String(h??'').trim()), fieldToCol:{}, matched:0, score:0 };

  const students = [];
  for (let r = bestH.idx+1; r < rows.length; r++) {
    const row = rows[r]||[];
    const get = (field) => { const m = bestH.fieldToCol[field]; return m ? String(row[m.col]??'').trim() : ''; };
    const rrnD = extractRrnDigits(get('resident_id'));
    const rid = rrnD ? formatRrn(rrnD) : '';
    const bd = rrnD ? birthFromRrn(rrnD) : normBirthIso(get('birth_date'));
    const numRaw = get('student_number').replace(/\D/g,'');
    const sn = numRaw ? String(Number(numRaw)) : String(Math.max(1, r - bestH.idx));
    const name = get('name');
    if (!name || !/[가-힣a-zA-Z]/.test(name)) continue; // 이름이 없거나 한글/영문이 아니면 건너뜀
    const item = { student_number: sn, name, birth_date: bd, resident_id: rid, address: get('address') };
    students.push(item);
  }
  return { mapping: bestH.fieldToCol, students };
}

const EXTRA_FIELDS = [
  { key: 'residentNumber', label: '주민등록번호' },
  { key: 'birthDate', label: '생년월일' },
  { key: 'address', label: '주소' },
  { key: 'sponsor', label: '전액자' },
  { key: 'remark', label: '비고' },
  { key: 'none', label: '사용 안함' },
];

const ADDABLE_FIELD_KEYS = EXTRA_FIELDS.filter((f) => f.key !== 'none').map((f) => f.key);
const SELECTED_FIELDS_STORAGE_KEY = 'studentRecords:selectedFields';

const applyResponsiveResidentField = (fields, list) => {
  const hasResidentNumber = list.some((s) => s.residentNumber && s.residentNumber.trim());
  const hasBirthDate = list.some((s) => s.birthDate && s.birthDate.trim());

  if (hasResidentNumber || !hasBirthDate) {
    return fields;
  }

  const next = [...fields];
  const residentIdx = next.indexOf('residentNumber');

  if (residentIdx !== -1) {
    next[residentIdx] = 'birthDate';
  } else if (!next.includes('birthDate')) {
    next.unshift('birthDate');
  }

  return next;
};

const getFieldWidthClass = () => 'w-[180px] min-w-[180px]';

const formatResidentNumber = (value) => {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 13);
  if (digits.length <= 6) return digits;
  return `${digits.slice(0, 6)}-${digits.slice(6)}`;
};

const digitsOnly = (s) => String(s || '').replace(/\D/g, '');

const isBlank = (s) => !s || String(s).trim() === '';

function StudentRecords() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [response, setResponse] = useState('');
  const [selectedModel] = useState('claude-3-5-sonnet-20241022');
  const [usedModel, setUsedModel] = useState('');
  const [selectedFields, setSelectedFields] = useState(() => {
    try {
      const saved = localStorage.getItem(SELECTED_FIELDS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (error) {
      console.error('Failed to restore selected student fields', error);
    }
    return ['residentNumber', 'address', 'sponsor'];
  });
  const excelInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const hwpInputRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const saveSeqRef = useRef(0);
  const hasFetchedRef = useRef(false);
  const scrollRef = useRef(null);
  const topScrollRef = useRef(null);
  const isSyncingScroll = useRef(false);
  const [scrollWidth, setScrollWidth] = useState(1200);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragScrollLeft = useRef(0);

  const withPlaceholders = (list) => {
    if (!list) return [];
    const sorted = [...list].sort((a, b) => Number(a.number) - Number(b.number));
    const maxNum = Math.max(30, sorted.length > 0 ? Number(sorted[sorted.length - 1].number) : 0, 30);
    const rows = [];
    for (let num = 1; num <= maxNum; num += 1) {
      const found = sorted.find((s) => Number(s.number) === num);
      if (found) {
        rows.push({
          ...found,
          residentNumber: found.residentNumber || '',
          birthDate: found.birthDate || '',
          address: found.address || '',
          sponsor: found.sponsor || '',
          remark: found.remark || '',
        });
      } else if (rows.length < 30) {
        rows.push({
          id: `temp-${num}`,
          number: num,
          name: '',
          residentNumber: '',
          birthDate: '',
          address: '',
          sponsor: '',
          remark: '',
        });
      }
    }
    // Ensure at least 30 rows
    while (rows.length < 30) {
      const num = rows.length + 1;
      rows.push({
        id: `temp-${num}`,
        number: num,
        name: '',
        residentNumber: '',
        birthDate: '',
        address: '',
        sponsor: '',
        remark: '',
      });
    }
    return rows;
  };

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const userId = localStorage.getItem('userId') || '';
        const res = await client.get('/api/students', { params: { userId } });
        const list = res.data && res.data.length > 0 ? res.data : [];
        setStudents(withPlaceholders(list));
        setSelectedFields((prev) => applyResponsiveResidentField(prev, list));
        hasFetchedRef.current = true;
      } catch (error) {
        console.error("Failed to fetch students", error);
        // Fallback to empty rows
        setStudents(withPlaceholders([]));
        hasFetchedRef.current = true;
      }
    };
    fetchStudents();
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  // Include existing rows even if name is cleared, so 번호 stays.
  const buildPayload = (list) =>
    list
      .filter((s) => {
        const hasNumber = s.number && Number(s.number) > 0;
        const hasAnyField =
          (s.name && s.name.trim() !== '') ||
          (s.residentNumber && s.residentNumber.trim() !== '') ||
          (s.birthDate && s.birthDate.trim() !== '') ||
          (s.address && s.address.trim() !== '') ||
          (s.sponsor && s.sponsor.trim() !== '') ||
          (s.remark && s.remark.trim() !== '');
        return hasNumber && hasAnyField;
      })
      .map((s) => ({
        number: s.number,
        name: (s.name || '').trim(),
        residentNumber: (s.residentNumber || '').trim(),
        birthDate: (s.birthDate || '').trim(),
        address: (s.address || '').trim(),
        sponsor: (s.sponsor || '').trim(),
        remark: (s.remark || '').trim(),
      }));

  const saveStudents = async (list, mode = 'manual') => {
    const seq = (saveSeqRef.current += 1);
    setIsSaving(true);
    setSaveMessage(mode === 'auto' ? '자동 저장 중...' : '저장 중...');
    try {
      const payload = { students: buildPayload(list), userId: localStorage.getItem('userId') || '' };
      const res = await client.post('/api/students', payload);
      const savedList = Array.isArray(res.data) ? res.data : [];
      // Ignore out-of-order responses so stale saves don't overwrite newer edits.
      if (seq !== saveSeqRef.current) return;
      setStudents(withPlaceholders(savedList));
      setSelectedFields((prev) => applyResponsiveResidentField(prev, savedList));
      setSaveMessage(mode === 'auto' ? '자동 저장되었습니다.' : '저장되었습니다.');
    } catch (error) {
      console.error("Failed to save students", error);
      if (seq !== saveSeqRef.current) return;
      setSaveMessage('저장 중 오류가 발생했습니다.');
    } finally {
      if (seq !== saveSeqRef.current) return;
      setIsSaving(false);
    }
  };

  const triggerAutoSave = (nextList) => {
    if (!hasFetchedRef.current) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setSaveMessage('자동 저장 대기 중...');
    saveTimeoutRef.current = setTimeout(() => {
      saveStudents(nextList, 'auto');
    }, 1200);
  };

  const handleFieldChange = (rowId, key, value) => {
    const next = students.map((student) => {
      const sid = student.student_id ?? student.id;
      return sid === rowId ? { ...student, [key]: value } : student;
    });
    setStudents(next);
    triggerAutoSave(next);
  };

  const handleFieldSelectChange = (idx, value) => {
    setSelectedFields((prev) => {
      const next = [...prev];
      if (value === 'none') {
        next.splice(idx, 1); // remove when selecting "사용 안함"
      } else {
        next[idx] = value;
      }
      return next;
    });
  };

  // Keep stable indexing back into selectedFields even if it already contains "none" entries
  // (e.g. from a previous session/hot-reload), so selecting "사용 안함" always removes the correct column.
  const visibleFieldEntries = selectedFields
    .map((field, originalIdx) => ({ field, originalIdx }))
    .filter(({ field }) => field !== 'none');

  const addRow = () => {
    const newId = students.length > 0 ? Math.max(...students.map((s) => s.number)) + 1 : 1;
    setStudents([
      ...students,
      {
      id: `temp-${newId}`,
      number: newId,
        name: '',
        residentNumber: '',
        birthDate: '',
        address: '',
        sponsor: '',
        remark: '',
      },
    ]);
  };

  const handleSave = async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    await saveStudents(students, 'manual');
  };

  const deleteAllStudents = async () => {
    const ok = window.confirm('정말 전체 삭제하시겠습니까?');
    if (!ok) return;

    try {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      // Clearing with empty payload will clear DB rows on backend; UI keeps placeholders.
      await saveStudents(withPlaceholders([]), 'manual');
    } catch (e) {
      console.error('Failed to delete all students', e);
    }
  };

  const handlePromptSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await client.post('/api/prompts', { 
        content: prompt,
        ai_model: selectedModel 
      });
      setResponse(res.data.generated_document);
      setUsedModel(res.data.ai_model);
    } catch (error) {
      console.error("Failed to submit prompt", error);
      setResponse("오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExcelUpload = async (f) => {
    if (!f) return;
    try {
      setSaveMessage('엑셀 업로드 중...');

      // 브라우저에서 직접 엑셀 파싱 (NestJS 의존 제거)
      const arrayBuffer = await f.arrayBuffer();
      const { students: parsed } = parseExcelInBrowser(arrayBuffer);

      if (!parsed.length) {
        setSaveMessage('엑셀에서 학생 정보를 찾지 못했습니다.');
        return;
      }

      // 파싱된 데이터를 화면에 즉시 표시 (체감 0.1초)
      const localList = parsed.map((s, i) => ({
        id: `excel-${i}`,
        number: Number(s.student_number) || (i + 1),
        name: s.name || '',
        residentNumber: s.resident_id || '',
        birthDate: s.birth_date || '',
        address: s.address || '',
        sponsor: '',
        remark: '',
      }));
      setStudents(withPlaceholders(localList));
      setSaveMessage(`엑셀 반영 완료: ${parsed.length}명`);

      // 서버 저장은 백그라운드로 (화면은 절대 덮어쓰지 않음)
      const serverPayload = { students: localList, userId: localStorage.getItem('userId') || '' };
      client.post('/api/students', serverPayload)
        .catch(err => console.error('Background save failed', err));

      setSelectedFields((prev) => applyResponsiveResidentField(prev, localList));
    } catch (e) {
      console.error('Excel upload failed', e);
      setSaveMessage('');
    }
  };

  const handleImageUpload = async (f) => {
    if (!f) return;
    try {
      setSaveMessage('이미지 OCR 분석 중...');
      const formData = new FormData();
      formData.append('file', f);
      const res = await client.post('/student-records/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      const savedList = Array.isArray(res.data?.saved) ? res.data.saved : [];
      if (savedList.length > 0) {
        setStudents(withPlaceholders(savedList));
        setSaveMessage(`OCR 반영 완료: ${savedList.length}명`);
      } else {
        setSaveMessage('OCR 결과가 없습니다.');
      }

      if (res.data?.text) {
        setResponse(`[OCR 추출 텍스트]\n${res.data.text}`);
      }
    } catch (e) {
      console.error('Image upload failed', e);
      setSaveMessage('이미지 처리 실패');
    }
  };

  const handleHwpUpload = async (f) => {
    if (!f) return;
    try {
      setSaveMessage('한글 파일 분석 중...');
      const formData = new FormData();
      formData.append('file', f);
      const res = await client.post('/student-records/upload-hwp', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.error) {
        setSaveMessage('한글 파일 처리 실패 (지원 예정)');
        setResponse(`[오류] ${res.data.error}`);
        return;
      }
      
      const savedList = Array.isArray(res.data?.saved) ? res.data.saved : [];
      if (savedList.length > 0) {
        setStudents(withPlaceholders(savedList));
        setSaveMessage(`한글 파일 반영 완료: ${savedList.length}명`);
      } else {
        setSaveMessage('데이터를 찾을 수 없습니다.');
      }

      if (res.data?.text) {
        setResponse(`[HWP 추출 텍스트]\n${res.data.text}`);
      }
    } catch (e) {
      console.error('HWP upload failed', e);
      setSaveMessage('한글 파일 처리 실패');
    }
  };

  const syncScrollPositions = (source, target, left) => {
    if (!source.current || !target.current) return;
    if (isSyncingScroll.current) return;
    isSyncingScroll.current = true;
    target.current.scrollLeft = left;
    // Allow the other handler to run after this frame
    setTimeout(() => {
      isSyncingScroll.current = false;
    }, 0);
  };

  const handleTopScroll = () => {
    if (!topScrollRef.current) return;
    syncScrollPositions(topScrollRef, scrollRef, topScrollRef.current.scrollLeft);
  };

  const handleBottomScroll = () => {
    if (!scrollRef.current) return;
    syncScrollPositions(scrollRef, topScrollRef, scrollRef.current.scrollLeft);
  };

  useEffect(() => {
    const updateWidth = () => {
      if (scrollRef.current) {
        setScrollWidth(scrollRef.current.scrollWidth || 1200);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      setScrollWidth(scrollRef.current.scrollWidth || 1200);
    }
  }, [selectedFields, students]);

  useEffect(() => {
    try {
      localStorage.setItem(SELECTED_FIELDS_STORAGE_KEY, JSON.stringify(selectedFields));
    } catch (error) {
      console.error('Failed to persist selected student fields', error);
    }
  }, [selectedFields]);

  const scrollByAmount = (delta) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: delta, behavior: 'smooth' });
    }
  };

  const handleMouseDown = (e) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    dragStartX.current = e.pageX;
    dragScrollLeft.current = scrollRef.current.scrollLeft;
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !scrollRef.current) return;
    const walk = dragStartX.current - e.pageX;
    scrollRef.current.scrollLeft = dragScrollLeft.current + walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">학생명부</h1>
          <p className="mt-1 text-sm text-gray-500">학생 관련 정보를 관리합니다.</p>
        </div>
        <div className="flex items-start gap-3 ml-auto">
          <span className="text-sm text-gray-600 min-w-[130px] text-right pt-2">{saveMessage}</span>
          <div className="flex flex-col items-end gap-2 mt-8">
          <button 
            onClick={() => navigate('/dashboard')}
            className="text-primary-600 hover:text-primary-900 font-medium"
          >
            &larr; 홈으로
          </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`inline-flex items-center px-4 py-2 border border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 ${isSaving ? 'bg-gray-400' : 'bg-white hover:bg-gray-50 border-gray-300'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-colors`}
            >
              {isSaving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="bg-white shadow rounded-lg overflow-hidden h-full flex flex-col w-full">
          <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 sticky top-0 z-10">
            <div className="flex flex-nowrap items-center w-full min-w-0">
              <span className="text-sm text-gray-700 font-medium truncate">
                학생 이름 입력 후 저장을 눌러주세요.
              </span>
              <input
                ref={excelInputRef}
                type="file"
                className="hidden"
                accept=".xls,.xlsx,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                onChange={(e) => {
                  const f = e.target.files && e.target.files[0];
                  if (f) handleExcelUpload(f);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => excelInputRef.current && excelInputRef.current.click()}
                className={`shrink-0 ml-3 inline-flex items-center justify-center px-3 py-1.5 rounded-md text-sm leading-[1.2] font-semibold border ${
                  isSubmitting ? 'bg-gray-200 text-gray-500 border-gray-200' : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50'
                }`}
                title="액셀 파일 업로드(.xls/.xlsx/.csv)"
              >
                액셀 파일 업로드
              </button>
              <button
                type="button"
                onClick={deleteAllStudents}
                className="shrink-0 ml-3 inline-flex items-center justify-center px-3 py-1.5 rounded-md text-sm leading-[1.2] font-semibold !text-white bg-gray-900 hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-900 disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={isSaving}
                aria-label="학생명부 전체 삭제"
                title="학생명부 전체 삭제"
              >
                전체 삭제
              </button>
            </div>
          </div>
          {/* Top horizontal scrollbar */}
          <div className="bg-gray-50 px-6 py-2 border-b border-gray-200">
            <div
              ref={topScrollRef}
              onScroll={handleTopScroll}
              className="overflow-x-auto w-full h-3"
            >
              <div style={{ width: `${scrollWidth}px` }} className="h-2 rounded-full bg-gray-200" />
            </div>
          </div>
          <div className="relative">
            <div
              className="overflow-x-auto w-full cursor-grab active:cursor-grabbing"
              ref={scrollRef}
              onScroll={handleBottomScroll}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {/* Flex-based "table" layout (no table/grid/colgroup/space-between) */}
              <div className="inline-flex w-max flex-col" data-sr-gapref>
                {/* Header row */}
                <div className="bg-gray-50 border-b border-gray-200 px-2 py-3">
                  <div className="flex items-center justify-start" data-sr-header-parent>
                    {/* Left group: 번호 + 이름 (fixed group, gap-only) */}
                    <div className="flex items-center gap-3 whitespace-nowrap flex-shrink-0" data-sr-left>
                      <div className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-[44px]">
                        번호
                      </div>
                      <div className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap w-[120px]">
                        <span data-sr-name>이름</span>
                      </div>
                    </div>

                    {/* Right group: selectable tabs accumulate to the right with a single fixed margin-left */}
                    <div className="flex items-center gap-3 whitespace-nowrap" data-sr-tabs>
                      {visibleFieldEntries.map(({ field, originalIdx }) => (
                        <div
                          key={`h-${field}-${originalIdx}`}
                          className={getFieldWidthClass(field)}
                          data-sr-field={field}
                        >
                          <select
                            value={field}
                            onChange={(e) => handleFieldSelectChange(originalIdx, e.target.value)}
                            className="text-xs border rounded px-2 py-1 bg-white w-full text-center"
                          >
                            {EXTRA_FIELDS.map((opt) => (
                              <option key={opt.key} value={opt.key}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() =>
                          setSelectedFields((prev) => {
                            const used = new Set(prev);
                            const nextKey = ADDABLE_FIELD_KEYS.find((k) => !used.has(k)) || 'residentNumber';
                            return [...prev, nextKey];
                          })
                        }
                        className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 text-sm"
                        title="필드 추가"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Body rows */}
                <div className="bg-white">
              {students.map((student) => (
                    <div
                      key={student.student_id || student.id}
                      className="flex items-center border-b border-gray-200 hover:bg-gray-50 px-2"
                    >
                      {/* Left group cells */}
                      <div className="flex items-center gap-3 whitespace-nowrap py-2 flex-shrink-0" data-sr-left>
                        <div className="w-[44px] text-sm font-medium text-gray-900 text-center">
                    {student.number}
                        </div>
                        <div className="w-[120px]">
                    <input
                      type="text"
                      value={student.name}
                            onChange={(e) =>
                              handleFieldChange(student.student_id ?? student.id, 'name', e.target.value)
                            }
                            className="w-full min-w-0 border-0 focus:ring-2 focus:ring-primary-500 rounded-md px-0 py-2 text-sm text-center"
                            placeholder=""
                          />
                        </div>
                      </div>

                      {/* Right group cells */}
                      <div className="flex items-center gap-3 whitespace-nowrap py-2" data-sr-tabs>
                        {visibleFieldEntries.map(({ field, originalIdx }) => (
                          <div key={`c-${student.id}-${field}-${originalIdx}`} className={getFieldWidthClass(field)}>
                            {field ? (
                              <input
                                type="text"
                                inputMode={field === 'residentNumber' ? 'numeric' : undefined}
                                value={student[field] || ''}
                                onChange={(e) => {
                                  const nextValue =
                                    field === 'residentNumber'
                                      ? formatResidentNumber(e.target.value)
                                      : e.target.value;
                                  handleFieldChange(student.student_id ?? student.id, field, nextValue);
                                }}
                                maxLength={field === 'residentNumber' ? 14 : undefined}
                      className="w-full border-0 focus:ring-2 focus:ring-primary-500 rounded-md px-3 py-2 text-sm"
                                placeholder=""
                              />
                            ) : null}
                          </div>
                        ))}
                        {/* Spacer so rows match header height even if right group empty */}
                        <div className="w-8" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <style>{`
                /* Use 번호–이름 "실제 간격"을 기준값으로 삼아 이름–주민등록번호 간격에 그대로 복제 */
                [data-sr-gapref] {
                  --sr-gap: 12px;
                }
                /* Force header spacing between '이름' and '주민등록번호' regardless of layout changes */
                [data-sr-header-parent] {
                  justify-content: flex-start !important;
                  gap: 0 !important;
                }
                [data-sr-tabs] {
                  margin-left: var(--sr-gap) !important;
                }
                [data-sr-left] {
                  gap: var(--sr-gap) !important;
                }
              `}</style>
            </div>
        </div>
        <div className="w-full flex justify-center py-4 border-t border-gray-200">
          <button
            onClick={addRow}
            className="inline-flex items-center px-4 py-2 border border-black text-sm font-medium rounded-md text-white bg-black hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-700 transition-colors"
          >
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            학생 추가
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}

export default StudentRecords;
