import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';

const STORAGE_KEY = 'careClassroomRecords';

const MOOD_OPTIONS = [
  { value: 'very-good', label: '매우 좋음', emoji: '✨' },
  { value: 'good', label: '좋음', emoji: '😊' },
  { value: 'calm', label: '보통', emoji: '😌' },
  { value: 'tired', label: '지침', emoji: '💤' },
  { value: 'sensitive', label: '예민함', emoji: '🍂' },
  { value: 'happy', label: '행복함', emoji: '🥰' },
  { value: 'excited', label: '신남', emoji: '🎉' },
  { value: 'proud', label: '뿌듯함', emoji: '⭐' },
  { value: 'thankful', label: '고마움', emoji: '💐' },
  { value: 'peaceful', label: '평온함', emoji: '☁️' },
  { value: 'energetic', label: '에너지 넘침', emoji: '⚡' },
  { value: 'focused', label: '집중 잘됨', emoji: '🧠' },
  { value: 'motivated', label: '의욕적임', emoji: '🔥' },
  { value: 'fun', label: '즐거움', emoji: '🎈' },
  { value: 'playful', label: '장난기 있음', emoji: '🙃' },
  { value: 'curious', label: '궁금함', emoji: '🤔' },
  { value: 'surprised', label: '놀람', emoji: '🎇' },
  { value: 'sleepy', label: '졸림', emoji: '🌙' },
  { value: 'worried', label: '걱정됨', emoji: '🌧️' },
  { value: 'anxious', label: '불안함', emoji: '😰' },
  { value: 'sad', label: '슬픔', emoji: '😢' },
  { value: 'lonely', label: '외로움', emoji: '🌫️' },
  { value: 'upset', label: '속상함', emoji: '💧' },
  { value: 'angry', label: '화남', emoji: '😠' },
  { value: 'frustrated', label: '답답함', emoji: '🌀' },
  { value: 'confused', label: '혼란스러움', emoji: '❓' },
  { value: 'embarrassed', label: '민망함', emoji: '🫧' },
  { value: 'shy', label: '수줍음', emoji: '🌸' },
  { value: 'bored', label: '지루함', emoji: '⏳' },
  { value: 'relieved', label: '안도감', emoji: '😮‍💨' },
  { value: 'sick', label: '몸이 안 좋음', emoji: '🤒' },
  { value: 'overwhelmed', label: '버거움', emoji: '🌪️' },
  { value: 'grumpy', label: '투덜거림', emoji: '🥀' },
  { value: 'silly', label: '실실 웃김', emoji: '😜' },
  { value: 'brave', label: '용기남', emoji: '🦁' },
  { value: 'kind', label: '따뜻함', emoji: '💗' },
  { value: 'creative', label: '창의적임', emoji: '🎨' },
  { value: 'curled', label: '혼자 있고 싶음', emoji: '🌑' },
  { value: 'hopeful', label: '기대됨', emoji: '🌈' },
  { value: 'custom', label: '직접 입력', emoji: '✍️' },
];

const MOOD_GROUPS = [
  { key: 'calm', label: '편안함 · 안정', bg: 'bg-emerald-50/60', values: ['good', 'calm', 'peaceful', 'relieved', 'bored'] },
  { key: 'joy', label: '기쁨 · 따뜻함', bg: 'bg-rose-50/60', values: ['very-good', 'happy', 'kind', 'thankful', 'hopeful', 'creative', 'brave'] },
  { key: 'energy', label: '에너지 · 의욕', bg: 'bg-amber-50/60', values: ['excited', 'fun', 'energetic', 'motivated', 'proud'] },
  { key: 'curious', label: '호기심 · 발견', bg: 'bg-indigo-50/60', values: ['focused', 'curious', 'surprised', 'playful', 'silly'] },
  { key: 'tired', label: '피곤함 · 지침', bg: 'bg-sky-50/60', values: ['tired', 'sleepy', 'sensitive', 'sick'] },
  { key: 'sad', label: '속상함 · 불안', bg: 'bg-slate-50', values: ['sad', 'lonely', 'upset', 'anxious', 'worried'] },
  { key: 'complex', label: '복잡함 · 답답함', bg: 'bg-violet-50/60', values: ['frustrated', 'confused', 'overwhelmed', 'embarrassed', 'shy', 'curled', 'angry', 'grumpy'] },
];

const PRIMARY_MOOD_OPTIONS = MOOD_OPTIONS.slice(0, 5);

const LINKAGE_OPTIONS = [
  { key: 'schedule', label: '학사일정' },
  { key: 'studentRecords', label: '학생명부' },
  { key: 'observationJournal', label: '관찰일지' },
  { key: 'todayMeal', label: '오늘의 급식' },
];

