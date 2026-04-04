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

function formatDateKey(date) {
  return new Date(date).toISOString().slice(0, 10);
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
  const [todos, setTodos] = useState('');
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
    setTodos(current?.todos || '');
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
        todos,
        importantEvents,
        updatedAt: new Date().toISOString(),
      },
    };

    setRecords(nextRecords);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextRecords));
    alert('돌봄교실 기록이 저장되었습니다.');
  };

  const handleDelete = () => {
    const nextRecords = { ...records };
    delete nextRecords[selectedDate];
    setRecords(nextRecords);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextRecords));
    setMood('calm');
    setCustomMood('');
    setTodos('');
    setImportantEvents('');
    setIsEditorOpen(false);
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

          <div className="grid grid-cols-7 gap-2">
            {monthDays.map((day, index) => {
              if (!day) {
                return <div key={`empty-${index}`} className="h-24 rounded-xl bg-transparent" />;
              }

              const dateKey = formatDateKey(day);
              const record = records[dateKey];
              const isSelected = selectedDate === dateKey;
              const isToday = dateKey === todayKey;
              const moodOption = MOOD_OPTIONS.find((item) => item.value === record?.mood);
              const moodText = record?.mood === 'custom' ? record?.customMood : moodOption?.label;

              return (
                <button
                  key={dateKey}
                  type="button"
                    onClick={() => {
                      setSelectedDate(dateKey);
                      setIsEditorOpen(true);
                    }}
                    className={`flex h-24 flex-col rounded-xl border p-3 text-left transition ${
                    isSelected
                      ? 'border-blue-500 ring-2 ring-blue-100 bg-blue-50/40 shadow-sm'
                      : isToday
                        ? 'border-blue-300 bg-blue-50/20 hover:border-blue-400'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-sm font-semibold text-gray-900">{day.getDate()}</span>
                  {record ? (
                    <div className="mt-2 space-y-1">
                      <span className="text-base">{moodOption?.emoji || '📝'}</span>
                      <div className="line-clamp-2 text-[11px] leading-4 text-gray-500">
                        {moodText || record.importantEvents || record.todos || '기록 있음'}
                      </div>
                    </div>
                  ) : (
                    <span className="mt-2 text-[11px] text-gray-300">기록 없음</span>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 py-6" onClick={() => setIsEditorOpen(false)}>
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-[2rem] border border-gray-200 bg-white p-6 shadow-2xl sm:p-8" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">{selectedDate} 기록</h2>
                <div className="mt-2 text-sm text-gray-500">판서합시다.</div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="rounded-full border border-gray-200 px-3 py-2 text-sm font-medium text-gray-500 transition hover:bg-gray-50"
              >
                닫기
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <div className="mb-2">
                  <label className="block pl-10 text-[22px] font-semibold text-gray-700">내 감정 확인하기</label>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <div className="min-h-[48px] rounded-2xl border border-gray-300 bg-white px-4 py-2 transition focus-within:border-primary-300 focus-within:bg-primary-50">
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
                          if (e.target.value.trim()) {
                            setMood('custom');
                          }
                        }}
                        placeholder="내 감정 직접 입력"
                        className="block w-full border-0 p-0 text-base text-gray-700 placeholder:text-gray-400 focus:ring-0"
                      />
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-sm text-gray-400">직접 입력하면 저장 시 해당 감정이 우선 기록됩니다.</p>
              </div>

              <div>
                <label className="mb-3 block text-xl font-semibold text-gray-700">투두리스트</label>
                <textarea
                  rows={6}
                  value={todos}
                  onChange={(e) => setTodos(e.target.value)}
                  placeholder="예: 숙제 확인\n간식 시간 체크\n하원 전 전달사항 정리"
                  className="block w-full rounded-2xl border border-gray-300 p-5 text-base focus:border-primary-500 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="mb-3 block text-xl font-semibold text-gray-700">중요 행사</label>
                <textarea
                  rows={5}
                  value={importantEvents}
                  onChange={(e) => setImportantEvents(e.target.value)}
                  placeholder="예: 생일파티, 현장체험, 보호자 상담 예정"
                  className="block w-full rounded-2xl border border-gray-300 p-5 text-base focus:border-primary-500 focus:ring-primary-500"
                />
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
