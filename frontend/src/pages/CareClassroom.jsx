import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';

const STORAGE_KEY = 'careClassroomRecords';

const MOOD_OPTIONS = [
  { value: 'very-good', label: '매우 좋음', emoji: '😄' },
  { value: 'good', label: '좋음', emoji: '🙂' },
  { value: 'calm', label: '보통', emoji: '😌' },
  { value: 'tired', label: '지침', emoji: '😪' },
  { value: 'sensitive', label: '예민함', emoji: '😣' },
  { value: 'happy', label: '행복함', emoji: '🥰' },
  { value: 'excited', label: '신남', emoji: '🤩' },
  { value: 'proud', label: '뿌듯함', emoji: '😎' },
  { value: 'thankful', label: '고마움', emoji: '🙏' },
  { value: 'peaceful', label: '평온함', emoji: '🫠' },
  { value: 'energetic', label: '에너지 넘침', emoji: '⚡' },
  { value: 'focused', label: '집중 잘됨', emoji: '🧠' },
  { value: 'motivated', label: '의욕적임', emoji: '🔥' },
  { value: 'fun', label: '즐거움', emoji: '🎉' },
  { value: 'playful', label: '장난기 있음', emoji: '😜' },
  { value: 'curious', label: '궁금함', emoji: '🤔' },
  { value: 'surprised', label: '놀람', emoji: '😲' },
  { value: 'sleepy', label: '졸림', emoji: '😴' },
  { value: 'worried', label: '걱정됨', emoji: '😟' },
  { value: 'anxious', label: '불안함', emoji: '😰' },
  { value: 'sad', label: '슬픔', emoji: '😢' },
  { value: 'lonely', label: '외로움', emoji: '🥲' },
  { value: 'upset', label: '속상함', emoji: '☹️' },
  { value: 'angry', label: '화남', emoji: '😠' },
  { value: 'frustrated', label: '답답함', emoji: '😤' },
  { value: 'confused', label: '혼란스러움', emoji: '😵' },
  { value: 'embarrassed', label: '민망함', emoji: '😳' },
  { value: 'shy', label: '수줍음', emoji: '🫣' },
  { value: 'bored', label: '지루함', emoji: '🥱' },
  { value: 'relieved', label: '안도감', emoji: '😮‍💨' },
  { value: 'sick', label: '몸이 안 좋음', emoji: '🤒' },
  { value: 'overwhelmed', label: '버거움', emoji: '😵‍💫' },
  { value: 'grumpy', label: '투덜거림', emoji: '😒' },
  { value: 'silly', label: '실실 웃김', emoji: '🤪' },
  { value: 'brave', label: '용기남', emoji: '🦁' },
  { value: 'kind', label: '따뜻함', emoji: '💗' },
  { value: 'creative', label: '창의적임', emoji: '🎨' },
  { value: 'curled', label: '혼자 있고 싶음', emoji: '🫥' },
  { value: 'hopeful', label: '기대됨', emoji: '🌈' },
  { value: 'custom', label: '직접 입력', emoji: '✍️' },
];

const PRIMARY_MOOD_OPTIONS = MOOD_OPTIONS.slice(0, 5);

