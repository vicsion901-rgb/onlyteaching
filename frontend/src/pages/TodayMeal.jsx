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

function TodayMeal() {
  const navigate = useNavigate();
  const schoolCode = localStorage.getItem('schoolCode') || '';
  const userId = localStorage.getItem('userId') || '';

  const [mealDate, setMealDate] = useState(new Date().toISOString().slice(0, 10));
  const [caption, setCaption] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [meals, setMeals] = useState([]);
  const [weeklyBoard, setWeeklyBoard] = useState([]);
  const [monthlyBoard, setMonthlyBoard] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [likingMealId, setLikingMealId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [showMonthlyMore, setShowMonthlyMore] = useState(false);
  const [showWeeklyMore, setShowWeeklyMore] = useState(false);
  const [feedSort, setFeedSort] = useState('latest');

  const { weekStart, weekEnd } = useMemo(() => getWeekRange(), []);
  const { monthStart, monthEnd, monthLabel, daysLeft } = useMemo(() => getMonthRange(), []);

  const fetchMeals = async () => {
    if (!schoolCode) { setMeals([]); return; }
    try {
      const res = await client.get('/api/meals', { params: { schoolCode, startDate: weekStart, endDate: weekEnd } });
      setMeals(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch meals', err);
      setErrorMsg('급식 목록을 불러오지 못했습니다.');
    }
  };
  const fetchBoard = async (period, startDate, endDate, setter) => {
    try {
      const res = await client.get('/api/meals', { params: { action: 'leaderboard', period, startDate, endDate } });
      setter(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch leaderboard', err);
      setter([]);
    }
  };

  useEffect(() => {
    fetchMeals();
    fetchBoard('weekly', weekStart, weekEnd, setWeeklyBoard);
    fetchBoard('monthly', monthStart, monthEnd, setMonthlyBoard);
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
        fetchBoard('weekly', weekStart, weekEnd, setWeeklyBoard),
        fetchBoard('monthly', monthStart, monthEnd, setMonthlyBoard),
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
        fetchBoard('weekly', weekStart, weekEnd, setWeeklyBoard),
        fetchBoard('monthly', monthStart, monthEnd, setMonthlyBoard),
      ]);
    } catch (err) {
      console.error('Failed to cheer meal post', err);
      setErrorMsg(err.response?.data?.message || '응원 처리 중 오류가 발생했습니다.');
    } finally {
      setLikingMealId(null);
    }
  };

  const monthlyTop = monthlyBoard[0] || null;
  const weeklyTop = weeklyBoard[0] || null;
  const monthlyTotalCheers = monthlyBoard.reduce((s, x) => s + (x.totalLikes || 0), 0);
  const participatingSchools = monthlyBoard.length;
  const ourMonthlyIndex = schoolCode ? monthlyBoard.findIndex((x) => x.schoolCode === schoolCode) : -1;
  const ourMonthly = ourMonthlyIndex >= 0 ? monthlyBoard[ourMonthlyIndex] : null;
  const sortedFeed = useMemo(() => {
    const arr = [...meals];
    if (feedSort === 'popular') arr.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    else arr.sort((a, b) => new Date(b.mealDate) - new Date(a.mealDate));
    return arr;
  }, [meals, feedSort]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/50 via-orange-50/30 to-white -mx-4 -my-6 px-4 py-6 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-5 sm:space-y-7">
        {/* 헤더 */}
        <div className="flex items-center justify-between gap-3">
          <div className="text-[11px] sm:text-xs font-semibold tracking-[0.2em] text-amber-600 uppercase">Today · 급식</div>
          <button onClick={() => navigate('/dashboard')} className="text-xs sm:text-sm font-medium text-amber-700 hover:text-amber-900">← 홈으로</button>
        </div>

        {errorMsg && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs sm:text-sm text-rose-700">{errorMsg}</div>
        )}

        {/* ① 행사 배너 */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-100 via-orange-100 to-rose-100 px-5 py-6 sm:px-8 sm:py-9 shadow-sm">
          <div className="absolute -right-6 -top-6 text-7xl sm:text-8xl opacity-20 select-none">🍱</div>
          <div className="relative">
            <p className="text-[11px] sm:text-xs font-semibold tracking-[0.25em] text-amber-700 uppercase">{monthLabel} 급식상</p>
            <h1 className="mt-1.5 text-2xl sm:text-3xl font-bold text-amber-900 leading-tight">
              학교별 오늘 급식을 올리고<br className="sm:hidden" /> <span className="text-orange-700">따뜻한 응원</span>을 보내주세요
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-amber-800/80 leading-relaxed">
              가장 많은 응원을 받은 학교의 영양선생님께 <span className="font-semibold text-amber-900">상장</span>을 보내드려요.
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5 sm:gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-3 py-1 text-[11px] sm:text-xs font-semibold text-amber-800 shadow-sm backdrop-blur">🏆 진행 중</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-3 py-1 text-[11px] sm:text-xs font-semibold text-orange-800 shadow-sm backdrop-blur">⏳ {daysLeft}일 남음</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-3 py-1 text-[11px] sm:text-xs font-semibold text-rose-800 shadow-sm backdrop-blur">👏 누적 {monthlyTotalCheers}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-3 py-1 text-[11px] sm:text-xs font-semibold text-pink-800 shadow-sm backdrop-blur">🏫 참여 {participatingSchools}</span>
            </div>
          </div>
        </section>

        {/* ② 이번 달 급식상 (월간 — 시상) */}
        <section className="rounded-3xl bg-white border border-amber-100 shadow-sm overflow-hidden">
          <div className="px-5 pt-5 sm:px-7 sm:pt-7">
            <p className="text-[11px] sm:text-xs font-semibold tracking-[0.25em] text-amber-700 uppercase">🏆 이번 달 급식상</p>
            <p className="mt-0.5 text-[10px] sm:text-[11px] text-amber-700/60">월간 누적 응원 · 상장 시상 기준</p>
          </div>
          {monthlyTop ? (
            <>
              {monthlyTop.topImageUrl ? (
                <div className="relative mx-5 mt-3 sm:mx-7 aspect-[16/9] overflow-hidden rounded-2xl bg-amber-50">
                  <img src={monthlyTop.topImageUrl} alt={`${monthlyTop.schoolCode} 대표 급식`} className="absolute inset-0 h-full w-full object-cover" />
                  <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-amber-500/95 px-3 py-1 text-[11px] sm:text-xs font-bold text-white shadow-md">
                    🥇 1위
                  </div>
                </div>
              ) : (
                <div className="mx-5 mt-3 sm:mx-7 flex aspect-[16/9] items-center justify-center rounded-2xl bg-amber-50 text-5xl">🍱</div>
              )}
              <div className="px-5 pt-5 sm:px-7 sm:pt-6">
                <h2 className="text-xl sm:text-2xl font-bold text-amber-900">{monthlyTop.schoolCode}</h2>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-amber-800/80">
                  <span className="font-semibold text-amber-700">👏 응원 {monthlyTop.totalLikes}</span>
                  <span className="text-amber-300">·</span>
                  <span>게시 {monthlyTop.postCount}개</span>
                  {monthlyTop.lastMealDate && (
                    <>
                      <span className="text-amber-300">·</span>
                      <span>최근 {formatShortDate(monthlyTop.lastMealDate)}</span>
                    </>
                  )}
                </div>
                <p className="mt-3 text-xs sm:text-sm font-medium text-orange-700">"이번 달 상장 유력 후보예요"</p>
                {ourMonthly && ourMonthlyIndex > 0 && (
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] sm:text-xs font-medium text-amber-700">
                    🏫 우리 학교 {ourMonthlyIndex + 1}위 · 👏 {ourMonthly.totalLikes}
                  </div>
                )}
              </div>
              {/* 월간 Top 3 시상대 */}
              <div className="px-5 py-5 sm:px-7 sm:py-6">
                <p className="mb-2 text-[10px] sm:text-[11px] font-semibold tracking-wider text-amber-700/70 uppercase">월간 Top 3</p>
                <div className="grid grid-cols-3 gap-2">
                  {[0, 1, 2].map((i) => {
                    const item = monthlyBoard[i];
                    if (!item) return (
                      <div key={i} className="rounded-2xl bg-amber-50/40 px-2 py-3 text-center text-[10px] text-amber-400/70">-</div>
                    );
                    const bg = i === 0 ? 'bg-gradient-to-b from-amber-100 to-amber-50' : i === 1 ? 'bg-gradient-to-b from-gray-100 to-gray-50' : 'bg-gradient-to-b from-orange-100 to-orange-50';
                    return (
                      <div key={i} className={`rounded-2xl ${bg} px-2 py-3 text-center`}>
                        <div className="text-2xl sm:text-3xl">{MEDAL[i]}</div>
                        <p className="mt-1 truncate text-[11px] sm:text-xs font-semibold text-amber-900">{item.schoolCode}</p>
                        <p className="text-[10px] sm:text-[11px] font-medium text-amber-700">👏 {item.totalLikes}</p>
                      </div>
                    );
                  })}
                </div>
                {monthlyBoard.length > 3 && (
                  <>
                    <button type="button" onClick={() => setShowMonthlyMore(!showMonthlyMore)}
                      className="mt-3 inline-flex items-center gap-1 text-[11px] sm:text-xs font-medium text-amber-700 hover:text-amber-900">
                      {showMonthlyMore ? '접기 ▴' : `+ 4~${Math.min(monthlyBoard.length, 10)}위 더보기 ▾`}
                    </button>
                    {showMonthlyMore && (
                      <div className="mt-2 space-y-1.5">
                        {monthlyBoard.slice(3, 10).map((item, idx) => {
                          const rank = idx + 4;
                          const isOurs = item.schoolCode === schoolCode;
                          return (
                            <div key={`m-${item.schoolCode}-${rank}`}
                              className={`flex items-center gap-2 rounded-xl px-3 py-2 ${isOurs ? 'bg-amber-100/70 ring-1 ring-amber-300/60' : 'bg-amber-50/40'}`}>
                              <span className="w-5 text-center text-[11px] font-bold text-amber-700/70">{rank}</span>
                              <span className="min-w-0 flex-1 truncate text-xs sm:text-sm font-medium text-amber-900">
                                {item.schoolCode}
                                {isOurs && <span className="ml-1.5 text-[10px] font-medium text-amber-600">우리 학교</span>}
                              </span>
                              <span className="text-xs font-bold text-amber-700">👏 {item.totalLikes}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="px-5 py-10 sm:px-7 sm:py-12 text-center">
              <div className="text-4xl sm:text-5xl mb-2">🌷</div>
              <p className="text-sm sm:text-base font-semibold text-amber-900">첫 급식상 후보를 기다리고 있어요</p>
              <p className="mt-1 text-xs sm:text-sm text-amber-700/70">오늘 첫 게시물이 곧 이번 달의 1위 후보가 됩니다</p>
            </div>
          )}
        </section>

        {/* ③ 이번 주 인기 급식 (주간 — 화제) */}
        <section className="rounded-3xl bg-gradient-to-br from-rose-50/60 via-pink-50/40 to-orange-50/60 border border-pink-100 shadow-sm overflow-hidden">
          <div className="px-5 pt-5 sm:px-7 sm:pt-7">
            <p className="text-[11px] sm:text-xs font-semibold tracking-[0.25em] text-rose-600 uppercase">🌶️ 이번 주 인기 급식</p>
            <p className="mt-0.5 text-[10px] sm:text-[11px] text-rose-500/70">{formatDateLabel(weekStart)} ~ {formatDateLabel(weekEnd)} · 주간 화제</p>
          </div>
          {weeklyTop ? (
            <>
              <div className="px-5 pt-3 sm:px-7">
                <div className="flex items-stretch gap-3">
                  <div className="relative h-24 w-24 sm:h-28 sm:w-28 shrink-0 overflow-hidden rounded-2xl bg-rose-50">
                    {weeklyTop.topImageUrl ? (
                      <img src={weeklyTop.topImageUrl} alt={`${weeklyTop.schoolCode} 주간 인기`} className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-3xl text-rose-300">🍜</div>
                    )}
                    <span className="absolute left-1.5 top-1.5 rounded-full bg-rose-500/95 px-2 py-0.5 text-[10px] font-bold text-white shadow">🔥 HOT</span>
                  </div>
                  <div className="min-w-0 flex-1 flex flex-col justify-center">
                    <p className="text-base sm:text-lg font-bold text-rose-900 truncate">{weeklyTop.schoolCode}</p>
                    <p className="mt-0.5 text-[11px] sm:text-xs text-rose-700/80">👏 {weeklyTop.totalLikes} · 게시 {weeklyTop.postCount}개</p>
                    <p className="mt-1 text-[11px] sm:text-xs font-medium text-orange-700">"이번 주 가장 응원받은 한 그릇"</p>
                  </div>
                </div>
              </div>
              {/* 주간 Top 3 */}
              <div className="px-5 py-5 sm:px-7 sm:py-6">
                <p className="mb-2 text-[10px] sm:text-[11px] font-semibold tracking-wider text-rose-600/70 uppercase">주간 Top 3</p>
                <div className="grid grid-cols-3 gap-2">
                  {[0, 1, 2].map((i) => {
                    const item = weeklyBoard[i];
                    if (!item) return (
                      <div key={i} className="rounded-2xl bg-white/40 px-2 py-3 text-center text-[10px] text-rose-300">-</div>
                    );
                    return (
                      <div key={i} className="rounded-2xl bg-white/70 px-2 py-3 text-center">
                        <div className="text-xl sm:text-2xl">{MEDAL[i]}</div>
                        <p className="mt-1 truncate text-[11px] sm:text-xs font-semibold text-rose-900">{item.schoolCode}</p>
                        <p className="text-[10px] sm:text-[11px] font-medium text-rose-700">👏 {item.totalLikes}</p>
                      </div>
                    );
                  })}
                </div>
                {weeklyBoard.length > 3 && (
                  <>
                    <button type="button" onClick={() => setShowWeeklyMore(!showWeeklyMore)}
                      className="mt-3 inline-flex items-center gap-1 text-[11px] sm:text-xs font-medium text-rose-600 hover:text-rose-800">
                      {showWeeklyMore ? '접기 ▴' : `+ 4~${Math.min(weeklyBoard.length, 10)}위 더보기 ▾`}
                    </button>
                    {showWeeklyMore && (
                      <div className="mt-2 space-y-1.5">
                        {weeklyBoard.slice(3, 10).map((item, idx) => {
                          const rank = idx + 4;
                          const isOurs = item.schoolCode === schoolCode;
                          return (
                            <div key={`w-${item.schoolCode}-${rank}`}
                              className={`flex items-center gap-2 rounded-xl px-3 py-2 ${isOurs ? 'bg-rose-100/70 ring-1 ring-rose-300/60' : 'bg-white/50'}`}>
                              <span className="w-5 text-center text-[11px] font-bold text-rose-600/70">{rank}</span>
                              <span className="min-w-0 flex-1 truncate text-xs sm:text-sm font-medium text-rose-900">
                                {item.schoolCode}
                                {isOurs && <span className="ml-1.5 text-[10px] font-medium text-rose-500">우리 학교</span>}
                              </span>
                              <span className="text-xs font-bold text-rose-700">👏 {item.totalLikes}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="px-5 py-10 sm:px-7 sm:py-12 text-center">
              <div className="text-4xl sm:text-5xl mb-2">🌼</div>
              <p className="text-sm sm:text-base font-semibold text-rose-900">이번 주 첫 화제 급식을 기다리고 있어요</p>
              <p className="mt-1 text-xs sm:text-sm text-rose-600/70">아래에서 우리 학교 급식을 올려보세요</p>
            </div>
          )}
        </section>

        {/* ④ 급식 피드 */}
        <section>
          <div className="mb-3 flex items-end justify-between gap-2 px-1">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-amber-900">이번 주 급식 피드</h3>
              <p className="text-[10px] sm:text-[11px] text-amber-700/60">{formatDateLabel(weekStart)} ~ {formatDateLabel(weekEnd)}</p>
            </div>
            <div className="inline-flex rounded-full bg-amber-100/70 p-0.5 text-[10px] sm:text-[11px] font-medium">
              <button type="button" onClick={() => setFeedSort('latest')}
                className={`rounded-full px-2.5 sm:px-3 py-1 transition ${feedSort === 'latest' ? 'bg-white text-amber-900 shadow-sm' : 'text-amber-700'}`}>최신순</button>
              <button type="button" onClick={() => setFeedSort('popular')}
                className={`rounded-full px-2.5 sm:px-3 py-1 transition ${feedSort === 'popular' ? 'bg-white text-amber-900 shadow-sm' : 'text-amber-700'}`}>인기순</button>
            </div>
          </div>
          {sortedFeed.length === 0 ? (
            <div className="rounded-3xl bg-white/60 border border-dashed border-amber-200 px-4 py-12 text-center">
              <div className="text-4xl mb-2">🍽️</div>
              <p className="text-sm sm:text-base font-medium text-amber-900">이번 주 첫 급식 게시물을 기다리고 있어요</p>
              <p className="mt-1 text-xs sm:text-sm text-amber-700/60">아래에서 우리 학교 급식을 올려보세요</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {sortedFeed.map((meal) => (
                <article key={meal.id} className="overflow-hidden rounded-3xl bg-white border border-amber-100 shadow-sm transition hover:shadow-md">
                  <div className="relative aspect-[4/3] bg-amber-50">
                    {meal.imageUrl ? (
                      <img src={meal.imageUrl} alt={`${meal.schoolCode} 급식`} className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-4xl text-amber-300">🍱</div>
                    )}
                    <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-amber-800 shadow-sm backdrop-blur">
                      {meal.schoolCode}
                    </div>
                  </div>
                  <div className="p-4 space-y-2.5">
                    <p className="text-[10px] sm:text-[11px] font-medium text-amber-600">{formatDateLabel(meal.mealDate)}</p>
                    <p className="text-sm leading-relaxed text-gray-700 line-clamp-2 min-h-[2.75rem]">{meal.caption || '오늘의 급식이 등록되었어요'}</p>
                    <div className="flex items-center justify-between pt-1 border-t border-amber-50">
                      <span className="text-sm font-semibold text-amber-700">👏 {meal.likes}</span>
                      <button type="button" onClick={() => handleCheer(meal.id)} disabled={likingMealId === meal.id || !userId}
                        className="inline-flex min-h-[36px] items-center gap-1 rounded-full bg-amber-500 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50">
                        {likingMealId === meal.id ? '...' : '👏 응원해요'}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* ⑤ 참여 카드 */}
        <section className="rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/60 p-5 sm:p-7 shadow-sm">
          <div className="flex items-start gap-3 mb-4">
            <div className="text-3xl">🍱</div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-bold text-amber-900">우리 학교도 오늘의 급식을 올려보세요</h3>
              <p className="mt-0.5 text-xs sm:text-sm text-amber-800/70">사진 한 장과 한마디면 충분해요 · 학교당 하루 1번</p>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-amber-800">학교 코드</label>
                <input value={schoolCode} readOnly className="block w-full rounded-xl border border-amber-200/60 bg-white/70 px-3 py-2 text-xs sm:text-sm text-amber-900" />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-amber-800">급식 날짜</label>
                <input type="date" value={mealDate} onChange={(e) => setMealDate(e.target.value)}
                  className="block w-full rounded-xl border border-amber-200/60 bg-white px-3 py-2 text-xs sm:text-sm text-amber-900 focus:border-amber-400 focus:ring-1 focus:ring-amber-300" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-amber-800">오늘의 한마디</label>
              <textarea rows={2} value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={120}
                placeholder="예) 오늘 반찬 반응이 정말 좋았어요"
                className="block w-full resize-none rounded-xl border border-amber-200/60 bg-white px-3 py-2 text-xs sm:text-sm text-amber-900 placeholder:text-amber-400/60 focus:border-amber-400 focus:ring-1 focus:ring-amber-300" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-amber-800">급식 사진</label>
              <input type="file" accept="image/*" onChange={handleFileChange}
                className="block w-full text-xs sm:text-sm text-amber-800 file:mr-3 file:rounded-lg file:border file:border-amber-300 file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-amber-700 hover:file:bg-amber-50" />
            </div>
            {previewUrl && (
              <div className="overflow-hidden rounded-2xl border border-amber-200">
                <img src={previewUrl} alt="미리보기" className="h-40 sm:h-48 w-full object-cover" />
              </div>
            )}
            <button type="submit" disabled={isSubmitting || !schoolCode}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-1 rounded-2xl bg-amber-500 px-5 py-3 text-sm font-bold text-white shadow-md transition hover:bg-amber-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60">
              {isSubmitting ? '게시 중...' : '🍱 오늘의 급식 게시하기'}
            </button>
          </form>
        </section>

        {/* ⑥ 상장 안내 / 규칙 */}
        <section className="rounded-3xl bg-white border border-amber-100 p-5 sm:p-7 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl sm:text-2xl">📜</span>
            <h3 className="text-base sm:text-lg font-bold text-amber-900">이번 달 급식상 안내</h3>
          </div>
          <ul className="space-y-2 text-xs sm:text-sm text-amber-800/90 leading-relaxed">
            <li className="flex items-start gap-2"><span className="mt-0.5 text-amber-500">🍙</span><span>학교당 하루 1번 올릴 수 있어요</span></li>
            <li className="flex items-start gap-2"><span className="mt-0.5 text-amber-500">👏</span><span>게시물마다 1번 응원할 수 있어요</span></li>
            <li className="flex items-start gap-2"><span className="mt-0.5 text-amber-500">🏆</span><span>이번 달 가장 많은 응원을 받은 학교의 영양선생님께 상장을 보내드려요</span></li>
          </ul>
        </section>
      </div>
    </div>
  );
}

export default TodayMeal;
