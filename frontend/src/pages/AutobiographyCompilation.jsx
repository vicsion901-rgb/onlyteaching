import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import client from '../api/client';

const VALID_TABS = ['student', 'teacher'];
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
  teacherRole: '',
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
        const res = await client.get('/student-records/list');
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
      };

      const res = await client.post('/autobiography-compilation/generate', payload);
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

      <div className="bg-white shadow rounded-lg p-2 sm:p-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setTab('student')}
                className={`w-full rounded-md px-4 py-3 text-sm sm:text-base font-semibold transition-colors ${
                  activeTab === 'student'
                    ? 'bg-primary-50 text-primary-700 border border-primary-200'
                    : 'bg-gray-50 text-gray-600 border border-transparent hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-center gap-3">
                  <span className="shrink-0">학생(라디오 사연 보내기 + @)</span>
                  <button
                    type="button"
                    onClick={() => {
                      setTab('student');
                      setIsSourcePickerOpen((prev) => !prev);
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-800 shadow-sm transition hover:bg-sky-100"
                  >
                    자료 연동하기
                    <span className="text-xs text-gray-400">▾</span>
                  </button>
                </div>
              </button>
              {isSourcePickerOpen && activeTab === 'student' && (
                <div className="w-full rounded-2xl border border-gray-200 bg-white p-4 shadow-xl">
                  <div className="mb-3 text-sm font-semibold text-gray-700">학생 자료 반영 항목 선택</div>
                  <div className="grid grid-cols-2 gap-2">
                    {STUDENT_LINKAGE_OPTIONS.map((option) => (
                      <label
                        key={option.key}
                        className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSources[option.key]}
                          onChange={() => toggleSource(option.key)}
                          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                    <label className="col-span-2 flex cursor-pointer items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-sm font-medium text-primary-700 transition hover:bg-primary-100">
                      <input
                        type="checkbox"
                        checked={isAllSourcesSelected}
                        onChange={toggleAllSources}
                        className="h-4 w-4 rounded border-primary-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span>전부 연동</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setTab('teacher')}
                className={`w-full rounded-md px-4 py-3 text-sm sm:text-base font-semibold transition-colors ${
                  activeTab === 'teacher'
                    ? 'bg-primary-50 text-primary-700 border border-primary-200'
                    : 'bg-gray-50 text-gray-600 border border-transparent hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-center gap-3">
                  <span className="shrink-0">선생님(돌봄교실 + @)</span>
                  <button
                    type="button"
                    onClick={() => {
                      setTab('teacher');
                      setIsSourcePickerOpen((prev) => !prev);
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 shadow-sm transition hover:bg-amber-100"
                  >
                    자료 연동하기
                    <span className="text-xs text-gray-400">▾</span>
                  </button>
                </div>
              </button>
              {isSourcePickerOpen && activeTab === 'teacher' && (
                <div className="w-full rounded-2xl border border-gray-200 bg-white p-4 shadow-xl">
                  <div className="mb-3 text-sm font-semibold text-gray-700">선생님 자료 반영 항목 선택</div>
                  <div className="grid grid-cols-2 gap-2">
                    {TEACHER_LINKAGE_OPTIONS.map((option) => (
                      <label
                        key={option.key}
                        className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSources[option.key]}
                          onChange={() => toggleSource(option.key)}
                          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                    <label className="col-span-2 flex cursor-pointer items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-sm font-medium text-primary-700 transition hover:bg-primary-100">
                      <input
                        type="checkbox"
                        checked={isAllSourcesSelected}
                        onChange={toggleAllSources}
                        className="h-4 w-4 rounded border-primary-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span>전부 연동</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {errorMsg ? (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 text-sm">{errorMsg}</div>
      ) : null}

      <form onSubmit={handleGenerate} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-6 space-y-4">
          <div>
            <h2 className="text-lg font-medium text-gray-900">입력 설정</h2>
            <p className="mt-1 text-sm text-gray-500">
              {activeTab === 'student'
                ? '학생 관점의 자서전 초안을 생성합니다.'
                : '선생님 관찰과 지도 관점을 반영한 자서전 초안을 생성합니다.'}
            </p>
          </div>

          {activeTab === 'student' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">학생 선택</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                  disabled={isLoadingStudents || students.length === 0}
                >
                  {students.length === 0 ? (
                    <option value="">학생이 없습니다</option>
                  ) : null}
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
                  className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md p-3 resize-none"
                  placeholder="예: 1학기 동안 발표 활동과 친구 관계, 좋아하는 과목 경험을 담아 따뜻한 학생 자서전 형식으로 작성해줘."
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                      e.preventDefault();
                      handleGenerate(e);
                    }
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">선생님 이름</label>
                  <input
                    type="text"
                    value={teacherForm.teacherName}
                    onChange={(e) => handleTeacherFieldChange('teacherName', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                    placeholder="예: 김민지"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">역할/관계</label>
                  <input
                    type="text"
                    value={teacherForm.teacherRole}
                    onChange={(e) => handleTeacherFieldChange('teacherRole', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                    placeholder="예: 담임교사"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">강조할 지도 관점</label>
                <input
                  type="text"
                  value={teacherForm.focus}
                  onChange={(e) => handleTeacherFieldChange('focus', e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                  placeholder="예: 성장 과정, 교실 기여, 진로 태도"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">자서전 요청 내용</label>
                <textarea
                  value={teacherPrompt}
                  onChange={(e) => setTeacherPrompt(e.target.value)}
                  rows={10}
                  className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md p-3 resize-none"
                  placeholder="예: 학생의 학교생활 변화와 공동체 기여를 담아 선생님 시점의 자서전 추천글처럼 정리해줘."
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                      e.preventDefault();
                      handleGenerate(e);
                    }
                  }}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isGenerating}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                isGenerating ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500`}
            >
              {isGenerating ? '생성 중...' : '생성하기 (Ctrl + Enter)'}
            </button>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6 flex flex-col">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-medium text-gray-900">생성 결과</h2>
              <p className="mt-1 text-sm text-gray-500">
                {activeTab === 'student'
                  ? '학생 관점의 자서전 초안이 여기에 표시됩니다.'
                  : '선생님 관점의 자서전 초안이 여기에 표시됩니다.'}
              </p>
            </div>
            {usedModel ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                {usedModel}
              </span>
            ) : null}
          </div>

          <div className="flex-1 bg-gray-50 rounded-md border border-gray-200 p-4 min-h-[420px]">
            <ResultRenderer text={response} />
          </div>
        </div>
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