const LINKAGE_OPTIONS = [
  { key: 'schedule', label: '학사일정' },
  { key: 'studentRecords', label: '학생명부' },
  { key: 'observationJournal', label: '관찰일지' },
  { key: 'todayMeal', label: '오늘의 급식' },
];

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
  const moodPickerRef = useRef(null);
  const sourcePickerRef = useRef(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setRecords(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load care classroom records', error);
    }
  }, []);

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
        sourceType: 'care-classroom-log',
        updatedAt: new Date().toISOString(),
      },
    };

    setRecords(nextRecords);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextRecords));
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
    setIsLinkingData(true);
    const data = {};
    for (const key of selected) {
      try {
        if (key === 'schedule') {
          const res = await client.get('/api/schedules', { timeout: 8000, __retryCount: 99 });
          data.schedule = Array.isArray(res.data) ? res.data : [];
        } else if (key === 'studentRecords') {
          const res = await client.get('/api/students', { timeout: 8000, __retryCount: 99 });
          data.studentRecords = Array.isArray(res.data) ? res.data : [];
        } else if (key === 'todayMeal') {
          const res = await client.get('/api/meals', { timeout: 8000, __retryCount: 99 });
          data.todayMeal = Array.isArray(res.data?.items) ? res.data.items : [];
        } else if (key === 'observationJournal') {
          data.observationJournal = [];
        }
      } catch { data[key] = []; }
    }
    setLinkedData(data);
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
                        <span className="shrink-0 text-xs sm:text-base leading-none">{moodOption?.emoji || '📝'}</span>
                        <span className="truncate hidden sm:inline">{previewMoodText || '기록 있음'}</span>
                      </div>
                      <div className="hidden sm:block line-clamp-1 text-[11px] leading-3.5 text-gray-400">
                        {firstFreeInput || '자유 입력 없음'}
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
              <div>
                <div className="mb-2">
                  <label className="block pl-10 text-[22px] font-semibold text-gray-700">내 감정 확인하기</label>
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
                      <div className="absolute left-0 top-14 z-20 w-[22rem] max-w-[calc(100vw-4rem)] rounded-2xl border border-gray-200 bg-white p-3 shadow-xl">
                        <div className="mb-2 text-sm font-semibold text-gray-700">감정 이모지 빠른 선택</div>
                        <div className="grid grid-cols-6 gap-2">
                          {MOOD_OPTIONS.filter((option) => option.value !== 'custom').map((option) => (
                            <button
                              key={`quick-${option.value}`}
                              type="button"
                              onClick={() => {
                                setMood(option.value);
                                setIsMoodPickerOpen(false);
                              }}
                              className={`flex h-10 w-10 items-center justify-center rounded-xl border text-lg transition ${
                                mood === option.value
                                  ? 'border-primary-300 bg-primary-50'
                                  : 'border-gray-200 bg-white hover:bg-gray-50'
                              }`}
                              title={option.label}
                            >
                              {option.emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <p className="mt-3 text-sm text-gray-400">직접 입력하면 저장 시 해당 감정이 우선 기록됩니다.</p>
              </div>

              {/* 감정 강도 + 이유 태그 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">감정 강도</label>
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(n => (
                      <button key={n} type="button" onClick={() => setMoodIntensity(n)}
                        className={`w-10 h-10 rounded-lg text-sm font-bold transition ${moodIntensity >= n ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>
                        {n}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">1=약함 · 5=매우 강함</p>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">감정 이유</label>
                  <div className="flex flex-wrap gap-1.5">
                    {['행정','생활기록부','상담','관계','학생','학부모','수업','회의','피로','안도','성취','답답함','위로','버팀'].map(tag => {
                      const isSel = moodReasonTags.includes(tag);
                      return (
                        <button key={tag} type="button" onClick={() => setMoodReasonTags(prev => isSel ? prev.filter(t => t !== tag) : [...prev, tag])}
                          className={`text-xs px-2.5 py-1 rounded-full border transition font-medium ${isSel ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-500 border-gray-200 hover:border-purple-300'}`}>
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 오늘의 한 장면 + 버티게 한 것 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">📸 오늘의 한 장면</label>
                  <textarea value={keyScene} onChange={(e) => setKeyScene(e.target.value)} rows={2}
                    className="block w-full rounded-xl border border-gray-300 p-3 text-sm resize-none focus:border-primary-500 focus:ring-primary-500"
                    placeholder="오늘 가장 오래 남은 장면은?" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">💪 오늘 나를 버티게 한 것</label>
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {['동료','학생','책임감','가족','휴식','작은 성취','루틴','음악/취미'].map(src => (
                      <button key={src} type="button" onClick={() => setSupportSource(supportSource === src ? '' : src)}
                        className={`text-[11px] px-2 py-0.5 rounded-full border transition ${supportSource === src ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-500 border-gray-200 hover:border-amber-300'}`}>
                        {src}
                      </button>
                    ))}
                  </div>
                  <input type="text" value={supportMemo} onChange={(e) => setSupportMemo(e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-primary-500 focus:ring-primary-500"
                    placeholder="한 줄 보충 (선택사항)" />
                </div>
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

                <div>
                  <label className="mb-3 block text-xl font-semibold text-gray-700">자유 입력</label>
                  <textarea
                    rows={5}
                    value={importantEvents}
                    onChange={(e) => setImportantEvents(e.target.value)}
                    placeholder="오늘 나를 가장 지치게 한 일은? / 오늘의 나를 한 문장으로 적는다면?"
                    className="block w-full rounded-2xl border border-gray-300 p-5 text-base focus:border-primary-500 focus:ring-primary-500"
                  />
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

export default CareClassroom;
