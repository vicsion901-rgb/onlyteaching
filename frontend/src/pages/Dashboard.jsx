import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { ChevronRight } from 'lucide-react';
import { getTabItems } from '../config/tabRegistry';
import WalkingAnimation from '../components/WalkingAnimation';
import QrDistribution from '../components/QrDistribution';

const GREETING_TEXT = 'On1yTeaching';

const DIRECT_OUTPUT_IDS = new Set([
  'life-records',
  'counseling',
  'newsletter',
  'autobiography-compilation',
  'exam-grading',
]);

const KEYWORD_MAP = [
  { id: 'life-records', title: '생활기록부 작성', emoji: '📝', route: '/life-records',
    reason: '생기부 문장 초안을 만들 수 있어요',
    keywords: ['생기부', '생활기록부', '생활기록', '기록부', '행발', '발표력', '예의범절', '서술', '기록 문장', '서술형', '평가문장'],
    aliases: ['생기브', '생긱부', '생기부쓰', '행바', '행발문장', '생기부문장', '생기부써', '생기부써줘'] },
  { id: 'counseling', title: '상담 기록', emoji: '💬', route: '/counseling',
    reason: '상담 내용과 관찰을 정리할 수 있어요',
    keywords: ['상담', '학부모', '갈등', '관찰', '생활지도', '학생 관계', '또래', '친구관계', '정서', '문제행동', '행동'],
    aliases: ['상담기록', '상듬', '학생관계', '친구갈등', '학부모상담', '지도기록'] },
  { id: 'today-meal', title: '오늘의 급식', emoji: '🍱', route: '/today-meal',
    reason: '급식 사진 업로드 + 학교별 응원 순위를 볼 수 있어요',
    keywords: ['급식', '응원', '영양선생님', '급식상', '식판', '점심', '식단', '오늘의급식'],
    aliases: ['오늘밥', '급싣', '급시', '영양쌤', '급식사진', '급식응원', '밥올려', '밥올리'] },
  { id: 'student-records', title: '학생 명부', emoji: '👥', route: '/student-records',
    reason: '학생 명부와 출결을 관리할 수 있어요',
    keywords: ['학생명부', '명부', '출석', '학생기록'],
    aliases: ['학생리스트', '학생목록', '명부확인'] },
  { id: 'schedule', title: '학사일정', emoji: '📅', route: '/schedule',
    reason: '일정을 등록하고 월간 흐름을 볼 수 있어요',
    keywords: ['일정', '학사', '스케줄', '학사일정', '회의'],
    aliases: ['스케쥴', '스케줄링', '일정등록', '일정정리'] },
  { id: 'newsletter', title: '가정통신문', emoji: '📢', route: '/newsletter',
    reason: '안내문/공지 초안을 만들 수 있어요',
    keywords: ['가정통신문', '안내문', '통신문', '공지', '안내'],
    aliases: ['공지문', '가통문', '안내문구', '공지사항'] },
  { id: 'autobiography-compilation', title: '자서전 편찬', emoji: '📖', route: '/autobiography-compilation',
    reason: '자서전 챕터와 질문을 확인하고 편집할 수 있어요',
    keywords: ['자서전', '편찬', '챕터', '회고', '회고록', '책만들기', '원고', '질문답변'],
    aliases: ['자서전쓰기', '챱터', '책편찬', '질문정리', '원고지편찬', '자서전편집'] },
  { id: 'creative-studio', title: '창작 편찬실', emoji: '🎨', route: '/creative-studio',
    reason: '창작 활동과 챕터 질문을 관리할 수 있어요',
    keywords: ['창작', '편찬실'],
    aliases: ['편찬싫', '편찬슬', '창작실'] },
  { id: 'subject-evaluation', title: '교과 평가', emoji: '📊', route: '/subject-evaluation',
    reason: '교과별 성취와 평가를 정리할 수 있어요',
    keywords: ['교과평가', '성적', '평가', '성취'],
    aliases: ['교과성적', '평가정리', '성적정리'] },
  { id: 'exam-grading', title: '시험 채점', emoji: '✏️', route: '/exam-grading',
    reason: '시험지 채점을 도와드려요',
    keywords: ['채점', '시험지', '시험채점'],
    aliases: ['시험점수', '시험검토', '채점해줘'] },
  { id: 'presenter-picker', title: '발표자 정하기', emoji: '🎤', route: '/presenter-picker',
    reason: '발표자를 뽑거나 순서를 정할 수 있어요',
    keywords: ['발표자', '발표 정하기', '발표 뽑기', '뽑기', '추첨', '랜덤', '모둠'],
    aliases: ['발표자뽑기', '발표자뽑고십어', '발표자뽑고싶어', '발표자정해줘', '랜덤뽑기', '추첨도구'] },
  { id: 'seat-arrangement', title: '자리 정하기', emoji: '🪑', route: '/seat-arrangement',
    reason: '자리 배치를 자동으로 정할 수 있어요',
    keywords: ['자리', '자리 배치', '좌석'],
    aliases: ['자리배치', '자리뽑기', '좌석배치', '자리정해줘'] },
  { id: 'role-assignment', title: '1인 1역', emoji: '🎭', route: '/role-assignment',
    reason: '1인 1역 분담을 만들 수 있어요',
    keywords: ['1인 1역', '역할', '분담', '1인1역'],
    aliases: ['역할분담', '일인일역', '역할정해줘'] },
  { id: 'absence-report', title: '결석계', emoji: '🏥', route: '/absence-report',
    reason: '결석/출결 신고를 처리할 수 있어요',
    keywords: ['결석', '출결', '결석계'],
    aliases: ['결석신고', '결석처리', '결석사유'] },
  { id: 'care-classroom', title: '돌봄교실', emoji: '🏫', route: '/care-classroom',
    reason: '돌봄교실 일지와 감정 기록을 남길 수 있어요',
    keywords: ['돌봄', '감정 기록', '돌봄교실'],
    aliases: ['돌봄일지', '돌봄기록', '돌붐교실'] },
  { id: 'teacher-activities', title: '학생 활동 관리', emoji: '📋', route: '/teacher-activities',
    reason: '학생 제출과 세션 현황을 볼 수 있어요',
    keywords: ['활동 관리', '제출 현황', '세션', '학생 활동'],
    aliases: ['활동현황', '제출확인', '활동관리'] },
  { id: 'qr-distribution', title: 'QR 배포', emoji: '📱', route: '#qr', action: 'showQr',
    reason: '아침 활동 링크를 QR 코드로 배포할 수 있어요',
    keywords: ['qr', '배포', '활동지', '링크 보내기', '큐알', '아침활동배포'],
    aliases: ['큐알로', '큐알배포', 'qr배포', 'qr코드', '큐알코드', '링크보내기', '큐알로보내'] },
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


  const [submittedPrompt, setSubmittedPrompt] = useState('');
  const [routeInfo, setRouteInfo] = useState({ primary: null, secondary: [], confidence: 'none' });

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
    const text = prompt.trim();
    if (!text) return;
    setSubmittedPrompt(text);
    const route = detectRoutesFromPrompt(text);
    setRouteInfo(route);
    setResponse('');
    setUsedModel('');

    const shouldGenerate = route.primary && DIRECT_OUTPUT_IDS.has(route.primary.id);
    if (!shouldGenerate) return;

    setIsLoading(true);
    try {
      const res = await client.post('/api/prompts', {
        content: text,
        ai_model: selectedModel,
      });
      setResponse(res.data.generated_document || '');
      setUsedModel(res.data.ai_model || '');
    } catch (error) {
      console.error('Failed to submit prompt', error);
      // 실패해도 라우팅 결과는 그대로 노출 — 별도 에러 메시지 없음
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
                <div className="bg-white border border-gray-300 rounded-md p-3 flex-1 overflow-y-auto shadow-sm">
                  <ResultPanel
                    submitted={submittedPrompt}
                    routeInfo={routeInfo}
                    response={response}
                    isLoading={isLoading}
                    onSelect={handleRecommendClick}
                  />
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
                  onClick={() => {
                    setPrompt('');
                    setResponse('');
                    setUsedModel('');
                    setSubmittedPrompt('');
                    setRouteInfo({ primary: null, secondary: [], confidence: 'none' });
                  }}
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

function editDistance(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  if (Math.abs(m - n) > 2) return 99;
  let prev = new Array(n + 1);
  let curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      curr[j] = a[i - 1] === b[j - 1] ? prev[j - 1] : Math.min(prev[j - 1], curr[j - 1], prev[j]) + 1;
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

function hasFuzzyMatch(input, keyword, threshold = 1) {
  if (!keyword || keyword.length < 2) return false;
  const lo = Math.max(2, keyword.length - 1);
  const hi = keyword.length + 1;
  for (let len = lo; len <= hi; len++) {
    for (let i = 0; i + len <= input.length; i++) {
      if (editDistance(input.slice(i, i + len), keyword) <= threshold) return true;
    }
  }
  return false;
}

function detectRoutesFromPrompt(text) {
  if (!text || !text.trim()) return { primary: null, secondary: [], confidence: 'none' };
  const normalized = text.toLowerCase().replace(/\s+/g, '');

  const scored = KEYWORD_MAP.map((entry) => {
    let score = 0, exactHit = 0, aliasHit = 0, fuzzyHit = 0;
    for (const kw of (entry.keywords || [])) {
      const k = kw.toLowerCase().replace(/\s+/g, '');
      if (!k) continue;
      if (normalized.includes(k)) { score += k.length >= 4 ? 3 : 2; exactHit++; }
      else if (hasFuzzyMatch(normalized, k)) { score += 1; fuzzyHit++; }
    }
    for (const al of (entry.aliases || [])) {
      const k = al.toLowerCase().replace(/\s+/g, '');
      if (!k) continue;
      if (normalized.includes(k)) { score += 2; aliasHit++; }
      else if (hasFuzzyMatch(normalized, k)) { score += 1; fuzzyHit++; }
    }
    return { ...entry, score, exactHit, aliasHit, fuzzyHit };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return { primary: null, secondary: [], confidence: text.trim().length >= 2 ? 'unknown' : 'none' };
  }
  const [primary, ...rest] = scored;
  const secondary = rest.slice(0, 3);
  let confidence;
  if (primary.exactHit >= 1) confidence = 'high';
  else if (primary.aliasHit >= 1 || primary.fuzzyHit >= 1) confidence = 'medium';
  else confidence = 'low';
  return { primary, secondary, confidence };
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

function DidYouMeanCard({ primary, secondary, onSelect }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 space-y-2">
      <p className="text-[11px] font-semibold tracking-wider text-amber-800 uppercase">혹시 이건가요?</p>
      <button type="button" onClick={() => onSelect(primary)}
        className="w-full text-left flex items-center gap-3 rounded-lg bg-white border border-amber-200 p-3 hover:border-amber-400 hover:shadow-sm transition">
        <span className="text-2xl shrink-0">{primary.emoji}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-gray-900">{primary.title}</p>
          <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{primary.reason}</p>
        </div>
        <span className="text-amber-700 text-sm font-semibold shrink-0">맞아요 →</span>
      </button>
      {secondary && secondary.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-[11px] text-gray-500">아니면:</span>
          {secondary.map((s) => (
            <button key={s.id} type="button" onClick={() => onSelect(s)}
              className="inline-flex items-center gap-1 rounded-full bg-white border border-amber-200 px-2 py-0.5 text-[11px] font-medium text-amber-800 hover:border-amber-400 transition">
              <span>{s.emoji}</span>{s.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ResultPanel({ submitted, routeInfo, response, isLoading, onSelect }) {
  // 1) 제출 전 — 기본 안내문 (좌상단, 입력창 placeholder와 같은 시작점)
  if (!submitted) {
    return (
      <p className="text-sm text-gray-400 leading-relaxed">
        업무 요청을 입력하고 <span className="font-medium text-gray-600">생성하기</span>를 누르면,
        바로 답변하거나 관련 작업으로 안내해드려요.
      </p>
    );
  }

  // 2) 생성 중
  if (isLoading) {
    return (
      <div className="space-y-3">
        <RequestEcho text={submitted} primary={routeInfo.primary} />
        <div className="rounded-xl bg-gray-50 border border-gray-200 px-3 py-4 text-center text-sm text-gray-500">
          답변을 만들고 있어요...
        </div>
      </div>
    );
  }

  const hasResponse = !!(response && response.trim());

  return (
    <div className="space-y-3">
      <RequestEcho text={submitted} primary={routeInfo.primary} />

      {hasResponse && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold tracking-wider text-emerald-700 uppercase">바로 결과</p>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
            <ResultRenderer text={response} />
          </div>
        </div>
      )}

      {routeInfo.confidence === 'high' && routeInfo.primary && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold tracking-wider text-indigo-700 uppercase">
            {hasResponse ? '다음 작업' : '추천 작업'}
          </p>
          <RecommendationCard primary={routeInfo.primary} secondary={routeInfo.secondary} onSelect={onSelect} />
        </div>
      )}

      {(routeInfo.confidence === 'medium' || routeInfo.confidence === 'low') && routeInfo.primary && (
        <DidYouMeanCard primary={routeInfo.primary} secondary={routeInfo.secondary} onSelect={onSelect} />
      )}

      {!routeInfo.primary && !hasResponse && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 space-y-2">
          <p className="text-xs text-amber-800">요청을 정확히 하나로 좁히지 못했어요. 혹시 아래 작업을 찾으시나요?</p>
          <div className="flex flex-wrap gap-1.5">
            {KEYWORD_MAP.slice(0, 6).map((s) => (
              <button key={s.id} type="button" onClick={() => onSelect(s)}
                className="inline-flex items-center gap-1 rounded-full bg-white border border-amber-200 px-2.5 py-0.5 text-[11px] font-medium text-amber-800 hover:border-amber-400 transition">
                <span>{s.emoji}</span>{s.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RequestEcho({ text, primary }) {
  return (
    <div className="flex items-start gap-2">
      <p className="text-[11px] font-semibold tracking-wider text-gray-500 uppercase shrink-0 mt-0.5">요청 해석</p>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-700 leading-relaxed line-clamp-2">"{text}"</p>
        {primary && (
          <p className="mt-0.5 text-[11px] text-indigo-700 font-medium">
            <span>{primary.emoji}</span> {primary.title}
          </p>
        )}
      </div>
    </div>
  );
}
