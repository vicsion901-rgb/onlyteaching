import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
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

// ─── 연간 자서전 질문 ───
const TEACHER_QUESTIONS = [
  { id: 'tq1', chapter: 0, text: '올해 학교에서 가장 많은 에너지를 쏟은 일은 무엇이었나요?' },
  { id: 'tq2', chapter: 1, text: '올해 가장 버겁고 지쳤던 순간은 언제였나요?' },
  { id: 'tq3', chapter: 2, text: '그럼에도 올해를 버틸 수 있게 해준 힘은 무엇이었나요?' },
  { id: 'tq4', chapter: 3, text: '올해 가장 외롭거나 혼자라고 느낀 순간은 언제였나요?' },
  { id: 'tq5', chapter: 4, text: '올해 가장 위로가 되었던 사람, 말, 장면은 무엇이었나요?' },
  { id: 'tq6', chapter: 5, text: '올해 교사로서 가장 많이 흔들렸던 지점은 무엇이었나요?' },
  { id: 'tq7', chapter: 6, text: '올해를 지나며 내가 달라졌다고 느낀 부분은 무엇인가요?' },
  { id: 'tq8', chapter: 7, text: '올해를 대표하는 장면 하나를 꼽는다면 무엇인가요?' },
  { id: 'tq9', chapter: 8, text: '작년과 비교했을 때 올해의 나는 무엇이 달라졌나요?' },
  { id: 'tq10', chapter: 9, text: '올해의 나에게, 그리고 내년의 나에게 남기고 싶은 말은 무엇인가요?' },
];

const STUDENT_QUESTIONS = [
  { id: 'sq1', chapter: 0, text: '올해 학교에서 가장 기억에 남는 일은 무엇이었나요?' },
  { id: 'sq2', chapter: 1, text: '올해 가장 어렵거나 힘들었던 순간은 언제였나요?' },
  { id: 'sq3', chapter: 2, text: '올해 나를 도와준 사람이나 힘이 된 것은 무엇이었나요?' },
  { id: 'sq4', chapter: 3, text: '올해 새로 사귄 친구나 더 가까워진 친구가 있나요?' },
  { id: 'sq5', chapter: 4, text: '올해 가장 뿌듯했던 순간은 언제였나요?' },
  { id: 'sq6', chapter: 5, text: '올해 내가 맡았던 역할 중 기억에 남는 것은 무엇인가요?' },
  { id: 'sq7', chapter: 6, text: '올해 나에게 일어난 가장 큰 변화는 무엇인가요?' },
  { id: 'sq8', chapter: 7, text: '올해를 떠올리면 가장 먼저 생각나는 장면은 무엇인가요?' },
  { id: 'sq9', chapter: 8, text: '앞으로 하고 싶은 것이나 되고 싶은 모습이 있나요?' },
  { id: 'sq10', chapter: 9, text: '올해의 나에게 해주고 싶은 말이 있다면 무엇인가요?' },
];

const FOLLOW_UP_RULES = [
  { keywords: ['힘들', '지쳤', '버거', '고됐', '벅찼', '어려'], questions: ['어떤 점이 가장 버거웠나요?', '그 시기를 버티게 한 작은 힘이 있었나요?'] },
  { keywords: ['학생', '아이들', '반 아이', '우리 반', '친구'], questions: ['어떤 학생(친구)이 가장 기억에 남나요?', '그 관계에서 배운 점이 있나요?'] },
  { keywords: ['생활기록부', '생기부', '기록'], questions: ['기록 과정에서 가장 어려운 부분은 무엇이었나요?'] },
  { keywords: ['수업', '교과', '발표', '활동'], questions: ['그 활동에서 가장 보람찼던 순간은 언제였나요?'] },
  { keywords: ['후회', '아쉬', '미안'], questions: ['그때 다시 돌아간다면 어떻게 하고 싶나요?'] },
  { keywords: ['변화', '달라', '성장', '배웠'], questions: ['그 변화를 알아차린 순간이 있었나요?'] },
  { keywords: ['행사', '체험', '운동회', '소풍'], questions: ['그 행사에서 가장 기억에 남는 장면은 무엇인가요?'] },
];

function generateFollowUps(answer) {
  if (!answer || answer.trim().length < 5) return [];
  const lower = answer.toLowerCase();
  const matched = [];
  for (const rule of FOLLOW_UP_RULES) {
    if (rule.keywords.some(kw => lower.includes(kw))) matched.push(...rule.questions);
  }
  if (matched.length === 0) matched.push('그 상황을 조금 더 이야기해줄 수 있나요?');
  return matched.slice(0, 2);
}

const SOURCE_CHAPTER_KEYWORDS = {
  studentRecords: ['학생', '친구', '반', '이름'],
  lifeRecords: ['기록', '생기부', '생활기록'],
  careClassroom: ['돌봄', '방과후'],
  schedule: ['일정', '행사', '체험', '운동회'],
  subjectEvaluation: ['평가', '시험', '성적', '교과'],
  observationJournal: ['관찰', '상담'],
};

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

// ─── 블록 관련 상수 ───
const SOURCE_LABELS = {
  radioStory: '라디오 사연',
  careClassroom: '돌봄교실',
  schedule: '학사일정',
  studentRecords: '학생명부',
  lifeRecords: '생활기록부',
  subjectEvaluation: '교과평가',
  observationJournal: '관찰일지',
  todayMeal: '오늘의 급식',
  'ai-generated': 'AI 생성',
};

const SOURCE_TO_CHAPTERS = {
  radioStory: ['intro', 'relations'],
  studentRecords: ['intro', 'background'],
  lifeRecords: ['early', 'settling', 'relations'],
  careClassroom: ['relations', 'responsibility'],
  subjectEvaluation: ['early', 'responsibility'],
  observationJournal: ['responsibility', 'turning'],
  schedule: ['present'],
  todayMeal: ['present'],
};

let _blockIdCounter = 0;
const generateBlockId = () => `blk_${Date.now()}_${++_blockIdCounter}`;

