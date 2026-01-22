import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';

const GRADE_EVENTS = {
  '1': ['입학식', '기초학력 진단', '현장체험학습'],
  '2': ['수행평가', '독서행사', '현장체험학습'],
  '3': ['수행평가', '과학체험', '안전교육'],
  '4': ['공개수업', '진로체험', '현장체험학습'],
  '5': ['수련회', '성교육', '수행평가'],
  '6': ['수학여행', '졸업식', '진로교육'],
};


function Schedule() {
  const navigate = useNavigate();
  const [currentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState(new Date().getDate());
  const [events, setEvents] = useState({});
  const [newEventTitle, setNewEventTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [response, setResponse] = useState('');
  const [selectedModel] = useState('claude-3-5-sonnet-20241022');
  const [usedModel, setUsedModel] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('1');
  const [personalColor, setPersonalColor] = useState('#2563eb');
  const [dragStartDay, setDragStartDay] = useState(null);
  const [dragEndDay, setDragEndDay] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragMoved, setDragMoved] = useState(false);

  const COLOR_PRESETS = [
    '#2563eb', // blue
    '#16a34a', // green
    '#ea580c', // orange
    '#e11d48', // rose
    '#6d28d9', // purple
    '#0f172a', // slate
  ];

  // Fetch events from backend
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await client.get('/schedules/');
        // Group events by date
        const eventsByDate = {};
        res.data.forEach(event => {
          const date = event.date;
          if (!eventsByDate[date]) {
            eventsByDate[date] = [];
          }
          eventsByDate[date].push(event);
        });
        setEvents(eventsByDate);
      } catch (error) {
        console.error("Failed to fetch events", error);
      }
    };
    fetchEvents();
  }, []);

  const getDaysInMonth = (month, year) => {
    return new Date(year, month, 0).getDate();
  };

  const daysInMonth = getDaysInMonth(currentMonth, currentYear);

  const handleDateClick = (day) => {
    setSelectedDate(day);
    setNewEventTitle('');
  };

  const handleAddEvent = async (titleOverride, colorOverride, dateOverride) => {
    const title = (titleOverride ?? newEventTitle).trim();
    const targetDay = dateOverride ?? selectedDate;
    if (!title || !targetDay) return;

    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(
      targetDay,
    ).padStart(2, '0')}`;
    const color = colorOverride ?? personalColor;
    
    try {
      const response = await client.post('/schedules/', {
        title,
        date: dateStr,
        memo: color,
      });

      // Update local state
      setEvents(prev => ({
        ...prev,
        [dateStr]: [...(prev[dateStr] || []), response.data]
      }));

      setNewEventTitle('');
    } catch (error) {
      console.error("Failed to add event", error);
      alert('일정 추가에 실패했습니다.');
    }
  };

  const handleAddPresetEvent = (title) => {
    handleAddEvent(title);
  };

  const handleRangeCreate = async () => {
    if (!dragStartDay || !dragEndDay || !dragMoved) return;
    const start = Math.min(dragStartDay, dragEndDay);
    const end = Math.max(dragStartDay, dragEndDay);
    const title = newEventTitle.trim() || '새 일정';
    for (let d = start; d <= end; d += 1) {
      // eslint-disable-next-line no-await-in-loop
      await handleAddEvent(title, personalColor, d);
    }
    setDragStartDay(null);
    setDragEndDay(null);
    setIsDragging(false);
    setDragMoved(false);
  };

  const isInDragRange = (day) => {
    if (!isDragging || dragStartDay === null) return false;
    const start = Math.min(dragStartDay, dragEndDay ?? dragStartDay);
    const end = Math.max(dragStartDay, dragEndDay ?? dragStartDay);
    return day >= start && day <= end;
  };

  const handleDeleteEvent = async (eventId, dateStr) => {
    try {
      await client.delete(`/schedules/${eventId}`);
      setEvents((prev) => {
        const next = { ...prev };
        if (next[dateStr]) {
          next[dateStr] = next[dateStr].filter((e) => e.id !== eventId);
          if (next[dateStr].length === 0) delete next[dateStr];
        }
        return next;
      });
    } catch (error) {
      console.error("Failed to delete event", error);
      alert('일정 삭제에 실패했습니다.');
    }
  };

  const handleDeleteAllForDate = async () => {
    if (!selectedDate) return;
    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(selectedDate).padStart(2, '0')}`;
    const targets = events[dateStr] || [];
    if (targets.length === 0) return;
    try {
      await Promise.all(targets.map((ev) => client.delete(`/schedules/${ev.id}`)));
      setEvents((prev) => {
        const next = { ...prev };
        delete next[dateStr];
        return next;
      });
    } catch (error) {
      console.error("Failed to delete events", error);
      alert('일괄 삭제에 실패했습니다.');
    }
  };

  const handlePromptSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let res;
      res = await client.post('/prompts/', { 
        content: prompt,
        ai_model: selectedModel 
      });
      setResponse(res.data.generated_document);
      setUsedModel(res.data.ai_model);
    } catch (error) {
      console.error("Failed to submit prompt", error);
      setResponse("오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedDateStr = selectedDate 
    ? `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(selectedDate).padStart(2, '0')}`
    : null;
  const selectedEvents = selectedDateStr ? (events[selectedDateStr] || []) : [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📅 학사일정</h1>
          <p className="mt-1 text-sm text-gray-500">{currentYear}년 {currentMonth}월</p>
        </div>
        <button 
          onClick={() => navigate('/dashboard')}
          className="text-primary-600 hover:text-primary-900 font-medium"
        >
          &larr; 업무도우미로 돌아가기
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-white shadow rounded-lg p-4">
          <div className="grid grid-cols-7 gap-1">
            {/* Day headers */}
            {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
              <div key={idx} className="text-center text-xs font-semibold text-gray-600 py-1">
                {day}
              </div>
            ))}
            
            {/* Calendar days */}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayEvents = events[dateStr] || [];
              const isSelected = selectedDate === day;
              
              return (
                <div
                  key={day}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setDragStartDay(day);
                    setDragEndDay(day);
                    setIsDragging(true);
                    setDragMoved(false);
                    handleDateClick(day);
                  }}
                  onMouseEnter={() => {
                    if (isDragging) {
                      setDragEndDay(day);
                      if (day !== dragStartDay) setDragMoved(true);
                    }
                  }}
                  onMouseUp={() => {
                    if (isDragging) {
                      setDragEndDay(day);
                      if (dragMoved) {
                        setTimeout(handleRangeCreate, 0);
                      } else {
                        setIsDragging(false);
                        setDragStartDay(null);
                        setDragEndDay(null);
                      }
                    }
                  }}
                  className={`border rounded p-2 min-h-[72px] cursor-pointer transition-colors ${
                    isSelected 
                      ? 'bg-primary-100 border-primary-500' 
                      : isInDragRange(day)
                        ? 'bg-blue-50 border-blue-400'
                        : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-1">
                    <div className="text-xs font-semibold text-gray-700 mt-0.5">{day}</div>
                  <div className="flex flex-wrap gap-1 flex-1">
                    {dayEvents.map((event) => {
                      const color = event.memo && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(event.memo)
                        ? event.memo
                        : '#e2e8f0';
                      const textColor = color === '#e2e8f0' ? '#0f172a' : 'white';
                      return (
                        <span
                          key={event.id}
                          className="text-[10px] px-1.5 py-0.5 rounded-full truncate max-w-[88px]"
                          style={{ backgroundColor: color, color: textColor }}
                          title={event.title}
                        >
                          {event.title}
                        </span>
                      );
                    })}
                  </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Event Details & Add */}
        <div className="bg-white shadow rounded-lg p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {selectedDate ? `${currentMonth}월 ${selectedDate}일` : '날짜를 선택하세요'}
          </h2>

          {selectedDate && (
            <>
              {/* Add Event Form */}
              <div className="mb-4">
                <label htmlFor="eventTitle" className="block text-sm font-medium text-gray-700 mb-2">
                  행사 추가
                </label>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      id="eventTitle"
                      value={newEventTitle}
                      onChange={(e) => setNewEventTitle(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddEvent()}
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
                      placeholder="행사명 입력"
                    />
                    <button
                      onClick={handleAddEvent}
                      className="px-3 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm font-medium"
                    >
                      추가
                    </button>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-600">글자색</span>
                    {COLOR_PRESETS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setPersonalColor(c)}
                        className={`w-7 h-7 rounded-full border ${personalColor === c ? 'ring-2 ring-offset-1 ring-primary-500' : 'border-gray-300'}`}
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Grade required events */}
              <div className="mb-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">학년별 필수 행사</span>
                  <select
                    className="border rounded px-2 py-1 text-sm"
                    value={selectedGrade}
                    onChange={(e) => setSelectedGrade(e.target.value)}
                  >
                    {['1', '2', '3', '4', '5', '6'].map((g) => (
                      <option key={g} value={g}>
                        초등 {g}학년
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-wrap gap-2">
                  {GRADE_EVENTS[selectedGrade].map((event) => (
                    <button
                      key={event}
                      onClick={() => handleAddPresetEvent(event)}
                      className="px-3 py-1 text-xs rounded-md bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-100"
                    >
                      {event}
                    </button>
                  ))}
                </div>
              </div>


              {/* Existing Events */}
              {selectedEvents.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-700">일정 목록</h3>
                    <button
                      onClick={handleDeleteAllForDate}
                      className="text-xs text-red-600 hover:text-red-800 font-semibold"
                    >
                      일괄삭제
                    </button>
                  </div>
                  <div className="space-y-2">
                    {selectedEvents.map((event) => {
                      const color = event.memo && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(event.memo)
                        ? event.memo
                        : '#e2e8f0';
                      const textColor = color === '#e2e8f0' ? '#0f172a' : 'white';
                      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(selectedDate).padStart(2, '0')}`;
                      return (
                        <div
                          key={event.id}
                          className="flex items-center justify-between text-sm bg-gray-50 rounded-md px-3 py-2 border border-gray-200"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-flex items-center justify-center w-3 h-3 rounded-full"
                              style={{ backgroundColor: color }}
                            />
                            <span className="text-sm" style={{ color: textColor === 'white' ? '#0f172a' : textColor }}>
                              {event.title}
                            </span>
                          </div>
                          <button
                            onClick={() => handleDeleteEvent(event.id, dateStr)}
                            className="text-xs text-red-600 hover:text-red-800 font-medium"
                          >
                            삭제
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* AI Prompt Section */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium leading-6 text-gray-900 mb-4">학사일정 관련해서 무엇이든 물어보세요.</h2>
          
          <form onSubmit={handlePromptSubmit}>
            <div className="mb-2">
              <label htmlFor="prompt" className="sr-only">Prompt</label>
              <div className="relative">
                <textarea
                  id="prompt"
                  className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md p-3 pb-10"
                  rows={12}
                  placeholder="학사일정 관련 내용을 입력해 주세요."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
              </div>
              <div className="flex justify-end mt-3">
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${isSubmitting ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500`}
                >
                  {isSubmitting ? '생성 중...' : '생성하기'}
                </button>
              </div>
            </div>
          </form>
          {response && (
            <div className="mt-6 bg-gray-50 rounded-md p-4 border border-gray-200">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium text-gray-900">결과:</h3>
                {usedModel && (
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    usedModel.startsWith('claude') ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {usedModel.startsWith('claude') ? '🤖 Claude' : 
                     usedModel === 'gpt-4o-mini' ? '⚡ GPT-4o Mini' : '🧠 GPT-4o'}
                  </span>
                )}
              </div>
              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono bg-white p-3 rounded border border-gray-200">{response}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Schedule;
