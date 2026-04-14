import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import client from '../api/client';

const VALID_TABS = ['student', 'teacher'];

const TEACHER_ROLE_OPTIONS = [
  { value: '담임교사', label: '담임교사' },
  { value: '전담교사', label: '전담교사 (과목 선택)' },
  { value: '교감', label: '교감' },
  { value: '교장', label: '교장' },
];


const SUBJECT_OPTIONS = [
  '국어', '수학', '영어', '사회', '과학', '도덕', '음악', '미술', '체육',
  '실과', '정보', '역사', '기술·가정', '한문', '제2외국어',
];
const STUDENT_LINKAGE_OPTIONS = [
  { key: 'radioStory', label: '라디오 사연 보내기' },
  { key: 'careClassroom', label: '돌봄교실' },
  { key: 'schedule', label: '학사일정' },
  { key: 'studentRecords', label: '학생명부' },
  { key: 'lifeRecords', label: '생활기록부' },
  { key: 'subjectEvaluation', label: '교과평가' },
  { key: 'observationJournal', label: '관찰일지' },
  { key: 'todayMeal', label: '오늘의 급식' },
];

const TEACHER_LINKAGE_OPTIONS = [
  { key: 'careClassroom', label: '돌봄교실' },
  { key: 'schedule', label: '학사일정' },
  { key: 'studentRecords', label: '학생명부' },
  { key: 'lifeRecords', label: '생활기록부' },
  { key: 'subjectEvaluation', label: '교과평가' },
  { key: 'observationJournal', label: '관찰일지' },
  { key: 'todayMeal', label: '오늘의 급식' },
];

const INITIAL_TEACHER_FORM = {
  teacherName: '',
  teacherRole: '담임교사',
  subject: '',
  focus: '',
};