function createBlock(type, text, source = null, sourceLabel = null) {
  return {
    id: generateBlockId(),
    type,
    source,
    sourceLabel: sourceLabel || (source ? SOURCE_LABELS[source] || source : null),
    originalText: text,
    currentText: text,
  };
}

function formatSourceItem(source, item) {
  switch (source) {
    case 'studentRecords':
      return `${item.number ? item.number + '번 ' : ''}${item.name || ''}`.trim();
    case 'lifeRecords':
      return typeof item === 'string' ? item : (item.content || item.comment || item.record || JSON.stringify(item));
    case 'careClassroom': {
      const parts = [item.date];
      if (item.mood) parts.push(`기분: ${item.mood}`);
      if (item.todos) parts.push(`활동: ${item.todos}`);
      if (item.events) parts.push(item.events);
      return parts.join(' | ');
    }
    case 'schedule':
      return typeof item === 'string' ? item : (item.title || item.event || item.description || JSON.stringify(item));
    case 'subjectEvaluation':
      return typeof item === 'string' ? item : (item.achievement || item.description || item.comment || JSON.stringify(item));
    case 'todayMeal':
      return typeof item === 'string' ? item : (item.menu || item.name || JSON.stringify(item));
    case 'radioStory':
      return typeof item === 'string' ? item : (item.content || item.story || JSON.stringify(item));
    default:
      return typeof item === 'string' ? item : JSON.stringify(item);
  }
}

function importSourceBlocks(sourceData) {
  const chapterBlocksMap = {};
  FIXED_CHAPTERS.forEach(ch => { chapterBlocksMap[ch.id] = []; });

  if (!sourceData) return chapterBlocksMap;

  for (const [sourceKey, items] of Object.entries(sourceData)) {
    if (!Array.isArray(items) || items.length === 0) continue;
    const targetChapters = SOURCE_TO_CHAPTERS[sourceKey] || ['present'];
    const label = SOURCE_LABELS[sourceKey] || sourceKey;

    items.forEach((item, idx) => {
      const text = formatSourceItem(sourceKey, item);
      if (!text || text.trim().length < 2) return;
      const targetChapter = targetChapters[idx % targetChapters.length];
      if (chapterBlocksMap[targetChapter]) {
        chapterBlocksMap[targetChapter].push(createBlock('linked', text, sourceKey, label));
      }
    });
  }

  return chapterBlocksMap;
}

function createBlocksFromAIContent(text) {
  if (!text) return [];
  return text.split('\n').filter(l => l.trim()).map(line =>
    createBlock('linked', line.trim(), 'ai-generated', 'AI 생성')
  );
}

