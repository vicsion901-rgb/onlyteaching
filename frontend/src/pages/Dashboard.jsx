import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { ChevronRight } from 'lucide-react';
import { getTabItems } from '../config/tabRegistry';
import WalkingAnimation from '../components/WalkingAnimation';

const GREETING_TEXT = 'On1yTeaching';

function Dashboard() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState('');
  const [selectedModel] = useState('claude-3-5-sonnet-20241022');
  const [usedModel, setUsedModel] = useState('');
  const [events, setEvents] = useState({});
  const [currentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear] = useState(new Date().getFullYear());
  const [tabUsage, setTabUsage] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tabUsage') || localStorage.getItem('tabClickCounts');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const migrated = {};
          Object.keys(parsed).forEach(key => {
            const val = parsed[key];
            if (typeof val === 'number') {
              migrated[key] = { count: val, lastUsed: 0 };
            } else {
              migrated[key] = val;
            }
          });
          return migrated;
        } catch {
          return {};
        }
      }
    }
    return {};
  });
  const [greeting, setGreeting] = useState(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('greetingTypedOnce') === '1') {
      return GREETING_TEXT;
    }
    return '';
  });

  const allTabs = useMemo(() => getTabItems({
    currentMonth,
    currentYear,
    hasStudentData: events && Object.keys(events).length > 0,
  }), [currentMonth, currentYear, events]);

  const recentTabs = useMemo(() => {
    const hasAnyUsage = Object.values(tabUsage).some(v => v?.lastUsed > 0);
    if (!hasAnyUsage) {
      // No usage data yet — show default order
      return allTabs.slice(0, 6);
    }
    return [...allTabs].sort((a, b) => {
      const timeA = tabUsage[a.id]?.lastUsed || 0;
      const timeB = tabUsage[b.id]?.lastUsed || 0;
      
      if (timeB !== timeA) {
        return timeB - timeA;
      }
      
      const countA = tabUsage[a.id]?.count || 0;
      const countB = tabUsage[b.id]?.count || 0;
      if (countB !== countA) {
        return countB - countA;
      }
      
      return 0;
    }).slice(0, 6);
  }, [allTabs, tabUsage]);


  const activeTabId = useMemo(() => detectTopicFromPrompt(prompt, allTabs), [prompt, allTabs]);

  // Fetch events from backend
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await client.get('/api/schedules');
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
    const now = Date.now();
    const newStats = { ...tabUsage };
    const current = newStats[tabId] || { count: 0, lastUsed: 0 };
    
    newStats[tabId] = { 
      count: current.count + 1, 
      lastUsed: now 
    };
    
    setTabUsage(newStats);
    localStorage.setItem('tabUsage', JSON.stringify(newStats));
    navigate(route);
  };


  const handlePromptSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await client.post('/api/prompts', { 
        content: prompt,
        ai_model: selectedModel 
      });
      setResponse(res.data.generated_document);
      setUsedModel(res.data.ai_model);
    } catch (error) {
      console.error("Failed to submit prompt", error);
      setResponse("오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3 flex flex-col min-h-[calc(100vh-2rem)]">
      <div className="flex items-start gap-6 sm:gap-10">
        <div className="flex flex-col">
          <h1
            className="text-3xl font-bold text-gray-900 italic"
            style={{ letterSpacing: '0.06em' }}
          >
            {greeting || GREETING_TEXT}
          </h1>
          <span className="text-base font-semibold shimmer-text">오직 가르치기만 하십시오.</span>
        </div>
        <div className="hidden sm:block pt-1">
          <WalkingAnimation />
        </div>
      </div>
      
      <div className="space-y-8">
        <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-100">
          <div className="px-4 py-4 sm:px-6 border-b border-gray-100 bg-gray-50/50">
            <h3 className="text-lg leading-6 font-bold text-gray-900 flex items-center gap-2">
              최근 이용하신 업무 목록
            </h3>
          </div>
          <div className="px-4 py-5 sm:p-6">
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {recentTabs.map((tab, index) => {
                const hasUsage = tabUsage[tab.id]?.lastUsed > 0;
                return (
                  <div
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id, tab.route)}
                    className={`group relative flex items-center space-x-3 sm:space-x-4 rounded-xl border bg-white px-3 sm:px-5 py-2 sm:py-2.5 shadow-sm hover:shadow-md cursor-pointer transition-all duration-200 ${
                      index === 0 && hasUsage
                        ? 'border-indigo-300 ring-2 ring-indigo-100'
                        : 'border-gray-200 hover:border-indigo-300'
                    }`}
                  >
                    {hasUsage && (
                      <span className={`absolute -top-2 -left-2 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shadow-sm z-10 ${
                        index === 0 ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {index + 1}
                      </span>
                    )}
                    <div className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-indigo-50 rounded-lg group-hover:bg-indigo-100 transition-colors">
                      <span className="text-xl sm:text-2xl" aria-hidden="true">{tab.emoji}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="absolute inset-0" aria-hidden="true" />
                      <p className="text-sm sm:text-base font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors truncate">
                        {tab.title}
                      </p>
                      <p className="text-[11px] sm:text-xs text-gray-500 truncate mt-0.5">{tab.subtitle}</p>
                    </div>
                    <div className="flex-shrink-0 self-center hidden sm:block">
                      <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-indigo-400 transition-colors" aria-hidden="true" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      
      {/* AI Prompt Section - Split layout */}
      <div className="bg-white overflow-hidden shadow rounded-lg flex-1 flex flex-col">
        <div className="px-4 py-5 sm:p-6 flex-1 flex flex-col">
          <form onSubmit={handlePromptSubmit} className="flex-1 flex flex-col">
            {/* 제목 행 - 같은 높이 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-2">
              <h2 className="text-lg font-medium leading-6 text-gray-900">통합형 업무 도우미</h2>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">결과</h3>
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
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
              {/* Left: textarea */}
              <div className="flex flex-col">
                <textarea
                  id="prompt"
                  className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md p-3 pb-4 flex-1 resize-none min-h-[100px] overflow-y-auto"
                  placeholder={'예시) 000학생 관련해서 발표능력 상, 정리정돈 중, 예의범절 하로 생기부 4줄 작성해줘.'}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                      e.preventDefault();
                      handlePromptSubmit(e);
                    }
                  }}
                />
              </div>

              {/* Right: result */}
              <div className="flex flex-col min-h-[100px]">
                <div className="bg-white border border-gray-300 rounded-md p-3 flex-1 overflow-y-auto shadow-sm">
                  <ResultRenderer text={response} />
                </div>
              </div>
            </div>

            {/* Submit button - below grid, aligned to left column */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 ${isLoading ? 'bg-gray-100' : 'bg-white hover:bg-gray-50'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400`}
                >
                  {isLoading ? '생성 중...' : '생성하기 (Ctrl + Enter)'}
                </button>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => { setPrompt(''); setResponse(''); setUsedModel(''); }}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
                >
                  초기화
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

    </div>
  );
}

export default Dashboard;

function ResultRenderer({ text }) {
  if (!text) {
    return <p className="text-sm text-gray-400" style={{ fontFamily: 'inherit' }}>결과가 여기에 표시됩니다.</p>;
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
    { id: 'creative-activities', keywords: ['창의적체험활동', '창체', '창의적', '동아리', '봉사'] },
    { id: 'life-records', keywords: ['생활기록부', '생기부', '생활기록', '기록부'] },
    { id: 'autobiography-compilation', keywords: ['자서전편찬', '자서전', '편찬', '회고록'] },
    { id: 'subject-evaluation', keywords: ['교과평가', '성적', '평가', '성취'] },
    { id: 'newsletter', keywords: ['가정통신문', '안내문', '통신문'] },
    { id: 'student-records', keywords: ['학생명부', '명부', '학생기록'] },
    { id: 'neis', keywords: ['neis', '나이스'] },
    { id: 'counseling', keywords: ['상담', '상담기록', '상담일지'] },
    { id: 'exam-grading', keywords: ['채점', '시험지', '시험채점'] },
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
