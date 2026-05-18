import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';

const STORAGE_KEY = 'subject_evaluation_recent';
const LEVELS = ['상', '중', '하'];

function SubjectEvaluation() {
  const navigate = useNavigate();
  const [achievements, setAchievements] = useState([]);
  const [achMeta, setAchMeta] = useState({ subjects: [], grade_groups: [], areas: [] });
  const [gradeFilter, setGradeFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAchLoading, setIsAchLoading] = useState(false);
  const [achLoaded, setAchLoaded] = useState(false);
  const [autoSelectedInitial, setAutoSelectedInitial] = useState(false);

  const [students, setStudents] = useState([]);
  const [studentsLoaded, setStudentsLoaded] = useState(false);

  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [manualStudentName, setManualStudentName] = useState('');

  const [selectedStandard, setSelectedStandard] = useState(null);
  const [level, setLevel] = useState('상');
  const [observation, setObservation] = useState('');
  const [evidence, setEvidence] = useState('');
  const [evalResult, setEvalResult] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copyMsg, setCopyMsg] = useState('');

  const [recentEvals, setRecentEvals] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  });
  const [recentStudentFilter, setRecentStudentFilter] = useState('');
  const writePanelRef = useRef(null);

  // 학생명부 로드
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) { setStudentsLoaded(true); return; }
    client.get('/api/students', { params: { userId } })
      .then((res) => setStudents(Array.isArray(res.data) ? res.data : []))
      .catch(() => {})
      .finally(() => setStudentsLoaded(true));
  }, []);

  // 성취기준 로드
  useEffect(() => {
    fetchAchievementStandards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gradeFilter, subjectFilter, areaFilter]);

  const fetchAchievementStandards = async () => {
    setIsAchLoading(true);
    try {
      const res = await client.get('/api/achievements', {
        params: {
          grade_group: gradeFilter || undefined,
          subject: subjectFilter || undefined,
          area: areaFilter || undefined,
        },
      });
      const raw = res.data;
      const items = Array.isArray(raw) ? raw : (raw?.items || []);
      setAchievements(items);
      const meta = (raw && !Array.isArray(raw) && raw.meta) ? raw.meta : null;
      if (meta && (meta.subjects?.length || meta.grade_groups?.length || meta.areas?.length)) {
        setAchMeta(meta);
      } else {
        // meta가 응답에 없으면 items에서 클라이언트 derive
        setAchMeta({
          subjects: [...new Set(items.map((i) => i.subject).filter(Boolean))].sort(),
          grade_groups: [...new Set(items.map((i) => String(i.grade_group)).filter(Boolean))].sort(),
          areas: [...new Set(items.map((i) => i.area).filter(Boolean))].sort(),
        });
      }
    } catch (error) {
      console.error('Failed to load achievement standards', error);
    } finally {
      setIsAchLoading(false);
      setAchLoaded(true);
    }
  };

  // 초기 자동 선택 — 메타 채워지면 첫 학년군 자동 셋
  useEffect(() => {
    if (autoSelectedInitial) return;
    if (!achLoaded) return;
    if (gradeFilter || subjectFilter) return;
    const gg = achMeta.grade_groups || [];
    if (gg.length > 0) {
      setGradeFilter(gg[0]);
      setAutoSelectedInitial(true);
    }
  }, [achLoaded, achMeta, gradeFilter, subjectFilter, autoSelectedInitial]);

  const filteredAchievements = useMemo(() => {
    if (!searchQuery.trim()) return achievements;
    const q = searchQuery.trim().toLowerCase();
    return achievements.filter((a) =>
      (a.standard || '').toLowerCase().includes(q) ||
      (a.code || '').toLowerCase().includes(q) ||
      (a.area || '').toLowerCase().includes(q),
    );
  }, [achievements, searchQuery]);

  const selectedStudent = useMemo(() => {
    if (!selectedStudentId) return null;
    return students.find((s) => String(s.id) === String(selectedStudentId)) || null;
  }, [students, selectedStudentId]);

  const selectStandard = (item) => {
    setSelectedStandard(item);
    setEvalResult('');
    setTimeout(() => writePanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  };

  const handleGenerate = async () => {
    if (!selectedStandard) return;
    const studentLabel = selectedStudent
      ? `${selectedStudent.number ? selectedStudent.number + '번 ' : ''}${selectedStudent.name || ''}`.trim()
      : (manualStudentName.trim() || '');
    setIsGenerating(true);
    setEvalResult('');
    const prompt = [
      `성취기준: ${selectedStandard.code || ''} ${selectedStandard.standard || ''}`,
      studentLabel ? `학생: ${studentLabel}` : '',
      `수행 수준: ${level}`,
      observation ? `관찰 키워드: ${observation}` : '',
      evidence ? `근거 메모: ${evidence}` : '',
      '',
      '위 정보를 바탕으로 학교 생활기록부 교과 평가문장을 한국어 1~2문장으로 정중하고 공식적인 톤으로 작성해주세요. 학생 이름이 있으면 자연스럽게 통합해주세요.',
    ].filter(Boolean).join('\n');

    let aiResult = '';
    try {
      const res = await client.post('/api/prompts', { content: prompt });
      aiResult = res.data.result || res.data.generated_document || '';
      if (aiResult.trim()) setEvalResult(aiResult.trim());
    } catch (err) {
      console.error('eval generation failed', err);
    }
    if (!aiResult.trim()) {
      setEvalResult(buildLocalEvalSentence({
        selectedStandard,
        studentName: studentLabel || (selectedStudent?.name || ''),
        level, observation, evidence,
      }));
    }
    setIsGenerating(false);
  };

  const handleSaveRecord = () => {
    if (!evalResult || !selectedStandard) return;
    const record = {
      id: Date.now(),
      studentId: selectedStudent?.id || null,
      studentNumber: selectedStudent?.number || null,
      studentName: selectedStudent?.name || manualStudentName.trim() || '미지정',
      gradeGroup: selectedStandard.grade_group,
      subject: selectedStandard.subject || '',
      area: selectedStandard.area || '',
      code: selectedStandard.code || '',
      standard: selectedStandard.standard || '',
      level,
      observation,
      evidence,
      text: evalResult,
      createdAt: new Date().toISOString(),
    };
    const next = [record, ...recentEvals].slice(0, 50);
    setRecentEvals(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
    setCopyMsg('기록 반영됨');
    setTimeout(() => setCopyMsg(''), 1500);
  };

  const handleCopy = () => {
    if (!evalResult) return;
    navigator.clipboard?.writeText(evalResult);
    setCopyMsg('복사됨');
    setTimeout(() => setCopyMsg(''), 1500);
  };

  const recentCountsByStudent = useMemo(() => {
    const map = new Map();
    for (const r of recentEvals) {
      const key = r.studentId ? String(r.studentId) : r.studentName;
      map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
  }, [recentEvals]);

  const visibleRecents = useMemo(() => {
    if (!recentStudentFilter) return recentEvals;
    return recentEvals.filter((r) => {
      const k = r.studentId ? String(r.studentId) : r.studentName;
      return k === recentStudentFilter;
    });
  }, [recentEvals, recentStudentFilter]);

  const studentChips = useMemo(() => {
    const arr = [];
    for (const r of recentEvals) {
      const key = r.studentId ? String(r.studentId) : r.studentName;
      if (!arr.find((a) => a.key === key)) {
        arr.push({ key, label: r.studentName, count: recentCountsByStudent.get(key) || 0 });
      }
      if (arr.length >= 6) break;
    }
    return arr;
  }, [recentEvals, recentCountsByStudent]);

  const filtersUntouched = !gradeFilter && !subjectFilter && !areaFilter && !searchQuery.trim();

  return (
    <div className="space-y-3 sm:space-y-4 max-w-3xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">📊 교과평가</h1>
          <p className="mt-0.5 text-[11px] sm:text-xs text-gray-500">성취기준 탐색 → 평가문장 작성 → 학생별 기록 반영</p>
        </div>
        <button onClick={() => navigate('/dashboard')} className="shrink-0 text-xs sm:text-sm font-medium text-primary-600 hover:text-primary-900">← 홈으로</button>
      </div>

      {/* ① 성취기준 탐색 */}
      <section className="rounded-xl bg-white border border-gray-200 shadow-sm p-3 sm:p-4">
        <div className="mb-2 flex items-end justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold tracking-wider text-blue-700 uppercase">① 성취기준 탐색</p>
            <h2 className="mt-0.5 text-sm sm:text-base font-bold text-gray-900">학년·교과·영역으로 평가 기준 찾기</h2>
          </div>
          {(gradeFilter || subjectFilter || areaFilter) && (
            <span className="text-[10px] text-blue-700">
              {gradeFilter && `${gradeFilter}학년군`}{subjectFilter && ` · ${subjectFilter}`}{areaFilter && ` · ${areaFilter}`}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 mb-2">
          <select value={gradeFilter} onChange={(e) => { setGradeFilter(e.target.value); setAreaFilter(''); }}
            className="rounded-md border-gray-300 text-xs sm:text-sm py-1.5 focus:border-blue-400 focus:ring-1 focus:ring-blue-300">
            <option value="">전체 학년군</option>
            {(achMeta.grade_groups || []).map((g) => <option key={g} value={g}>{g}학년군</option>)}
          </select>
          <select value={subjectFilter} onChange={(e) => { setSubjectFilter(e.target.value); setAreaFilter(''); }}
            className="rounded-md border-gray-300 text-xs sm:text-sm py-1.5 focus:border-blue-400 focus:ring-1 focus:ring-blue-300">
            <option value="">전체 교과</option>
            {(achMeta.subjects || []).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)}
            className="rounded-md border-gray-300 text-xs sm:text-sm py-1.5 focus:border-blue-400 focus:ring-1 focus:ring-blue-300">
            <option value="">전체 영역</option>
            {(achMeta.areas || []).map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="코드/문장 검색"
            className="rounded-md border-gray-300 text-xs sm:text-sm py-1.5 focus:border-blue-400 focus:ring-1 focus:ring-blue-300" />
        </div>
        <div className="space-y-1.5 max-h-[18rem] overflow-y-auto pr-1">
          {isAchLoading && (
            <div className="space-y-1.5">
              {[0, 1, 2].map((i) => (<div key={i} className="h-12 rounded-md bg-gray-100 animate-pulse" />))}
            </div>
          )}
          {!isAchLoading && achLoaded && filteredAchievements.length === 0 && (
            <div className="rounded-md bg-blue-50/50 border border-blue-100 px-2.5 py-3 text-center text-[11px] sm:text-xs text-blue-700">
              {filtersUntouched
                ? '학년군 / 교과 / 영역을 선택하거나 검색어를 입력하면 성취기준이 표시돼요.'
                : '선택한 조건에 맞는 성취기준이 없어요. 다른 필터를 시도해보세요.'}
            </div>
          )}
          {!isAchLoading && filteredAchievements.map((item) => {
            const isSelected = selectedStandard?.id === item.id;
            return (
              <div key={`${item.id}-${item.code}`}
                className={`rounded-lg border p-2 transition ${isSelected ? 'border-blue-400 bg-blue-50/40 ring-1 ring-blue-300' : 'border-gray-200 bg-white hover:border-blue-200 hover:shadow-sm'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1 mb-0.5">
                      {item.code && (<span className="inline-flex items-center rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-800">{item.code}</span>)}
                      <span className="text-[10px] text-gray-500 truncate">{item.subject} · {item.grade_group}학년군 · {item.area}</span>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-900 leading-snug line-clamp-2">{item.standard}</p>
                  </div>
                  <button type="button" onClick={() => selectStandard(item)}
                    className={`shrink-0 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] sm:text-[11px] font-semibold transition ${isSelected ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>
                    {isSelected ? '선택됨 ✓' : '이 기준으로 →'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ② 평가문장 작성 */}
      <section ref={writePanelRef} className="rounded-xl bg-white border border-gray-200 shadow-sm p-3 sm:p-4">
        <div className="mb-2">
          <p className="text-[10px] font-semibold tracking-wider text-emerald-700 uppercase">② 평가문장 작성</p>
          <h2 className="mt-0.5 text-sm sm:text-base font-bold text-gray-900">선택한 기준에 학생 맥락을 더해 초안 만들기</h2>
        </div>
        {!selectedStandard ? (
          <div className="rounded-md bg-gray-50 border border-gray-200 px-2.5 py-3 text-center text-[11px] sm:text-xs text-gray-500">
            위에서 <span className="font-semibold text-gray-700">[이 기준으로 →]</span> 버튼을 누르면 여기서 평가문장을 작성할 수 있어요.
          </div>
        ) : (
          <div className="space-y-2">
            <div className="rounded-md bg-blue-50/50 border border-blue-100 p-2">
              <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider">선택한 기준</p>
              <p className="mt-0.5 text-[11px] sm:text-xs text-blue-900 leading-snug line-clamp-2">
                {selectedStandard.code && (<span className="font-bold mr-1">[{selectedStandard.code}]</span>)}
                {selectedStandard.standard}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <div className="col-span-2">
                <label className="block text-[10px] font-medium text-gray-600 mb-0.5">학생</label>
                {students.length > 0 ? (
                  <select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="block w-full rounded-md border-gray-300 text-xs sm:text-sm py-1.5 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-300">
                    <option value="">학생 선택</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.number ? `${s.number}번 ` : ''}{s.name || ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input type="text" value={manualStudentName} onChange={(e) => setManualStudentName(e.target.value)}
                    placeholder={studentsLoaded ? '학생명부 비어 있음 — 이름 직접 입력' : '학생명부 불러오는 중...'}
                    className="block w-full rounded-md border-gray-300 text-xs sm:text-sm py-1.5 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-300" />
                )}
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-600 mb-0.5">수준</label>
                <select value={level} onChange={(e) => setLevel(e.target.value)}
                  className="block w-full rounded-md border-gray-300 text-xs sm:text-sm py-1.5 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-300">
                  {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <input type="text" value={observation} onChange={(e) => setObservation(e.target.value)}
              placeholder="관찰 키워드 — 예) 발표 자신감, 자료 정리, 또래 협력"
              className="block w-full rounded-md border-gray-300 text-xs sm:text-sm py-1.5 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-300" />
            <textarea value={evidence} onChange={(e) => setEvidence(e.target.value)} rows={2}
              placeholder="근거 메모 (선택) — 평가 근거 활동/사례를 짧게"
              className="block w-full rounded-md border-gray-300 text-xs sm:text-sm py-1.5 resize-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-300" />
            <button type="button" onClick={handleGenerate} disabled={isGenerating}
              className="w-full inline-flex items-center justify-center rounded-md bg-emerald-600 px-3 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60 transition">
              {isGenerating ? '생성 중...' : '평가문장 생성'}
            </button>
            {evalResult && (
              <div className="space-y-1.5">
                <div className="rounded-md bg-emerald-50/60 border border-emerald-200 p-2.5">
                  <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">결과</p>
                  <p className="mt-1 text-xs sm:text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">{evalResult}</p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button type="button" onClick={handleCopy}
                    className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-medium text-gray-700 hover:bg-gray-50 transition">복사</button>
                  <button type="button" onClick={handleGenerate} disabled={isGenerating}
                    className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-medium text-gray-700 hover:bg-gray-50 transition">다시 생성</button>
                  <button type="button" onClick={handleSaveRecord}
                    className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-emerald-700 transition">기록 반영</button>
                  {copyMsg && (<span className="text-[11px] text-emerald-700 font-medium">{copyMsg}</span>)}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ③ 최근 작업 / 학생별 기록 */}
      <section className="rounded-xl bg-white border border-gray-200 shadow-sm p-3 sm:p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold tracking-wider text-purple-700 uppercase">③ 학생별 평가문장 기록</p>
            <h2 className="mt-0.5 text-sm sm:text-base font-bold text-gray-900">기록 반영된 평가문장</h2>
          </div>
          {recentEvals.length > 0 && (<span className="text-[10px] text-gray-400">총 {recentEvals.length}건</span>)}
        </div>
        {studentChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 mb-2">
            <button type="button" onClick={() => setRecentStudentFilter('')}
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium transition ${recentStudentFilter === '' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'}`}>
              전체 {recentEvals.length}
            </button>
            {studentChips.map((c) => (
              <button key={c.key} type="button" onClick={() => setRecentStudentFilter(c.key)}
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium transition ${recentStudentFilter === c.key ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'}`}>
                {c.label} {c.count}
              </button>
            ))}
          </div>
        )}
        {recentEvals.length === 0 ? (
          <div className="rounded-md bg-purple-50/30 border border-purple-100 px-2.5 py-3 text-center text-[11px] sm:text-xs text-purple-700/70">
            아직 기록된 평가문장이 없어요. 위에서 작성한 뒤 <span className="font-semibold">[기록 반영]</span> 버튼을 누르면 여기 쌓여요.
          </div>
        ) : (
          <ul className="space-y-1 max-h-[18rem] overflow-y-auto pr-1">
            {visibleRecents.map((r) => (
              <li key={r.id} className="rounded-md border border-gray-200 bg-white p-2">
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px]">
                  <span className="font-semibold text-gray-900">
                    {r.studentNumber ? `${r.studentNumber}번 ` : ''}{r.studentName}
                  </span>
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-600">{r.subject || '교과'}</span>
                  {r.code && (<><span className="text-gray-400">·</span><span className="font-mono text-blue-700">{r.code}</span></>)}
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-600">{r.level}</span>
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-400">{new Date(r.createdAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric' })}</span>
                </div>
                <p className="mt-0.5 text-[11px] sm:text-xs text-gray-700 leading-snug line-clamp-2">{r.text}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function buildLocalEvalSentence({ selectedStandard, studentName, level, observation, evidence }) {
  const name = studentName ? `${studentName} 학생은` : '학생은';
  const code = selectedStandard?.code ? `[${selectedStandard.code}] ` : '';
  const obsLine = observation ? `${observation}을 중심으로 ` : '';
  const evidLine = evidence ? ` (${evidence})` : '';
  const levelLabel = level === '상'
    ? '성취기준에 부합하는 우수한 수행을 보였습니다'
    : level === '중'
    ? '성취기준에 안정적으로 도달하는 수행을 보였습니다'
    : '성취기준 도달을 향해 꾸준한 노력을 이어가고 있습니다';
  return `${code}${name} ${obsLine}${levelLabel}.${evidLine}`;
}

export default SubjectEvaluation;