// ─── 메인 컴포넌트 ───
function AutobiographyCompilation() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentPrompt, setStudentPrompt] = useState('');
  const [teacherPrompt, setTeacherPrompt] = useState('');
  const [teacherForm, setTeacherForm] = useState(INITIAL_TEACHER_FORM);
  const [registeredName, setRegisteredName] = useState('');
  const [nameMode, setNameMode] = useState('registered');
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [response, setResponse] = useState('');
  const [usedModel, setUsedModel] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [chapterOrder, setChapterOrder] = useState(() => FIXED_CHAPTERS.map((_, i) => i));
  const [dragIdx, setDragIdx] = useState(null);
  const [isSourcePickerOpen, setIsSourcePickerOpen] = useState(false);
  const [lastSourceData, setLastSourceData] = useState(null);
  const [questionAnswers, setQuestionAnswers] = useState({});
  const [followUpAnswers, setFollowUpAnswers] = useState({});
  const [followUps, setFollowUps] = useState({});
  const [isQuestionsOpen, setIsQuestionsOpen] = useState(false);
  const [expandedQ, setExpandedQ] = useState(null);
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

  const collectSourceData = async () => {
    const data = {};

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

    if (selectedSources.schedule) {
      try {
        const res = await client.get('/api/schedules');
        data.schedule = Array.isArray(res.data) ? res.data.slice(0, 30) : [];
      } catch {
        data.schedule = [];
      }
    }

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

    if (selectedSources.lifeRecords) {
      try {
        const res = await client.get('/api/liferecords?action=keywords&query=');
        data.lifeRecords = Array.isArray(res.data) ? res.data.slice(0, 20) : [];
      } catch {
        data.lifeRecords = [];
      }
    }

    if (selectedSources.subjectEvaluation) {
      try {
        const res = await client.get('/api/achievements');
        data.subjectEvaluation = Array.isArray(res.data) ? res.data.slice(0, 20) : [];
      } catch {
        data.subjectEvaluation = [];
      }
    }

    if (selectedSources.todayMeal) {
      try {
        const res = await client.get('/api/meals');
        data.todayMeal = Array.isArray(res.data?.items) ? res.data.items.slice(0, 10) : [];
      } catch {
        data.todayMeal = [];
      }
    }

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
      setLastSourceData(sourceData);

      // 질문 답변을 프롬프트에 자동 반영
      const questions = activeTab === 'student' ? STUDENT_QUESTIONS : TEACHER_QUESTIONS;
      const qaText = questions
        .filter(q => questionAnswers[q.id]?.trim())
        .map(q => {
          let text = `질문: ${q.text}\n답변: ${questionAnswers[q.id].trim()}`;
          const fups = followUps[q.id] || [];
          fups.forEach((fu, i) => {
            const fa = followUpAnswers[`${q.id}_${i}`];
            if (fa?.trim()) text += `\n심화: ${fu}\n답변: ${fa.trim()}`;
          });
          return text;
        })
        .join('\n\n');
      const fullPrompt = qaText ? `${prompt}\n\n─── 질문 답변 ───\n${qaText}` : prompt;

      const payload = {
        tab: activeTab,
        version: activeTab,
        prompt: fullPrompt,
        student_id: selectedStudent ? Number(selectedStudent.id) : null,
        student_name: selectedStudent?.name || '',
        student_number: selectedStudent?.number || '',
        teacher_name: teacherForm.teacherName.trim(),
        teacher_role: teacherForm.teacherRole.trim(),
        teacher_focus: teacherForm.focus.trim(),
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

          {/* 연동 자료 섹션 */}
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
                  rows={4}
                  className="block w-full border-gray-300 rounded-md p-3 text-sm resize-none shadow-sm"
                  placeholder="예: 1학기 동안 발표 활동과 친구 관계, 좋아하는 과목 경험을 담아 따뜻한 학생 자서전 형식으로 작성해줘."
                  onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); handleGenerate(e); } }}
                />
              </div>
              <QuestionsSection questions={STUDENT_QUESTIONS} questionAnswers={questionAnswers} setQuestionAnswers={setQuestionAnswers} followUps={followUps} setFollowUps={setFollowUps} followUpAnswers={followUpAnswers} setFollowUpAnswers={setFollowUpAnswers} expandedQ={expandedQ} setExpandedQ={setExpandedQ} isOpen={isQuestionsOpen} setIsOpen={setIsQuestionsOpen} />
            </div>
          ) : (
            <div className="space-y-4">
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
                  rows={4}
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
              <QuestionsSection questions={TEACHER_QUESTIONS} questionAnswers={questionAnswers} setQuestionAnswers={setQuestionAnswers} followUps={followUps} setFollowUps={setFollowUps} followUpAnswers={followUpAnswers} setFollowUpAnswers={setFollowUpAnswers} expandedQ={expandedQ} setExpandedQ={setExpandedQ} isOpen={isQuestionsOpen} setIsOpen={setIsQuestionsOpen} />
            </div>
          )}

        </div>

        {/* 자서전 목차 + 뷰어 버튼 */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">자서전 목차</h2>
            <button type="button" onClick={() => setResponse(response || '__viewer__')}
              className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100">
              📖 자서전 편찬실
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {chapterOrder.map((origIdx, pos) => {
              const ch = FIXED_CHAPTERS[origIdx];
              const hasContent = response && response !== '__viewer__' && parseResponseToChapters(response)[origIdx]?.status === 'filled';
              return (
                <div
                  key={ch.id}
                  draggable
                  onDragStart={() => setDragIdx(pos)}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                  onDrop={() => {
                    if (dragIdx === null || dragIdx === pos) return;
                    setChapterOrder(prev => {
                      const next = [...prev];
                      const [moved] = next.splice(dragIdx, 1);
                      next.splice(pos, 0, moved);
                      return next;
                    });
                    setDragIdx(null);
                  }}
                  onDragEnd={() => setDragIdx(null)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-grab active:cursor-grabbing transition-all ${
                    dragIdx === pos ? 'border-purple-400 bg-purple-50 shadow-lg scale-[1.02] opacity-80' : 'border-gray-100 hover:bg-gray-50 hover:border-gray-200'
                  }`}
                >
                  <span className="text-xs font-bold text-gray-400 w-5">{pos + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{ch.title}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-xs text-gray-400">{ch.period}</span>
                      <ChapterBadges chapterIdx={origIdx} questionAnswers={questionAnswers} selectedSources={selectedSources} activeTab={activeTab} hasContent={hasContent} />
                    </div>
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
            chapterOrder={chapterOrder}
            usedModel={usedModel}
            sourceData={lastSourceData}
            onClose={() => { setResponse(''); setUsedModel(''); }}
            questionAnswers={questionAnswers}
            setQuestionAnswers={setQuestionAnswers}
            followUps={followUps}
            setFollowUps={setFollowUps}
            followUpAnswers={followUpAnswers}
            setFollowUpAnswers={setFollowUpAnswers}
          />
        )}
      </form>
    </div>
  );
}

// ─── 유틸리티 ───

function extractGeneratedText(data) {
  if (!data) return '';
  const candidates = [data.generated_text, data.generated_document, data.result, data.output, data.content];
  const firstText = candidates.find((value) => typeof value === 'string' && value.trim());
  if (firstText) return firstText;
  if (Array.isArray(data.items)) {
    return data.items.map((item) => (typeof item === 'string' ? item : JSON.stringify(item, null, 2))).join('\n\n');
  }
  if (typeof data === 'string') return data;
  return JSON.stringify(data, null, 2);
}

function parseResponseToChapters(text) {
  if (!text) return FIXED_CHAPTERS.map(ch => ({ ...ch, content: '', status: 'empty' }));

  const sections = text.split(/^##\s*/m).filter(Boolean);
  const parsed = {};
  for (const sec of sections) {
    const lines = sec.split('\n');
    const title = lines[0].trim();
    const body = lines.slice(1).join('\n').trim();
    if (body) parsed[title] = body;
  }

  return FIXED_CHAPTERS.map((ch, idx) => {
    let matched = '';
    for (const [title, body] of Object.entries(parsed)) {
      if (title.includes(ch.title) || ch.title.includes(title) ||
          title.includes(ch.period) || idx === 0 && title.includes('시작')) {
        matched = body;
        delete parsed[title];
        break;
      }
    }
    if (!matched && Object.keys(parsed).length > 0) {
      const remaining = Object.entries(parsed);
      if (remaining.length > 0 && idx < FIXED_CHAPTERS.length) {
        const [key, val] = remaining[0];
        matched = val;
        delete parsed[key];
      }
    }
    return { ...ch, content: matched, status: matched ? 'filled' : 'empty' };
  });
}

// ─── 질문 섹션 컴포넌트 ───

function QuestionsSection({ questions, questionAnswers, setQuestionAnswers, followUps, setFollowUps, followUpAnswers, setFollowUpAnswers, expandedQ, setExpandedQ, isOpen, setIsOpen }) {
  const answeredCount = questions.filter(q => questionAnswers[q.id]?.trim()).length;
  return (
    <div className="rounded-xl border-2 border-purple-100 bg-purple-50/30 p-3">
      <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">📝 자서전 질문</span>
          {answeredCount > 0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-600 text-white">{answeredCount}/{questions.length}</span>}
        </div>
        <span className="text-xs text-gray-400">{isOpen ? '접기 ▲' : '펼치기 ▼'}</span>
      </button>
      {isOpen && (
        <div className="mt-3 space-y-1">
          {questions.map((q) => {
            const isExp = expandedQ === q.id;
            const hasAns = !!questionAnswers[q.id]?.trim();
            const fups = followUps[q.id] || [];
            return (
              <div key={q.id} className={`rounded-lg border transition-all ${isExp ? 'border-purple-300 bg-white' : hasAns ? 'border-green-200 bg-green-50/30' : 'border-gray-100 bg-white/50'}`}>
                <button type="button" onClick={() => setExpandedQ(isExp ? null : q.id)} className="w-full text-left px-3 py-2 flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0 ${hasAns ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                    {hasAns ? '✓' : q.id.replace(/[a-z]/g, '')}
                  </span>
                  <span className="text-xs text-gray-700 flex-1 line-clamp-2">{q.text}</span>
                </button>
                {isExp && (
                  <div className="px-3 pb-3 space-y-2">
                    <textarea
                      value={questionAnswers[q.id] || ''}
                      onChange={(e) => setQuestionAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                      onBlur={() => {
                        const ans = questionAnswers[q.id];
                        if (ans && ans.trim().length >= 5) {
                          setFollowUps(prev => ({ ...prev, [q.id]: generateFollowUps(ans) }));
                        }
                      }}
                      rows={3}
                      className="w-full text-xs border border-gray-200 rounded-md p-2 resize-none focus:ring-1 focus:ring-purple-400 focus:border-purple-400"
                      placeholder="자유롭게 답변해주세요..."
                    />
                    {fups.length > 0 && (
                      <div className="space-y-1.5 pl-2 border-l-2 border-purple-200">
                        <div className="text-[10px] font-semibold text-purple-500">심화 질문</div>
                        {fups.map((fu, i) => (
                          <div key={i}>
                            <p className="text-[11px] text-gray-600 mb-1">→ {fu}</p>
                            <textarea
                              value={followUpAnswers[`${q.id}_${i}`] || ''}
                              onChange={(e) => setFollowUpAnswers(prev => ({ ...prev, [`${q.id}_${i}`]: e.target.value }))}
                              rows={2}
                              className="w-full text-xs border border-gray-100 rounded p-1.5 resize-none focus:ring-1 focus:ring-purple-300"
                              placeholder="답변..."
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── 목차 카드 배지 컴포넌트 ───

function ChapterBadges({ chapterIdx, questionAnswers, selectedSources, activeTab, hasContent }) {
  const questions = activeTab === 'student' ? STUDENT_QUESTIONS : TEACHER_QUESTIONS;
  const q = questions.find(qq => qq.chapter === chapterIdx);
  const hasAnswer = q && !!questionAnswers[q.id]?.trim();

  const linkedSources = Object.entries(selectedSources)
    .filter(([, v]) => v)
    .map(([k]) => k);
  const chapterSources = linkedSources.filter(src => {
    const mapping = SOURCE_TO_CHAPTERS[src] || [];
    const chId = FIXED_CHAPTERS[chapterIdx]?.id;
    return mapping.includes(chId);
  });

  return (
    <span className="flex items-center gap-1 flex-wrap">
      {hasAnswer && <span className="text-[9px] px-1 py-0.5 rounded bg-purple-100 text-purple-600">질문답변</span>}
      {chapterSources.length > 0 && <span className="text-[9px] px-1 py-0.5 rounded bg-sky-100 text-sky-600">{chapterSources.length}개 연동</span>}
      {hasContent && <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-100 text-emerald-600">초안</span>}
    </span>
  );
}

// ─── 블록 편집 컴포넌트 ───

function AddBlockButton({ onClick, alwaysVisible }) {
  return (
    <div className={`flex justify-center py-0.5 transition-opacity duration-200 ${alwaysVisible ? 'opacity-100' : 'opacity-0 hover:opacity-100'}`}>
      <button
        type="button"
        onClick={onClick}
        className={`px-3 py-0.5 rounded-full border transition ${
          alwaysVisible
            ? 'text-xs text-amber-600 border-amber-300 bg-amber-50 hover:bg-amber-100 font-medium py-1.5 px-4'
            : 'text-[10px] text-gray-300 hover:text-amber-600 border-transparent hover:border-amber-300 hover:bg-amber-50'
        }`}
      >
        + 문장 추가
      </button>
    </div>
  );
}

function ProofreadSuggestion({ result, onApply, onDismiss }) {
  if (!result || !result.hasChanges || result.applied) return null;
  return (
    <div className="mt-1.5 p-2.5 bg-green-50 border border-green-200 rounded-lg text-xs animate-in fade-in">
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-semibold text-green-700">📝 교정 제안</span>
        <div className="flex gap-1">
          <button type="button" onClick={onApply} className="px-2.5 py-0.5 bg-green-500 text-white rounded text-[10px] font-medium hover:bg-green-600 transition">적용</button>
          <button type="button" onClick={onDismiss} className="px-2.5 py-0.5 bg-gray-200 text-gray-600 rounded text-[10px] font-medium hover:bg-gray-300 transition">무시</button>
        </div>
      </div>
      <div className="line-through text-red-400 mb-1 leading-relaxed">{result.original}</div>
      <div className="text-green-700 leading-relaxed">{result.revised}</div>
    </div>
  );
}

function EditableBlock({ block, onUpdate, onDelete, onRestore, onProofread, proofreadResult, onApplyProofread, onDismissProofread, isProofreading }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(block.currentText);
  const textareaRef = useRef(null);

  const isLinked = block.type === 'linked' || block.type === 'linked-edited';
  const isEdited = block.type === 'linked-edited';
  const isManual = block.type === 'manual';

  useEffect(() => {
    setEditText(block.currentText);
  }, [block.currentText]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    if (editText.trim() !== block.currentText) {
      onUpdate(editText.trim());
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setEditText(block.currentText);
      setIsEditing(false);
    }
  };

  const SOURCE_BADGE_COLORS = {
    'ai-generated': 'bg-violet-100 text-violet-700',
    studentRecords: 'bg-blue-100 text-blue-700',
    lifeRecords: 'bg-emerald-100 text-emerald-700',
    careClassroom: 'bg-amber-100 text-amber-700',
    subjectEvaluation: 'bg-cyan-100 text-cyan-700',
    observationJournal: 'bg-pink-100 text-pink-700',
    schedule: 'bg-indigo-100 text-indigo-700',
    todayMeal: 'bg-orange-100 text-orange-700',
    radioStory: 'bg-rose-100 text-rose-700',
  };

  return (
    <div className={`group relative rounded-lg px-2.5 py-1.5 transition-all ${
      isEditing ? 'bg-amber-50 ring-1 ring-amber-300 shadow-sm' : 'hover:bg-amber-50/50'
    }`}>
      {/* 출처/상태 배지 */}
      {(isLinked || isManual) && (
        <div className="flex items-center gap-1 mb-0.5">
          {block.sourceLabel && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${SOURCE_BADGE_COLORS[block.source] || 'bg-gray-100 text-gray-600'}`}>
              {block.sourceLabel}
            </span>
          )}
          {isManual && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium">
              직접 입력
            </span>
          )}
          {isEdited && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600 font-medium">
              ✏️ 수정됨
            </span>
          )}
        </div>
      )}

      {/* 본문 */}
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={editText}
          onChange={(e) => {
            setEditText(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
          }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-full text-[13px] leading-[2] bg-transparent border-none outline-none resize-none"
          style={{ fontFamily: "'Noto Serif KR', serif", minHeight: 40 }}
        />
      ) : (
        <p
          className="text-[13px] text-gray-800 leading-[2] text-justify indent-4 cursor-text"
          style={{ fontFamily: "'Noto Serif KR', serif" }}
          onClick={() => setIsEditing(true)}
        >
          {block.currentText || <span className="text-gray-300 italic">클릭하여 입력...</span>}
        </p>
      )}

      {/* 호버 액션 버튼 */}
      <div className="absolute right-1 top-1 hidden group-hover:flex items-center gap-0.5 bg-white/90 rounded shadow-sm border border-gray-100 px-1 py-0.5">
        <button
          type="button"
          onClick={() => onProofread(block.id)}
          disabled={isProofreading || !block.currentText?.trim()}
          className="text-[10px] px-1.5 py-0.5 text-green-600 hover:bg-green-50 rounded disabled:opacity-30"
          title="오탈자 점검"
        >
          ✓점검
        </button>
        {isEdited && (
          <button
            type="button"
            onClick={onRestore}
            className="text-[10px] px-1.5 py-0.5 text-blue-600 hover:bg-blue-50 rounded"
            title="원문 복원"
          >
            ↩원문
          </button>
        )}
        {isManual && (
          <button
            type="button"
            onClick={onDelete}
            className="text-[10px] px-1.5 py-0.5 text-red-500 hover:bg-red-50 rounded"
            title="삭제"
          >
            ×
          </button>
        )}
      </div>

      {/* 교정 제안 */}
      <ProofreadSuggestion
        result={proofreadResult}
        onApply={onApplyProofread}
        onDismiss={onDismissProofread}
      />
    </div>
  );
}

