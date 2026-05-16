import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';

function getWeekRange(date = new Date()) {
  const current = new Date(date);
  const day = current.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(current);
  monday.setDate(current.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    weekStart: monday.toISOString().slice(0, 10),
    weekEnd: sunday.toISOString().slice(0, 10),
  };
}

function getMonthRange(date = new Date()) {
  const y = date.getFullYear();
  const m = date.getMonth();
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
  return `${t.getFullYear()}.${String(t.getMonth() + 1).padStart(2, '0')}.${String(t.getDate()).padStart(2, '0')}`;
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
  const [rankTab, setRankTab] = useState('weekly');
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
    setIsSubmitting(true);
    setErrorMsg('');
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
      setCaption('');
      setSelectedFile(null);
      setPreviewUrl('');
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
    setLikingMealId(mealId);
    setErrorMsg('');
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
  const monthlyTotalCheers = monthlyBoard.reduce((s, x) => s + (x.totalLikes || 0), 0);

  const currentBoard = rankTab === 'weekly' ? weeklyBoard : rankTab === 'monthly' ? monthlyBoard : monthlyBoard.filter((x) => x.schoolCode === schoolCode);
  const sortedFeed = useMemo(() => {
    const arr = [...meals];
    if (feedSort === 'popular') arr.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    else arr.sort((a, b) => new Date(b.mealDate) - new Date(a.mealDate));
    return arr;
  }, [meals, feedSort]);

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">🍱 오늘의 급식</h1>
          <p className="mt-1 text-xs sm:text-sm text-gray-500">학교별 급식을 올리고 응원해보세요.</p>
        </div>
        <button onClick={() => navigate('/dashboard')} className="shrink-0 text-sm font-medium text-primary-600 hover:text-primary-900">← 홈으로</button>
      </div>

      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs sm:text-sm text-red-700">{errorMsg}</div>
      )}

      {/* 히어로 배너 */}
      <section className="rounded-2xl bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 border border-amber-100 p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs font-semibold tracking-wider text-amber-700 uppercase">{monthLabel} 급식상</p>
            <h2 className="mt-1 text-xl sm:text-2xl font-bold text-gray-900">학교별 오늘 급식을 올리고 응원해보세요</h2>
            <p className="mt-1.5 text-xs sm:text-sm text-gray-600 leading-relaxed">이번 달 가장 많은 응원을 받은 학교의 영양선생님께 상장을 보내드려요.</p>
          </div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2 sm:shrink-0">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-[11px] sm:text-xs font-semibold text-amber-700 shadow-sm">🏆 진행 중</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-[11px] sm:text-xs font-semibold text-orange-700 shadow-sm">⏳ {daysLeft}일 남음</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-[11px] sm:text-xs font-semibold text-rose-700 shadow-sm">👏 누적 {monthlyTotalCheers}</span>
          </div>
        </div>
      </section>

      {/* 1위 학교 + 시상 안내 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <section className="rounded-2xl bg-white border border-gray-200 p-4 sm:p-5 shadow-sm">
          <p className="text-[11px] sm:text-xs font-medium tracking-wide text-gray-400 uppercase">이번 달 1위 학교</p>
          {monthlyTop ? (
            <div className="mt-2 flex items-center gap-3">
              <div className="text-3xl sm:text-4xl">🥇</div>
              <div className="min-w-0 flex-1">
                <p className="text-base sm:text-lg font-bold text-gray-900 truncate">{monthlyTop.schoolCode}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] sm:text-xs text-gray-500">
                  <span className="font-semibold text-amber-600">👏 응원 {monthlyTop.totalLikes}</span>
                  <span>·</span>
                  <span>게시 {monthlyTop.postCount}개</span>
                  {monthlyTop.lastMealDate && <><span>·</span><span>최근 {formatShortDate(monthlyTop.lastMealDate)}</span></>}
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-xs sm:text-sm text-gray-400">이번 달 게시물이 쌓이면 1위 학교가 표시돼요.</p>
          )}
        </section>
        <section className="rounded-2xl bg-white border border-gray-200 p-4 sm:p-5 shadow-sm">
          <p className="text-[11px] sm:text-xs font-medium tracking-wide text-gray-400 uppercase">이번 달 급식상 안내</p>
          <p className="mt-2 text-xs sm:text-sm leading-relaxed text-gray-700">가장 많은 응원을 받은 학교의 영양선생님께 <span className="font-semibold text-amber-700">상장</span>을 보내드려요.</p>
          <p className="mt-1 text-[11px] sm:text-xs text-gray-400">월말 자동 집계 · 학교 단위로 선정</p>
        </section>
      </div>

      {/* 업로드 + 랭킹 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {/* 업로드 카드 */}
        <section className="rounded-2xl bg-white border border-gray-200 p-4 sm:p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">오늘의 급식 올리기</h3>
            <span className="text-[10px] sm:text-[11px] text-gray-400">학교당 하루 1게시물</span>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-gray-500">학교 코드</label>
                <input value={schoolCode} readOnly className="block w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2 text-xs sm:text-sm text-gray-700" />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-gray-500">급식 날짜</label>
                <input type="date" value={mealDate} onChange={(e) => setMealDate(e.target.value)}
                  className="block w-full rounded-lg border border-gray-200 px-2.5 py-2 text-xs sm:text-sm focus:border-primary-300 focus:ring-1 focus:ring-primary-200" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-gray-500">오늘의 한마디</label>
              <textarea rows={2} value={caption} onChange={(e) => setCaption(e.target.value)}
                placeholder="예) 오늘 반찬 반응이 정말 좋았어요"
                maxLength={120}
                className="block w-full resize-none rounded-lg border border-gray-200 px-2.5 py-2 text-xs sm:text-sm placeholder:text-gray-300 focus:border-primary-300 focus:ring-1 focus:ring-primary-200" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-gray-500">급식 사진</label>
              <input type="file" accept="image/*" onChange={handleFileChange}
                className="block w-full text-xs sm:text-sm file:mr-3 file:rounded-md file:border file:border-amber-200 file:bg-amber-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-amber-700 hover:file:bg-amber-100" />
            </div>
            {previewUrl && (
              <div className="overflow-hidden rounded-xl border border-gray-200">
                <img src={previewUrl} alt="미리보기" className="h-40 sm:h-48 w-full object-cover" />
              </div>
            )}
            <button type="submit" disabled={isSubmitting || !schoolCode}
              className="inline-flex w-full items-center justify-center rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60">
              {isSubmitting ? '업로드 중...' : '🍱 오늘의 급식 게시'}
            </button>
          </form>
        </section>

        {/* 랭킹 카드 */}
        <section className="rounded-2xl bg-white border border-gray-200 p-4 sm:p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">랭킹</h3>
            <div className="inline-flex rounded-full bg-gray-100 p-0.5 text-[10px] sm:text-[11px] font-medium">
              {[
                { key: 'weekly', label: '이번 주' },
                { key: 'monthly', label: '이번 달' },
                { key: 'ours', label: '우리 학교' },
              ].map((t) => (
                <button key={t.key} type="button" onClick={() => setRankTab(t.key)}
                  className={`rounded-full px-2.5 py-0.5 transition ${rankTab === t.key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            {currentBoard.length === 0 ? (
              <div className="rounded-xl bg-gray-50 px-3 py-6 text-center text-xs sm:text-sm text-gray-400">
                {rankTab === 'ours' ? '우리 학교의 이번 달 기록이 아직 없어요.' : '아직 순위 데이터가 없습니다.'}
              </div>
            ) : (
              currentBoard.slice(0, 8).map((item, idx) => {
                const isOurs = item.schoolCode === schoolCode;
                const isTop3 = rankTab !== 'ours' && idx < 3;
                return (
                  <div key={`${rankTab}-${item.schoolCode}-${idx}`}
                    className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 transition ${
                      isOurs ? 'border-amber-200 bg-amber-50/60' : isTop3 ? 'border-orange-100 bg-orange-50/40' : 'border-gray-100 bg-white'
                    }`}>
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="w-5 text-center text-sm">
                        {isTop3 ? MEDAL[idx] : <span className="text-[11px] font-bold text-gray-400">{idx + 1}</span>}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xs sm:text-sm font-semibold text-gray-800">{item.schoolCode}</p>
                        <p className="text-[10px] sm:text-[11px] text-gray-400">게시 {item.postCount}개</p>
                      </div>
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-amber-600 shrink-0">👏 {item.totalLikes}</div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* 피드 */}
      <section className="rounded-2xl bg-white border border-gray-200 p-4 sm:p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">이번 주 급식 피드</h3>
            <p className="text-[10px] sm:text-[11px] text-gray-400">{formatDateLabel(weekStart)} ~ {formatDateLabel(weekEnd)}</p>
          </div>
          <div className="inline-flex rounded-full bg-gray-100 p-0.5 text-[10px] sm:text-[11px] font-medium">
            <button type="button" onClick={() => setFeedSort('latest')}
              className={`rounded-full px-2.5 py-0.5 transition ${feedSort === 'latest' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}>최신순</button>
            <button type="button" onClick={() => setFeedSort('popular')}
              className={`rounded-full px-2.5 py-0.5 transition ${feedSort === 'popular' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}>인기순</button>
          </div>
        </div>
        {sortedFeed.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center text-xs sm:text-sm text-gray-400">
            이번 주 등록된 급식 사진이 없습니다.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {sortedFeed.map((meal) => (
              <article key={meal.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md">
                <div className="relative aspect-[4/3] bg-gray-100">
                  {meal.imageUrl ? (
                    <img src={meal.imageUrl} alt={`${meal.schoolCode} 급식`} className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-3xl text-gray-300">🍱</div>
                  )}
                  <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-gray-700 shadow-sm">{meal.schoolCode}</span>
                </div>
                <div className="p-3 sm:p-4 space-y-2">
                  <p className="text-[10px] sm:text-[11px] text-gray-400">{formatDateLabel(meal.mealDate)}</p>
                  <p className="text-xs sm:text-sm leading-relaxed text-gray-700 line-clamp-2 min-h-[2.5rem]">{meal.caption || '오늘의 급식이 등록되었습니다.'}</p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs sm:text-sm font-semibold text-amber-600">👏 {meal.likes}</span>
                    <button type="button" onClick={() => handleCheer(meal.id)} disabled={likingMealId === meal.id || !userId}
                      className="inline-flex min-h-[36px] items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs sm:text-sm font-semibold text-amber-700 transition hover:bg-amber-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60">
                      {likingMealId === meal.id ? '...' : '👏 응원'}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* 선정 기준 */}
      <section className="rounded-2xl bg-gray-50 border border-gray-200 p-4 sm:p-5">
        <p className="text-[11px] sm:text-xs font-semibold tracking-wide text-gray-500 uppercase mb-2">선정 기준</p>
        <ul className="space-y-1 text-xs sm:text-sm text-gray-600">
          <li className="flex items-start gap-2"><span className="text-amber-500">·</span>학교당 하루 1게시물</li>
          <li className="flex items-start gap-2"><span className="text-amber-500">·</span>계정당 게시물 1회 응원</li>
          <li className="flex items-start gap-2"><span className="text-amber-500">·</span>월간 누적 응원 수 기준으로 학교 단위 선정</li>
        </ul>
      </section>
    </div>
  );
}

export default TodayMeal;