function computeEmotionLabel(pos, neg) {
  if (pos == null || neg == null) return null;
  const p = Number(pos) || 0;
  const n = Number(neg) || 0;
  if (p <= 2 && n <= 2) return { label: '잔잔한 날', emoji: '😌', summary: '감정의 파도 없이 조용히 흘러간 하루', chapters: [4, 8] };
  if (n >= 8 && p <= 3) return { label: '많이 지친 날', emoji: '😮‍💨', summary: '마음의 피로가 크게 남은 하루', chapters: [2, 6, 7] };
  if (n >= 7 && p <= 3) return { label: '마음이 무거운 날', emoji: '😞', summary: '부담이 크게 느껴진 하루', chapters: [2, 6] };
  if (n >= 7 && p >= 4) return { label: '힘들었지만 버틴 날', emoji: '💪', summary: '지쳤지만 끝까지 견딘 감각이 남아 있었다', chapters: [6, 7] };
  if (p >= 8 && n >= 8) return { label: '감정이 크게 오간 날', emoji: '🎢', summary: '소모도 컸지만 보람도 함께 남은 날', chapters: [5, 7] };
  if (p >= 7 && n <= 3) return { label: '보람이 남은 날', emoji: '😊', summary: '안정된 마음으로 하루를 마무리할 수 있었다', chapters: [8, 10] };
  if (p >= 7 && n <= 5) return { label: '비교적 안정된 날', emoji: '🙂', summary: '마음이 조금 풀린 하루', chapters: [8] };
  if (n > p + 2) return { label: '조금 지친 날', emoji: '😪', summary: '에너지가 부족했던 하루', chapters: [2, 4] };
  if (p > n + 2) return { label: '마음이 조금 풀린 날', emoji: '🌤️', summary: '작은 안도감이 남은 하루', chapters: [5, 8] };
  if (p >= 5 && n >= 5) return { label: '힘들었지만 의미도 컸던 날', emoji: '⚖️', summary: '감정의 진폭이 큰 하루였다', chapters: [5, 7] };
  return { label: '무덤덤한 날', emoji: '😶', summary: '특별한 감정 없이 지나간 하루', chapters: [4] };
}

const MIN_TODO_ROWS = 3;

function createTodoItem(index = 0) {
  return {
    id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
    text: '',
    isDeadline: false,
    done: false,
  };
}

function ensureTodoRows(items) {
  const nextItems = [...items];
  while (nextItems.length < MIN_TODO_ROWS) {
    nextItems.push(createTodoItem(nextItems.length));
  }
  return nextItems;
}

function normalizeTodoItems(source) {
  if (Array.isArray(source)) {
    return ensureTodoRows(
      source.map((item, index) => ({
        id: item?.id || createTodoItem(index).id,
        text: typeof item?.text === 'string' ? item.text : '',
        isDeadline: Boolean(item?.isDeadline),
        done: Boolean(item?.done),
      })),
    );
  }

  if (typeof source === 'string' && source.trim()) {
    const splitItems = source
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean)
      .map((text, index) => ({
        id: createTodoItem(index).id,
        text,
        isDeadline: false,
        done: false,
      }));

    return ensureTodoRows(splitItems);
  }

  return ensureTodoRows([]);
}

function getTodoStats(todoItems) {
  const meaningfulItems = normalizeTodoItems(todoItems).filter((item) => item.text.trim());
  const completed = meaningfulItems.filter((item) => item.done).length;
  const total = meaningfulItems.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { total, completed, percent, meaningfulItems };
}

