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

  const [selectedStandard, setSelectedStandard] = useState(null);
  const [studentName, setStudentName] = useState('');
  const [level, setLevel] = useState('상');
  const [observation, setObservation] = useState('');
  const [evidence, setEvidence] = useState('');
  const [evalResult, setEvalResult] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copyMsg, setCopyMsg] = useState('');

  const [recentEvals, setRecentEvals] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  });
  const writePanelRef = useRef(null);

  useEffect(() => {
    fetchAchievementStandards();
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
      setAchievements(res.data?.items || []);
      setAchMeta(res.data?.meta || { subjects: [], grade_groups: [], areas: [] });
    } catch (error) {
      console.error('Failed to load achievement standards', error);
    } finally {
      setIsAchLoading(false);
      setAchLoaded(true);
    }
  };

  const filteredAchievements = useMemo(() => {
    if (!searchQuery.trim()) return achievements;
    const q = searchQuery.trim().toLowerCase();
    return achievements.filter((a) =>
      (a.standard || '').toLowerCase().includes(q) ||
      (a.code || '').toLowerCase().includes(q) ||
      (a.area || '').toLowerCase().includes(q),
    );
  }, [achievements, searchQuery]);

  const selectStandard = (item) => {
    setSelectedStandard(item);
    setEvalResult('');
    setTimeout(() => writePanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  const handleGenerate = async () => {
    if (!selectedStandard) return;
    setIsGenerating(true);
    setEvalResult('');
    const prompt = [
      `성취기준: ${selectedStandard.code || ''} ${selectedStandard.standard || ''}`,
      studentName ? `학생: ${studentName}` : '',
      `수행 수준: ${level}`,
      observation ? `관찰 키워드: ${observation}` : '',
      evidence ? `근거 메모: ${evidence}` : '',
      '',
      '위 정보를 바탕으로 학교 생활기록부에 들어갈 교과별 평가문장을 한국어 1~2문장으로 정중하고 공식적인 톤으로 작성해주세요. 학생 이름이 있으면 자연스럽게 통합해주세요.',
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
      setEvalResult(buildLocalEvalSentence({ selectedStandard, studentName, level, observation, evidence }));
    }
    setIsGenerating(false);
  };

  const handleSaveRecord = () => {
    if (!evalResult || !selectedStandard) return;
    const record = {
      id: Date.now(),
      studentName: studentName || '미지정',
      subject: selectedStandard.subject || '',
      area: selectedStandard.area || '',
      code: selectedStandard.code || '',
      level,
      text: evalResult,
      createdAt: new Date().toISOString(),
    };
    const next = [record, ...recentEvals].slice(0, 30);
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

  const filtersUntouched = !gradeFilter && !subjectFilter && !areaFilter && !searchQuery.trim();

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">📊 교과평가</h1>
          <p className="mt-1 text-xs sm:text-sm text-gray-500">성취기준 탐색 → 평가문장 작성 → 학생별 기록 반영</p>
        </div>
        <button onClick={() => navigate('/dashboard')} className="shrink-0 text-sm font-medium text-primary-600 hover:text-primary-900">← 홈으로</button>
      </div>

      {/* ① 성취기준 탐색 */}
      <section className="rounded-2xl bg-white border border-gray-200 shadow-sm p-4 sm:p-5">
        <div className="mb-3">
          <p className="text-[11px] font-semibold tracking-wider text-blue-700 uppercase">① 성취기준 탐색</p>
          <h2 className="mt-0.5 text-base sm:text-lg font-bold text-gray-900">학년·교과·영역으로 평가 기준 찾기</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
          <select value={gradeFilter} onChange={(e) => { setGradeFilter(e.target.value); setAreaFilter(''); }}
            className="rounded-lg border-gray-300 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-300">
            <option value="">전체 학년군</option>
            {(achMeta.grade_groups || []).sort().map((g) => <option key={g} value={g}>{g}학년군</option>)}
          </select>
          <select value={subjectFilter} onChange={(e) => { setSubjectFilter(e.target.value); setAreaFilter(''); }}
            className="rounded-lg border-gray-300 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-300">
            <option value="">전체 교과</option>
            {(achMeta.subjects || []).sort().map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)}
            className="rounded-lg border-gray-300 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-300">
            <option value="">전체 영역</option>
            {(achMeta.areas || []).sort().map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="코드/문장 검색"
            className="rounded-lg border-gray-300 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-300" />
        </div>
        <div className="space-y-2">
          {isAchLoading && (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (<div key={i} className="h-16 rounded-lg bg-gray-100 animate-pulse" />))}
            </div>
          )}
          {!isAchLoading && achLoaded && filteredAchievements.length === 0 && (
            <div className="rounded-lg bg-blue-50/50 border border-blue-100 px-3 py-4 text-center text-xs sm:text-sm text-blue-700">
              {filtersUntouched
                ? '학년군 / 교과 / 영역을 선택하거나 검색어를 입력하면 성취기준이 표시돼요.'
                : '선택한 조건에 맞는 성취기준이 아직 없어요. 다른 필터를 시도해보세요.'}
            </div>
          )}
          {!isAchLoading && filteredAchievements.map((item) => {
            const isSelected = selectedStandard?.id === item.id;
            return (
              <div key={`${item.id}-${item.code}`}
                className={`rounded-xl border p-3 transition ${isSelected ? 'border-blue-400 bg-blue-50/40 ring-1 ring-blue-300' : 'border-gray-200 bg-white hover:border-blue-200 hover:shadow-sm'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      {item.code && (<span className="inline-flex items-center rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-800">{item.code}</span>)}
                      <span className="text-[10px] text-gray-500">{item.subject} · {item.grade_group}학년군 · {item.area}</span>
                    </div>
                    <p className="text-sm text-gray-900 leading-relaxed">{item.standard}</p>
                  </div>
                  <button type="button" onClick={() => selectStandard(item)}
                    className={`shrink-0 inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition ${isSelected ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>
                    {isSelected ? '선택됨 ✓' : '이 기준으로 →'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ② 평가문장 작성 */}
      <section ref={writePanelRef} className="rounded-2xl bg-white border border-gray-200 shadow-sm p-4 sm:p-5">
        <div className="mb-3">
          <p className="text-[11px] font-semibold tracking-wider text-emerald-700 uppercase">② 평가문장 작성</p>
          <h2 className="mt-0.5 text-base sm:text-lg font-bold text-gray-900">선택한 기준에 학생 맥락을 더해 초안 만들기</h2>
        </div>
        {!selectedStandard ? (
          <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-6 text-center text-xs sm:text-sm text-gray-500">
            위에서 성취기준의 <span className="font-semibold text-gray-700">[이 기준으로 →]</span> 버튼을 누르면 여기에서 평가문장을 작성할 수 있어요.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg bg-blue-50/50 border border-blue-100 p-2.5">
              <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider">선택한 성취기준</p>
              <p className="mt-0.5 text-xs sm:text-sm text-blue-900 leading-relaxed">
                {selectedStandard.code && (<span className="font-bold mr-1">[{selectedStandard.code}]</span>)}
                {selectedStandard.standard}
              </p>
              <p className="mt-0.5 text-[10px] text-blue-700/70">{selectedStandard.subject} · {selectedStandard.grade_group}학년군 · {selectedStandard.area}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">학생</label>
                <input type="text" value={studentName} onChange={(e) => setStudentName(e.target.value)}
                  placeholder="이름 또는 번호"
                  className="block w-full rounded-lg border-gray-300 text-sm focus:border-emerald-400 focus:ring-1 focus:ring-emerald-300" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">수행 수준</label>
                <select value={level} onChange={(e) => setLevel(e.target.value)}
                  className="block w-full rounded-lg border-gray-300 text-sm focus:border-emerald-400 focus:ring-1 focus:ring-emerald-300">
                  {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-600 mb-1">관찰 키워드</label>
              <input type="text" value={observation} onChange={(e) => setObservation(e.target.value)}
                placeholder="예) 발표 자신감, 자료 정리, 또래 협력"
                className="block w-full rounded-lg border-gray-300 text-sm focus:border-emerald-400 focus:ring-1 focus:ring-emerald-300" />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-600 mb-1">근거 메모 (선택)</label>
              <textarea value={evidence} onChange={(e) => setEvidence(e.target.value)} rows={2}
                placeholder="평가 근거가 된 활동/사례를 짧게"
                className="block w-full rounded-lg border-gray-300 text-sm resize-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-300" />
            </div>
            <button type="button" onClick={handleGenerate} disabled={isGenerating}
              className="w-full inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60 transition">
              {isGenerating ? '생성 중...' : '평가문장 생성'}
            </button>
            {evalResult && (
              <div className="space-y-2">
                <div className="rounded-lg bg-emerald-50/60 border border-emerald-200 p-3">
                  <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">결과</p>
                  <p className="mt-1 text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">{evalResult}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={handleCopy}
                    className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 transition">복사</button>
                  <button type="button" onClick={handleGenerate} disabled={isGenerating}
                    className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 transition">다시 생성</button>
                  <button type="button" onClick={handleSaveRecord}
                    className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 transition">기록 반영</button>
                  {copyMsg && (<span className="text-[11px] text-emerald-700 font-medium">{copyMsg}</span>)}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ③ 최근 작업 */}
      <section className="rounded-2xl bg-white border border-gray-200 shadow-sm p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold tracking-wider text-purple-700 uppercase">③ 최근 작업</p>
            <h2 className="mt-0.5 text-base sm:text-lg font-bold text-gray-900">학생별 평가문장 기록</h2>
          </div>
          {recentEvals.length > 0 && (<span className="text-[10px] text-gray-400">총 {recentEvals.length}건</span>)}
        </div>
        {recentEvals.length === 0 ? (
          <div className="rounded-lg bg-purple-50/30 border border-purple-100 px-3 py-4 text-center text-xs sm:text-sm text-purple-700/70">
            아직 기록된 평가문장이 없어요. 위에서 작성한 뒤 <span className="font-semibold">[기록 반영]</span> 버튼을 누르면 여기 쌓여요.
          </div>
        ) : (
          <ul className="space-y-1.5">
            {recentEvals.slice(0, 8).map((r) => (
              <li key={r.id} className="rounded-lg border border-gray-200 bg-white p-2.5">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
                  <span className="font-semibold text-gray-900">{r.studentName}</span>
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-600">{r.subject || '교과'}</span>
                  {r.code && (<><span className="text-gray-400">·</span><span className="font-mono text-blue-700">{r.code}</span></>)}
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-600">{r.level}</span>
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-400">{new Date(r.createdAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric' })}</span>
                </div>
                <p className="mt-1 text-xs text-gray-700 leading-relaxed line-clamp-2">{r.text}</p>
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