function ChapterContent({ ch, idx, blocks, onAddBlock, onUpdateBlock, onDeleteBlock, onRestoreBlock, onProofreadBlock, onProofreadPage, proofreadResults, isProofreading, onApplyProofread, onDismissProofread, highlight }) {
  const hl = (text) => {
    if (!highlight) return text;
    const re = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.split(re).map((part, i) =>
      re.test(part) ? <mark key={i} className="bg-yellow-300 px-0.5 rounded">{part}</mark> : part
    );
  };

  const hasBlocks = blocks && blocks.length > 0;

  return (
    <div className="h-full overflow-y-auto px-8 py-6 flex flex-col" style={{ fontFamily: "'Noto Serif KR', serif" }}>
      {/* 챕터 헤더 */}
      <div className="text-center mb-4">
        <span className="text-[10px] text-amber-500 tracking-[0.2em] uppercase">{ch.period}</span>
        <h2 className="text-lg font-bold text-gray-900 mt-1">제{idx + 1}장</h2>
        <h3 className="text-base text-gray-700 mt-0.5">{ch.title}</h3>
        <div className="w-10 h-px bg-amber-400 mx-auto mt-3" />
      </div>

      {/* 블록 리스트 */}
      <div className="flex-1">
        {hasBlocks ? (
          <>
            <AddBlockButton onClick={() => onAddBlock(ch.id, 0)} />
            {blocks.map((block, i) => (
              <React.Fragment key={block.id}>
                <EditableBlock
                  block={block}
                  onUpdate={(text) => onUpdateBlock(ch.id, i, text)}
                  onDelete={() => onDeleteBlock(ch.id, i)}
                  onRestore={() => onRestoreBlock(ch.id, i)}
                  onProofread={(blockId) => onProofreadBlock(ch.id, blockId)}
                  proofreadResult={proofreadResults?.[block.id]}
                  onApplyProofread={() => onApplyProofread(ch.id, block.id)}
                  onDismissProofread={() => onDismissProofread(block.id)}
                  isProofreading={isProofreading}
                />
                <AddBlockButton onClick={() => onAddBlock(ch.id, i + 1)} />
              </React.Fragment>
            ))}
          </>
        ) : (
          <div className="text-center py-6">
            <p className="text-xs text-gray-300 italic mb-4">
              {ch.placeholder}
            </p>
            <AddBlockButton onClick={() => onAddBlock(ch.id, 0)} alwaysVisible />
            <p className="text-[10px] text-gray-300 mt-3">
              직접 문장을 추가하거나, 자서전 생성 후 내용이 채워집니다.
            </p>
          </div>
        )}
      </div>

      {/* 페이지 단위 오탈자 점검 */}
      {hasBlocks && (
        <div className="mt-2 flex justify-center">
          <button
            type="button"
            onClick={() => onProofreadPage(ch.id)}
            disabled={isProofreading}
            className="text-[11px] px-3 py-1 text-green-600 bg-green-50 border border-green-200 rounded-full hover:bg-green-100 disabled:opacity-40 transition font-medium"
          >
            {isProofreading ? '점검 중...' : '📝 이 페이지 오탈자 점검'}
          </button>
        </div>
      )}

      {/* 페이지 번호 */}
      <div className="text-center text-[10px] text-gray-300 mt-2 flex-shrink-0">{idx + 1}</div>
    </div>
  );
}