function previewText(value, maxLength = 16) {
  const normalized = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
  if (!normalized) return '';
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength)}...`;
}

function formatDateKey(date) {
  const target = new Date(date);
  const year = target.getFullYear();
  const month = String(target.getMonth() + 1).padStart(2, '0');
  const day = String(target.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getMonthLabel(date) {
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });
}

function CareClassroom() {
  const navigate = useNavigate();
  const today = new Date();
  const todayKey = formatDateKey(today);
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [records, setRecords] = useState({});
  const [mood, setMood] = useState('calm');
  const [customMood, setCustomMood] = useState('');
  const [todoItems, setTodoItems] = useState(() => ensureTodoRows([]));
  const [importantEvents, setImportantEvents] = useState('');
  const [moodIntensity, setMoodIntensity] = useState(3);
  const [moodReasonTags, setMoodReasonTags] = useState([]);
  const [keyScene, setKeyScene] = useState('');
  const [supportSource, setSupportSource] = useState('');
  const [supportMemo, setSupportMemo] = useState('');
  const [emotionReasonNote, setEmotionReasonNote] = useState('');
  const [positiveScore, setPositiveScore] = useState(5);
  const [negativeScore, setNegativeScore] = useState(5);
  const [isMoodPickerOpen, setIsMoodPickerOpen] = useState(false);
  const [isSourcePickerOpen, setIsSourcePickerOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedSources, setSelectedSources] = useState({
    schedule: false,
    studentRecords: false,
    observationJournal: false,
    todayMeal: false,
  });
  const [linkedData, setLinkedData] = useState({});
  const [isLinkingData, setIsLinkingData] = useState(false);
  const [linkStatus, setLinkStatus] = useState({});
  const [linkedContext, setLinkedContext] = useState(null);
  const digestCacheRef = useRef({});
  const moodPickerRef = useRef(null);
  const sourcePickerRef = useRef(null);

  useEffect(() => {
    // localStorage fallback 먼저 로드
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setRecords(JSON.parse(saved));
    } catch {}

    // 서버에서 월별 데이터 로드 시도
    const userId = localStorage.getItem('userId');
    if (userId) {
      const month = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
      client.get(`/api/care-classroom?userId=${userId}&month=${month}`, { timeout: 8000, __retryCount: 99 })
        .then(res => {
          if (Array.isArray(res.data) && res.data.length > 0) {
            const serverRecords = {};
            res.data.forEach(r => {
              serverRecords[r.record_date] = {
                mood: r.mood, customMood: r.custom_mood, todos: r.todo_items,
                importantEvents: r.free_memo, moodIntensity: 3,
                moodReasonTags: r.emotion_reason_tags || [],
                keyScene: r.key_scene, supportSource: r.support_source,
                supportMemo: r.support_memo,
                positiveEmotionScore: r.positive_emotion_score,
                negativeEmotionScore: r.negative_emotion_score,
                linkedContext: r.linked_context_summary,
                updatedAt: r.updated_at,
              };
            });
            setRecords(prev => ({ ...prev, ...serverRecords }));
          }
        })
        .catch(() => {});
    }
  }, [currentMonth]);

  useEffect(() => {
    const current = records[selectedDate];
    setMood(current?.mood || 'calm');
    setCustomMood(current?.customMood || '');
    setTodoItems(normalizeTodoItems(current?.todos));
    setImportantEvents(current?.importantEvents || '');
    setMoodIntensity(current?.moodIntensity || 3);
    setMoodReasonTags(current?.moodReasonTags || []);
    setKeyScene(current?.keyScene || '');
    setSupportSource(current?.supportSource || '');
    setSupportMemo(current?.supportMemo || '');
    setEmotionReasonNote(current?.emotionReasonNote || '');
    setPositiveScore(current?.positiveEmotionScore ?? 5);
    setNegativeScore(current?.negativeEmotionScore ?? 5);
  }, [records, selectedDate]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMoodPickerOpen && moodPickerRef.current && !moodPickerRef.current.contains(event.target)) {
        setIsMoodPickerOpen(false);
      }

      if (isSourcePickerOpen && sourcePickerRef.current && !sourcePickerRef.current.contains(event.target)) {
        setIsSourcePickerOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMoodPickerOpen, isSourcePickerOpen]);

  const monthDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startWeekday = firstDay.getDay();
    const totalDays = lastDay.getDate();
    const days = [];

    for (let i = 0; i < startWeekday; i += 1) {
      days.push(null);
    }

    for (let day = 1; day <= totalDays; day += 1) {
      days.push(new Date(year, month, day));
    }

    return days;
  }, [currentMonth]);

  const selectedRecord = records[selectedDate];
  const selectedMoodOption = MOOD_OPTIONS.find((item) => item.value === mood) || MOOD_OPTIONS[0];
  const isAllSourcesSelected = Object.values(selectedSources).every(Boolean);

  const handleSave = () => {
    const nextRecords = {
      ...records,
        [selectedDate]: {
        mood,
        customMood,
        moodIntensity,
        moodReasonTags,
        todos: todoItems,
        importantEvents,
        keyScene,
        supportSource,
        supportMemo,
        emotionReasonNote,
        positiveEmotionScore: positiveScore,
        negativeEmotionScore: negativeScore,
        linkedContext: linkedContext?.date === selectedDate ? linkedContext : undefined,
        sourceType: 'care-classroom-log',
        updatedAt: new Date().toISOString(),
      },
    };

    setRecords(nextRecords);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextRecords));

    // 서버 저장 (백그라운드)
    const userId = localStorage.getItem('userId');
    if (userId) {
      const emotionResult = computeEmotionLabel(positiveScore, negativeScore);
      client.post('/api/care-classroom', {
        userId, recordDate: selectedDate, mood, customMood,
        positiveEmotionScore: positiveScore, negativeEmotionScore: negativeScore,
        emotionReasonTags: moodReasonTags, todoItems, keyScene,
        supportSource, supportMemo, freeMemo: importantEvents,
        linkedStudentIds: [], linkedContextSummary: linkedContext?.date === selectedDate ? linkedContext : null,
        computedEmotionLabel: emotionResult?.label, computedEmotionSummary: emotionResult?.summary,
      }, { timeout: 10000, __retryCount: 99 }).catch(() => {});
    }

    alert('돌봄교실 기록이 저장되었습니다.');
    setIsEditorOpen(false);
  };

  const handleDelete = () => {
    const nextRecords = { ...records };
    delete nextRecords[selectedDate];
    setRecords(nextRecords);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextRecords));
    setMood('calm');
    setCustomMood('');
    setTodoItems(ensureTodoRows([]));
    setImportantEvents('');
    setIsEditorOpen(false);
  };

  const updateTodoItem = (id, field, value) => {
    setTodoItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const addTodoItem = () => {
    setTodoItems((prev) => [...prev, createTodoItem(prev.length)]);
  };

  const removeTodoItem = (id) => {
    setTodoItems((prev) => ensureTodoRows(prev.filter((item) => item.id !== id)));
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
      schedule: nextValue,
      studentRecords: nextValue,
      observationJournal: nextValue,
      todayMeal: nextValue,
    });
  };

  const handleLinkData = async () => {
    const selected = Object.entries(selectedSources).filter(([, v]) => v).map(([k]) => k);
    if (selected.length === 0) { alert('연동할 항목을 선택해주세요.'); return; }

    const cacheKey = `${selectedDate}:${selected.sort().join(',')}`;
    if (digestCacheRef.current[cacheKey]) {
      setLinkedContext(digestCacheRef.current[cacheKey]);
      setIsSourcePickerOpen(false);
      return;
    }

    setIsLinkingData(true);
    const status = {};
    selected.forEach(k => { status[k] = 'loading'; });
    setLinkStatus({ ...status });

    const digestResults = {};
    const fetchers = selected.map(async (key) => {
      try {
        if (key === 'schedule') {
          const res = await client.get('/api/schedules', { timeout: 6000, __retryCount: 99 });
          const all = Array.isArray(res.data) ? res.data : [];
          const todayEvents = all.filter(e => e.date === selectedDate);
          const weekStart = selectedDate.slice(0, 8);
          const weekEvents = all.filter(e => e.date?.startsWith(weekStart)).slice(0, 5);
          const summary = todayEvents.length > 0 ? todayEvents.map(e => e.title || e.event || '').filter(Boolean) : weekEvents.map(e => `${e.date?.slice(8)}일: ${e.title || ''}`);
          digestResults.schedule = { summary: summary.slice(0, 3), tags: todayEvents.length > 2 ? ['바쁜 일정'] : todayEvents.length > 0 ? ['일정 있음'] : ['여유로운 날'] };
        } else if (key === 'studentRecords') {
          const res = await client.get('/api/students', { timeout: 6000, __retryCount: 99 });
          const students = Array.isArray(res.data) ? res.data.slice(0, 5) : [];
          digestResults.studentRecords = { students: students.map(s => ({ id: String(s.student_id || s.id), name: s.name, number: s.number })), summary: `학생 ${students.length}명` };
        } else if (key === 'todayMeal') {
          const res = await client.get('/api/meals', { timeout: 6000, __retryCount: 99 });
          const items = Array.isArray(res.data?.items) ? res.data.items : [];
          digestResults.todayMeal = { summary: items.slice(0, 3).map(i => i.menu || i.name || '').filter(Boolean).join(', ') || '급식 정보 없음', tags: ['생활장면'] };
        } else if (key === 'observationJournal') {
          digestResults.observationJournal = { highlights: [], tags: ['관찰'], emotionHints: ['관계', '관찰대상'] };
        }
        status[key] = 'done';
      } catch {
        status[key] = 'error';
        digestResults[key] = null;
      }
      setLinkStatus({ ...status });
    });

    await Promise.all(fetchers);

    const bgSummary = [];
    const emotionTags = new Set();
    const scenePrompts = [];
    const suggestedStudents = [];

    if (digestResults.schedule) {
      bgSummary.push(...digestResults.schedule.summary);
      digestResults.schedule.tags.forEach(t => emotionTags.add(t));
    }
    if (digestResults.studentRecords) {
      suggestedStudents.push(...digestResults.studentRecords.students);
      emotionTags.add('학생');
    }
    if (digestResults.observationJournal) {
      digestResults.observationJournal.emotionHints?.forEach(t => emotionTags.add(t));
      scenePrompts.push('오늘 가장 오래 남은 장면은 무엇이었나요?');
    }
    if (digestResults.todayMeal) {
      bgSummary.push(`급식: ${digestResults.todayMeal.summary}`);
    }
    if (scenePrompts.length === 0) scenePrompts.push('오늘 마음에 남은 순간이 있나요?');

    const ctx = {
      date: selectedDate,
      backgroundSummary: bgSummary,
      suggestedEmotionTags: Array.from(emotionTags),
      suggestedScenePrompts: scenePrompts,
      suggestedStudents,
      autoDraftHints: ['짧게 적어도 자서전 장면 재료로 활용됩니다.'],
      rawDigests: digestResults,
    };

    digestCacheRef.current[cacheKey] = ctx;
    setLinkedContext(ctx);
    setLinkedData(digestResults);
    setIsSourcePickerOpen(false);
    setIsLinkingData(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🧠 돌봄교실</h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-500">
            <p>어제보다 더 나은 오늘의 내가 된다. (단, 1g이라도 괜찮아.)</p>
            <div className="relative" ref={sourcePickerRef}>
              <button
                type="button"
                onClick={() => setIsSourcePickerOpen((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 shadow-sm transition hover:bg-amber-100"
              >
                자료 연동하기
                <span className="text-xs text-gray-400">▾</span>
              </button>
              {isSourcePickerOpen && (
                <div className="absolute left-0 top-12 z-20 w-[24rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-gray-200 bg-white p-4 shadow-xl">
                  <div className="mb-3 text-sm font-semibold text-gray-700">자료 반영 항목 선택</div>
                  <div className="grid grid-cols-2 gap-2">
                    {LINKAGE_OPTIONS.map((option) => (
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
                  <button
                    type="button"
                    onClick={handleLinkData}
                    disabled={isLinkingData || !Object.values(selectedSources).some(Boolean)}
                    className="mt-3 w-full py-2 rounded-lg text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                  >
                    {isLinkingData ? '연동 중...' : '반영하기'}
                  </button>
                  {Object.keys(linkStatus).length > 0 && (
                    <div className="mt-2 space-y-0.5">
                      {Object.entries(linkStatus).map(([k, s]) => (
                        <div key={k} className="flex items-center gap-1.5 text-[10px]">
                          <span className={`w-1.5 h-1.5 rounded-full ${s === 'done' ? 'bg-green-500' : s === 'loading' ? 'bg-amber-400 animate-pulse' : 'bg-red-400'}`} />
                          <span className="text-gray-600">{k === 'schedule' ? '학사일정' : k === 'studentRecords' ? '학생명부' : k === 'observationJournal' ? '관찰일지' : '급식'}</span>
                          <span className={s === 'done' ? 'text-green-600' : s === 'loading' ? 'text-amber-600' : 'text-red-500'}>{s === 'done' ? '완료' : s === 'loading' ? '반영 중...' : '오류'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="shrink-0 font-medium text-primary-600 hover:text-primary-900"
        >
          &larr; 홈으로
        </button>
      </div>

      <div>
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              이전달
            </button>
            <h2 className="text-xl font-semibold text-gray-900">{getMonthLabel(currentMonth)}</h2>
            <button
              type="button"
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              다음달
            </button>
          </div>

          <div className="mb-3 grid grid-cols-7 gap-2 text-center text-xs font-semibold text-gray-400">
            {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {monthDays.map((day, index) => {
              if (!day) {
                return <div key={`empty-${index}`} className="h-16 sm:h-24 rounded-xl bg-transparent" />;
              }

              const dateKey = formatDateKey(day);
              const record = records[dateKey];
              const isSelected = selectedDate === dateKey;
              const isToday = dateKey === todayKey;
              const moodOption = MOOD_OPTIONS.find((item) => item.value === record?.mood);
              const moodText = record?.customMood || moodOption?.label;
              const todoStats = getTodoStats(record?.todos);
              const firstFreeInput = previewText(record?.importantEvents, 14);
              const previewMoodText = previewText(moodText, 10);
              const emotionResult = record ? computeEmotionLabel(record.positiveEmotionScore, record.negativeEmotionScore) : null;

              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => {
                    setSelectedDate(dateKey);
                    setIsEditorOpen(true);
                  }}
                  className={`relative flex h-16 sm:h-24 flex-col rounded-lg sm:rounded-xl border p-1 sm:p-3 text-left transition overflow-hidden ${
                    isSelected
                      ? isToday
                        ? 'border-emerald-500 ring-2 ring-emerald-100 bg-emerald-50 shadow-sm'
                        : 'border-blue-500 ring-2 ring-blue-100 bg-blue-50/40 shadow-sm'
                      : isToday
                        ? 'border-emerald-400 bg-emerald-50/70 hover:border-emerald-500'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {isToday && (
                    <span className="hidden sm:inline-flex absolute right-2 top-2 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-white">
                      today
                    </span>
                  )}
                  {todoStats.total > 0 && (
                    <>
                      <div className="hidden sm:flex absolute left-2 top-8 h-4 w-[calc(100%-1rem)] items-center justify-center text-center text-[10px] font-semibold text-gray-900">
                        to-do 이행률 {todoStats.percent}%
                      </div>
                      <span
                        className={`sm:hidden absolute right-0.5 top-0.5 rounded-full px-1 py-0 text-[8px] font-bold leading-tight ${
                          todoStats.percent === 100
                            ? 'bg-emerald-100 text-emerald-700'
                            : todoStats.percent >= 50
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-rose-100 text-rose-600'
                        }`}
                      >
                        {todoStats.percent}%
                      </span>
                    </>
                  )}
                  <span className={`text-xs sm:text-sm font-semibold ${isToday ? 'text-emerald-700' : 'text-gray-900'}`}>{day.getDate()}</span>
                  {record ? (
                    <div className="mt-1 sm:mt-6 space-y-0.5 sm:space-y-1">
                      <div className="flex items-center gap-0.5 sm:gap-1 overflow-hidden text-[9px] sm:text-[11px] leading-tight text-gray-600">
                        <span className="shrink-0 text-xs sm:text-base leading-none">{emotionResult?.emoji || moodOption?.emoji || '📝'}</span>
                        <span className="truncate hidden sm:inline">{emotionResult?.label || previewMoodText || '기록 있음'}</span>
                      </div>
                      {(record.positiveEmotionScore != null || record.negativeEmotionScore != null) && (
                        <div className="hidden sm:flex gap-1 text-[9px] font-medium">
                          <span className="text-emerald-600">+{record.positiveEmotionScore ?? '-'}</span>
                          <span className="text-rose-500">-{record.negativeEmotionScore ?? '-'}</span>
                        </div>
                      )}
                      <div className="hidden sm:block line-clamp-1 text-[10px] leading-3.5 text-gray-400 italic">
                        {emotionResult?.summary || firstFreeInput || ''}
                      </div>
                    </div>
                  ) : (
                    <span className="hidden sm:inline mt-6 text-[11px] text-gray-300">기록 없음</span>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {/* 연동 데이터 표시 */}
      {Object.keys(linkedData).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {linkedData.schedule && linkedData.schedule.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">📅 학사일정</h3>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {linkedData.schedule.slice(0, 15).map((item, i) => (
                  <div key={i} className="text-xs text-gray-600 flex gap-2">
                    <span className="text-gray-400 flex-shrink-0">{item.date || item.start_date || ''}</span>
                    <span>{item.title || item.event || item.description || JSON.stringify(item)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {linkedData.studentRecords && linkedData.studentRecords.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">👥 학생명부</h3>
              <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                {linkedData.studentRecords.map((s, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                    {s.number ? `${s.number}번 ` : ''}{s.name || ''}
                  </span>
                ))}
              </div>
            </div>
          )}
          {linkedData.todayMeal && linkedData.todayMeal.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">🍽️ 오늘의 급식</h3>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {linkedData.todayMeal.map((item, i) => (
                  <div key={i} className="text-xs text-gray-600">{item.menu || item.name || JSON.stringify(item)}</div>
                ))}
              </div>
            </div>
          )}
          {linkedData.observationJournal !== undefined && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">🔍 관찰일지</h3>
              <p className="text-xs text-gray-400">관찰일지 연동은 준비 중입니다.</p>
            </div>
          )}
        </div>
      )}

      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 py-6" onClick={() => setIsEditorOpen(false)}>
          <div className="max-h-[88vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] border border-gray-200 bg-white p-5 shadow-2xl sm:p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">{selectedDate} 기록</h2>
                <div className="mt-2 text-sm text-gray-500">판서합시다.</div>
              </div>
              <div className="flex items-center gap-3">
                {selectedDate === todayKey && (
                  <span className="inline-flex items-center rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold uppercase tracking-[0.08em] text-white">
                    Today
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-xl font-medium text-gray-500 transition hover:bg-gray-50"
                  aria-label="닫기"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {/* 오늘의 배경 (연동 시 — 간결하게) */}
              {linkedContext && linkedContext.date === selectedDate && linkedContext.backgroundSummary.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/50 px-4 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs">📅</span>
                    <p className="text-xs text-amber-700">{linkedContext.backgroundSummary.slice(0, 2).join(' · ')}</p>
                  </div>
                </div>
              )}

              {/* ① 오늘 기분 한 줄 */}
              <div>
                <div className="mb-2">
                  <label className="block text-lg font-semibold text-gray-700">오늘 기분 한 줄</label>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <div ref={moodPickerRef} className="relative min-h-[48px] rounded-2xl border border-gray-300 bg-white px-4 py-2 transition focus-within:border-primary-300 focus-within:bg-primary-50">
                    <div className="flex min-h-[48px] items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setIsMoodPickerOpen((prev) => !prev)}
                        className="inline-flex h-[40px] shrink-0 items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700 transition hover:bg-gray-100"
                        title="이모지 선택"
                      >
                        <span className="text-2xl">{selectedMoodOption.emoji}</span>
                        <span className="text-xs text-gray-400">▾</span>
                      </button>
                      <input
                        type="text"
                        value={customMood}
                        onChange={(e) => {
                          setCustomMood(e.target.value);
                        }}
                        placeholder="예) 출근 후 업무메세지가 많이 와있다. 학생들은 아침활동을 안하고 떠들고 있네?"
                        className="block w-full border-0 p-0 text-base text-gray-700 placeholder:text-gray-400 focus:ring-0"
                      />
                    </div>
                    {isMoodPickerOpen && (
                      <div className="absolute left-0 top-14 z-20 w-[22rem] max-w-[calc(100vw-4rem)] max-h-[26rem] overflow-y-auto rounded-2xl border border-gray-200 bg-white p-3 shadow-xl">
                        <div className="mb-2 text-sm font-semibold text-gray-700">감정 이모지 빠른 선택</div>
                        <div className="space-y-2">
                          {MOOD_GROUPS.map((group) => (
                            <div key={group.key} className={`rounded-xl ${group.bg} p-2`}>
                              <p className="mb-1 px-1 text-[10px] font-medium text-gray-500">{group.label}</p>
                              <div className="grid grid-cols-6 gap-1.5">
                                {group.values.map((value) => {
                                  const option = MOOD_OPTIONS.find((o) => o.value === value);
                                  if (!option) return null;
                                  return (
                                    <button
                                      key={`quick-${option.value}`}
                                      type="button"
                                      onClick={() => {
                                        setMood(option.value);
                                        setIsMoodPickerOpen(false);
                                      }}
                                      className={`flex h-9 w-9 items-center justify-center rounded-lg border text-lg transition ${
                                        mood === option.value
                                          ? 'border-primary-400 bg-white shadow-sm'
                                          : 'border-transparent bg-white/70 hover:bg-white'
                                      }`}
                                      title={option.label}
                                    >
                                      {option.emoji}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <p className="mt-1 text-[10px] text-gray-300">이모지를 고르고 한 줄로 적어주세요</p>
              </div>

              {/* 긍정/부정 감정 지수 + 이유 태그 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-emerald-700">😊 긍정 감정 지수</label>
                  <div className="flex gap-0.5">
                    {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
                      <button key={n} type="button" onClick={() => setPositiveScore(n)}
                        className={`w-7 h-8 rounded text-[10px] font-bold transition ${positiveScore >= n && n > 0 ? 'bg-emerald-500 text-white' : n === 0 && positiveScore === 0 ? 'bg-gray-300 text-white' : 'bg-gray-100 text-gray-400 hover:bg-emerald-100'}`}>
                        {n}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">오늘 긍정적인 감정은 얼마나 컸나요?</p>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-rose-600">😞 부정 감정 지수</label>
                  <div className="flex gap-0.5">
                    {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
                      <button key={n} type="button" onClick={() => setNegativeScore(n)}
                        className={`w-7 h-8 rounded text-[10px] font-bold transition ${negativeScore >= n && n > 0 ? 'bg-rose-500 text-white' : n === 0 && negativeScore === 0 ? 'bg-gray-300 text-white' : 'bg-gray-100 text-gray-400 hover:bg-rose-100'}`}>
                        {n}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">오늘 부정적인 감정은 얼마나 컸나요?</p>
                </div>
              </div>
              {/* ③ 감정 이유 태그 */}
              <EmotionReasonTags moodReasonTags={moodReasonTags} setMoodReasonTags={setMoodReasonTags} suggestedTags={linkedContext?.suggestedEmotionTags} />
              <div className="mt-2">
                <input type="text" value={emotionReasonNote} onChange={(e) => setEmotionReasonNote(e.target.value)}
                  className="block w-full rounded-lg border border-gray-200 p-2 text-sm focus:border-primary-500 focus:ring-primary-500"
                  placeholder="태그로 표현되지 않는 감정 이유를 적어주세요" />
              </div>

              {/* ④ 오늘의 한 장면 */}
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">📸 오늘의 한 장면</label>
                <textarea value={keyScene} onChange={(e) => setKeyScene(e.target.value)} rows={2}
                  className="block w-full rounded-xl border border-gray-300 p-3 text-sm resize-none focus:border-primary-500 focus:ring-primary-500"
                  placeholder={linkedContext?.suggestedScenePrompts?.[0] || '오늘 가장 오래 남은 장면은 무엇인가요?'} />
                <p className="text-[10px] text-gray-300 mt-1">짧게 적어도 나중에 자서전 장면 재료로 활용됩니다</p>
              </div>

              {/* ⑤ 오늘 나를 버티게 한 것 */}
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">💪 오늘 나를 버티게 한 것</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {['동료','학생','책임감','가족','휴식','작은 성취','루틴','음악/취미'].map(src => (
                    <button key={src} type="button" onClick={() => setSupportSource(supportSource === src ? '' : src)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition font-medium ${supportSource === src ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-500 border-gray-200 hover:border-amber-300'}`}>
                      {src}
                    </button>
                  ))}
                </div>
                <input type="text" value={supportMemo} onChange={(e) => setSupportMemo(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-primary-500 focus:ring-primary-500"
                  placeholder="오늘 나를 버티게 해준 것을 짧게 적어주세요" />
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <div>
                  <div className="mb-3 flex items-center gap-3">
                    <label className="text-xl font-semibold text-gray-700">투두리스트</label>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-amber-300 bg-amber-100 px-1 font-bold text-amber-700">마</span>
                      <span>마감기한</span>
                      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-emerald-300 bg-emerald-100 px-1 font-bold text-emerald-700">완</span>
                      <span>완료</span>
                    </div>
                  </div>
                  <div className="space-y-3 rounded-2xl border border-gray-300 p-4">
                    {todoItems.map((item, index) => (
                      <div key={item.id} className="flex items-center gap-2">
                        <span className="w-6 text-sm font-semibold text-gray-500">{index + 1}</span>
                        <button
                          type="button"
                          onClick={() => updateTodoItem(item.id, 'isDeadline', !item.isDeadline)}
                          className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition ${
                            item.isDeadline
                              ? 'bg-amber-100 text-amber-700 border border-amber-300'
                              : 'bg-gray-100 text-gray-400 border border-gray-200'
                          }`}
                          title="마감기한 표시"
                        >
                          마
                        </button>
                        <button
                          type="button"
                          onClick={() => updateTodoItem(item.id, 'done', !item.done)}
                          className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition ${
                            item.done
                              ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                              : 'bg-gray-100 text-gray-400 border border-gray-200'
                          }`}
                          title="완료 표시"
                        >
                          완
                        </button>
                        <input
                          type="text"
                          value={item.text}
                          onChange={(e) => updateTodoItem(item.id, 'text', e.target.value)}
                          placeholder={index === 0 ? '예: 전직원 회의' : index === 1 ? '예: 14:30 전화상담' : '할 일을 입력하세요'}
                          className="block w-full rounded-xl border border-gray-200 px-3 py-2 text-base text-gray-700 placeholder:text-gray-400 focus:border-primary-500 focus:ring-primary-500"
                        />
                        {index >= MIN_TODO_ROWS && (
                          <button
                            type="button"
                            onClick={() => removeTodoItem(item.id)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-sm text-gray-400 transition hover:bg-gray-50"
                            title="할 일 삭제"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addTodoItem}
                      className="inline-flex items-center rounded-lg border border-dashed border-primary-300 px-3 py-2 text-sm font-semibold text-primary-600 transition hover:bg-primary-50"
                    >
                      + 추가
                    </button>
                  </div>
                </div>

                {/* ⑦ 자유 메모 */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">✏️ 자유 메모</label>
                  <textarea
                    rows={3}
                    value={importantEvents}
                    onChange={(e) => setImportantEvents(e.target.value)}
                    placeholder="오늘 하루를 마무리하며 남기고 싶은 말이 있다면 적어주세요"
                    className="block w-full rounded-xl border border-gray-300 p-3 text-sm resize-none focus:border-primary-500 focus:ring-primary-500"
                  />
                  <p className="text-[10px] text-gray-300 mt-1">자유롭게 무엇이든 적어도 됩니다</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 pt-2">
                <button
                  type="button"
                  onClick={handleSave}
                  className="rounded-2xl bg-blue-600 px-8 py-4 text-lg font-semibold text-white shadow-sm transition hover:bg-blue-700"
                >
                  {selectedRecord ? '기록 수정' : '기록 저장'}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={!selectedRecord}
                  className="rounded-2xl border border-gray-200 px-8 py-4 text-lg font-semibold text-gray-500 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  기록 삭제
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const ALL_EMOTION_TAGS = ['행정','생활기록부','상담','관계','학생','학부모','수업','회의','피로','안도','성취','답답함','위로','버팀'];

function EmotionReasonTags({ moodReasonTags, setMoodReasonTags, suggestedTags }) {
  const [showAll, setShowAll] = useState(false);
  const suggested = suggestedTags || [];
  const priorityTags = [...new Set([...suggested, ...ALL_EMOTION_TAGS.slice(0, 6)])].slice(0, 6);
  const visibleTags = showAll ? ALL_EMOTION_TAGS : priorityTags;

  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-gray-700">
        감정 이유 {suggested.length > 0 && <span className="text-[10px] text-amber-500 font-normal ml-1">· 추천 포함</span>}
      </label>
      <div className="flex flex-wrap gap-1.5">
        {visibleTags.map(tag => {
          const isSel = moodReasonTags.includes(tag);
          const isSugg = suggested.includes(tag);
          return (
            <button key={tag} type="button" onClick={() => setMoodReasonTags(prev => isSel ? prev.filter(t => t !== tag) : [...prev, tag])}
              className={`text-xs px-2.5 py-1 rounded-full border transition font-medium ${isSel ? 'bg-purple-600 text-white border-purple-600' : isSugg ? 'bg-amber-50 text-amber-700 border-amber-300' : 'bg-white text-gray-500 border-gray-200 hover:border-purple-300'}`}>
              {tag}
            </button>
          );
        })}
        {!showAll && ALL_EMOTION_TAGS.length > priorityTags.length && (
          <button type="button" onClick={() => setShowAll(true)} className="text-[10px] text-purple-400 hover:text-purple-600 px-2 py-1">
            +{ALL_EMOTION_TAGS.length - priorityTags.length}개 더 보기
          </button>
        )}
        {showAll && (
          <button type="button" onClick={() => setShowAll(false)} className="text-[10px] text-gray-400 hover:text-gray-600 px-2 py-1">접기</button>
        )}
      </div>
    </div>
  );
}

export default CareClassroom;
