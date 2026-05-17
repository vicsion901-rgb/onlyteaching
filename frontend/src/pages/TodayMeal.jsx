import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';

function getWeekRange(date = new Date()) {
  const c = new Date(date);
  const day = c.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(c); mon.setDate(c.getDate() + diff);
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  return { weekStart: mon.toISOString().slice(0, 10), weekEnd: sun.toISOString().slice(0, 10) };
}

function getMonthRange(date = new Date()) {
  const y = date.getFullYear(); const m = date.getMonth();
  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0);
  return {
    monthStart: first.toISOString().slice(0, 10),
    monthEnd: last.toISOString().slice(0, 10),
    monthLabel: `${m + 1}월`,
    daysLeft: Math.max(0, Math.ceil((last - new Date()) / (1000 * 60 * 60 * 24))),
  };
}

function formatDateLabel(value) {
  if (!value) return '-';
  const t = new Date(value);
  if (Number.isNaN(t.getTime())) return value;
  return t.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
}
function formatShortDate(value) {
  if (!value) return '';
  const t = new Date(value);
  if (Number.isNaN(t.getTime())) return value;
  return `${String(t.getMonth() + 1).padStart(2, '0')}.${String(t.getDate()).padStart(2, '0')}`;
}

const MEDAL = ['🥇', '🥈', '🥉'];

// 학교 표시 — 학교명 매핑 추가 시 여기만 수정
function displaySchool(item) {
  if (!item) return '';
  return item.schoolName || item.schoolCode || '학교';
}