// ─── 전자북 모달 ───

function EbookModal({ response, activeTab, usedModel, onClose, chapterOrder, sourceData, questionAnswers, setQuestionAnswers, followUps, setFollowUps, followUpAnswers, setFollowUpAnswers }) {
  const [spread, setSpread] = useState(0);
  const [showToc, setShowToc] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showQuestions, setShowQuestions] = useState(false);
  const [expandedQ, setExpandedQ] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [pageInput, setPageInput] = useState('');
  const [highlight, setHighlight] = useState('');
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimer = useRef(null);

  // 블록 상태
  const [chapterBlocks, setChapterBlocks] = useState({});
  const [proofreadResults, setProofreadResults] = useState({});
  const [isProofreading, setIsProofreading] = useState(false);

  const allChapters = useMemo(() => parseResponseToChapters(response), [response]);
  const chapters = useMemo(() => {
    if (chapterOrder && chapterOrder.length === allChapters.length) {
      return chapterOrder.map(i => allChapters[i]);
    }
    return allChapters;
  }, [allChapters, chapterOrder]);
  const maxSpread = Math.ceil(chapters.length / 2) - 1;
  const leftIdx = spread * 2;
  const rightIdx = spread * 2 + 1;
  const leftCh = chapters[leftIdx];
  const rightCh = rightIdx < chapters.length ? chapters[rightIdx] : null;

  const goSpread = (s) => setSpread(Math.max(0, Math.min(maxSpread, s)));
  const goPage = (p) => goSpread(Math.floor(p / 2));

  // 블록 초기화: AI 응답 + 연동 자료 → 블록 변환
  useEffect(() => {
    const parsed = parseResponseToChapters(response);
    const sourceBlocks = importSourceBlocks(sourceData);
    const blocks = {};

    parsed.forEach((ch) => {
      const aiBlocks = createBlocksFromAIContent(ch.content);
      const linked = sourceBlocks[ch.id] || [];
      blocks[ch.id] = [...aiBlocks, ...linked];
    });

    setChapterBlocks(blocks);
    setProofreadResults({});
  }, [response, sourceData]);

  // 질문 답변 → 해당 장 블록 자동 삽입
  useEffect(() => {
    if (!questionAnswers) return;
    const questions = activeTab === 'student' ? STUDENT_QUESTIONS : TEACHER_QUESTIONS;
    setChapterBlocks(prev => {
      const next = { ...prev };
      questions.forEach(q => {
        const ans = questionAnswers[q.id]?.trim();
        if (!ans) return;
        const ch = FIXED_CHAPTERS[q.chapter];
        if (!ch) return;
        const arr = next[ch.id] || [];
        const existingQBlock = arr.find(b => b.source === `question-${q.id}`);
        if (existingQBlock) {
          if (existingQBlock.currentText !== ans) {
            next[ch.id] = arr.map(b => b.source === `question-${q.id}` ? { ...b, currentText: ans, originalText: ans } : b);
          }
        } else {
          next[ch.id] = [...arr, createBlock('linked', ans, `question-${q.id}`, '질문 답변')];
        }
      });
      return next;
    });
  }, [questionAnswers, activeTab]);

  // 키보드
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goSpread(spread - 1);
      if (e.key === 'ArrowRight') goSpread(spread + 1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [spread]);

  // 컨트롤 자동 숨김
  useEffect(() => {
    const show = () => { setControlsVisible(true); clearTimeout(hideTimer.current); hideTimer.current = setTimeout(() => setControlsVisible(false), 4000); };
    show();
    window.addEventListener('mousemove', show);
    window.addEventListener('touchstart', show);
    return () => { window.removeEventListener('mousemove', show); window.removeEventListener('touchstart', show); clearTimeout(hideTimer.current); };
  }, []);

  // ── 블록 CRUD ──

  const addBlock = useCallback((chapterId, atIndex) => {
    setChapterBlocks(prev => {
      const arr = [...(prev[chapterId] || [])];
      arr.splice(atIndex, 0, createBlock('manual', ''));
      return { ...prev, [chapterId]: arr };
    });
  }, []);

  const updateBlock = useCallback((chapterId, blockIndex, newText) => {
    setChapterBlocks(prev => {
      const arr = [...(prev[chapterId] || [])];
      const block = { ...arr[blockIndex] };
      block.currentText = newText;
      if (block.type === 'linked' && newText !== block.originalText) {
        block.type = 'linked-edited';
      } else if (block.type === 'linked-edited' && newText === block.originalText) {
        block.type = 'linked';
      }
      arr[blockIndex] = block;
      return { ...prev, [chapterId]: arr };
    });
  }, []);

  const deleteBlock = useCallback((chapterId, blockIndex) => {
    setChapterBlocks(prev => {
      const arr = [...(prev[chapterId] || [])];
      arr.splice(blockIndex, 1);
      return { ...prev, [chapterId]: arr };
    });
  }, []);

  const restoreBlock = useCallback((chapterId, blockIndex) => {
    setChapterBlocks(prev => {
      const arr = [...(prev[chapterId] || [])];
      const block = { ...arr[blockIndex] };
      block.currentText = block.originalText;
      block.type = 'linked';
      arr[blockIndex] = block;
      return { ...prev, [chapterId]: arr };
    });
  }, []);

  // ── 교정 ──

  const callProofreadApi = useCallback(async (texts) => {
    const endpoints = ['/proofread', '/api/proofread'];
    for (const endpoint of endpoints) {
      try {
        const res = await client.post(endpoint, {
          texts,
          contentType: 'autobiography',
        }, { timeout: 15000 });
        return res.data?.results || [];
      } catch (err) {
        if (err.response?.status === 404) continue;
        throw err;
      }
    }
    throw new Error('교정 API를 찾을 수 없습니다.');
  }, []);

  const handleProofreadBlock = useCallback(async (chapterId, blockId) => {
    const blocks = chapterBlocks[chapterId] || [];
    const block = blocks.find(b => b.id === blockId);
    if (!block || !block.currentText?.trim()) return;

    setIsProofreading(true);
    try {
      const apiResults = await callProofreadApi([{ id: block.id, text: block.currentText }]);
      const results = {};
      for (const r of apiResults) {
        results[r.id] = { ...r, applied: false };
      }
      setProofreadResults(prev => ({ ...prev, ...results }));
    } catch (err) {
      console.error('Proofread failed:', err);
      alert('오탈자 점검에 실패했습니다. 백엔드 서버를 확인해주세요.');
    } finally {
      setIsProofreading(false);
    }
  }, [chapterBlocks, callProofreadApi]);

  const handleProofreadPage = useCallback(async (chapterId) => {
    const blocks = chapterBlocks[chapterId] || [];
    const textsToCheck = blocks
      .filter(b => b.currentText?.trim())
      .map(b => ({ id: b.id, text: b.currentText }));

    if (textsToCheck.length === 0) return;

    setIsProofreading(true);
    try {
      const apiResults = await callProofreadApi(textsToCheck);
      const results = {};
      for (const r of apiResults) {
        results[r.id] = { ...r, applied: false };
      }
      setProofreadResults(prev => ({ ...prev, ...results }));
    } catch (err) {
      console.error('Proofread failed:', err);
      alert('오탈자 점검에 실패했습니다. 백엔드 서버를 확인해주세요.');
    } finally {
      setIsProofreading(false);
    }
  }, [chapterBlocks, callProofreadApi]);

  const handleProofreadChapter = useCallback(async (chapterId) => {
    await handleProofreadPage(chapterId);
  }, [handleProofreadPage]);

  const applyProofread = useCallback((chapterId, blockId) => {
    const result = proofreadResults[blockId];
    if (!result) return;

    setChapterBlocks(prev => {
      const arr = [...(prev[chapterId] || [])];
      const idx = arr.findIndex(b => b.id === blockId);
      if (idx < 0) return prev;
      const block = { ...arr[idx] };
      block.currentText = result.revised;
      if (block.type === 'linked' && result.revised !== block.originalText) {
        block.type = 'linked-edited';
      }
      arr[idx] = block;
      return { ...prev, [chapterId]: arr };
    });

    setProofreadResults(prev => ({
      ...prev,
      [blockId]: { ...prev[blockId], applied: true },
    }));
  }, [proofreadResults]);

  const dismissProofread = useCallback((blockId) => {
    setProofreadResults(prev => {
      const next = { ...prev };
      delete next[blockId];
      return next;
    });
  }, []);

  // ── 검색 ──

  const doSearch = () => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const q = searchQuery.trim().toLowerCase();
    const results = [];
    chapters.forEach((ch, i) => {
      const blocks = chapterBlocks[ch.id] || [];
      const blockTexts = blocks.map(b => b.currentText).join(' ');
      const searchable = [`제${i + 1}장`, `${i + 1}`, ch.title, ch.period, ch.content || '', blockTexts, ch.placeholder || ''].join(' ');
      const idx = searchable.toLowerCase().indexOf(q);
      if (idx >= 0) {
        const textSource = blockTexts || ch.content || ch.placeholder || ch.title;
        const srcIdx = textSource.toLowerCase().indexOf(q);
        const start = Math.max(0, srcIdx - 20);
        const snippet = srcIdx >= 0 ? '...' + textSource.slice(start, srcIdx + q.length + 30) + '...' : ch.title;
        results.push({ page: i, title: ch.title, snippet });
      }
    });
    setSearchResults(results);
    setHighlight(searchQuery.trim());
  };

  const goToPage = () => {
    const n = Number(pageInput);
    if (n >= 1 && n <= chapters.length) { goPage(n - 1); setShowSearch(false); setPageInput(''); }
  };

  // 블록 수 요약
  const getBlockSummary = (chId) => {
    const blocks = chapterBlocks[chId] || [];
    const linked = blocks.filter(b => b.type === 'linked' || b.type === 'linked-edited').length;
    const manual = blocks.filter(b => b.type === 'manual').length;
    const edited = blocks.filter(b => b.type === 'linked-edited').length;
    return { total: blocks.length, linked, manual, edited };
  };

  return (
    <div className="fixed inset-0 z-[200] bg-stone-900 flex flex-col select-none">
      {/* 상단 바 */}
      <div className={`flex items-center justify-between px-4 py-2 bg-black/60 transition-opacity duration-500 ${controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="flex items-center gap-2">
          <button onClick={() => { setShowToc(!showToc); setShowSearch(false); setShowQuestions(false); }} className="text-xs text-amber-300 hover:text-white border border-amber-800 rounded px-2 py-1" aria-label="목차">☰ 목차</button>
          <button onClick={() => { setShowSearch(!showSearch); setShowToc(false); setShowQuestions(false); }} className="text-xs text-amber-300 hover:text-white border border-amber-800 rounded px-2 py-1" aria-label="검색">🔍 검색</button>
          <button onClick={() => { setShowQuestions(!showQuestions); setShowToc(false); setShowSearch(false); }} className="text-xs text-purple-300 hover:text-white border border-purple-800 rounded px-2 py-1" aria-label="질문">📝 질문</button>
          <span className="text-xs text-stone-400 ml-2">{leftIdx + 1}~{Math.min(rightIdx + 1, chapters.length)} / {chapters.length}장</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const leftBlocks = chapterBlocks[leftCh?.id] || [];
              const rightBlocks = rightCh ? (chapterBlocks[rightCh.id] || []) : [];
              const allIds = [...leftBlocks, ...rightBlocks].filter(b => b.currentText?.trim()).map(b => b.id);
              if (leftCh) handleProofreadPage(leftCh.id);
              if (rightCh) handleProofreadPage(rightCh.id);
            }}
            disabled={isProofreading}
            className="text-xs text-green-300 hover:text-white border border-green-800 rounded px-2 py-1 disabled:opacity-40"
          >
            {isProofreading ? '점검 중...' : '📝 펼친 면 점검'}
          </button>
          <span className="text-xs text-amber-200">{activeTab === 'student' ? '학생 자서전' : '선생님 자서전'}</span>
          <button onClick={() => {
            const allText = chapters.map((ch, i) => {
              const blocks = chapterBlocks[ch.id] || [];
              const text = blocks.map(b => b.currentText).filter(Boolean).join('\n');
              return `## 제${i+1}장 ${ch.title}\n\n${text || ch.content || ''}`;
            }).join('\n\n');
            navigator.clipboard.writeText(allText);
          }} className="text-xs text-stone-400 hover:text-white border border-stone-700 rounded px-2 py-1" aria-label="전체 복사">복사</button>
          <button onClick={onClose} className="text-xs text-stone-400 hover:text-white border border-stone-700 rounded px-2 py-1" aria-label="닫기">✕</button>
        </div>
      </div>

      {/* 목차 패널 */}
      {showToc && (
        <div className="absolute left-2 top-12 z-20 w-64 bg-white/95 rounded-lg shadow-2xl border border-amber-200 py-1 max-h-[75vh] overflow-y-auto backdrop-blur">
          <div className="px-3 py-1.5 text-xs font-bold text-amber-800 border-b border-amber-100">목차</div>
          {chapters.map((c, i) => {
            const summary = getBlockSummary(c.id);
            return (
              <button key={c.id} onClick={() => { goPage(i); setShowToc(false); }}
                className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 hover:bg-amber-50 ${Math.floor(i / 2) === spread ? 'bg-amber-100 font-semibold text-amber-900' : 'text-gray-700'}`}>
                <span className="text-[10px] text-amber-500 w-4">{i + 1}</span>
                <span className="flex-1 truncate">{c.title}</span>
                <div className="flex items-center gap-1">
                  {summary.total > 0 && (
                    <span className="text-[9px] text-gray-400">{summary.total}블록</span>
                  )}
                  <span className={`w-1.5 h-1.5 rounded-full ${summary.total > 0 || c.status === 'filled' ? 'bg-emerald-400' : 'bg-gray-300'}`} />
                </div>
              </button>
            );
          })}
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

      {/* 질문 패널 */}
      {showQuestions && (
        <div className="absolute left-2 top-12 z-20 w-80 bg-white/95 rounded-lg shadow-2xl border border-purple-200 max-h-[75vh] overflow-y-auto backdrop-blur p-3">
          <QuestionsSection
            questions={activeTab === 'student' ? STUDENT_QUESTIONS : TEACHER_QUESTIONS}
            questionAnswers={questionAnswers || {}}
            setQuestionAnswers={setQuestionAnswers || (() => {})}
            followUps={followUps || {}}
            setFollowUps={setFollowUps || (() => {})}
            followUpAnswers={followUpAnswers || {}}
            setFollowUpAnswers={setFollowUpAnswers || (() => {})}
            expandedQ={expandedQ}
            setExpandedQ={setExpandedQ}
            isOpen={true}
            setIsOpen={() => setShowQuestions(false)}
          />
        </div>
      )}

      {/* 책 본문 + 좌우 넘김 */}
      <div className="flex-1 flex items-center justify-center relative">
        <button onClick={() => goSpread(spread - 1)} disabled={spread === 0} aria-label="이전 페이지"
          className="absolute left-0 top-0 bottom-0 w-12 md:w-16 flex items-center justify-center z-10 group">
          <span className={`text-2xl transition-opacity ${spread === 0 ? 'opacity-0' : 'opacity-60 group-hover:opacity-100'} text-white`}>‹</span>
        </button>

        <div className="flex shadow-[0_0_60px_rgba(0,0,0,0.5)] rounded-sm overflow-hidden" style={{ width: 'min(88vw, 1050px)', height: 'min(78vh, 620px)' }}>
          {/* 왼쪽 페이지 */}
          <div className="flex-1 bg-amber-50 relative" style={{ boxShadow: 'inset -8px 0 12px -8px rgba(0,0,0,0.08)' }}>
            {leftCh && (
              <ChapterContent
                ch={leftCh}
                idx={leftIdx}
                blocks={chapterBlocks[leftCh.id] || []}
                onAddBlock={addBlock}
                onUpdateBlock={updateBlock}
                onDeleteBlock={deleteBlock}
                onRestoreBlock={restoreBlock}
                onProofreadBlock={handleProofreadBlock}
                onProofreadPage={handleProofreadPage}
                proofreadResults={proofreadResults}
                isProofreading={isProofreading}
                onApplyProofread={applyProofread}
                onDismissProofread={dismissProofread}
                highlight={highlight}
              />
            )}
          </div>
          <div className="w-px bg-amber-300/60" />
          {/* 오른쪽 페이지 */}
          <div className="flex-1 bg-amber-50 relative hidden sm:block" style={{ boxShadow: 'inset 8px 0 12px -8px rgba(0,0,0,0.08)' }}>
            {rightCh ? (
              <ChapterContent
                ch={rightCh}
                idx={rightIdx}
                blocks={chapterBlocks[rightCh.id] || []}
                onAddBlock={addBlock}
                onUpdateBlock={updateBlock}
                onDeleteBlock={deleteBlock}
                onRestoreBlock={restoreBlock}
                onProofreadBlock={handleProofreadBlock}
                onProofreadPage={handleProofreadPage}
                proofreadResults={proofreadResults}
                isProofreading={isProofreading}
                onApplyProofread={applyProofread}
                onDismissProofread={dismissProofread}
                highlight={highlight}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-300 text-xs italic">— 끝 —</div>
            )}
          </div>
        </div>

        <button onClick={() => goSpread(spread + 1)} disabled={spread === maxSpread} aria-label="다음 페이지"
          className="absolute right-0 top-0 bottom-0 w-12 md:w-16 flex items-center justify-center z-10 group">
          <span className={`text-2xl transition-opacity ${spread === maxSpread ? 'opacity-0' : 'opacity-60 group-hover:opacity-100'} text-white`}>›</span>
        </button>
      </div>

      {/* 하단 인디케이터 */}
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