function AutobiographyCompilation() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentPrompt, setStudentPrompt] = useState('');
  const [teacherPrompt, setTeacherPrompt] = useState('');
  const [teacherForm, setTeacherForm] = useState(INITIAL_TEACHER_FORM);
  const [registeredName, setRegisteredName] = useState('');
  const [nameMode, setNameMode] = useState('registered'); // 'registered' | 'custom'
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [response, setResponse] = useState('');
  const [usedModel, setUsedModel] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSourcePickerOpen, setIsSourcePickerOpen] = useState(false);
  const [selectedSources, setSelectedSources] = useState({
    radioStory: false,
    careClassroom: false,
    schedule: false,
    studentRecords: false,
    lifeRecords: false,
    subjectEvaluation: false,
    observationJournal: false,
    todayMeal: false,
  });

  const activeTab = VALID_TABS.includes(searchParams.get('tab'))
    ? searchParams.get('tab')
    : 'student';

  useEffect(() => {
    if (!VALID_TABS.includes(searchParams.get('tab'))) {
      setSearchParams({ tab: 'student' }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const fetchStudents = async () => {
      setIsLoadingStudents(true);
      try {
        const res = await client.get('/api/students');
        const list = Array.isArray(res.data) ? res.data : [];
        const cleaned = list
          .filter((student) => student && typeof (student.student_id ?? student.id) !== 'undefined')
          .map((student) => ({
            id: String(student.student_id ?? student.id),
            number: student.number,
            name: student.name || '',
          }))
          .sort((a, b) => Number(a.number || 0) - Number(b.number || 0));

        setStudents(cleaned);
        if (cleaned.length > 0) {
          setSelectedStudentId((current) => current || cleaned[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch students', error);
        setErrorMsg('학생 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
      } finally {
        setIsLoadingStudents(false);
      }
    };

    fetchStudents();

    // 교사 이름 자동 로드
    const userId = localStorage.getItem('userId');
    if (userId) {
      client.get('/api/account', { params: { userId } })
        .then(res => {
          if (res.data?.name) {
            setRegisteredName(res.data.name);
            setTeacherForm(prev => prev.teacherName ? prev : { ...prev, teacherName: res.data.name });
          }
        })
        .catch(() => {});
    }
  }, []);

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === selectedStudentId) || null,
    [students, selectedStudentId],
  );
  const isAllSourcesSelected = Object.values(selectedSources).every(Boolean);

  const setTab = (tab) => {
    setSearchParams({ tab });
    setErrorMsg('');
    setResponse('');
    setUsedModel('');
  };

  const toggleSource = (key) => {
    setSelectedSources((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleAllSources = () => {
    const nextValue = !isAllSourcesSelected;
    setSelectedSources({
      radioStory: nextValue,
      careClassroom: nextValue,
      schedule: nextValue,
      studentRecords: nextValue,
      lifeRecords: nextValue,
      subjectEvaluation: nextValue,
      observationJournal: nextValue,
      todayMeal: nextValue,
    });
  };

  const handleTeacherFieldChange = (key, value) => {
    setTeacherForm((prev) => ({ ...prev, [key]: value }));
  };

  const getPromptByTab = () => (activeTab === 'student' ? studentPrompt : teacherPrompt);

  // 체크된 소스별 실제 데이터 수집
  const collectSourceData = async () => {
    const data = {};

    // 돌봄교실: localStorage (선생님 자서전 핵심 뼈대)
    if (selectedSources.careClassroom) {
      try {
        const raw = localStorage.getItem('careClassroomRecords');
        const records = raw ? JSON.parse(raw) : {};
        const entries = Object.entries(records)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, rec]) => {
            const todos = Array.isArray(rec.todos)
              ? rec.todos.filter((t) => t.text?.trim()).map((t) => `${t.done ? '✓' : '○'} ${t.text}`).join(', ')
              : '';
            const mood = rec.customMood?.trim() || rec.mood || '';
            const events = rec.importantEvents?.trim() || '';
            return { date, mood, todos, events };
          })
          .filter((e) => e.mood || e.todos || e.events);
        data.careClassroom = entries;
      } catch {
        data.careClassroom = [];
      }
    }

    // 학사일정
    if (selectedSources.schedule) {
      try {
        const res = await client.get('/api/schedules');
        data.schedule = Array.isArray(res.data) ? res.data.slice(0, 30) : [];
      } catch {
        data.schedule = [];
      }
    }

    // 학생명부
    if (selectedSources.studentRecords) {
      try {
        const res = await client.get('/api/students');
        data.studentRecords = Array.isArray(res.data)
          ? res.data.map((s) => ({ number: s.number, name: s.name }))
          : [];
      } catch {
        data.studentRecords = [];
      }
    }

    // 생활기록부
    if (selectedSources.lifeRecords) {
      try {
        const res = await client.get('/api/liferecords?action=keywords&query=');
        data.lifeRecords = Array.isArray(res.data) ? res.data.slice(0, 20) : [];
      } catch {
        data.lifeRecords = [];
      }
    }

    // 교과평가
    if (selectedSources.subjectEvaluation) {
      try {
        const res = await client.get('/api/achievements');
        data.subjectEvaluation = Array.isArray(res.data) ? res.data.slice(0, 20) : [];
      } catch {
        data.subjectEvaluation = [];
      }
    }

    // 오늘의 급식
    if (selectedSources.todayMeal) {
      try {
        const res = await client.get('/api/meals');
        data.todayMeal = Array.isArray(res.data?.items) ? res.data.items.slice(0, 10) : [];
      } catch {
        data.todayMeal = [];
      }
    }

    // 관찰일지: 미구현 (ERD 완성 후 연동 예정)
    if (selectedSources.observationJournal) {
      data.observationJournal = [];
    }

    return data;
  };

  const handleGenerate = async (event) => {
    event.preventDefault();

    const prompt = getPromptByTab().trim();

    if (activeTab === 'student' && !selectedStudentId) {
      setErrorMsg('학생 탭에서는 학생을 먼저 선택해주세요.');
      return;
    }

    if (!prompt) {
      setErrorMsg('생성에 필요한 요청 내용을 입력해주세요.');
      return;
    }

    setIsGenerating(true);
    setErrorMsg('');

    try {
      const sourceData = await collectSourceData();

      const payload = {
        tab: activeTab,
        version: activeTab,
        prompt,
        student_id: selectedStudent ? Number(selectedStudent.id) : null,
        student_name: selectedStudent?.name || '',
        student_number: selectedStudent?.number || '',
        teacher_name: teacherForm.teacherName.trim(),
        teacher_role: teacherForm.teacherRole.trim(),
        teacher_focus: teacherForm.focus.trim(),
        // 연동된 탭 데이터 (백엔드 ERD 완성 후 활용)
        source_data: sourceData,
        selected_sources: Object.keys(selectedSources).filter((k) => selectedSources[k]),
      };

      const res = await client.post('/api/autobiography', payload);
      setResponse(extractGeneratedText(res.data));
      setUsedModel(res.data?.ai_model || res.data?.model || '');
    } catch (error) {
      console.error('Failed to generate autobiography compilation', error);
      setErrorMsg('자서전 편찬 생성 중 오류가 발생했습니다. 다시 시도해주세요.');
      setResponse('');
      setUsedModel('');
    } finally {
      setIsGenerating(false);
    }
  };

  const currentOptions = activeTab === 'student' ? STUDENT_LINKAGE_OPTIONS : TEACHER_LINKAGE_OPTIONS;
  const selectedCount = Object.values(selectedSources).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📚 자서전 편찬</h1>
          <div className="mt-1 text-sm text-gray-500">
            입력된 자료를 참고하여 자서전을 편찬합니다.
          </div>
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="text-primary-600 hover:text-primary-900 font-medium shrink-0"
        >
          &larr; 홈으로
        </button>
      </div>

      {/* 탭 토글 */}
      <div className="bg-white shadow rounded-lg p-1.5 grid grid-cols-2 gap-1.5">
        {[
          { id: 'student', icon: '🎙', label: '학생', sub: '라디오 사연 + @', color: 'bg-sky-600' },
          { id: 'teacher', icon: '👩‍🏫', label: '선생님', sub: '돌봄교실 + @', color: 'bg-purple-600' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => { setTab(t.id); setIsSourcePickerOpen(false); }}
            className={`rounded-md px-3 py-2.5 text-sm font-semibold transition-colors text-center ${
              activeTab === t.id ? `${t.color} text-white shadow-sm` : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <div>{t.icon} {t.label} 자서전</div>
            <div className="text-xs opacity-70 mt-0.5">({t.sub})</div>
          </button>
        ))}
      </div>

      {errorMsg ? (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 text-sm">{errorMsg}</div>
      ) : null}

      <form onSubmit={handleGenerate} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-6 space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-medium text-gray-900">입력 설정</h2>
              <p className="mt-1 text-sm text-gray-500">
                {activeTab === 'student'
                  ? '학생 관점의 자서전 초안을 생성합니다.'
                  : '선생님 관찰과 지도 관점을 반영한 자서전 초안을 생성합니다.'}
              </p>
            </div>
            {isGenerating ? (
              <button
                type="button"
                onClick={() => { window.__abortAutobiography?.(); }}
                className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md shadow-sm text-red-600 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-400 whitespace-nowrap"
              >
                생성 중단
              </button>
            ) : (
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 whitespace-nowrap"
              >
                생성하기 (Ctrl+Enter)
              </button>
            )}
          </div>

          {/* 연동 자료 섹션 — 입력 폼 안으로 통합 */}
          <div className={`rounded-xl border-2 p-4 ${activeTab === 'student' ? 'border-sky-100 bg-sky-50/40' : 'border-amber-100 bg-amber-50/40'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-700">🔗 연동 자료</span>
                {selectedCount > 0 && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${activeTab === 'student' ? 'bg-sky-600 text-white' : 'bg-amber-500 text-white'}`}>
                    {selectedCount}개 선택됨
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsSourcePickerOpen((p) => !p)}
                className={`text-xs px-3 py-1 rounded-full border font-medium transition ${
                  activeTab === 'student'
                    ? 'border-sky-300 text-sky-700 hover:bg-sky-100'
                    : 'border-amber-300 text-amber-700 hover:bg-amber-100'
                }`}
              >
                {isSourcePickerOpen ? '접기 ▲' : '항목 선택 ▼'}
              </button>
            </div>

            {/* 선택된 항목 칩 — 항상 표시 */}
            {selectedCount > 0 && !isSourcePickerOpen && (
              <div className="flex flex-wrap gap-1.5">
                {currentOptions.filter((o) => selectedSources[o.key]).map((o) => (
                  <span
                    key={o.key}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                      activeTab === 'student' ? 'bg-sky-100 text-sky-800' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {o.label}
                    <button type="button" onClick={() => toggleSource(o.key)} className="opacity-60 hover:opacity-100 font-bold">×</button>
                  </span>
                ))}
              </div>
            )}

            {selectedCount === 0 && !isSourcePickerOpen && (
              <p className="text-xs text-gray-400">항목을 선택하면 자서전 생성 시 해당 데이터가 함께 전달됩니다.</p>
            )}

            {/* 체크박스 패널 */}
            {isSourcePickerOpen && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {currentOptions.map((option) => (
                  <label
                    key={option.key}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                      selectedSources[option.key]
                        ? activeTab === 'student'
                          ? 'border-sky-400 bg-sky-50 text-sky-800 font-medium'
                          : 'border-amber-400 bg-amber-50 text-amber-800 font-medium'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSources[option.key] || false}
                      onChange={() => toggleSource(option.key)}
                      className="h-4 w-4 rounded"
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
                <label className={`col-span-2 flex cursor-pointer items-center gap-2 rounded-lg border-2 px-3 py-2 text-sm font-semibold transition ${
                  isAllSourcesSelected
                    ? activeTab === 'student' ? 'border-sky-500 bg-sky-100 text-sky-900' : 'border-amber-500 bg-amber-100 text-amber-900'
                    : 'border-dashed border-gray-300 text-gray-500 hover:bg-gray-50'
                }`}>
                  <input
                    type="checkbox"
                    checked={isAllSourcesSelected}
                    onChange={toggleAllSources}
                    className="h-4 w-4 rounded"
                  />
                  <span>전부 연동</span>
                </label>
              </div>
            )}
          </div>

          {activeTab === 'student' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">학생 선택</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm text-sm"
                  disabled={isLoadingStudents || students.length === 0}
                >
                  {students.length === 0 ? <option value="">학생이 없습니다</option> : null}
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.number ? `${student.number}번 ` : ''}{student.name || '(이름 없음)'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">자서전 요청 내용</label>
                <textarea
                  value={studentPrompt}
                  onChange={(e) => setStudentPrompt(e.target.value)}
                  rows={10}
                  className="block w-full border-gray-300 rounded-md p-3 text-sm resize-none shadow-sm"
                  placeholder="예: 1학기 동안 발표 활동과 친구 관계, 좋아하는 과목 경험을 담아 따뜻한 학생 자서전 형식으로 작성해줘."
                  onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); handleGenerate(e); } }}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 이름 + 역할 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
                  <select
                    value={nameMode}
                    onChange={(e) => {
                      setNameMode(e.target.value);
                      if (e.target.value === 'registered') {
                        handleTeacherFieldChange('teacherName', registeredName);
                      } else {
                        handleTeacherFieldChange('teacherName', '');
                      }
                    }}
                    className="block w-full rounded-md border-gray-300 shadow-sm text-sm mb-1"
                  >
                    {registeredName && <option value="registered">{registeredName}</option>}
                    <option value="custom">직접 입력</option>
                  </select>
                  {nameMode === 'custom' && (
                    <input
                      type="text"
                      value={teacherForm.teacherName}
                      onChange={(e) => handleTeacherFieldChange('teacherName', e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm text-sm"
                      placeholder="원하는 이름 또는 별명 입력"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">역할</label>
                  <select
                    value={teacherForm.teacherRole}
                    onChange={(e) => {
                      handleTeacherFieldChange('teacherRole', e.target.value);
                      if (e.target.value !== '전담교사') handleTeacherFieldChange('subject', '');
                    }}
                    className="block w-full rounded-md border-gray-300 shadow-sm text-sm"
                  >
                    {TEACHER_ROLE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 전담교사 과목 선택 */}
              {teacherForm.teacherRole === '전담교사' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">담당 과목</label>
                  <div className="flex flex-wrap gap-2">
                    {SUBJECT_OPTIONS.map((subj) => (
                      <button
                        key={subj}
                        type="button"
                        onClick={() => handleTeacherFieldChange('subject', subj)}
                        className={`px-3 py-1 rounded-full text-sm border transition ${
                          teacherForm.subject === subj
                            ? 'bg-amber-500 text-white border-amber-500 font-semibold'
                            : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {subj}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {activeTab === 'principal' ? '경영 철학 / 강조점' :
                   activeTab === 'vice-principal' ? '운영 관점 / 강조점' : '강조할 지도 관점'}
                </label>
                <input
                  type="text"
                  value={teacherForm.focus}
                  onChange={(e) => handleTeacherFieldChange('focus', e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm text-sm"
                  placeholder={
                    activeTab === 'principal' ? '예: 학생 중심 학교, 소통과 혁신' :
                    activeTab === 'vice-principal' ? '예: 교사 지원, 교육과정 운영' : '예: 성장 과정, 교실 기여, 진로 태도'
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">자서전 요청 내용</label>
                <textarea
                  value={teacherPrompt}
                  onChange={(e) => setTeacherPrompt(e.target.value)}
                  rows={8}
                  className="block w-full border-gray-300 rounded-md p-3 text-sm resize-none shadow-sm"
                  placeholder={
                    activeTab === 'principal'
                      ? '예: 취임 이후 학교 변화와 주요 결정, 교직원·학생과의 에피소드를 담아 교장 자서전으로 작성해줘.'
                      : activeTab === 'vice-principal'
                      ? '예: 학교 운영 지원 경험과 교사들과의 협력 이야기를 담아 교감 자서전으로 작성해줘.'
                      : '예: 학생의 학교생활 변화와 공동체 기여를 담아 선생님 시점의 자서전으로 정리해줘.'
                  }
                  onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); handleGenerate(e); } }}
                />
              </div>
            </div>
          )}

        </div>

        {/* 생성 결과 모달 */}
        {response && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="bg-white w-full max-w-3xl rounded-xl shadow-2xl border border-gray-200 relative max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between p-5 border-b border-gray-200">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">생성 결과</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {activeTab === 'student' ? '학생 관점 자서전 초안' : '선생님 관점 자서전 초안'}
                    {usedModel && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">{usedModel}</span>}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => navigator.clipboard.writeText(response)}
                    className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                    복사
                  </button>
                  <button onClick={() => { setResponse(''); setUsedModel(''); }}
                    className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                    닫기
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <ResultRenderer text={response} />
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

function ResultRenderer({ text }) {
  if (!text) {
    return (
      <div className="h-full flex items-center justify-center text-center text-sm text-gray-400 px-6">
        생성된 자서전 내용이 여기에 표시됩니다.
      </div>
    );
  }

  const lines = String(text)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <div className="space-y-3">
      {lines.map((line, index) => (
        <p key={`${line}-${index}`} className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
          {line}
        </p>
      ))}
    </div>
  );
}

function extractGeneratedText(data) {
  if (!data) return '';

  const candidates = [
    data.generated_text,
    data.generated_document,
    data.result,
    data.output,
    data.content,
  ];

  const firstText = candidates.find((value) => typeof value === 'string' && value.trim());
  if (firstText) return firstText;

  if (Array.isArray(data.items)) {
    return data.items
      .map((item) => (typeof item === 'string' ? item : JSON.stringify(item, null, 2)))
      .join('\n\n');
  }

  if (typeof data === 'string') return data;

  return JSON.stringify(data, null, 2);
}

export default AutobiographyCompilation;
