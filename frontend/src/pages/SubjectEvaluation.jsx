import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { getLibrary } from '../data/subjectEvalLibrary';

const STORAGE_KEY = 'subject_eval_v2';
const SUBJECTS = ['국어', '수학', '사회', '과학', '영어', '도덕', '체육', '음악', '미술', '실과', '통합교과'];

function SubjectEvaluation() {
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');

  const [achievements, setAchievements] = useState([]);
  const [achMeta, setAchMeta] = useState({ subjects: [], grade_groups: [], areas: [] });
  const [isAchLoading, setIsAchLoading] = useState(false);

  const [subject, setSubject] = useState('국어');
  const [area, setArea] = useState('');
  const [gradeGroup, setGradeGroup] = useState('');

  const [selectedStandard, setSelectedStandard] = useState(null);
  const [selectedKeywords, setSelectedKeywords] = useState([]);
  const [selectedSentences, setSelectedSentences] = useState([]);
  const [teacherNote, setTeacherNote] = useState('');

  const [records, setRecords] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  });
  const [copyMsg, setCopyMsg] = useState('');
  const [boardStudentFilter, setBoardStudentFilter] = useState('');

  // 학생명부 로드
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;
    client.get('/api/students', { params: { userId } })
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        setStudents(list);
        if (list.length > 0 && !selectedStudentId) setSelectedStudentId(String(list[0].id));
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 성취기준 로드 (전체)
  useEffect(() => {
    setIsAchLoading(true);
    client.get('/api/achievements')
      .then((res) => {
        const raw = res.data;
        const items = Array.isArray(raw) ? raw : (raw?.items || []);
        setAchievements(items);
        const meta = (raw && !Array.isArray(raw) && raw.meta) ? raw.meta : null;
        if (meta) setAchMeta(meta);
        else setAchMeta({
          subjects: [...new Set(items.map((i) => i.subject).filter(Boolean))].sort(),
          grade_groups: [...new Set(items.map((i) => String(i.grade_group)).filter(Boolean))].sort(),
          areas: [...new Set(items.map((i) => i.area).filter(Boolean))].sort(),
        });
      })
      .catch(() => {})
      .finally(() => setIsAchLoading(false));
  }, []);

  // 교과 변경 시 첫 영역 자동 선택
  const areasForSubject = useMemo(() => {
    return [...new Set(achievements.filter((a) => a.subject === subject).map((a) => a.area))];
  }, [achievements, subject]);

  useEffect(() => {
    if (areasForSubject.length > 0 && !areasForSubject.includes(area)) {
      setArea(areasForSubject[0]);
    }
  }, [areasForSubject, area]);

  // 영역 변경 시 학년군 후보 + 자동 첫 학년군
  const gradeGroupsForSubjectArea = useMemo(() => {
    return [...new Set(
      achievements
        .filter((a) => a.subject === subject && a.area === area)
        .map((a) => String(a.grade_group)),
    )].sort();
  }, [achievements, subject, area]);

  useEffect(() => {
    if (gradeGroupsForSubjectArea.length > 0 && !gradeGroupsForSubjectArea.includes(gradeGroup)) {
      setGradeGroup(gradeGroupsForSubjectArea[0]);
    }
  }, [gradeGroupsForSubjectArea, gradeGroup]);

  // 현재 선택된 성취기준 후보
  const standardsForCurrent = useMemo(() => {
    return achievements.filter(
      (a) => a.subject === subject && a.area === area && String(a.grade_group) === gradeGroup,
    );
  }, [achievements, subject, area, gradeGroup]);

  // 라이브러리 (키워드 + 문장 후보)
  const library = useMemo(() => getLibrary(subject, area), [subject, area]);

  const selectedStudent = useMemo(
    () => students.find((s) => String(s.id) === String(selectedStudentId)) || null,
    [students, selectedStudentId],
  );

  // 학생+성취기준 unique key
  const currentRecordId = useMemo(() => {
    if (!selectedStudent || !selectedStandard) return null;
    return `${selectedStudent.id}_${selectedStandard.code}`;
  }, [selectedStudent, selectedStandard]);

  // 학생/성취기준 바뀌면 기존 저장 자동 로드
  useEffect(() => {
    if (!currentRecordId) {
      setSelectedKeywords([]);
      setSelectedSentences([]);
      setTeacherNote('');
      return;
    }
    const existing = records.find((r) => r.id === currentRecordId);
    if (existing) {
      setSelectedKeywords(existing.selectedKeywords || []);
      setSelectedSentences(existing.selectedSentences || []);
      setTeacherNote(existing.teacherNote || '');
    } else {
      setSelectedKeywords([]);
      setSelectedSentences([]);
      setTeacherNote('');
    }
  }, [currentRecordId, records]);

  const toggleKeyword = (kw) => {
    setSelectedKeywords((prev) => prev.includes(kw) ? prev.filter((k) => k !== kw) : [...prev, kw]);
  };

  const addSentence = (s) => {
    setSelectedSentences((prev) => prev.includes(s) ? prev : [...prev, s]);
  };

  const removeSentence = (idx) => {
    setSelectedSentences((prev) => prev.filter((_, i) => i !== idx));
  };

  const finalText = useMemo(() => {
    const parts = [...selectedSentences];
    if (teacherNote.trim()) parts.push(teacherNote.trim());
    return parts.join(' ');
  }, [selectedSentences, teacherNote]);

  const handleSave = () => {
    if (!selectedStudent || !selectedStandard) return;
    if (selectedSentences.length === 0 && !teacherNote.trim()) return;
    const now = new Date().toISOString();
    const existingIdx = records.findIndex((r) => r.id === currentRecordId);
    const record = {
      id: currentRecordId,
      studentId: selectedStudent.id,
      studentNumber: selectedStudent.number || null,
      studentName: selectedStudent.name || '',
      gradeGroup: selectedStandard.grade_group,
      subject: selectedStandard.subject,
      area: selectedStandard.area,
      standardCode: selectedStandard.code,
      standardText: selectedStandard.standard,
      selectedKeywords,
      selectedSentences,
      teacherNote,
      finalText,
      createdAt: existingIdx >= 0 ? records[existingIdx].createdAt : now,
      updatedAt: now,
    };
    const next = [...records];
    if (existingIdx >= 0) next[existingIdx] = record;
    else next.unshift(record);
    setRecords(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
    setCopyMsg(existingIdx >= 0 ? '수정 저장됨' : '저장됨');
    setTimeout(() => setCopyMsg(''), 1500);
  };

  const handleCopy = () => {
    if (!finalText) return;
    navigator.clipboard?.writeText(finalText);
    setCopyMsg('복사됨');
    setTimeout(() => setCopyMsg(''), 1500);
  };

  const handleDelete = () => {
    if (!currentRecordId) return;
    const next = records.filter((r) => r.id !== currentRecordId);
    setRecords(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
    setSelectedKeywords([]);
    setSelectedSentences([]);
    setTeacherNote('');
    setCopyMsg('삭제됨');
    setTimeout(() => setCopyMsg(''), 1500);
  };

  // 학생별 기록 보드
  const studentChips = useMemo(() => {
    const counts = new Map();
    for (const r of records) {
      const key = r.studentId ? String(r.studentId) : r.studentName;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const arr = [];
    for (const r of records) {
      const key = r.studentId ? String(r.studentId) : r.studentName;
      if (!arr.find((a) => a.key === key)) {
        arr.push({ key, label: `${r.studentNumber ? r.studentNumber + '번 ' : ''}${r.studentName}`, count: counts.get(key) || 0 });
      }
      if (arr.length >= 8) break;
    }
    return arr;
  }, [records]);

  const visibleRecords = useMemo(() => {
    if (!boardStudentFilter) return records;
    return records.filter((r) => {
      const k = r.studentId ? String(r.studentId) : r.studentName;
      return k === boardStudentFilter;
    });
  }, [records, boardStudentFilter]);

  const loadRecord = (r) => {
    if (r.studentId) setSelectedStudentId(String(r.studentId));
    setSubject(r.subject);
    setArea(r.area);
    setGradeGroup(String(r.gradeGroup));
    const std = achievements.find((a) => a.code === r.standardCode);
    setSelectedStandard(std || { code: r.standardCode, standard: r.standardText, subject: r.subject, area: r.area, grade_group: r.gradeGroup });
    setSelectedKeywords(r.selectedKeywords || []);
    setSelectedSentences(r.selectedSentences || []);
    setTeacherNote(r.teacherNote || '');
  };

  const hasExistingRecord = currentRecordId && records.some((r) => r.id === currentRecordId);

  return (
    <div className="max-w-5xl mx-auto space-y-3 sm:space-y-4">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">📊 교과평가</h1>
          <p className="mt-0.5 text-[11px] sm:text-xs text-gray-500">학생 선택 → 교과·영역·성취기준 → 문장 조합 → 학생별 저장</p>
        </div>
        <button onClick={() => navigate('/dashboard')} className="shrink-0 text-xs font-medium text-primary-600 hover:text-primary-900">← 홈으로</button>
      </div>

      {/* 학생 선택 */}
      <section className="rounded-xl bg-white border border-gray-200 shadow-sm p-3 sm:p-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] font-semibold text-blue-700 uppercase tracking-wider mb-1">학생 선택</label>
            {students.length > 0 ? (
              <select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)}
                className="block w-full rounded-md border-gray-300 text-sm py-1.5 focus:border-blue-400 focus:ring-1 focus:ring-blue-300">
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.number ? `${s.number}번 ` : ''}{s.name || ''}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-xs text-gray-500">학생명부에 학생이 없어요. 먼저 명부를 등록해 주세요.</p>
            )}
          </div>
          {selectedStudent && (
            <div className="text-[11px] text-gray-500">
              총 평가 {records.filter((r) => String(r.studentId) === String(selectedStudent.id)).length}건
            </div>
          )}
        </div>
      </section>

      {/* 교과 탭 */}
      <section className="rounded-xl bg-white border border-gray-200 shadow-sm p-3 sm:p-4">
        <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider mb-2">① 교과</p>
        <div className="flex flex-wrap gap-1">
          {SUBJECTS.map((s) => {
            const isActive = subject === s;
            const has = achievements.some((a) => a.subject === s);
            return (
              <button key={s} type="button" disabled={!has} onClick={() => { setSubject(s); setSelectedStandard(null); }}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${isActive ? 'bg-emerald-600 text-white' : has ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-gray-50 text-gray-300 cursor-not-allowed'}`}>
                {s}
              </button>
            );
          })}
        </div>

        {/* 영역 칩 */}
        {areasForSubject.length > 0 && (
          <>
            <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider mt-3 mb-2">② 영역</p>
            <div className="flex flex-wrap gap-1">
              {areasForSubject.map((ar) => {
                const isActive = area === ar;
                return (
                  <button key={ar} type="button" onClick={() => { setArea(ar); setSelectedStandard(null); }}
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition ${isActive ? 'bg-emerald-600 text-white' : 'bg-white border border-emerald-200 text-emerald-700 hover:border-emerald-400'}`}>
                    {ar}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* 학년군 */}
        {gradeGroupsForSubjectArea.length > 0 && (
          <>
            <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider mt-3 mb-2">③ 학년군</p>
            <div className="flex flex-wrap gap-1">
              {gradeGroupsForSubjectArea.map((gg) => {
                const isActive = gradeGroup === gg;
                return (
                  <button key={gg} type="button" onClick={() => { setGradeGroup(gg); setSelectedStandard(null); }}
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition ${isActive ? 'bg-emerald-600 text-white' : 'bg-white border border-emerald-200 text-emerald-700 hover:border-emerald-400'}`}>
                    {gg}학년군
                  </button>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* 성취기준 카드 */}
      <section className="rounded-xl bg-white border border-gray-200 shadow-sm p-3 sm:p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider">④ 성취기준</p>
          {isAchLoading && <span className="text-[10px] text-gray-400">불러오는 중...</span>}
        </div>
        {!isAchLoading && standardsForCurrent.length === 0 && (
          <p className="text-xs text-gray-500 py-2">해당 조건의 성취기준이 없어요. 백엔드 데이터를 확인해 주세요.</p>
        )}
        <div className="space-y-1.5 max-h-[14rem] overflow-y-auto pr-1">
          {standardsForCurrent.map((item) => {
            const isSelected = selectedStandard?.id === item.id;
            return (
              <div key={item.id}
                className={`rounded-lg border p-2 transition ${isSelected ? 'border-blue-400 bg-blue-50/40 ring-1 ring-blue-300' : 'border-gray-200 bg-white hover:border-blue-200'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="inline-flex items-center rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-800 mr-1.5">{item.code}</span>
                    <span className="text-xs sm:text-sm text-gray-900">{item.standard}</span>
                  </div>
                  <button type="button" onClick={() => setSelectedStandard(item)}
                    className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold transition ${isSelected ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>
                    {isSelected ? '선택됨 ✓' : '선택'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 평가문장 작성 */}
      {selectedStandard && (
        <section className="rounded-xl bg-white border border-gray-200 shadow-sm p-3 sm:p-4">
          <div className="mb-2">
            <p className="text-[10px] font-semibold text-purple-700 uppercase tracking-wider">⑤ 평가문장 조합</p>
            <p className="mt-0.5 text-[11px] text-purple-700/70">
              <span className="font-mono font-bold mr-1">[{selectedStandard.code}]</span>{selectedStandard.standard}
            </p>
          </div>

          {/* 평가 포인트 키워드 */}
          {library?.keywords?.length > 0 && (
            <div className="mb-2.5">
              <p className="text-[10px] font-medium text-gray-500 mb-1">평가 포인트</p>
              <div className="flex flex-wrap gap-1">
                {library.keywords.map((kw) => {
                  const on = selectedKeywords.includes(kw);
                  return (
                    <button key={kw} type="button" onClick={() => toggleKeyword(kw)}
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition ${on ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'}`}>
                      {on ? '✓ ' : ''}{kw}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 문장 후보 */}
          {library?.sentences?.length > 0 ? (
            <div className="mb-2.5">
              <p className="text-[10px] font-medium text-gray-500 mb-1">문장 후보 (클릭 시 결과에 추가)</p>
              <div className="space-y-1">
                {library.sentences.map((s) => {
                  const on = selectedSentences.includes(s);
                  return (
                    <button key={s} type="button" onClick={() => addSentence(s)}
                      disabled={on}
                      className={`block w-full text-left rounded-md border px-2 py-1.5 text-xs leading-relaxed transition ${on ? 'bg-purple-50 border-purple-200 text-purple-800 cursor-not-allowed' : 'bg-white border-gray-200 hover:border-purple-300 hover:bg-purple-50/40'}`}>
                      {on && <span className="mr-1 text-purple-600">+추가됨</span>}{s}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400 mb-2">이 영역의 문장 후보 라이브러리가 아직 준비되지 않았어요. 직접 메모를 활용해 주세요.</p>
          )}

          {/* 결과 조합 */}
          <div className="rounded-lg bg-emerald-50/40 border border-emerald-200 p-2.5 space-y-1.5">
            <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">결과 (선택한 문장)</p>
            {selectedSentences.length === 0 ? (
              <p className="text-xs text-emerald-700/60">위에서 문장 후보를 눌러 결과를 만들어 주세요.</p>
            ) : (
              <ul className="space-y-1">
                {selectedSentences.map((s, idx) => (
                  <li key={idx} className="flex items-start gap-2 rounded bg-white border border-emerald-100 px-2 py-1">
                    <span className="flex-1 text-xs text-gray-800 leading-relaxed">{s}</span>
                    <button type="button" onClick={() => removeSentence(idx)} className="shrink-0 text-[11px] text-rose-500 hover:text-rose-700">✕</button>
                  </li>
                ))}
              </ul>
            )}
            <textarea value={teacherNote} onChange={(e) => setTeacherNote(e.target.value)} rows={2}
              placeholder="교사 메모/보완 의견 (선택, 결과 마지막에 덧붙여짐)"
              className="block w-full rounded border border-emerald-200 bg-white px-2 py-1 text-xs text-gray-800 placeholder:text-emerald-700/40 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-300 resize-none" />
            {finalText && (
              <div className="rounded bg-white border border-emerald-200 p-2 text-xs text-gray-900 leading-relaxed">
                <p className="text-[10px] font-semibold text-emerald-700 mb-0.5">최종 문장</p>
                {finalText}
              </div>
            )}
          </div>

          {/* 액션 */}
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <button type="button" onClick={handleSave} disabled={!selectedStudent || (!selectedSentences.length && !teacherNote.trim())}
              className="rounded-md bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-50 transition">
              {hasExistingRecord ? '수정 저장' : '학생 기록에 저장'}
            </button>
            <button type="button" onClick={handleCopy} disabled={!finalText}
              className="rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition">복사</button>
            {hasExistingRecord && (
              <button type="button" onClick={handleDelete}
                className="rounded-md border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 transition">삭제</button>
            )}
            {copyMsg && <span className="text-[11px] text-emerald-700 font-medium">{copyMsg}</span>}
            {hasExistingRecord && <span className="text-[11px] text-amber-600">기존 저장 불러옴</span>}
          </div>
        </section>
      )}

      {/* 학생별 평가 기록 */}
      <section className="rounded-xl bg-white border border-gray-200 shadow-sm p-3 sm:p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold text-rose-700 uppercase tracking-wider">⑥ 학생별 교과평가 기록</p>
            <h2 className="mt-0.5 text-sm sm:text-base font-bold text-gray-900">저장된 평가</h2>
          </div>
          {records.length > 0 && <span className="text-[10px] text-gray-400">총 {records.length}건</span>}
        </div>
        {studentChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 mb-2">
            <button type="button" onClick={() => setBoardStudentFilter('')}
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition ${boardStudentFilter === '' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'}`}>
              전체 {records.length}
            </button>
            {studentChips.map((c) => (
              <button key={c.key} type="button" onClick={() => setBoardStudentFilter(c.key)}
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition ${boardStudentFilter === c.key ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'}`}>
                {c.label} {c.count}
              </button>
            ))}
          </div>
        )}
        {records.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-3">저장된 기록이 없어요. 위에서 평가문장을 만들고 저장해 보세요.</p>
        ) : (
          <ul className="space-y-1 max-h-[18rem] overflow-y-auto pr-1">
            {visibleRecords.map((r) => (
              <li key={r.id}
                className="rounded-md border border-gray-200 bg-white p-2 hover:border-rose-200 cursor-pointer transition"
                onClick={() => loadRecord(r)}>
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px]">
                  <span className="font-semibold text-gray-900">{r.studentNumber ? `${r.studentNumber}번 ` : ''}{r.studentName}</span>
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-600">{r.subject}</span>
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-600">{r.area}</span>
                  <span className="text-gray-400">·</span>
                  <span className="font-mono text-blue-700">{r.standardCode}</span>
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-400">{new Date(r.updatedAt || r.createdAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric' })}</span>
                </div>
                <p className="mt-0.5 text-[11px] text-gray-700 leading-snug line-clamp-2">{r.finalText}</p>
              </li>
            ))}
          </ul>
        )}
        {records.length > 0 && (
          <p className="mt-1.5 text-[10px] text-gray-400">기록을 클릭하면 작성 패널에 불러와 수정할 수 있어요.</p>
        )}
      </section>
    </div>
  );
}

export default SubjectEvaluation;
