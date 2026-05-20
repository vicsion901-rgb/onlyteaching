import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { getLibrary, getSentencesByLevel, hasLevelVariants } from '../data/subjectEvalLibrary';
import { gradeToGroup } from '../utils/profile';

const STORAGE_KEY = 'subject_eval_v2';
const SUBJECTS = ['국어', '수학', '사회', '과학', '영어', '도덕', '체육', '음악', '미술', '실과', '통합교과'];

function SubjectEvaluation() {
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [studentsLoaded, setStudentsLoaded] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');

  const [achievements, setAchievements] = useState([]);
  const [achMeta, setAchMeta] = useState({ subjects: [], grade_groups: [], areas: [] });
  const [isAchLoading, setIsAchLoading] = useState(false);

  const [subject, setSubject] = useState('국어');
  const [area, setArea] = useState('');
  const [gradeGroup, setGradeGroup] = useState('');

  const [selectedStandard, setSelectedStandard] = useState(null);
  const [level, setLevel] = useState('중');
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
    if (!userId) { setStudentsLoaded(true); return; }
    client.get('/api/students', { params: { userId } })
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        setStudents(list);
        if (list.length > 0 && !selectedStudentId) setSelectedStudentId(String(list[0].id));
      })
      .catch(() => {})
      .finally(() => setStudentsLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 성취기준 로드
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

  // 디버그 로그
  useEffect(() => {
    if (achievements.length === 0) return;
    // eslint-disable-next-line no-console
    console.debug('[교과평가-data]', {
      total: achievements.length,
      subjects: [...new Set(achievements.map((a) => a.subject))],
      gradeGroups: [...new Set(achievements.map((a) => String(a.grade_group)))],
      areas: [...new Set(achievements.map((a) => a.area))],
    });
  }, [achievements]);

  // subject fallback
  useEffect(() => {
    if (achievements.length === 0) return;
    const availableSubjects = [...new Set(achievements.map((a) => a.subject))];
    if (!availableSubjects.includes(subject) && availableSubjects.length > 0) {
      setSubject(availableSubjects[0]);
      setSelectedStandard(null);
    }
  }, [achievements, subject]);

  const areasForSubject = useMemo(() => {
    return [...new Set(achievements.filter((a) => a.subject === subject).map((a) => a.area))];
  }, [achievements, subject]);

  useEffect(() => {
    if (areasForSubject.length > 0 && !areasForSubject.includes(area)) {
      setArea(areasForSubject[0]);
    }
  }, [areasForSubject, area]);

  const gradeGroupsForSubjectArea = useMemo(() => {
    return [...new Set(
      achievements
        .filter((a) => a.subject === subject && a.area === area)
        .map((a) => String(a.grade_group)),
    )].sort();
  }, [achievements, subject, area]);

  useEffect(() => {
    if (gradeGroupsForSubjectArea.length > 0 && !gradeGroupsForSubjectArea.includes(gradeGroup)) {
      // 프로필 학년 기반 학년군이 가용하면 우선 선택, 아니면 첫 항목 fallback
      const profileGroup = gradeToGroup(Number(localStorage.getItem('gradeLevel')) || null);
      if (profileGroup && gradeGroupsForSubjectArea.includes(profileGroup)) {
        setGradeGroup(profileGroup);
      } else {
        setGradeGroup(gradeGroupsForSubjectArea[0]);
      }
    }
  }, [gradeGroupsForSubjectArea, gradeGroup]);

  const standardsForCurrent = useMemo(() => {
    return achievements.filter(
      (a) => a.subject === subject && a.area === area && String(a.grade_group) === gradeGroup,
    );
  }, [achievements, subject, area, gradeGroup]);

  const library = useMemo(() => getLibrary(subject, area), [subject, area]);

  const selectedStudent = useMemo(
    () => students.find((s) => String(s.id) === String(selectedStudentId)) || null,
    [students, selectedStudentId],
  );

  const currentRecordId = useMemo(() => {
    if (!selectedStudent || !selectedStandard) return null;
    return `${selectedStudent.id}_${selectedStandard.code}`;
  }, [selectedStudent, selectedStandard]);

  // 학생+기준 바뀌면 기존 저장 자동 로드
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
      setLevel(existing.level || '중');
    } else {
      setSelectedKeywords([]);
      setSelectedSentences([]);
      setTeacherNote('');
      setLevel('중');
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
      level,
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
      if (arr.length >= 5) break;
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
    setLevel(r.level || '중');
  };

  const hasExistingRecord = currentRecordId && records.some((r) => r.id === currentRecordId);

  return (
    <div className="max-w-7xl mx-auto space-y-2.5">
      {/* 상단 헤더 */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">📊 교과평가</h1>
          <p className="mt-0.5 text-[11px] text-gray-500">학생 선택 → 교과·영역·성취기준 → 문장 조합 → 학생별 저장</p>
        </div>
      </div>

      {/* 학생 선택 + 작업 경로 (한 줄) */}
      <section className="rounded-xl bg-white border border-gray-200 shadow-sm p-2.5 sm:p-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[200px] flex-shrink-0">
            <label className="block text-[10px] font-semibold text-blue-700 uppercase tracking-wider mb-0.5">학생</label>
            {!studentsLoaded ? (
              <div className="h-8 rounded-md bg-gray-100 animate-pulse" />
            ) : students.length > 0 ? (
              <select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)}
                className="block w-full rounded-md border-gray-300 text-sm py-1 focus:border-blue-400 focus:ring-1 focus:ring-blue-300">
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.number ? `${s.number}번 ` : ''}{s.name || ''}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-xs text-gray-500">학생명부 없음</p>
            )}
          </div>
          <div className="min-w-0 flex-1 hidden sm:block">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">현재 작업</p>
            <p className="mt-0.5 text-xs sm:text-sm font-medium text-gray-800 truncate">
              {selectedStudent ? (
                <>
                  {selectedStudent.number ? `${selectedStudent.number}번 ` : ''}{selectedStudent.name}
                  {gradeGroup && <span className="text-gray-400"> · {gradeGroup}학년군</span>}
                  {subject && <span className="text-gray-400"> · {subject}</span>}
                  {area && <span className="text-gray-400"> · {area}</span>}
                  {selectedStandard && <span className="text-blue-600 ml-1.5 font-mono text-[10px]">[{selectedStandard.code}]</span>}
                </>
              ) : '학생을 선택해 주세요'}
            </p>
          </div>
          {selectedStudent && (
            <div className="text-[10px] text-gray-400 shrink-0">
              저장 {records.filter((r) => String(r.studentId) === String(selectedStudent.id)).length}건
            </div>
          )}
        </div>
      </section>

      {/* 2단 그리드 */}
      <div className="lg:grid lg:grid-cols-[3fr_2fr] lg:gap-2.5 space-y-2.5 lg:space-y-0">

        {/* ─── 왼쪽: 탐색/선택 ─── */}
        <div className="space-y-2.5">

          {/* 교과/영역/학년군 */}
          <section className="rounded-xl bg-white border border-gray-200 shadow-sm p-2.5 sm:p-3">
            <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider mb-1.5">① 교과 · 영역 · 학년군</p>
            <div className="flex flex-wrap gap-1 mb-2">
              {SUBJECTS.map((s) => {
                const isActive = subject === s;
                const has = achievements.some((a) => a.subject === s);
                return (
                  <button key={s} type="button" disabled={!has} onClick={() => { setSubject(s); setSelectedStandard(null); }}
                    className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition ${isActive ? 'bg-emerald-600 text-white' : has ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-gray-50 text-gray-300 cursor-not-allowed'}`}>
                    {s}
                  </button>
                );
              })}
            </div>
            {areasForSubject.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1.5">
                {areasForSubject.map((ar) => {
                  const isActive = area === ar;
                  return (
                    <button key={ar} type="button" onClick={() => { setArea(ar); setSelectedStandard(null); }}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition ${isActive ? 'bg-emerald-600 text-white' : 'bg-white border border-emerald-200 text-emerald-700 hover:border-emerald-400'}`}>
                      {ar}
                    </button>
                  );
                })}
              </div>
            )}
            {gradeGroupsForSubjectArea.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {gradeGroupsForSubjectArea.map((gg) => {
                  const isActive = gradeGroup === gg;
                  return (
                    <button key={gg} type="button" onClick={() => { setGradeGroup(gg); setSelectedStandard(null); }}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition ${isActive ? 'bg-emerald-600 text-white' : 'bg-white border border-emerald-200 text-emerald-700 hover:border-emerald-400'}`}>
                      {gg}학년군
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* 성취기준 카드 */}
          <section className="rounded-xl bg-white border border-gray-200 shadow-sm p-2.5 sm:p-3">
            <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider mb-1.5">② 성취기준</p>
            {isAchLoading && (
              <div className="space-y-1">{[0,1,2].map(i => (<div key={i} className="h-10 rounded-md bg-gray-100 animate-pulse" />))}</div>
            )}
            {!isAchLoading && achievements.length === 0 && (
              <p className="text-xs text-blue-700 py-2">성취기준을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>
            )}
            {!isAchLoading && achievements.length > 0 && standardsForCurrent.length === 0 && (
              <p className="text-xs text-gray-500 py-2">선택한 조건에 맞는 성취기준이 없어요.</p>
            )}
            <div className="space-y-1 max-h-[16rem] overflow-y-auto pr-1">
              {standardsForCurrent.map((item) => {
                const isSelected = selectedStandard?.id === item.id;
                return (
                  <div key={item.id}
                    className={`rounded-md border p-1.5 transition ${isSelected ? 'border-blue-400 bg-blue-50/50 ring-1 ring-blue-300' : 'border-gray-200 bg-white hover:border-blue-200'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="inline-flex items-center rounded bg-blue-100 px-1 py-0.5 text-[9px] font-bold text-blue-800 mr-1">{item.code}</span>
                        <span className="text-[11px] sm:text-xs text-gray-900 leading-snug">{item.standard}</span>
                      </div>
                      <button type="button" onClick={() => {
                        if (isSelected) {
                          setSelectedStandard(null);
                          setSelectedKeywords([]);
                          setSelectedSentences([]);
                          setTeacherNote('');
                          setLevel('중');
                        } else {
                          setSelectedStandard(item);
                        }
                      }}
                        className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold transition ${isSelected ? 'bg-rose-500 text-white hover:bg-rose-600' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>
                        {isSelected ? '✕' : '선택'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 문장 후보 (성취기준 선택 시) */}
          {selectedStandard && (
            <section className="rounded-xl bg-white border border-gray-200 shadow-sm p-2.5 sm:p-3">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <p className="text-[10px] font-semibold text-purple-700 uppercase tracking-wider">③ 평가문장 후보</p>
                <div className="inline-flex rounded-full bg-purple-50 p-0.5 text-[10px] font-medium">
                  {['상', '중', '하'].map((lv) => (
                    <button key={lv} type="button"
                      onClick={() => { setLevel(lv); setSelectedSentences([]); }}
                      className={`rounded-full px-2 py-0 transition ${level === lv ? 'bg-purple-600 text-white shadow-sm' : 'text-purple-700 hover:text-purple-900'}`}>
                      {lv}
                    </button>
                  ))}
                </div>
              </div>

              {/* 키워드 칩 (보조) */}
              {library?.keywords?.length > 0 && (
                <div className="mb-1.5">
                  <p className="text-[9px] font-medium text-gray-400 mb-0.5">평가 포인트 (보조)</p>
                  <div className="flex flex-wrap gap-1">
                    {library.keywords.map((kw) => {
                      const on = selectedKeywords.includes(kw);
                      return (
                        <button key={kw} type="button" onClick={() => toggleKeyword(kw)}
                          className={`rounded-full px-1.5 py-0 text-[10px] font-medium transition ${on ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'}`}>
                          {on ? '✓ ' : ''}{kw}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 문장 후보 */}
              {(() => {
                const candidates = getSentencesByLevel(subject, area, level);
                const isLevelSpecific = hasLevelVariants(subject, area);
                if (candidates.length === 0) {
                  return <p className="text-[11px] text-gray-400 py-1">이 영역의 문장 후보가 아직 없어요. 오른쪽 메모로 작성해 주세요.</p>;
                }
                return (
                  <>
                    <p className="text-[9px] font-medium text-gray-400 mb-0.5">
                      문장 후보 {isLevelSpecific ? `· ${level} 수준` : ''} (클릭 → 결과창에 추가)
                    </p>
                    <div className="space-y-1">
                      {candidates.map((s) => {
                        const on = selectedSentences.includes(s);
                        return (
                          <button key={s} type="button" onClick={() => addSentence(s)} disabled={on}
                            className={`block w-full text-left rounded-md border px-2 py-1 text-[11px] leading-snug transition ${on ? 'bg-purple-50 border-purple-200 text-purple-800 cursor-not-allowed' : 'bg-white border-gray-200 hover:border-purple-300 hover:bg-purple-50/40'}`}>
                            {on && <span className="mr-1 text-purple-600 text-[10px]">+추가됨</span>}{s}
                          </button>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </section>
          )}
        </div>

        {/* ─── 오른쪽: 결과/저장 ─── */}
        <div className="space-y-2.5 lg:sticky lg:top-3 lg:self-start lg:max-h-[calc(100vh-1.5rem)] lg:overflow-y-auto">

          {/* 결과 조합창 */}
          <section className="rounded-xl bg-white border border-gray-200 shadow-sm p-2.5 sm:p-3">
            <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider mb-1.5">④ 평가문장 결과</p>

            {!selectedStandard ? (
              <div className="rounded-md bg-gray-50 border border-gray-200 px-2.5 py-4 text-center">
                <p className="text-[11px] text-gray-500">왼쪽에서 성취기준을 선택하면<br />결과창이 활성화됩니다</p>
              </div>
            ) : (
              <>
                <div className="rounded-md bg-blue-50/50 border border-blue-100 p-1.5 mb-1.5">
                  <p className="text-[9px] font-semibold text-blue-700 uppercase tracking-wider">선택한 기준</p>
                  <p className="mt-0.5 text-[11px] text-blue-900 leading-snug line-clamp-2">
                    <span className="font-mono font-bold mr-1">[{selectedStandard.code}]</span>
                    {selectedStandard.standard}
                  </p>
                </div>

                {selectedSentences.length === 0 && !teacherNote.trim() ? (
                  <p className="text-[11px] text-gray-400 py-2 text-center">왼쪽에서 문장 후보를 눌러 결과를 만들어 주세요</p>
                ) : (
                  <ul className="space-y-1 mb-1.5">
                    {selectedSentences.map((s, idx) => (
                      <li key={idx} className="flex items-start gap-1.5 rounded bg-white border border-emerald-100 px-1.5 py-1">
                        <span className="flex-1 text-[11px] text-gray-800 leading-snug">{s}</span>
                        <button type="button" onClick={() => removeSentence(idx)} className="shrink-0 text-[10px] text-rose-500 hover:text-rose-700">✕</button>
                      </li>
                    ))}
                  </ul>
                )}

                <textarea value={teacherNote} onChange={(e) => setTeacherNote(e.target.value)} rows={2}
                  placeholder="교사 메모/보완 의견 (선택)"
                  className="block w-full rounded-md border border-gray-200 px-2 py-1 text-[11px] text-gray-800 placeholder:text-gray-400 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-300 resize-none mb-1.5" />

                {finalText && (
                  <div className="rounded-md bg-emerald-50/60 border border-emerald-200 p-1.5 mb-1.5">
                    <p className="text-[9px] font-semibold text-emerald-700 uppercase tracking-wider mb-0.5">최종 문장</p>
                    <p className="text-[11px] text-gray-900 leading-relaxed">{finalText}</p>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-1">
                  <button type="button" onClick={handleSave} disabled={!selectedStudent || (!selectedSentences.length && !teacherNote.trim())}
                    className="rounded-md bg-purple-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-purple-700 disabled:opacity-50 transition">
                    {hasExistingRecord ? '수정 저장' : '저장'}
                  </button>
                  <button type="button" onClick={handleCopy} disabled={!finalText}
                    className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[10px] font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition">복사</button>
                  {hasExistingRecord && (
                    <button type="button" onClick={handleDelete}
                      className="rounded-md border border-rose-200 bg-white px-2 py-1 text-[10px] font-medium text-rose-600 hover:bg-rose-50 transition">삭제</button>
                  )}
                  {copyMsg && <span className="text-[10px] text-emerald-700 font-medium">{copyMsg}</span>}
                </div>
                {hasExistingRecord && <p className="mt-1 text-[10px] text-amber-600">기존 저장 불러옴 · 수정 가능</p>}
              </>
            )}
          </section>

          {/* 최근 저장 (압축) */}
          <section className="rounded-xl bg-white border border-gray-200 shadow-sm p-2.5 sm:p-3">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-semibold text-rose-700 uppercase tracking-wider">⑤ 최근 저장</p>
              {records.length > 0 && <span className="text-[9px] text-gray-400">총 {records.length}건</span>}
            </div>
            {studentChips.length > 0 && (
              <div className="flex flex-wrap gap-0.5 mb-1.5">
                <button type="button" onClick={() => setBoardStudentFilter('')}
                  className={`rounded-full px-1.5 py-0 text-[9px] font-medium transition ${boardStudentFilter === '' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'}`}>
                  전체
                </button>
                {studentChips.map((c) => (
                  <button key={c.key} type="button" onClick={() => setBoardStudentFilter(c.key)}
                    className={`rounded-full px-1.5 py-0 text-[9px] font-medium transition ${boardStudentFilter === c.key ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'}`}>
                    {c.label} {c.count}
                  </button>
                ))}
              </div>
            )}
            {records.length === 0 ? (
              <p className="text-[11px] text-gray-400 text-center py-2">저장된 기록이 없어요</p>
            ) : (
              <ul className="space-y-0.5 max-h-[14rem] overflow-y-auto pr-1">
                {visibleRecords.slice(0, 8).map((r) => (
                  <li key={r.id}
                    className="rounded-md border border-gray-200 bg-white p-1.5 hover:border-rose-200 cursor-pointer transition"
                    onClick={() => loadRecord(r)}>
                    <div className="flex flex-wrap items-center gap-x-1 text-[10px]">
                      <span className="font-semibold text-gray-900">{r.studentNumber ? `${r.studentNumber}번 ` : ''}{r.studentName}</span>
                      <span className="text-gray-400">·</span>
                      <span className="text-gray-600">{r.subject}</span>
                      <span className="font-mono text-blue-700 ml-auto text-[9px]">{r.standardCode}</span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-gray-700 leading-snug line-clamp-1">{r.finalText}</p>
                  </li>
                ))}
              </ul>
            )}
            {records.length > 0 && (
              <p className="mt-1 text-[9px] text-gray-400">클릭 → 불러와 수정</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default SubjectEvaluation;
