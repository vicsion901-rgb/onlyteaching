import React, { useState, useEffect, useMemo } from 'react';
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

const HOLIDAYS_2026 = {
  "2026-01-01": "신정",
  "2026-02-16": "설날",
  "2026-02-17": "설날",
  "2026-02-18": "설날",
  "2026-03-01": "삼일절",
  "2026-03-02": "대체공휴일",
  "2026-05-05": "어린이날",
  "2026-05-24": "부처님오신날",
  "2026-05-25": "대체공휴일",
  "2026-06-06": "현충일",
  "2026-08-15": "광복절",
  "2026-08-17": "대체공휴일",
  "2026-09-24": "추석",
  "2026-09-25": "추석",
  "2026-09-26": "추석",
  "2026-10-03": "개천절",
  "2026-10-05": "대체공휴일",
  "2026-10-09": "한글날",
  "2026-12-25": "성탄절",
  "2027-01-01": "신정",
  "2027-02-06": "설날",
  "2027-02-07": "설날",
  "2027-02-08": "설날",
  "2027-02-09": "대체공휴일"
};

function Schedule() {
  const navigate = useNavigate();
  // Initialize with 2026-03-01 for academic planning context, or current date?
  // User asked for 2026 holidays. Let's start at current date but allow navigation.
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().getDate());
  const [events, setEvents] = useState({});
  const [newEventTitle, setNewEventTitle] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('1');
  const [personalColor, setPersonalColor] = useState('#2563eb');
  const [dragStartDay, setDragStartDay] = useState(null);
  const [dragEndDay, setDragEndDay] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragMoved, setDragMoved] = useState(false);

  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

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

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 2, 1));
    setSelectedDate(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth, 1));
    setSelectedDate(null);
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

  const selectedDateStr = selectedDate 
    ? `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(selectedDate).padStart(2, '0')}`
    : null;
  const selectedEvents = selectedDateStr ? (events[selectedDateStr] || []) : [];

  const schoolDaysStats = useMemo(() => {
    const start = new Date(2026, 2, 1);
    const end = new Date(2027, 2, 0);
    
    let totalDays = 0;
    let semester1 = 0;
    let semester2 = 0;

    const curr = new Date(start);
    
    while (curr <= end) {
      const year = curr.getFullYear();
      const month = curr.getMonth() + 1;
      const day = curr.getDate();
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayOfWeek = curr.getDay();

      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        if (!HOLIDAYS_2026[dateStr]) {
          const dayEvents = events[dateStr] || [];
          const hasVacation = dayEvents.some(e => 
            e.title.includes('방학') || 
            e.title.includes('휴업') || 
            e.title.includes('개교기념일')
          );

          if (!hasVacation) {
            totalDays++;
            if (month >= 3 && month <= 7) {
              semester1++;
            } else {
              semester2++;
            }
          }
        }
      }
      
      curr.setDate(curr.getDate() + 1);
    }

    return { totalDays, semester1, semester2 };
  }, [events]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">📅 학사일정</h1>
            <div className="flex items-center gap-2 mt-1">
              <button onClick={handlePrevMonth} className="text-gray-500 hover:text-gray-700 p-1">
                &larr;
              </button>
              <p className="text-sm text-gray-500 font-medium">{currentYear}년 {currentMonth}월</p>
              <button onClick={handleNextMonth} className="text-gray-500 hover:text-gray-700 p-1">
                &rarr;
              </button>
            </div>
          </div>
        </div>
        <button 
          onClick={() => navigate('/dashboard')}
          className="text-primary-600 hover:text-primary-900 font-medium"
        >
          &larr; 업무도우미로 돌아가기
        </button>
      </div>

      <div className="bg-white shadow rounded-lg p-4 border-l-4 border-primary-500">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">수업일수 계산기 (2026학년도)</h3>
            <p className="text-sm text-gray-500">공휴일 및 방학/휴업일을 제외한 평일 기준</p>
          </div>
          <div className="flex gap-6 text-center">
            <div>
              <p className="text-xs text-gray-500">1학기 (3-7월)</p>
              <p className="text-xl font-bold text-gray-800">{schoolDaysStats.semester1}일</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">2학기 (8-2월)</p>
              <p className="text-xl font-bold text-gray-800">{schoolDaysStats.semester2}일</p>
            </div>
            <div className="pl-6 border-l border-gray-200">
              <p className="text-xs text-gray-500">총 수업일수</p>
              <p className="text-2xl font-bold text-primary-600">
                {schoolDaysStats.totalDays} <span className="text-sm text-gray-400 font-normal">/ 190</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white shadow rounded-lg p-4">
          <div className="grid grid-cols-7 gap-1">
            {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
              <div key={idx} className={`text-center text-xs font-semibold py-1 ${idx === 0 ? 'text-red-500' : 'text-gray-600'}`}>
                {day}
              </div>
            ))}
            
            {Array.from({ length: new Date(currentYear, currentMonth - 1, 1).getDay() }, (_, i) => (
               <div key={`empty-${i}`} className="bg-gray-50/30"></div>
            ))}

            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayEvents = events[dateStr] || [];
              const isSelected = selectedDate === day;
              const holidayName = HOLIDAYS_2026[dateStr];
              const isHoliday = !!holidayName;
              const dateObj = new Date(currentYear, currentMonth - 1, day);
              const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
              const isSunday = dateObj.getDay() === 0;
              
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
                  className={`border rounded p-1 min-h-[80px] cursor-pointer transition-colors relative ${
                    isSelected 
                      ? 'bg-primary-50 border-primary-500 ring-1 ring-primary-500' 
                      : isInDragRange(day)
                        ? 'bg-blue-50 border-blue-400'
                        : isHoliday 
                          ? 'bg-red-50 border-red-200 hover:bg-red-100'
                          : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className={`text-xs font-semibold ${
                      isHoliday || isSunday ? 'text-red-600' : isWeekend ? 'text-gray-600' : 'text-gray-700'
                    }`}>
                      {day}
                    </span>
                    {isHoliday && (
                      <span className="text-[10px] text-red-500 font-medium truncate ml-1">{holidayName}</span>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-0.5 mt-1">
                    {dayEvents.map((event) => {
                      const color = event.memo && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(event.memo)
                        ? event.memo
                        : '#e2e8f0';
                      const textColor = color === '#e2e8f0' ? '#0f172a' : 'white';
                      return (
                        <div
                          key={event.id}
                          className="text-[10px] px-1 rounded-sm truncate"
                          style={{ backgroundColor: color, color: textColor }}
                          title={event.title}
                        >
                          {event.title}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-4 h-fit">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">
            {selectedDate ? `${currentMonth}월 ${selectedDate}일` : '날짜를 선택하세요'}
            {selectedDate && HOLIDAYS_2026[`${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(selectedDate).padStart(2, '0')}`] && (
              <span className="ml-2 text-sm text-red-500 font-normal">
                ({HOLIDAYS_2026[`${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(selectedDate).padStart(2, '0')}`]})
              </span>
            )}
          </h2>

          {selectedDate && (
            <>
              <div className="mb-6">
                <label htmlFor="eventTitle" className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                  새 일정 추가
                </label>
                <div className="flex flex-col gap-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      id="eventTitle"
                      value={newEventTitle}
                      onChange={(e) => setNewEventTitle(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddEvent()}
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500 shadow-sm"
                      placeholder="일정 내용 입력"
                    />
                    <button
                      onClick={handleAddEvent}
                      className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm font-medium shadow-sm transition-colors"
                    >
                      등록
                    </button>
                  </div>
                  
                  <div className="flex gap-1.5 flex-wrap">
                    {COLOR_PRESETS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setPersonalColor(c)}
                        className={`w-6 h-6 rounded-full border transition-all ${
                          personalColor === c 
                            ? 'ring-2 ring-offset-1 ring-primary-500 scale-110' 
                            : 'border-gray-200 hover:scale-105'
                        }`}
                        style={{ backgroundColor: c }}
                        title={c}
                        aria-label={`색상 선택: ${c}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">학년별 행사 템플릿</span>
                  <select
                    className="border-gray-200 text-xs rounded-md py-1 pr-6 pl-2 focus:ring-primary-500 focus:border-primary-500"
                    value={selectedGrade}
                    onChange={(e) => setSelectedGrade(e.target.value)}
                  >
                    {['1', '2', '3', '4', '5', '6'].map((g) => (
                      <option key={g} value={g}>초등 {g}학년</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-wrap gap-2">
                  {GRADE_EVENTS[selectedGrade].map((event) => (
                    <button
                      key={event}
                      onClick={() => handleAddPresetEvent(event)}
                      className="px-2.5 py-1.5 text-xs rounded-full bg-gray-100 text-gray-700 hover:bg-primary-50 hover:text-primary-700 hover:ring-1 hover:ring-primary-200 transition-all border border-transparent"
                    >
                      + {event}
                    </button>
                  ))}
                </div>
              </div>


              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-900">등록된 일정 ({selectedEvents.length})</h3>
                  {selectedEvents.length > 0 && (
                    <button
                      onClick={handleDeleteAllForDate}
                      className="text-xs text-gray-400 hover:text-red-600 underline transition-colors"
                    >
                      전체 삭제
                    </button>
                  )}
                </div>
                
                {selectedEvents.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">등록된 일정이 없습니다.</p>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {selectedEvents.map((event) => {
                      const color = event.memo && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(event.memo)
                        ? event.memo
                        : '#e2e8f0';
                      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(selectedDate).padStart(2, '0')}`;
                      return (
                        <div
                          key={event.id}
                          className="group flex items-center justify-between text-sm bg-white rounded-md px-3 py-2.5 border border-gray-200 hover:border-primary-200 hover:shadow-sm transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: color }}
                            />
                            <span className="text-gray-700 font-medium">
                              {event.title}
                            </span>
                          </div>
                          <button
                            onClick={() => handleDeleteEvent(event.id, dateStr)}
                            className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                            title="삭제"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Schedule;
