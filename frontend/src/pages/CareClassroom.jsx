import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

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
  const [isMoodPickerOpen, setIsMoodPickerOpen] = useState(false);
  const [isSourcePickerOpen, setIsSourcePickerOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedSources, setSelectedSources] = useState({
    schedule: false,
    studentRecords: false,
    observationJournal: false,
    todayMeal: false,
  });
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
        todos: todoItems,
        importantEvents,
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
                    <div className="hidden sm:flex absolute left-2 top-8 h-4 w-[calc(100%-1rem)] items-center justify-center text-center text-[10px] font-semibold text-gray-900">
                      to-do 이행률 {todoStats.percent}%
                    </div>
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
                    placeholder="자유 입력"
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