function TodayMeal() {
  const navigate = useNavigate();
  const schoolCode = localStorage.getItem('schoolCode') || '';
  const userId = localStorage.getItem('userId') || '';

  const [mealDate, setMealDate] = useState(new Date().toISOString().slice(0, 10));
  const [caption, setCaption] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [meals, setMeals] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`tm_meals_${schoolCode}`) || '[]'); } catch { return []; }
  });
  const [weeklyBoard, setWeeklyBoard] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tm_weekly') || '[]'); } catch { return []; }
  });
  const [monthlyBoard, setMonthlyBoard] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tm_monthly') || '[]'); } catch { return []; }
  });
  const [boardLoaded, setBoardLoaded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [likingMealId, setLikingMealId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [rankTab, setRankTab] = useState('monthly');
  const [showRankMore, setShowRankMore] = useState(false);
  const [feedSort, setFeedSort] = useState('latest');

  const { weekStart, weekEnd } = useMemo(() => getWeekRange(), []);
  const { monthStart, monthEnd, monthLabel, daysLeft } = useMemo(() => getMonthRange(), []);

  const fetchMeals = async () => {
    if (!schoolCode) { setMeals([]); return; }
    try {
      const res = await client.get('/api/meals', { params: { schoolCode, startDate: weekStart, endDate: weekEnd } });
      const data = Array.isArray(res.data) ? res.data : [];
      setMeals(data);
      try { localStorage.setItem(`tm_meals_${schoolCode}`, JSON.stringify(data)); } catch {}
    } catch (err) {
      console.error('Failed to fetch meals', err);
      setErrorMsg('급식 목록을 불러오지 못했습니다.');
    }
  };
  const fetchBoard = async (period, startDate, endDate, setter, cacheKey) => {
    try {
      const res = await client.get('/api/meals', { params: { action: 'leaderboard', period, startDate, endDate } });
      const data = Array.isArray(res.data) ? res.data : [];
      setter(data);
      if (cacheKey) { try { localStorage.setItem(cacheKey, JSON.stringify(data)); } catch {} }
    } catch (err) {
      console.error('Failed to fetch leaderboard', err);
    }
  };

  useEffect(() => {
    setBoardLoaded(false);
    Promise.all([
      fetchMeals(),
      fetchBoard('weekly', weekStart, weekEnd, setWeeklyBoard, 'tm_weekly'),
      fetchBoard('monthly', monthStart, monthEnd, setMonthlyBoard, 'tm_monthly'),
    ]).finally(() => setBoardLoaded(true));
  }, [schoolCode, weekStart, weekEnd, monthStart, monthEnd]);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
    setPreviewUrl(file ? URL.createObjectURL(file) : '');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!schoolCode) { setErrorMsg('학교 코드가 없습니다. 다시 로그인해주세요.'); return; }
    if (!selectedFile) { setErrorMsg('급식 사진을 선택해주세요.'); return; }
    setIsSubmitting(true); setErrorMsg('');
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const uploadRes = await client.post('/api/meals?action=upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await client.post('/api/meals', {
        schoolCode, mealDate, caption,
        imageUrl: uploadRes.data?.imageUrl,
        createdByUserId: userId,
      });
      setCaption(''); setSelectedFile(null); setPreviewUrl('');
      await Promise.all([
        fetchMeals(),
        fetchBoard('weekly', weekStart, weekEnd, setWeeklyBoard, 'tm_weekly'),
        fetchBoard('monthly', monthStart, monthEnd, setMonthlyBoard, 'tm_monthly'),
      ]);
    } catch (err) {
      console.error('Failed to save meal post', err);
      setErrorMsg(err.response?.data?.message || '오늘의 급식 업로드 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheer = async (mealId) => {
    if (!schoolCode || !userId) { setErrorMsg('응원을 누르려면 로그인 정보가 필요합니다.'); return; }
    setLikingMealId(mealId); setErrorMsg('');
    try {
      await client.post(`/api/meals?action=like&mealId=${mealId}`, { schoolCode, userId });
      await Promise.all([
        fetchMeals(),
        fetchBoard('weekly', weekStart, weekEnd, setWeeklyBoard, 'tm_weekly'),
        fetchBoard('monthly', monthStart, monthEnd, setMonthlyBoard, 'tm_monthly'),
      ]);
    } catch (err) {
      console.error('Failed to cheer meal post', err);
      setErrorMsg(err.response?.data?.message || '응원 처리 중 오류가 발생했습니다.');
    } finally {
      setLikingMealId(null);
    }
  };

  const monthlyTop = monthlyBoard[0] || null;
  const monthlyTotalCheers = monthlyBoard.reduce((s, x) => s + (x.totalLikes || 0), 0);
  const participatingSchools = monthlyBoard.length;

  const currentBoard = rankTab === 'weekly' ? weeklyBoard
    : rankTab === 'monthly' ? monthlyBoard
    : monthlyBoard.filter((x) => x.schoolCode === schoolCode);
  const ourRankInCurrent = schoolCode ? currentBoard.findIndex((x) => x.schoolCode === schoolCode) : -1;

  const sortedFeed = useMemo(() => {
    const arr = [...meals];
    if (feedSort === 'popular') arr.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    else arr.sort((a, b) => new Date(b.mealDate) - new Date(a.mealDate));
    return arr;
  }, [meals, feedSort]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/40 via-orange-50/20 to-white -mx-4 -my-6 px-4 py-5 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-4 sm:space-y-5">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold tracking-[0.2em] text-amber-700 uppercase">Today · 급식</p>
          <button onClick={() => navigate('/dashboard')} className="text-xs font-medium text-amber-700 hover:text-amber-900">← 홈으로</button>
        </div>

        {errorMsg && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{errorMsg}</div>
        )}

        {/* A. 행사 배너 — 얇은 한 줄 */}
        <section className="flex items-center gap-3 rounded-2xl border border-amber-200/60 bg-gradient-to-r from-amber-100 via-orange-100 to-rose-100 px-3.5 py-3 sm:px-4 sm:py-3.5 shadow-sm">
          <span className="text-2xl sm:text-3xl">🍱</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm sm:text-base font-bold text-amber-900 leading-tight">{monthLabel} 급식상 진행 중</p>
            <p className="text-[11px] sm:text-xs text-amber-800/80 leading-snug">가장 많은 응원을 받은 학교의 영양선생님께 상장을 보내드려요</p>
          </div>
          <div className="hidden sm:flex flex-wrap items-center gap-1.5 shrink-0">
            <span className="rounded-full bg-white/85 px-2 py-0.5 text-[11px] font-semibold text-orange-800 shadow-sm">⏳ {daysLeft}일</span>
            <span className="rounded-full bg-white/85 px-2 py-0.5 text-[11px] font-semibold text-rose-800 shadow-sm">👏 {monthlyTotalCheers}</span>
            <span className="rounded-full bg-white/85 px-2 py-0.5 text-[11px] font-semibold text-pink-800 shadow-sm">🏫 {participatingSchools}</span>
          </div>
        </section>
        {/* 모바일 메타 칩 */}
        <div className="flex sm:hidden flex-wrap items-center gap-1.5 -mt-2">
          <span className="rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-orange-800 shadow-sm border border-amber-100">⏳ {daysLeft}일</span>
          <span className="rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-rose-800 shadow-sm border border-rose-100">👏 {monthlyTotalCheers}</span>
          <span className="rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-pink-800 shadow-sm border border-pink-100">🏫 {participatingSchools}</span>
        </div>

        {/* 짧은 안내 — 이벤트 성격 명시 */}
        <div className="rounded-xl bg-amber-50/60 border border-amber-100 px-3 py-2 text-[11px] sm:text-xs text-amber-800/90 leading-relaxed">
          🍱 급식상은 실제 시식 평가가 아니라, 학교에서 올린 사진과 소개를 보고 따뜻한 응원을 보내는 이벤트예요
        </div>

        {/* B. 월간 1위 큰 카드 */}
        <section className="overflow-hidden rounded-3xl bg-white border border-amber-100 shadow-sm">
          {monthlyTop ? (
            <>
              <div className="relative aspect-[16/9] bg-amber-50">
                {monthlyTop.topImageUrl ? (
                  <img src={monthlyTop.topImageUrl} alt={`${displaySchool(monthlyTop)} 대표 급식`} className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-6xl text-amber-300">🍱</div>
                )}
                <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-amber-500/95 px-3 py-1 text-xs font-bold text-white shadow-md backdrop-blur-sm">
                  🥇 이번 달 1위
                </div>
                <div className="absolute right-3 bottom-3 inline-flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                  👏 {monthlyTop.totalLikes}
                </div>
              </div>
              <div className="px-4 py-3.5 sm:px-5 sm:py-4">
                <h2 className="text-xl sm:text-2xl font-bold text-amber-900 leading-tight">{displaySchool(monthlyTop)}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] sm:text-xs text-amber-800/75">
                  <span>게시 {monthlyTop.postCount}개</span>
                  {monthlyTop.lastMealDate && <><span className="text-amber-300">·</span><span>최근 {formatShortDate(monthlyTop.lastMealDate)}</span></>}
                </div>
                <p className="mt-2 text-xs sm:text-sm font-medium text-orange-700">"이번 달 상장 유력 후보예요"</p>
              </div>
            </>
          ) : !boardLoaded ? (
            <div className="relative aspect-[16/9] bg-amber-50 animate-pulse" />
          ) : (
            <div className="relative aspect-[16/9] bg-gradient-to-br from-amber-50 to-orange-50 flex flex-col items-center justify-center text-center px-4">
              <div className="text-5xl mb-2">🌷</div>
              <p className="text-sm sm:text-base font-semibold text-amber-900">첫 급식상 후보를 기다리고 있어요</p>
              <p className="mt-1 text-xs text-amber-700/70">오늘 첫 게시물이 곧 이번 달의 1위가 됩니다</p>
            </div>
          )}
        </section>

        {/* C. TOP 3 보드 (탭 + 전체 보기) */}
        <section className="rounded-2xl bg-white border border-amber-100 p-3.5 sm:p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-amber-900 shrink-0">TOP 3</h3>
              {ourRankInCurrent >= 0 && rankTab !== 'ours' && (
                <button type="button" onClick={() => setShowRankMore(true)}
                  className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-amber-800 hover:bg-amber-200 transition truncate">
                  📌 우리 학교 {ourRankInCurrent + 1}위
                </button>
              )}
            </div>
            <div className="inline-flex rounded-full bg-amber-50 p-0.5 text-[11px] font-medium shrink-0">
              {[
                { key: 'weekly', label: '이번 주' },
                { key: 'monthly', label: '이번 달' },
                { key: 'ours', label: '우리 학교' },
              ].map((t) => (
                <button key={t.key} type="button" onClick={() => { setRankTab(t.key); setShowRankMore(false); }}
                  className={`rounded-full px-2 sm:px-2.5 py-1 transition ${rankTab === t.key ? 'bg-white text-amber-900 shadow-sm' : 'text-amber-700 hover:text-amber-900'}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          {currentBoard.length === 0 && !boardLoaded ? (
            <div className="space-y-1.5">
              {[0,1,2].map(i => (<div key={i} className="h-10 rounded-xl bg-amber-50/50 animate-pulse" />))}
            </div>
          ) : currentBoard.length === 0 ? (
            <div className="rounded-xl bg-amber-50/40 px-3 py-5 text-center text-xs text-amber-700/70">
              {rankTab === 'ours' ? '우리 학교의 이번 달 기록이 아직 없어요' : '첫 후보를 기다리고 있어요'}
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                {currentBoard.slice(0, 3).map((item, idx) => {
                  const isOurs = item.schoolCode === schoolCode;
                  return (
                    <div key={`top-${item.schoolCode}-${idx}`}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2 ${isOurs ? 'bg-amber-100/70 ring-1 ring-amber-300/60' : idx === 0 ? 'bg-gradient-to-r from-amber-50 to-orange-50/50' : 'bg-amber-50/30'}`}>
                      <span className="w-6 text-center text-xl shrink-0">{MEDAL[idx]}</span>
                      <div className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 overflow-hidden rounded-lg bg-amber-50">
                        {item.topImageUrl ? (
                          <img src={item.topImageUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-base text-amber-300">🍱</div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs sm:text-sm font-semibold text-amber-900">
                          {displaySchool(item)}
                          {isOurs && <span className="ml-1.5 text-[10px] font-medium text-amber-600">우리 학교</span>}
                        </p>
                        <p className="text-[10px] text-amber-700/60">게시 {item.postCount}개</p>
                      </div>
                      <span className="shrink-0 text-xs sm:text-sm font-bold text-amber-700">👏 {item.totalLikes}</span>
                    </div>
                  );
                })}
              </div>
              {currentBoard.length > 3 && (
                <>
                  <button type="button" onClick={() => setShowRankMore(!showRankMore)}
                    className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 hover:text-amber-900">
                    {showRankMore ? '접기 ▴' : `+ 전체 ${currentBoard.length}개 학교 보기 ▾`}
                  </button>
                  {showRankMore && (
                    <div className="mt-1.5 space-y-1 max-h-[18rem] overflow-y-auto pr-1">
                      {currentBoard.slice(3).map((item, idx) => {
                        const rank = idx + 4;
                        const isOurs = item.schoolCode === schoolCode;
                        return (
                          <div key={`more-${item.schoolCode}-${rank}`}
                            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 ${isOurs ? 'bg-amber-100/60 ring-1 ring-amber-300/60' : 'bg-amber-50/30'}`}>
                            <span className="w-5 text-center text-[11px] font-bold text-amber-700/70">{rank}</span>
                            <span className="min-w-0 flex-1 truncate text-xs font-medium text-amber-900">
                              {displaySchool(item)}
                              {isOurs && <span className="ml-1.5 text-[10px] font-medium text-amber-600">우리 학교</span>}
                            </span>
                            <span className="text-[11px] font-bold text-amber-700">👏 {item.totalLikes}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </section>

        {/* D. 급식 사진 피드 — 메인 */}
        <section>
          <div className="mb-2.5 flex items-end justify-between gap-2 px-1">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-amber-900">이번 주 급식 피드</h3>
              <p className="text-[10px] text-amber-700/60">{formatDateLabel(weekStart)} ~ {formatDateLabel(weekEnd)}</p>
            </div>
            <div className="inline-flex rounded-full bg-amber-50 p-0.5 text-[11px] font-medium">
              <button type="button" onClick={() => setFeedSort('latest')}
                className={`rounded-full px-2.5 py-1 transition ${feedSort === 'latest' ? 'bg-white text-amber-900 shadow-sm' : 'text-amber-700'}`}>최신순</button>
              <button type="button" onClick={() => setFeedSort('popular')}
                className={`rounded-full px-2.5 py-1 transition ${feedSort === 'popular' ? 'bg-white text-amber-900 shadow-sm' : 'text-amber-700'}`}>인기순</button>
            </div>
          </div>
          {sortedFeed.length === 0 && !boardLoaded ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {[0,1,2,3].map(i => (
                <div key={i} className="rounded-2xl border border-amber-100 bg-white overflow-hidden">
                  <div className="aspect-[4/3] bg-amber-50 animate-pulse" />
                  <div className="p-3 space-y-2">
                    <div className="h-3 w-1/3 bg-amber-50 rounded animate-pulse" />
                    <div className="h-3 w-full bg-amber-50 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : sortedFeed.length === 0 ? (
            <div className="rounded-2xl bg-white/70 border border-dashed border-amber-200 px-4 py-10 text-center">
              <div className="text-4xl mb-2">🍽️</div>
              <p className="text-sm font-semibold text-amber-900">첫 급식 사진을 기다리고 있어요</p>
              <p className="mt-1 text-xs text-amber-700/60">아래에서 우리 학교 급식을 올려보세요</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {sortedFeed.map((meal) => (
                <article key={meal.id} className="overflow-hidden rounded-2xl bg-white border border-amber-100 shadow-sm transition hover:shadow-md">
                  <div className="relative aspect-[4/3] bg-amber-50">
                    {meal.imageUrl ? (
                      <img src={meal.imageUrl} alt={`${displaySchool(meal)} 급식`} className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-4xl text-amber-300">🍱</div>
                    )}
                    <span className="absolute left-3 top-3 inline-flex items-center rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 shadow-sm backdrop-blur">
                      {displaySchool(meal)}
                    </span>
                  </div>
                  <div className="p-3 sm:p-3.5 space-y-2">
                    <p className="text-[10px] font-medium text-amber-600">{formatDateLabel(meal.mealDate)}</p>
                    <p className="text-sm leading-relaxed text-gray-700 line-clamp-2 min-h-[2.5rem]">{meal.caption || '오늘의 급식이 등록되었어요'}</p>
                    <div className="flex items-center justify-between pt-1 border-t border-amber-50">
                      <span className="text-sm font-semibold text-amber-700">👏 {meal.likes}</span>
                      <button type="button" onClick={() => handleCheer(meal.id)} disabled={likingMealId === meal.id || !userId}
                        className="inline-flex min-h-[36px] items-center gap-1 rounded-full bg-amber-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50">
                        {likingMealId === meal.id ? '...' : '👏 응원해요'}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* E. 업로드 참여 카드 — 작게 */}
        <section className="rounded-2xl bg-gradient-to-br from-amber-50/80 to-orange-50/60 border border-amber-200/60 p-3.5 sm:p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="text-xl">🍱</span>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm sm:text-base font-bold text-amber-900 leading-tight">우리 학교도 오늘 급식을 올려보세요</h3>
              <p className="text-[10px] text-amber-800/70">사진 한 장 + 한마디면 충분해요</p>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-2">
            <div className="flex gap-2">
              <input type="date" value={mealDate} onChange={(e) => setMealDate(e.target.value)}
                className="rounded-lg border border-amber-200/60 bg-white px-2.5 py-1.5 text-xs text-amber-900 focus:border-amber-400 focus:ring-1 focus:ring-amber-300" />
              <input type="file" accept="image/*" onChange={handleFileChange}
                className="min-w-0 flex-1 text-xs text-amber-800 file:mr-2 file:rounded file:border file:border-amber-300 file:bg-white file:px-2 file:py-1 file:text-[11px] file:font-semibold file:text-amber-700 hover:file:bg-amber-50" />
            </div>
            <textarea rows={2} value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={120}
              placeholder="오늘의 한마디 — 예) 오늘 반찬 반응이 정말 좋았어요"
              className="block w-full resize-none rounded-lg border border-amber-200/60 bg-white px-2.5 py-2 text-xs text-amber-900 placeholder:text-amber-400/60 focus:border-amber-400 focus:ring-1 focus:ring-amber-300" />
            {previewUrl && (
              <div className="overflow-hidden rounded-lg border border-amber-200">
                <img src={previewUrl} alt="미리보기" className="h-28 w-full object-cover" />
              </div>
            )}
            <button type="submit" disabled={isSubmitting || !schoolCode}
              className="inline-flex min-h-[40px] w-full items-center justify-center gap-1 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-amber-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60">
              {isSubmitting ? '게시 중...' : '🍱 오늘의 급식 게시'}
            </button>
          </form>
        </section>

        {/* F. 상장 안내 */}
        <section className="rounded-2xl bg-white/70 border border-amber-100 px-4 py-3 sm:px-5 sm:py-3.5 shadow-sm">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-base">📜</span>
            <h3 className="text-xs sm:text-sm font-bold text-amber-900">이번 달 급식상 안내</h3>
          </div>
          <ul className="space-y-0.5 text-[11px] sm:text-xs text-amber-800/85 leading-relaxed">
            <li>🍙 학교당 하루 1번 올릴 수 있어요</li>
            <li>👏 게시물마다 1번 응원할 수 있어요</li>
            <li>🏆 이번 달 가장 많은 응원을 받은 학교의 영양선생님께 상장을 보내드려요</li>
            <li>👀 게시물의 사진과 소개 문구를 보고 따뜻한 응원을 보내주세요</li>
          </ul>
        </section>
      </div>
    </div>
  );
}

export default TodayMeal;
