import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { ChevronRight } from 'lucide-react';
import { getTabItems } from '../config/tabRegistry';
import WalkingAnimation from '../components/WalkingAnimation';
import QrDistribution from '../components/QrDistribution';

const GREETING_TEXT = 'On1yTeaching';

const KEYWORD_MAP = [
  { id: 'life-records', title: '생활기록부 작성', emoji: '📝', route: '/life-records',
    reason: '생기부 문장 초안을 만들 수 있어요',
    keywords: ['생기부', '생활기록부', '생활기록', '기록부', '행발', '발표력', '예의범절', '서술', '기록 문장'] },
  { id: 'counseling', title: '상담 기록', emoji: '💬', route: '/counseling',
    reason: '상담 내용과 관찰을 정리할 수 있어요',
    keywords: ['상담', '학부모', '갈등', '관찰', '생활지도', '학생 관계', '또래'] },
  { id: 'today-meal', title: '오늘의 급식', emoji: '🍱', route: '/today-meal',
    reason: '급식 사진 업로드 + 학교별 응원 순위를 볼 수 있어요',
    keywords: ['급식', '응원', '영양선생님', '급식상', '식판', '점심'] },
  { id: 'student-records', title: '학생 명부', emoji: '👥', route: '/student-records',
    reason: '학생 명부와 출결을 관리할 수 있어요',
    keywords: ['학생명부', '명부', '출석', '학생기록'] },
  { id: 'schedule', title: '학사일정', emoji: '📅', route: '/schedule',
    reason: '일정을 등록하고 월간 흐름을 볼 수 있어요',
    keywords: ['일정', '학사', '스케줄', '학사일정'] },
  { id: 'newsletter', title: '가정통신문', emoji: '📢', route: '/newsletter',
    reason: '안내문/공지 초안을 만들 수 있어요',
    keywords: ['가정통신문', '안내문', '통신문', '공지', '안내'] },
  { id: 'autobiography-compilation', title: '자서전 편찬', emoji: '📖', route: '/autobiography-compilation',
    reason: '자서전 챕터와 질문을 확인하고 편집할 수 있어요',
    keywords: ['자서전', '편찬', '챕터', '회고', '회고록'] },
  { id: 'creative-studio', title: '창작 편찬실', emoji: '🎨', route: '/creative-studio',
    reason: '창작 활동과 챕터 질문을 관리할 수 있어요',
    keywords: ['창작', '편찬실'] },
  { id: 'subject-evaluation', title: '교과 평가', emoji: '📊', route: '/subject-evaluation',
    reason: '교과별 성취와 평가를 정리할 수 있어요',
    keywords: ['교과평가', '성적', '평가', '성취'] },
  { id: 'exam-grading', title: '시험 채점', emoji: '✏️', route: '/exam-grading',
    reason: '시험지 채점을 도와드려요',
    keywords: ['채점', '시험지', '시험채점'] },
  { id: 'presenter-picker', title: '발표자 정하기', emoji: '🎤', route: '/presenter-picker',
    reason: '발표자를 뽑거나 순서를 정할 수 있어요',
    keywords: ['발표자', '발표 정하기', '발표 뽑기', '뽑기'] },
  { id: 'seat-arrangement', title: '자리 정하기', emoji: '🪑', route: '/seat-arrangement',
    reason: '자리 배치를 자동으로 정할 수 있어요',
    keywords: ['자리', '자리 배치', '좌석'] },
  { id: 'role-assignment', title: '1인 1역', emoji: '🎭', route: '/role-assignment',
    reason: '1인 1역 분담을 만들 수 있어요',
    keywords: ['1인 1역', '역할', '분담', '1인1역'] },
  { id: 'absence-report', title: '결석계', emoji: '🏥', route: '/absence-report',
    reason: '결석/출결 신고를 처리할 수 있어요',
    keywords: ['결석', '출결', '결석계'] },
  { id: 'care-classroom', title: '돌봄교실', emoji: '🏫', route: '/care-classroom',
    reason: '돌봄교실 일지와 감정 기록을 남길 수 있어요',
    keywords: ['돌봄', '감정 기록', '돌봄교실'] },
  { id: 'teacher-activities', title: '학생 활동 관리', emoji: '📋', route: '/teacher-activities',
    reason: '학생 제출과 세션 현황을 볼 수 있어요',
    keywords: ['활동 관리', '제출 현황', '세션', '학생 활동'] },
  { id: 'qr-distribution', title: 'QR 배포', emoji: '📱', route: '#qr', action: 'showQr',
    reason: '아침 활동 링크를 QR 코드로 배포할 수 있어요',
    keywords: ['qr', '배포', '활동지', '링크 보내기', '큐알'] },
];

