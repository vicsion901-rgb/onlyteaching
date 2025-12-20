import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';

const GREETING_TEXT = '선생님, 안녕하세요';

const TOPIC_MAP = {
  schedule: { emoji: '📅', title: '학사일정', route: '/schedule' },
  'life-records': { emoji: '📝', title: '생활기록부', route: '/life-records' },
  neis: { emoji: '💼', title: 'NEIS 업무', route: '/neis' },
  newsletter: { emoji: '📋', title: '가정통신문', route: '/newsletter' },
  'subject-evaluation': { emoji: '📊', title: '교과평가', route: '/subject-evaluation' },
  'student-records': { emoji: '👥', title: '학생명부', route: '/student-records' },
  'semester1-schedule': { emoji: '🌸', title: '업무 일정 (1학기)', route: '/semester1-schedule' }, // 벚꽃
  'semester2-schedule': { emoji: '🍁', title: '업무 일정 (2학기)', route: '/semester2-schedule' }, // 붉은 단풍잎
};

function Dashboard() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState('');
  const [selectedModel] = useState('claude-3-5-sonnet-20241022');
  const [usedModel, setUsedModel] = useState('');
  const [events, setEvents] = useState({});
  const [currentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear] = useState(new Date().getFullYear());
  const [tabClickCounts, setTabClickCounts] = useState({});
  const [greeting, setGreeting] = useState(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('greetingTypedOnce') === '1') {
      return GREETING_TEXT;
    }
    return '';
  });

  const allTabs = useMemo(() => ([
    {
      id: 'schedule',
      route: '/schedule',
      emoji: '📅',
      title: '학사일정',
      subtitle: `${currentYear}년 ${currentMonth}월`,
    },
    {
      id: 'semester1-schedule',
      route: '/semester1-schedule',
      emoji: '🌸',
      title: '업무 일정 (1학기)',
      subtitle: '1학기 일정',
    },
    {
      id: 'semester2-schedule',
      route: '/semester2-schedule',
      emoji: '🍁',
      title: '업무 일정 (2학기)',
      subtitle: '2학기 일정',
    },
    {
      id: 'newsletter',
      route: '/newsletter',
      emoji: '📋',
      title: '가정통신문',
      subtitle: '안내문 작성',
    },
    {
      id: 'subject-evaluation',
      route: '/subject-evaluation',
      emoji: '📊',
      title: '교과평가',
      subtitle: '성적 관리',
    },
    {
      id: 'student-records',
      route: '/student-records',
      emoji: '👥',
      title: '학생명부',
      subtitle: events && Object.keys(events).length > 0 ? '명단 등록됨' : '명단 관리',
    },
    {
      id: 'neis',
      route: '/neis',
      emoji: '💼',
      title: 'NEIS 업무',
      subtitle: 'NEIS 관리',
    },
    {
      id: 'life-records',
      route: '/life-records',
      emoji: '📝',
      title: '생활기록부',
      subtitle: '기록 관리',
    }
  ]), [currentMonth, currentYear, events]);

  const [quickTabs, setQuickTabs] = useState([
    { id: 'schedule', ...TOPIC_MAP.schedule },
    { id: 'life-records', ...TOPIC_MAP['life-records'] },
    { id: 'neis', ...TOPIC_MAP.neis },
  ]);

  const activeTabId = useMemo(() => detectTopicFromPrompt(prompt, allTabs), [prompt, allTabs]);

  // Load click counts from localStorage
  useEffect(() => {
    const savedCounts = localStorage.getItem('tabClickCounts');
    if (savedCounts) {
      setTabClickCounts(JSON.parse(savedCounts));
    }
  }, []);

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

  // One-time typing animation for greeting on first visit after login
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem('greetingTypedOnce') === '1') return;

    let index = 0;
    const interval = setInterval(() => {
      index += 1;
      setGreeting(GREETING_TEXT.slice(0, index));
      if (index >= GREETING_TEXT.length) {
        clearInterval(interval);
        localStorage.setItem('greetingTypedOnce', '1');
      }
    }, 80);

    return () => clearInterval(interval);
  }, []);

  // Handle tab clicks and update localStorage
  const handleTabClick = (tabId, route) => {
    const newCounts = { ...tabClickCounts };
    newCounts[tabId] = (newCounts[tabId] || 0) + 1;
    setTabClickCounts(newCounts);
    localStorage.setItem('tabClickCounts', JSON.stringify(newCounts));
    navigate(route);
  };

  // Ensure prompt-detected topic exists in quick tabs (bottom buttons)
  useEffect(() => {
    if (!activeTabId) return;
    const meta = getTopicMeta(activeTabId, prompt, allTabs);
    if (!meta) return;
    const exists = quickTabs.find((t) => t.id === activeTabId);
    if (exists) return;
    setQuickTabs((prev) => {
      const withCounts = prev.map((t, idx) => ({
        ...t,
        _count: tabClickCounts[t.id] || 0,
        _idx: idx,
      }));
      const replaceTarget = withCounts.reduce((min, item) => {
        if (item._count < min._count) return item;
        if (item._count === min._count && item._idx > min._idx) return item;
        return min;
      }, withCounts[0]);
      const next = [...prev];
      next[replaceTarget._idx] = { id: activeTabId, ...meta };
      return next;
    });
  }, [activeTabId, prompt, quickTabs, tabClickCounts, allTabs]);

  const handlePromptSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
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
        
        // If it's a student list upload, show success message and maybe redirect or refresh
        if (res.data.students) {
          setResponse(`학생 명부 인식이 완료되었습니다.\n총 ${res.data.count}명의 학생이 등록되었습니다.\n\n[인식된 학생 목록]\n${res.data.students.map(s => `${s.number}번 ${s.name}`).join(', ')}`);
          setUsedModel(selectedModel);
          setFile(null); // Reset file
          // Trigger a refresh of the layout sidebar status if possible, or just let user navigate
          // Ideally we would use a context or global state, but for now a reload or navigation will update it
          window.dispatchEvent(new Event('student-records-updated')); // Custom event if we want to listen
        } else {
           setResponse(res.data.generated_document || JSON.stringify(res.data, null, 2));
           setUsedModel(res.data.ai_model || selectedModel);
        }
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
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <h1
          className="text-3xl font-bold text-gray-900"
          style={{ letterSpacing: '0.06em' }}
        >
          {greeting || GREETING_TEXT}
        </h1>
      </div>
      
      {/* Quick Access Tabs (top 4 by click count, no prompt highlighting) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {(() => {
          const top4Tabs = [...allTabs]
            .map((t) => ({ ...t, clickCount: tabClickCounts[t.id] || 0 }))
            .sort((a, b) => b.clickCount - a.clickCount)
            .slice(0, 4);

          return top4Tabs.map(tab => (
            <div
              key={tab.id}
              onClick={() => handleTabClick(tab.id, tab.route)}
              className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow cursor-pointer chalk-red-cursor"
            >
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-4xl">{tab.emoji}</span>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {tab.title}
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {tab.subtitle}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          ));
        })()}
      </div>
      
      {/* AI Prompt Section - Split layout */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium leading-6 text-gray-900 mb-4">학생 명부 파일을 드래그해서 올려주세요.</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: form */}
            <div>
              {/* Quick Suggestion Buttons */}
              <div className="flex flex-wrap gap-3 mb-4">
                {quickTabs.map((tab) => {
                  const isActive = activeTabId === tab.id;
                  const cls = isActive
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50';
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setPrompt(`${tab.title}에 대해 알려줘`);
                        handleTabClick(tab.id, tab.route);
                      }}
                      className={`inline-flex items-center px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${cls}`}
                    >
                      <span className="mr-2 text-lg">{tab.emoji}</span>
                      {tab.title}
                    </button>
                  );
                })}
              </div>

              <form onSubmit={handlePromptSubmit}>
                <label htmlFor="prompt" className="sr-only">Prompt</label>
                <div className="relative">
                  <textarea
                    id="prompt"
                    className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md p-3 pb-10"
                    rows={12}
                    placeholder={'학생 명부 파일을 드래그해서 올려주세요.'}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                        e.preventDefault();
                        handlePromptSubmit(e);
                      }
                    }}
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
                    disabled={isLoading}
                    className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${isLoading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500`}
                  >
                    {isLoading ? '생성 중...' : '생성하기 (Ctrl + Enter)'}
                  </button>
                </div>
              </form>
            </div>

            {/* Right: result */}
            <div className="bg-gray-50 rounded-md p-4 border border-gray-200 h-full">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-gray-900">결과:</h3>
                  {activeTabId === 'life-records' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                      생활기록부
                    </span>
                  )}
                </div>
                {usedModel && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                    OnlyTeaching DB
                  </span>
                )}
              </div>
              <div className="min-h-[240px] bg-white border border-gray-200 rounded-md p-3">
                <ResultRenderer text={response} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;

function ResultRenderer({ text }) {
  if (!text) {
    return <p className="text-sm text-gray-400">결과가 여기에 표시됩니다.</p>;
  }

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const bulletLines = lines.filter((l) => l.startsWith('- '));
  const otherLines = lines.filter((l) => !l.startsWith('- '));
  const combinedParagraph = bulletLines.map((l) => l.replace(/^- /, '')).join(' ');

  return (
    <div className="space-y-3">
      {otherLines.map((line, idx) => (
        <p key={`other-${idx}`} className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
          {line}
        </p>
      ))}

      {bulletLines.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-semibold text-gray-900">추천 문장 예시:</div>
          <ul className="list-disc list-inside text-sm text-gray-800 space-y-1">
            {bulletLines.map((line, idx) => (
              <li key={`bullet-${idx}`}>{line.replace(/^- /, '')}</li>
            ))}
          </ul>
          <div className="pt-2">
            <div className="text-xs font-semibold text-gray-900 mb-1">종합 문단</div>
            <p className="text-sm text-gray-800 leading-relaxed bg-gray-50 border border-gray-200 rounded-md p-3">
              {combinedParagraph}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function detectTopicFromPrompt(text, tabs) {
  if (!text || !text.trim()) return null;
  const normalized = text.toLowerCase().replace(/\s+/g, '');

  const keywordMap = [
    { id: 'schedule', keywords: ['학사일정', '학사', '일정', '스케줄'] },
    { id: 'semester1-schedule', keywords: ['업무일정', '업무 일정', '1학기', '1학', '1 학기'] },
    { id: 'semester2-schedule', keywords: ['2학기', '2학', '2 학기'] },
    { id: 'life-records', keywords: ['생활기록부', '생기부', '생활기록', '기록부'] },
    { id: 'subject-evaluation', keywords: ['교과평가', '성적', '평가', '성취'] },
    { id: 'newsletter', keywords: ['가정통신문', '안내문', '통신문'] },
    { id: 'student-records', keywords: ['학생명부', '명부', '학생기록'] },
    { id: 'neis', keywords: ['neis', '나이스'] },
  ];

  for (const entry of keywordMap) {
    if (entry.keywords.some((k) => normalized.includes(k.replace(/\s+/g, '').toLowerCase()))) {
      return entry.id;
    }
  }

  // Fallback: try to match by title similarity
  if (tabs && Array.isArray(tabs)) {
    for (const tab of tabs) {
      const titleNorm = (tab.title || '').toLowerCase().replace(/\s+/g, '');
      if (!titleNorm) continue;
      if (normalized.includes(titleNorm) || titleNorm.includes(normalized)) {
        return tab.id;
      }
    }
  }

  return null;
}

function getTopicMeta(id, promptText, tabs) {
  if (TOPIC_MAP[id]) return TOPIC_MAP[id];
  if (tabs) {
    const found = tabs.find((t) => t.id === id);
    if (found) return found;
  }
  return {
    emoji: '✨',
    title: promptText ? promptText.slice(0, 8) + (promptText.length > 8 ? '…' : '') : '사용자 지정',
    route: '/',
  };
}
