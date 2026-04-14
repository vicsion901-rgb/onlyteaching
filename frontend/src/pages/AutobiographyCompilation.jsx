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

        {/* 자서전 목차 (항상 표시) + 뷰어 버튼 */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">자서전 목차</h2>
            <button type="button" onClick={() => setResponse(response || '__viewer__')}
              className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100">
              📖 뷰어로 보기
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {FIXED_CHAPTERS.map((ch, i) => {
              const hasContent = response && response !== '__viewer__' && parseResponseToChapters(response)[i]?.status === 'filled';
              return (
                <div key={ch.id} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-100 hover:bg-gray-50">
                  <span className="text-xs font-bold text-gray-400 w-5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{ch.title}</p>
                    <p className="text-xs text-gray-400">{ch.period}</p>
                  </div>
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${hasContent ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                </div>
              );
            })}
          </div>
        </div>

        {/* 전자북 결과 모달 */}
        {response && (
          <EbookModal
            response={response === '__viewer__' ? '' : response}
            activeTab={activeTab}
            usedModel={usedModel}
            onClose={() => { setResponse(''); setUsedModel(''); }}
          />
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

// ─── 고정 챕터 구조 (시간순 전자북) ───
const FIXED_CHAPTERS = [
  { id: 'intro', title: '시작하는 글', period: '프롤로그', placeholder: '이 장은 자서전의 문을 여는 공간입니다. 생성 후 도입부가 채워집니다.' },
  { id: 'background', title: '어린 시절과 배경', period: '과거', placeholder: '학생의 초기 성장 배경을 담는 영역입니다. 추가 자료가 연동되면 더 풍부해집니다.' },
  { id: 'early', title: '학교생활의 초반', period: '입학~적응기', placeholder: '학교에 처음 적응하던 시기의 이야기가 담길 공간입니다.' },
  { id: 'settling', title: '익숙해지는 과정', period: '적응기~안정기', placeholder: '학교생활에 익숙해지며 자리를 잡아가는 과정을 담습니다.' },
  { id: 'relations', title: '관계와 협력', period: '성장기', placeholder: '친구, 선생님, 공동체와의 관계를 통해 성장한 경험을 담습니다.' },
  { id: 'responsibility', title: '책임감과 역할', period: '성장기', placeholder: '맡은 역할과 책임을 통해 변화한 모습을 기록합니다.' },
  { id: 'turning', title: '성장의 전환점', period: '전환기', placeholder: '의미 있는 변화의 순간, 전환점이 된 사건을 담습니다.' },
  { id: 'present', title: '현재의 모습', period: '현재', placeholder: '지금의 모습과 태도, 성장한 결과를 정리합니다.' },
  { id: 'future', title: '앞으로의 가능성', period: '미래', placeholder: '앞으로의 꿈과 가능성, 기대를 담는 공간입니다.' },
  { id: 'closing', title: '맺는 글', period: '에필로그', placeholder: '자서전을 마무리하는 따뜻한 인사를 담습니다.' },
];

function parseResponseToChapters(text) {
  if (!text) return FIXED_CHAPTERS.map(ch => ({ ...ch, content: '', status: 'empty' }));

  // AI 응답에서 ## 제목으로 분리 시도
  const sections = text.split(/^##\s*/m).filter(Boolean);
  const parsed = {};
  for (const sec of sections) {
    const lines = sec.split('\n');
    const title = lines[0].trim();
    const body = lines.slice(1).join('\n').trim();
    if (body) parsed[title] = body;
  }

  // 고정 챕터에 매핑
  return FIXED_CHAPTERS.map((ch, idx) => {
    // 제목 유사도로 매칭
    let matched = '';
    for (const [title, body] of Object.entries(parsed)) {
      if (title.includes(ch.title) || ch.title.includes(title) ||
          title.includes(ch.period) || idx === 0 && title.includes('시작')) {
        matched = body;
        delete parsed[title];
        break;
      }
    }
    // 매칭 안 되면 순서대로 배분
    if (!matched && Object.keys(parsed).length > 0) {
      const remaining = Object.entries(parsed);
      if (remaining.length > 0 && idx < FIXED_CHAPTERS.length) {
        const [key, val] = remaining[0];
        matched = val;
        delete parsed[key];
      }
    }
    return {
      ...ch,
      content: matched,
      status: matched ? 'filled' : 'empty',
    };
  });
}

function ChapterContent({ ch, idx, highlight }) {
  const hl = (text) => {
    if (!highlight) return text;
    const re = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.split(re).map((part, i) =>
      re.test(part) ? <mark key={i} className="bg-yellow-300 px-0.5 rounded">{part}</mark> : part
    );
  };
  return (
    <div className="h-full overflow-y-auto px-8 py-6" style={{ fontFamily: "'Noto Serif KR', serif" }}>
      <div className="text-center mb-5">
        <span className="text-[10px] text-amber-500 tracking-[0.2em] uppercase">{ch.period}</span>
        <h2 className="text-lg font-bold text-gray-900 mt-1">제{idx + 1}장</h2>
        <h3 className="text-base text-gray-700 mt-0.5">{ch.title}</h3>
        <div className="w-10 h-px bg-amber-400 mx-auto mt-3" />
      </div>
      {ch.content ? (
        <div className="text-[13px] text-gray-800 leading-[2] space-y-2.5">
          {ch.content.split('\n').filter(Boolean).map((line, i) => (
            <p key={i} className="text-justify indent-4">{hl(line)}</p>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center pt-16">
          <div className="text-3xl mb-3 opacity-15">✎</div>
          <p className="text-sm text-gray-400 leading-relaxed max-w-[200px]">{ch.placeholder}</p>
          <p className="text-[11px] text-gray-300 mt-3">관련 내용이 입력되면 채워집니다.</p>
        </div>
      )}
      <div className="text-center text-[10px] text-gray-300 mt-6">{idx + 1}</div>
    </div>
  );
}

function EbookModal({ response, activeTab, usedModel, onClose }) {
  const [spread, setSpread] = React.useState(0);
  const [showToc, setShowToc] = React.useState(false);
  const [showSearch, setShowSearch] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState([]);
  const [pageInput, setPageInput] = React.useState('');
  const [highlight, setHighlight] = React.useState('');
  const [controlsVisible, setControlsVisible] = React.useState(true);
  const hideTimer = React.useRef(null);

  const chapters = React.useMemo(() => parseResponseToChapters(response), [response]);
  const maxSpread = Math.ceil(chapters.length / 2) - 1;
  const leftIdx = spread * 2;
  const rightIdx = spread * 2 + 1;
  const leftCh = chapters[leftIdx];
  const rightCh = rightIdx < chapters.length ? chapters[rightIdx] : null;

  const goSpread = (s) => setSpread(Math.max(0, Math.min(maxSpread, s)));
  const goPage = (p) => goSpread(Math.floor(p / 2));

  // 키보드 이벤트
  React.useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goSpread(spread - 1);
      if (e.key === 'ArrowRight') goSpread(spread + 1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [spread]);

  // 컨트롤 자동 숨김
  React.useEffect(() => {
    const show = () => { setControlsVisible(true); clearTimeout(hideTimer.current); hideTimer.current = setTimeout(() => setControlsVisible(false), 4000); };
    show();
    window.addEventListener('mousemove', show);
    window.addEventListener('touchstart', show);
    return () => { window.removeEventListener('mousemove', show); window.removeEventListener('touchstart', show); clearTimeout(hideTimer.current); };
  }, []);

  // 단어 검색 (본문 + 제목 + placeholder 전부 검색)
  const doSearch = () => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const q = searchQuery.trim().toLowerCase();
    const results = [];
    chapters.forEach((ch, i) => {
      const searchable = [`제${i + 1}장`, `${i + 1}`, ch.title, ch.period, ch.content || '', ch.placeholder || ''].join(' ');
      const idx = searchable.toLowerCase().indexOf(q);
      if (idx >= 0) {
        const textSource = ch.content || ch.placeholder || ch.title;
        const srcIdx = textSource.toLowerCase().indexOf(q);
        const start = Math.max(0, srcIdx - 20);
        const snippet = srcIdx >= 0 ? '...' + textSource.slice(start, srcIdx + q.length + 30) + '...' : ch.title;
        results.push({ page: i, title: ch.title, snippet });
      }
    });
    setSearchResults(results);
    setHighlight(searchQuery.trim());
  };

  // 페이지 이동
  const goToPage = () => {
    const n = Number(pageInput);
    if (n >= 1 && n <= chapters.length) { goPage(n - 1); setShowSearch(false); setPageInput(''); }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-stone-900 flex flex-col select-none">
      {/* 상단 바 - 자동 숨김 */}
      <div className={`flex items-center justify-between px-4 py-2 bg-black/60 transition-opacity duration-500 ${controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="flex items-center gap-2">
          <button onClick={() => { setShowToc(!showToc); setShowSearch(false); }} className="text-xs text-amber-300 hover:text-white border border-amber-800 rounded px-2 py-1" aria-label="목차">☰ 목차</button>
          <button onClick={() => { setShowSearch(!showSearch); setShowToc(false); }} className="text-xs text-amber-300 hover:text-white border border-amber-800 rounded px-2 py-1" aria-label="검색">🔍 검색</button>
          <span className="text-xs text-stone-400 ml-2">{leftIdx + 1}~{Math.min(rightIdx + 1, chapters.length)} / {chapters.length}장</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-amber-200">{activeTab === 'student' ? '학생 자서전' : '선생님 자서전'}</span>
          <button onClick={() => navigator.clipboard.writeText(response)} className="text-xs text-stone-400 hover:text-white border border-stone-700 rounded px-2 py-1" aria-label="전체 복사">복사</button>
          <button onClick={onClose} className="text-xs text-stone-400 hover:text-white border border-stone-700 rounded px-2 py-1" aria-label="닫기">✕</button>
        </div>
      </div>

      {/* 목차 패널 */}
      {showToc && (
        <div className="absolute left-2 top-12 z-20 w-60 bg-white/95 rounded-lg shadow-2xl border border-amber-200 py-1 max-h-[75vh] overflow-y-auto backdrop-blur">
          <div className="px-3 py-1.5 text-xs font-bold text-amber-800 border-b border-amber-100">목차</div>
          {chapters.map((c, i) => (
            <button key={c.id} onClick={() => { goPage(i); setShowToc(false); }}
              className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 hover:bg-amber-50 ${Math.floor(i / 2) === spread ? 'bg-amber-100 font-semibold text-amber-900' : 'text-gray-700'}`}>
              <span className="text-[10px] text-amber-500 w-4">{i + 1}</span>
              <span className="flex-1 truncate">{c.title}</span>
              <span className={`w-1.5 h-1.5 rounded-full ${c.status === 'filled' ? 'bg-emerald-400' : 'bg-gray-300'}`} />
            </button>
          ))}
        </div>
      )}

      {/* 검색 패널 */}
      {showSearch && (
        <div className="absolute right-2 top-12 z-20 w-72 bg-white/95 rounded-lg shadow-2xl border border-amber-200 p-3 backdrop-blur">
          <div className="text-xs font-bold text-gray-800 mb-2">단어 검색</div>
          <div className="flex gap-1 mb-2">
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()}
              className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-400" placeholder="검색어 입력" autoFocus />
            <button onClick={doSearch} className="text-xs bg-amber-500 text-white rounded px-2 py-1 hover:bg-amber-600">검색</button>
          </div>
          {searchResults.length > 0 && (
            <div className="max-h-40 overflow-y-auto space-y-1">
              {searchResults.map((r, i) => (
                <button key={i} onClick={() => { goPage(r.page); setShowSearch(false); }}
                  className="w-full text-left px-2 py-1.5 text-xs bg-gray-50 hover:bg-amber-50 rounded border border-gray-100">
                  <span className="font-semibold text-amber-700">{r.page + 1}장 {r.title}</span>
                  <p className="text-gray-500 mt-0.5 truncate">{r.snippet}</p>
                </button>
              ))}
            </div>
          )}
          {searchQuery && searchResults.length === 0 && <p className="text-xs text-gray-400">결과 없음</p>}
          <div className="border-t border-gray-200 mt-2 pt-2">
            <div className="text-xs font-bold text-gray-800 mb-1">페이지 이동</div>
            <div className="flex gap-1">
              <input value={pageInput} onChange={e => setPageInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && goToPage()}
                className="w-16 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-400" placeholder="장 번호" type="number" min="1" max={chapters.length} />
              <button onClick={goToPage} className="text-xs bg-gray-200 text-gray-700 rounded px-2 py-1 hover:bg-gray-300">이동</button>
              <span className="text-[10px] text-gray-400 self-center ml-1">1~{chapters.length}</span>
            </div>
          </div>
        </div>
      )}

      {/* 책 본문 + 좌우 넘김 영역 */}
      <div className="flex-1 flex items-center justify-center relative">
        {/* 왼쪽 넘김 영역 */}
        <button onClick={() => goSpread(spread - 1)} disabled={spread === 0} aria-label="이전 페이지"
          className="absolute left-0 top-0 bottom-0 w-12 md:w-16 flex items-center justify-center z-10 group">
          <span className={`text-2xl transition-opacity ${spread === 0 ? 'opacity-0' : 'opacity-20 group-hover:opacity-70'} text-white`}>‹</span>
        </button>

        {/* 책 */}
        <div className="flex shadow-[0_0_60px_rgba(0,0,0,0.5)] rounded-sm overflow-hidden" style={{ width: 'min(88vw, 1050px)', height: 'min(78vh, 620px)' }}>
          {/* 왼쪽 페이지 */}
          <div className="flex-1 bg-amber-50 relative" style={{ boxShadow: 'inset -8px 0 12px -8px rgba(0,0,0,0.08)' }}>
            {leftCh && <ChapterContent ch={leftCh} idx={leftIdx} highlight={highlight} />}
          </div>
          {/* 접힘선 */}
          <div className="w-px bg-amber-300/60" />
          {/* 오른쪽 페이지 */}
          <div className="flex-1 bg-amber-50 relative hidden sm:block" style={{ boxShadow: 'inset 8px 0 12px -8px rgba(0,0,0,0.08)' }}>
            {rightCh ? <ChapterContent ch={rightCh} idx={rightIdx} highlight={highlight} /> : (
              <div className="h-full flex items-center justify-center text-gray-300 text-xs italic">— 끝 —</div>
            )}
          </div>
        </div>

        {/* 오른쪽 넘김 영역 */}
        <button onClick={() => goSpread(spread + 1)} disabled={spread === maxSpread} aria-label="다음 페이지"
          className="absolute right-0 top-0 bottom-0 w-12 md:w-16 flex items-center justify-center z-10 group">
          <span className={`text-2xl transition-opacity ${spread === maxSpread ? 'opacity-0' : 'opacity-20 group-hover:opacity-70'} text-white`}>›</span>
        </button>
      </div>

      {/* 하단 페이지 인디케이터 */}
      <div className={`flex items-center justify-center gap-1.5 py-2 transition-opacity duration-500 ${controlsVisible ? 'opacity-100' : 'opacity-0'}`}>
        {Array.from({ length: maxSpread + 1 }).map((_, i) => (
          <button key={i} onClick={() => goSpread(i)} aria-label={`${i * 2 + 1}-${i * 2 + 2}장`}
            className={`w-1.5 h-1.5 rounded-full transition ${i === spread ? 'bg-amber-400 scale-150' : 'bg-stone-600 hover:bg-stone-500'}`} />
        ))}
      </div>
    </div>
  );
}

export default AutobiographyCompilation;