function Dashboard() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState('');
  const [selectedModel] = useState('claude-3-5-sonnet-20241022');
  const [usedModel, setUsedModel] = useState('');
  const [events, setEvents] = useState({});
  const [showQr, setShowQr] = useState(false);
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


  const routeInfo = useMemo(() => detectRoutesFromPrompt(prompt), [prompt]);

  const handleRecommendClick = (item) => {
    if (!item) return;
    if (item.action === 'showQr') { setShowQr(true); return; }
    handleTabClick(item.id, item.route);
  };

  // Fetch events from backend
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const userId = localStorage.getItem('userId') || localStorage.getItem('user_id');
        if (!userId) return;
        const res = await client.get('/api/schedules', { params: { userId } });
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

        {/* QR 배포 */}
        <div className="mt-4">
          {showQr ? (
            <QrDistribution onClose={() => setShowQr(false)} />
          ) : (
            <button onClick={() => setShowQr(true)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-purple-50 text-purple-700 rounded-xl border border-purple-200 hover:bg-purple-100 transition text-sm font-medium">
              📱 QR로 아침 활동 배포하기
            </button>
          )}
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
                  {routeInfo.primary && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-100 text-indigo-800">
                      <span>{routeInfo.primary.emoji}</span>{routeInfo.primary.title}
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
                <div className="bg-white border border-gray-300 rounded-md p-3 flex-1 overflow-y-auto shadow-sm space-y-3">
                  {routeInfo.primary && (
                    <RecommendationCard primary={routeInfo.primary} secondary={routeInfo.secondary} onSelect={handleRecommendClick} />
                  )}
                  {!routeInfo.primary && routeInfo.isAmbiguous && (
                    <AmbiguousHint suggestions={KEYWORD_MAP.slice(0, 6)} onSelect={handleRecommendClick} />
                  )}
                  {!routeInfo.primary && !routeInfo.isAmbiguous && !response && (
                    <EmptyHint onSelect={handleRecommendClick} />
                  )}
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

function detectRoutesFromPrompt(text) {
  if (!text || !text.trim()) return { primary: null, secondary: [], isAmbiguous: false };
  const normalized = text.toLowerCase().replace(/\s+/g, '');

  const scored = KEYWORD_MAP.map((entry) => {
    let score = 0;
    for (const kw of entry.keywords) {
      const k = kw.toLowerCase().replace(/\s+/g, '');
      if (!k) continue;
      if (normalized.includes(k)) score += k.length >= 4 ? 3 : 2;
    }
    return { ...entry, score };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return { primary: null, secondary: [], isAmbiguous: text.trim().length >= 2 };
  }
  const [primary, ...rest] = scored;
  return {
    primary,
    secondary: rest.slice(0, 3),
    isAmbiguous: primary.score <= 2 && rest.length > 0,
  };
}

function RecommendationCard({ primary, secondary, onSelect }) {
  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-3 space-y-2">
      <p className="text-[11px] font-semibold tracking-wider text-indigo-700 uppercase">추천 작업</p>
      <button type="button" onClick={() => onSelect(primary)}
        className="w-full text-left flex items-center gap-3 rounded-lg bg-white border border-indigo-200 p-3 hover:border-indigo-400 hover:shadow-sm transition">
        <span className="text-2xl shrink-0">{primary.emoji}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-gray-900">{primary.title}</p>
          <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{primary.reason}</p>
        </div>
        <span className="text-indigo-600 text-sm font-semibold shrink-0">이동 →</span>
      </button>
      {secondary && secondary.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-[11px] text-gray-500">비슷한 작업:</span>
          {secondary.map((s) => (
            <button key={s.id} type="button" onClick={() => onSelect(s)}
              className="inline-flex items-center gap-1 rounded-full bg-white border border-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-700 hover:border-indigo-300 hover:text-indigo-700 transition">
              <span>{s.emoji}</span>{s.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AmbiguousHint({ suggestions, onSelect }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 space-y-2">
      <p className="text-xs text-amber-800">어떤 작업을 하시려는지 아래에서 골라보세요</p>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((s) => (
          <button key={s.id} type="button" onClick={() => onSelect(s)}
            className="inline-flex items-center gap-1 rounded-full bg-white border border-amber-200 px-2.5 py-0.5 text-[11px] font-medium text-amber-800 hover:border-amber-400 transition">
            <span>{s.emoji}</span>{s.title}
          </button>
        ))}
      </div>
    </div>
  );
}

function EmptyHint({ onSelect }) {
  const popular = KEYWORD_MAP.slice(0, 6);
  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500">자연어로 업무를 적으면 추천 탭을 알려드려요.</p>
      <div className="grid grid-cols-2 gap-2">
        {popular.map((p) => (
          <button key={p.id} type="button" onClick={() => onSelect(p)}
            className="flex items-center gap-2 rounded-lg bg-gray-50 border border-gray-200 p-2 text-left hover:border-indigo-300 hover:bg-indigo-50/40 transition">
            <span className="text-lg shrink-0">{p.emoji}</span>
            <span className="text-xs font-medium text-gray-800 truncate">{p.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
