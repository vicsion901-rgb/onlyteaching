import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const STORAGE_KEY = 'careClassroomRecords';

const MOOD_OPTIONS = [
  { value: 'very-good', label: '매우 좋음', emoji: '😄' },
  { value: 'good', label: '좋음', emoji: '🙂' },
  { value: 'calm', label: '보통', emoji: '😌' },
  { value: 'tired', label: '지침', emoji: '😪' },
  { value: 'sensitive', label: '예민함', emoji: '😣' },
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
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(formatDateKey(today));
  const [records, setRecords] = useState({});
  const [mood, setMood] = useState('calm');
  const [todos, setTodos] = useState('');
  const [importantEvents, setImportantEvents] = useState('');

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
    setTodos(current?.todos || '');
    setImportantEvents(current?.importantEvents || '');
  }, [records, selectedDate]);

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

  const handleSave = () => {
    const nextRecords = {
      ...records,
      [selectedDate]: {
        mood,
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
    setTodos('');
    setImportantEvents('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🧠 돌봄교실</h1>
          <p className="mt-1 text-sm text-gray-500">하루하루 기분 상태와 할 일, 중요 행사를 기록하는 캘린더입니다.</p>
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="shrink-0 font-medium text-primary-600 hover:text-primary-900"
        >
          &larr; 홈으로
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
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
              const moodOption = MOOD_OPTIONS.find((item) => item.value === record?.mood);

              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => setSelectedDate(dateKey)}
                  className={`flex h-24 flex-col rounded-xl border p-3 text-left transition ${
                    isSelected
                      ? 'border-primary-300 bg-primary-50 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-sm font-semibold text-gray-900">{day.getDate()}</span>
                  {record ? (
                    <div className="mt-2 space-y-1">
                      <span className="text-base">{moodOption?.emoji || '📝'}</span>
                      <div className="line-clamp-2 text-[11px] leading-4 text-gray-500">
                        {record.importantEvents || record.todos || '기록 있음'}
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

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900">{selectedDate} 기록</h2>
            <p className="mt-1 text-sm text-gray-500">기분 상태, 투두리스트, 중요행사를 날짜별로 남겨주세요.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">기분 상태</label>
              <div className="grid grid-cols-2 gap-2">
                {MOOD_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setMood(option.value)}
                    className={`rounded-xl border px-3 py-3 text-left text-sm transition ${
                      mood === option.value
                        ? 'border-primary-300 bg-primary-50 text-primary-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="mr-2">{option.emoji}</span>
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">투두리스트</label>
              <textarea
                rows={5}
                value={todos}
                onChange={(e) => setTodos(e.target.value)}
                placeholder="예: 숙제 확인\n간식 시간 체크\n하원 전 전달사항 정리"
                className="block w-full rounded-xl border border-gray-300 p-3 text-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">중요 행사</label>
              <textarea
                rows={4}
                value={importantEvents}
                onChange={(e) => setImportantEvents(e.target.value)}
                placeholder="예: 생일파티, 현장체험, 보호자 상담 예정"
                className="block w-full rounded-xl border border-gray-300 p-3 text-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={handleSave}
                className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                {selectedRecord ? '기록 수정' : '기록 저장'}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={!selectedRecord}
                className="rounded-lg border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                기록 삭제
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default CareClassroom;
