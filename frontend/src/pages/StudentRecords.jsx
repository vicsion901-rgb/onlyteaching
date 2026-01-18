import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';

const EXTRA_FIELDS = [
  { key: 'residentNumber', label: '주민등록번호' },
  { key: 'address', label: '주소' },
  { key: 'sponsor', label: '전액자' },
  { key: 'remark', label: '비고' },
  { key: 'none', label: '사용 안함' },
];

const ADDABLE_FIELD_KEYS = EXTRA_FIELDS.filter((f) => f.key !== 'none').map((f) => f.key);

const getFieldWidthClass = () => 'w-[180px] min-w-[180px]';

const formatResidentNumber = (value) => {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 13);
  if (digits.length <= 6) return digits;
  return `${digits.slice(0, 6)}-${digits.slice(6)}`;
};

const TESSERACT_CDN = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';

const loadTesseract = () =>
  new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && window.Tesseract) return resolve(window.Tesseract);
    const existing = document.querySelector(`script[src="${TESSERACT_CDN}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.Tesseract));
      existing.addEventListener('error', reject);
      return;
    }
    const script = document.createElement('script');
    script.src = TESSERACT_CDN;
    script.async = true;
    script.onload = () => resolve(window.Tesseract);
    script.onerror = reject;
    document.head.appendChild(script);
  });

const digitsOnly = (s) => String(s || '').replace(/\D/g, '');

const isBlank = (s) => !s || String(s).trim() === '';

const normalizeHeader = (s) => String(s || '').replace(/\s+/g, '');

const cleanHangulName = (s) => {
  const raw = String(s || '');
  // Keep Hangul and spaces only.
  const cleaned = raw.replace(/[^가-힣\s]/g, '').replace(/\s+/g, ' ').trim();
  return cleaned.length >= 2 ? cleaned : '';
};

const isValidRrnDigits = (digits13) => {
  const d = String(digits13 || '');
  if (!/^\d{13}$/.test(d)) return false;
  const yy = Number(d.slice(0, 2));
  const mm = Number(d.slice(2, 4));
  const dd = Number(d.slice(4, 6));
  // Basic plausibility checks (month/day range). We don't infer century here.
  if (!(mm >= 1 && mm <= 12)) return false;
  if (!(dd >= 1 && dd <= 31)) return false;
  // 7th digit typically 1-4 (Korean resident reg.); allow 5-8 for foreigners to avoid false negatives.
  const g = Number(d[6]);
  if (!(g >= 1 && g <= 8)) return false;
  // Avoid obviously bogus values (all same digit).
  if (/^(\d)\1{12}$/.test(d)) return false;
  return true;
};

const cleanAddress = (s) => {
  const raw = String(s || '').replace(/\s+/g, ' ').trim();
  const hangulCount = (raw.match(/[가-힣]/g) || []).length;
  // If it's mostly not Korean text, treat as garbage.
  if (hangulCount < 3) return '';
  // Strip weird control chars.
  return raw.replace(/[^\w가-힣\s\-()\.·,]/g, '').trim();
};

const median = (arr) => {
  if (!arr.length) return 0;
  const a = [...arr].sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 === 0 ? (a[mid - 1] + a[mid]) / 2 : a[mid];
};

const clusterWordsIntoRows = (words) => {
  const w = (words || [])
    .filter((x) => x && x.text && String(x.text).trim() !== '')
    .map((x) => ({
      text: String(x.text),
      bbox: x.bbox,
      x: (x.bbox.x0 + x.bbox.x1) / 2,
      y: (x.bbox.y0 + x.bbox.y1) / 2,
      h: x.bbox.y1 - x.bbox.y0,
    }))
    .sort((a, b) => a.y - b.y);

  const hMed = median(w.map((x) => x.h)) || 14;
  const threshold = Math.max(8, hMed * 0.7);

  const rows = [];
  for (const item of w) {
    const last = rows[rows.length - 1];
    if (!last || Math.abs(item.y - last.y) > threshold) {
      rows.push({ y: item.y, items: [item] });
    } else {
      last.items.push(item);
      last.y = (last.y * (last.items.length - 1) + item.y) / last.items.length;
    }
  }
  return rows.map((r) => r.items.sort((a, b) => a.x - b.x));
};

const parseRosterFromOcrWords = (words) => {
  const rows = clusterWordsIntoRows(words);
  if (!rows.length) return [];

  const headerKeys = {
    name: ['성명', '이름'],
    residentNumber: ['주민등록번호', '주민번호', '주민등록'],
    address: ['주소'],
  };

  const headerIdx = rows.findIndex((r) => {
    const joined = normalizeHeader(r.map((x) => x.text).join(''));
    const hits =
      (headerKeys.name.some((k) => joined.includes(k)) ? 1 : 0) +
      (headerKeys.residentNumber.some((k) => joined.includes(k)) ? 1 : 0) +
      (headerKeys.address.some((k) => joined.includes(k)) ? 1 : 0);
    return hits >= 2;
  });

  const rrnPattern = /(\d{6})[- ]?(\d{7})/;

  const extractRowNumberFromRow = (r) => {
    // Excel roster usually has "순" column at far left with 1..N.
    // Pick the left-most short integer token as row number.
    const candidates = (r || [])
      .map((w) => {
        const t = String(w.text || '').trim();
        const d = digitsOnly(t);
        const n = d ? Number(d) : NaN;
        return { n, x: w.x, len: d.length };
      })
      .filter((c) => Number.isFinite(c.n) && c.len > 0 && c.len <= 2 && c.n >= 1 && c.n <= 60);

    if (!candidates.length) return null;
    candidates.sort((a, b) => a.x - b.x);
    return candidates[0].n;
  };

  const extractRrnDigitsFromText = (text) => {
    const s = String(text || '');
    const m = s.match(rrnPattern);
    if (m) return `${m[1]}${m[2]}`;
    const d = digitsOnly(s);
    return d.length === 13 ? d : '';
  };

  const extractRrnDigitsFromRow = (r) => {
    for (const w of r) {
      const d = extractRrnDigitsFromText(w.text);
      if (d) return d;
    }
    return '';
  };

  const looksLikeDataRow = (r) => {
    // Only treat as a student row if we can find an actual 주민번호 token (13 digits / 6-7 pattern).
    return Boolean(extractRrnDigitsFromRow(r));
  };

  const pickNameNearRrn = (r) => {
    // Find the 주민번호 token, then pick the nearest Hangul-heavy token to its left.
    const rrnIdx = r.findIndex((w) => Boolean(extractRrnDigitsFromText(w.text)));
    if (rrnIdx < 0) return '';
    const left = r.slice(0, rrnIdx).reverse();
    const candidate = left.find((w) => (w.text.match(/[가-힣]/g) || []).length >= 2);
    const picked = candidate ? candidate.text.trim() : '';
    return cleanHangulName(picked);
  };

  const parseByResidentNumberPattern = () => {
    const out = [];
    for (const r of rows) {
      if (!looksLikeDataRow(r)) continue;
      const rrnDigits = extractRrnDigitsFromRow(r);
      if (!rrnDigits || !isValidRrnDigits(rrnDigits)) continue;
      const name = pickNameNearRrn(r);
      const number = extractRowNumberFromRow(r);

      // Address is optional; try to grab Hangul text to the right of rrn that looks like an address.
      const rrnIdx = r.findIndex((w) => Boolean(extractRrnDigitsFromText(w.text)));
      const rightText = rrnIdx >= 0 ? r.slice(rrnIdx + 1).map((x) => x.text).join(' ').trim() : '';
      const address =
        /[가-힣]/.test(rightText) && /(로|길|동|번지|호)/.test(rightText) ? cleanAddress(rightText) : '';

      const item = {
        name: cleanHangulName(name),
        residentNumber: rrnDigits ? formatResidentNumber(rrnDigits) : '',
        address: cleanAddress(address),
        number,
      };
      // If something is unclear, keep it empty rather than adding garbage.
      if (isBlank(item.name)) item.name = '';
      if (isBlank(item.address)) item.address = '';
      if (isBlank(item.residentNumber)) item.residentNumber = '';
      if (isBlank(item.name) && isBlank(item.residentNumber) && isBlank(item.address)) continue;
      out.push(item);
    }
    return out;
  };

  // Try header-based parsing first. If header isn't detected, fall back to 주민번호 패턴 기반 파싱.
  if (headerIdx < 0) {
    return parseByResidentNumberPattern();
  }

  const startIdx = headerIdx;
  const headerRow = rows[startIdx];

  const findHeaderX = (keys) => {
    const joined = headerRow.map((x) => ({ t: normalizeHeader(x.text), x: x.x }));
    const hit = joined.find((w) => keys.some((k) => w.t.includes(k)));
    return hit ? hit.x : null;
  };

  const colCenters = [
    { key: 'name', x: findHeaderX(headerKeys.name) },
    { key: 'residentNumber', x: findHeaderX(headerKeys.residentNumber) },
    { key: 'address', x: findHeaderX(headerKeys.address) },
  ].filter((c) => typeof c.x === 'number');

  // If we can't locate at least 2 header columns, fall back to 주민번호 패턴 기반 파싱.
  if (colCenters.length < 2) return parseByResidentNumberPattern();

  colCenters.sort((a, b) => a.x - b.x);
  const bounds = [];
  for (let i = 0; i < colCenters.length - 1; i += 1) {
    bounds.push((colCenters[i].x + colCenters[i + 1].x) / 2);
  }

  const assignCol = (x) => {
    for (let i = 0; i < bounds.length; i += 1) {
      if (x < bounds[i]) return colCenters[i].key;
    }
    return colCenters[colCenters.length - 1].key;
  };

  const out = [];
  for (const r of rows.slice(startIdx + 1)) {
    const cells = { name: [], residentNumber: [], address: [] };
    for (const w of r) {
      const key = assignCol(w.x);
      if (cells[key]) cells[key].push(w.text);
    }
    const name = cleanHangulName((cells.name || []).join(' ').trim());
    const rrnDigitsRaw = extractRrnDigitsFromText((cells.residentNumber || []).join(' '));
    const rrnDigits = isValidRrnDigits(rrnDigitsRaw) ? rrnDigitsRaw : '';
    const address = cleanAddress((cells.address || []).join(' ').trim());
    const item = {
      name,
      residentNumber: rrnDigits ? formatResidentNumber(rrnDigits) : '',
      address,
      number: extractRowNumberFromRow(r),
    };
    // Hard filter: only accept rows that have a valid 13-digit 주민번호.
    const rrnLen = digitsOnly(item.residentNumber).length;
    if (rrnLen !== 13) continue;
    out.push(item);
  }
  // If header-based parse yielded nothing, fall back to 주민번호 패턴 기반 파싱.
  return out.length ? out : parseByResidentNumberPattern();
};

const preprocessImageForOcr = async (file) => {
  const img = await createImageBitmap(file);
  const scale = 2; // upscale helps OCR a lot for phone photos
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // Simple grayscale + contrast + threshold (binarize)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imageData.data;
  const threshold = 170;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    // luminance
    let y = 0.299 * r + 0.587 * g + 0.114 * b;
    // contrast stretch
    y = (y - 128) * 1.3 + 128;
    const v = y > threshold ? 255 : 0;
    d[i] = v;
    d[i + 1] = v;
    d[i + 2] = v;
  }
  ctx.putImageData(imageData, 0, 0);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  return blob || file;
};

function StudentRecords() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [file, setFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [response, setResponse] = useState('');
  const [selectedModel] = useState('claude-3-5-sonnet-20241022');
  const [usedModel, setUsedModel] = useState('');
  const [selectedFields, setSelectedFields] = useState(['residentNumber', 'address', 'sponsor']);
  const [isOcrRunning, setIsOcrRunning] = useState(false);
  const [ocrMessage, setOcrMessage] = useState('');
  const ocrInputRef = useRef(null);
  const hwpInputRef = useRef(null);
  const excelInputRef = useRef(null);
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
        const res = await client.get('/student-records/list');
        const list = res.data && res.data.length > 0 ? res.data : [];
        setStudents(withPlaceholders(list));
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
          (s.address && s.address.trim() !== '') ||
          (s.sponsor && s.sponsor.trim() !== '') ||
          (s.remark && s.remark.trim() !== '');
        return hasNumber && hasAnyField;
      })
      .map((s) => ({
        number: s.number,
        name: (s.name || '').trim(),
        residentNumber: (s.residentNumber || '').trim(),
        address: (s.address || '').trim(),
        sponsor: (s.sponsor || '').trim(),
        remark: (s.remark || '').trim(),
      }));

  const saveStudents = async (list, mode = 'manual') => {
    const seq = (saveSeqRef.current += 1);
    setIsSaving(true);
    setSaveMessage(mode === 'auto' ? '자동 저장 중...' : '저장 중...');
    try {
      const payload = buildPayload(list);
      const res = await client.post('/student-records/bulk', payload);
      const savedList = Array.isArray(res.data) ? res.data : [];
      // Ignore out-of-order responses so stale saves don't overwrite newer edits.
      if (seq !== saveSeqRef.current) return;
      setStudents(withPlaceholders(savedList));
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

  const handlePromptSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let res;
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        if (prompt) formData.append('prompt', prompt);
        formData.append('ai_model', selectedModel);
        
        res = await client.post('/prompts/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        setResponse(res.data.generated_document || JSON.stringify(res.data, null, 2));
        setUsedModel(res.data.ai_model || selectedModel);
      } else {
        res = await client.post('/prompts/', { 
          content: prompt,
          ai_model: selectedModel 
        });
        setResponse(res.data.generated_document);
        setUsedModel(res.data.ai_model);
      }
    } catch (error) {
      console.error("Failed to submit prompt", error);
      setResponse("오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
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

  // Treat a row as "filled" only if it contains meaningful data.
  // This prevents OCR garbage like "~", "i", etc. from blocking auto-fill.
  const isRowFilled = (s) => {
    const name = String(s?.name || '').trim();
    const rrnDigits = digitsOnly(String(s?.residentNumber || ''));
    const address = String(s?.address || '').trim();
    const sponsor = String(s?.sponsor || '').trim();
    const remark = String(s?.remark || '').trim();

    const nameHangul = (name.match(/[가-힣]/g) || []).length;
    const addressHangul = (address.match(/[가-힣]/g) || []).length;

    return Boolean(
      nameHangul >= 2 ||
        rrnDigits.length === 13 ||
        addressHangul >= 3 ||
        sponsor !== '' ||
        remark !== '',
    );
  };

  const applyOcrRowsToStudents = (current, ocrRows) => {
    const next = current.map((s) => ({ ...s }));
    const fillRow = (idx, r) => {
      next[idx] = {
        ...next[idx],
        name: r.name || '',
        residentNumber: r.residentNumber ? formatResidentNumber(r.residentNumber) : '',
        address: r.address || '',
      };
    };

    // 1) If OCR extracted explicit row numbers ("순"), map them directly.
    for (const r of ocrRows) {
      if (!r || !r.number) continue;
      const idx = Number(r.number) - 1;
      if (idx < 0 || idx >= next.length) continue;
      if (isRowFilled(next[idx])) continue; // don't overwrite meaningful user-entered rows
      fillRow(idx, r);
    }

    // 2) Fill remaining OCR rows into the next empty rows.
    let cursor = 0;
    for (const r of ocrRows) {
      if (r && r.number) continue; // already mapped above
      while (cursor < next.length && isRowFilled(next[cursor])) cursor += 1;
      if (cursor >= next.length) break;
      fillRow(cursor, r || {});
      cursor += 1;
    }
    return next;
  };

  const handleRosterImageOcr = async (imgFile) => {
    if (!imgFile) return;
    try {
      setIsOcrRunning(true);
      setOcrMessage('OCR 라이브러리 로딩 중...');
      const Tesseract = await loadTesseract();
      if (!Tesseract || typeof Tesseract.recognize !== 'function') {
        throw new Error('Tesseract 로드 실패');
      }

      setOcrMessage('이미지 전처리 중...');
      const preprocessed = await preprocessImageForOcr(imgFile);

      setOcrMessage('OCR 인식 중...');
      const res = await Tesseract.recognize(preprocessed, 'kor+eng', {
        logger: (m) => {
          if (m && m.status === 'recognizing text' && typeof m.progress === 'number') {
            setOcrMessage(`OCR 인식 중... ${(m.progress * 100).toFixed(0)}%`);
          }
        },
      });

      // Some builds may not populate words reliably; fall back to lines (still has bbox+text).
      const words = (res?.data?.words && res.data.words.length > 0 ? res.data.words : res?.data?.lines) || [];
      const parsed = parseRosterFromOcrWords(words);
      if (!parsed.length) {
        setOcrMessage('인식 실패: 표에서 주민번호(######-#######) 패턴을 찾지 못했어요. 더 선명한 이미지로 다시 시도해 주세요.');
        return;
      }

      // Ensure needed columns are visible so user can verify results.
      setSelectedFields((prev) => {
        const next = [...prev];
        if (!next.includes('residentNumber')) next.push('residentNumber');
        if (!next.includes('address')) next.push('address');
        return next;
      });

      const merged = applyOcrRowsToStudents(students, parsed);
      setStudents(merged);
      triggerAutoSave(merged);
      setOcrMessage(`인식 완료: ${parsed.length}명 반영`);
    } catch (e) {
      console.error(e);
      setOcrMessage('OCR 실패: 이미지가 선명한지/표가 잘 보이는지 확인해 주세요.');
    } finally {
      setIsOcrRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">학생명부</h1>
          <p className="mt-1 text-sm text-gray-500">학생 번호와 이름을 관리합니다</p>
        </div>
        <div className="flex items-start gap-3 ml-auto">
          <span className="text-sm text-gray-600 min-w-[130px] text-right pt-2">{saveMessage}</span>
          <div className="flex flex-col items-end gap-2 mt-8">
          <button 
            onClick={() => navigate('/dashboard')}
            className="text-primary-600 hover:text-primary-900 font-medium"
          >
            &larr; 홈으로 돌아가기
          </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${isSaving ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors`}
            >
              {isSaving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="bg-white shadow rounded-lg overflow-hidden h-full flex flex-col lg:w-1/2">
          <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex items-center sticky top-0 z-10">
          <span className="text-sm text-gray-700 font-medium">학생 이름 입력 후 저장을 눌러주세요.</span>
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
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer?.files?.[0];
                if (f) handleRosterImageOcr(f);
              }}
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

      {/* AI Prompt Section */}
        <div className="bg-white overflow-hidden shadow rounded-lg h-full flex flex-col lg:w-1/2">
          <div className="px-4 py-5 sm:p-6 flex-1 flex flex-col">
            <h2 className="text-lg font-medium leading-6 text-gray-900 mb-4">학생명부 관련해서 무엇이든 물어보세요.</h2>
            
            <form onSubmit={handlePromptSubmit} className="flex-1 flex flex-col">
              <div className="mb-2 flex flex-col" style={{ minHeight: '480px' }}>
              <label htmlFor="prompt" className="sr-only">Prompt</label>
              <div className="relative">
                <textarea
                  id="prompt"
                    className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md p-3 pb-10 min-h-[400px] max-h-[560px] whitespace-nowrap"
                  rows={12}
                    placeholder="학생명부가 담긴 한글 문서, 엑셀 파일, 이미지 파일을 드래그해 주시면 자동 반영됩니다."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
                  <div className="absolute bottom-2 left-2 flex flex-wrap items-center gap-2">
                    {/* 업로드(공통): AI 프롬프트 파일로도 저장 + 학생명부 OCR도 동시에 실행 */}
                    <input
                      ref={ocrInputRef}
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => {
                        const f = e.target.files && e.target.files[0];
                        if (f) {
                          setFile(f);
                          handleRosterImageOcr(f);
                        }
                        // 같은 파일 재선택 가능하도록 초기화
                        e.target.value = '';
                      }}
                    />

                    {/* 한글 파일 업로드(.hwp/.hwpx) */}
                    <input
                      ref={hwpInputRef}
                      type="file"
                      className="hidden"
                      accept=".hwp,.hwpx"
                      onChange={(e) => {
                        const f = e.target.files && e.target.files[0];
                        if (f) setFile(f);
                        // 같은 파일 재선택 가능하도록 초기화
                        e.target.value = '';
                      }}
                    />

                    {/* 액셀 파일 업로드(.xls/.xlsx/.csv) */}
                    <input
                      ref={excelInputRef}
                      type="file"
                      className="hidden"
                      accept=".xls,.xlsx,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                      onChange={(e) => {
                        const f = e.target.files && e.target.files[0];
                        if (f) setFile(f);
                        // 같은 파일 재선택 가능하도록 초기화
                        e.target.value = '';
                      }}
                    />

                    <button
                      type="button"
                      disabled={isOcrRunning}
                      onClick={() => ocrInputRef.current && ocrInputRef.current.click()}
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium border ${
                        isOcrRunning
                          ? 'bg-gray-200 text-gray-500 border-gray-200'
                          : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50'
                      }`}
                      title="이미지 파일 업로드(학생명부 OCR)"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                      </svg>
                      <span>이미지 파일(jpg, png) 업로드</span>
                    </button>

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => hwpInputRef.current && hwpInputRef.current.click()}
                      className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium border ${
                        isSubmitting ? 'bg-gray-200 text-gray-500 border-gray-200' : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50'
                      }`}
                      title="한글 파일 업로드(.hwp/.hwpx)"
                    >
                      한글 파일 업로드
                    </button>

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => excelInputRef.current && excelInputRef.current.click()}
                      className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium border ${
                        isSubmitting ? 'bg-gray-200 text-gray-500 border-gray-200' : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50'
                      }`}
                      title="액셀 파일 업로드(.xls/.xlsx/.csv)"
                    >
                      액셀 파일 업로드
                    </button>

                    {ocrMessage ? <span className="text-xs text-gray-600">{ocrMessage}</span> : null}
                  </div>
              </div>
              <div className="flex justify-end mt-3">
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${isSubmitting ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500`}
                >
                  {isSubmitting ? '생성 중...' : '생성하기'}
                </button>
              </div>
            </div>
          </form>
          {response && (
            <div className="mt-6 bg-gray-50 rounded-md p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                <h3 className="text-sm font-medium text-gray-900">결과:</h3>
                {usedModel && (
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    usedModel.startsWith('claude') ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {usedModel.startsWith('claude') ? '🤖 Claude' : 
                     usedModel === 'gpt-4o-mini' ? '⚡ GPT-4o Mini' : '🧠 GPT-4o'}
                  </span>
                )}
              </div>
              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono bg-white p-3 rounded border border-gray-200">{response}</pre>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudentRecords;
