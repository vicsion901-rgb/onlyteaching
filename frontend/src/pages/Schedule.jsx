import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';

function Schedule() {
  const navigate = useNavigate();
  const [currentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState(null);
  const [events, setEvents] = useState({});
  const [newEventTitle, setNewEventTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [file, setFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [response, setResponse] = useState('');
  const [selectedModel] = useState('claude-3-5-sonnet-20241022');
  const [usedModel, setUsedModel] = useState('');

  // Fetch events from backend
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await client.get('/schedules/');
        // Group events by date
        const eventsByDate = {};
        res.data.forEach(event => {
          const date = event.start_date;
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

  const handleAddEvent = async () => {
    if (!newEventTitle.trim() || !selectedDate) return;

    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(selectedDate).padStart(2, '0')}`;
    
    try {
      const response = await client.post('/schedules/', {
        title: newEventTitle,
        start_date: dateStr,
        end_date: dateStr
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

  const handlePromptSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let res;
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        if (prompt) formData.append('prompt', prompt);
        formData.append('ai_model', selectedModel);
        
        res = await client.post('/prompts/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        setResponse(res.data.generated_document || JSON.stringify(res.data, null, 2));
        setUsedModel(res.data.ai_model || selectedModel);
      } else {
        res = await client.post('/prompts/', { 
          content: prompt,
          ai_model: selectedModel 
        });
        setResponse(res.data.generated_document);
        setUsedModel(res.data.ai_model);
      }
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
                  onClick={() => handleDateClick(day)}
                  className={`border rounded p-1 min-h-[60px] cursor-pointer transition-colors ${
                    isSelected 
                      ? 'bg-primary-100 border-primary-500' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="text-xs font-semibold text-gray-700">{day}</div>
                  <div className="mt-1 space-y-0.5">
                    {dayEvents.map((event, idx) => (
                      <div
                        key={idx}
                        className="text-[10px] bg-primary-200 text-primary-900 rounded px-1 py-0.5 truncate"
                        title={event.title}
                      >
                        {event.title}
                      </div>
                    ))}
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
              </div>

              {/* Existing Events */}
              {selectedEvents.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">일정 목록</h3>
                  <div className="space-y-2">
                    {selectedEvents.map((event, idx) => (
                      <div key={idx} className="text-sm bg-gray-50 rounded-md px-3 py-2 border border-gray-200">
                        {event.title}
                      </div>
                    ))}
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
          <h2 className="text-lg font-medium leading-6 text-gray-900 mb-4">학사일정 관련 무엇이든 물어보세요.</h2>
          
          <form onSubmit={handlePromptSubmit}>
            <div className="mb-2">
              <label htmlFor="prompt" className="sr-only">Prompt</label>
              <div className="relative">
                <textarea
                  id="prompt"
                  className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md p-3 pb-10"
                  rows={12}
                  placeholder="학사일정 관련 무엇이든 물어보세요."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
                <div className="absolute bottom-2 left-2">
                    <input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => setFile(e.target.files[0])}
                    />
                    <label
                      htmlFor="file-upload"
                      className={`cursor-pointer inline-flex items-center p-1.5 rounded-full hover:bg-gray-100 transition-colors ${file ? 'text-primary-600 bg-primary-50' : 'text-gray-400'}`}
                      title="이미지 업로드"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                      </svg>
                      {file && <span className="ml-1 text-xs font-medium">{file.name}</span>}
                    </label>
                  </div>
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
