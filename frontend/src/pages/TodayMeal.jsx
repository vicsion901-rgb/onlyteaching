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

function formatDateLabel(value) {
  if (!value) return '-';
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return value;

  return target.toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
}

function TodayMeal() {
  const navigate = useNavigate();
  const schoolCode = localStorage.getItem('schoolCode') || '';
  const userId = localStorage.getItem('userId') || '';
  const [mealDate, setMealDate] = useState(new Date().toISOString().slice(0, 10));
  const [caption, setCaption] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [meals, setMeals] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [likingMealId, setLikingMealId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const { weekStart, weekEnd } = useMemo(() => getWeekRange(), []);

  const fetchMeals = async () => {
    if (!schoolCode) {
      setMeals([]);
      return;
    }

    try {
      const res = await client.get('/api/meals', {
        params: { schoolCode, startDate: weekStart, endDate: weekEnd },
      });
      setMeals(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Failed to fetch meals', error);
      setErrorMsg('급식 목록을 불러오지 못했습니다.');
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const res = await client.get('/api/meals?action=leaderboard', {
        params: { weekStart, weekEnd },
      });
      setLeaderboard(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Failed to fetch leaderboard', error);
    }
  };

  useEffect(() => {
    fetchMeals();
    fetchLeaderboard();
  }, [schoolCode, weekStart, weekEnd]);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
    setPreviewUrl(file ? URL.createObjectURL(file) : '');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!schoolCode) {
      setErrorMsg('학교 코드가 없습니다. 다시 로그인해주세요.');
      return;
    }

    if (!selectedFile) {
      setErrorMsg('급식 사진을 선택해주세요.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const uploadRes = await client.post('/api/meals?action=upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      await client.post('/api/meals', {
        schoolCode,
        mealDate,
        caption,
        imageUrl: uploadRes.data?.imageUrl,
        createdByUserId: userId,
      });

      setCaption('');
      setSelectedFile(null);
      setPreviewUrl('');
      await Promise.all([fetchMeals(), fetchLeaderboard()]);
    } catch (error) {
      console.error('Failed to save meal post', error);
      setErrorMsg(error.response?.data?.message || '오늘의 급식 업로드 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLike = async (mealId) => {
    if (!schoolCode || !userId) {
      setErrorMsg('좋아요를 누르려면 로그인 정보가 필요합니다.');
      return;
    }

    setLikingMealId(mealId);
    setErrorMsg('');

    try {
      await client.post(`/api/meals?action=like&mealId=${mealId}`, { schoolCode, userId });
      await Promise.all([fetchMeals(), fetchLeaderboard()]);
    } catch (error) {
      console.error('Failed to like meal post', error);
      setErrorMsg(error.response?.data?.message || '좋아요 처리 중 오류가 발생했습니다.');
    } finally {
      setLikingMealId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🍱 오늘의 급식</h1>
          <p className="mt-1 text-sm text-gray-500">학교별 오늘 급식 사진을 올리고, 따봉으로 이번 주 급식상장을 응원해보세요.</p>
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="shrink-0 font-medium text-primary-600 hover:text-primary-900"
        >
          &larr; 홈으로
        </button>
      </div>

      {errorMsg ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMsg}</div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900">오늘의 급식 업로드</h2>
              <p className="mt-1 text-sm text-gray-500">학교당 하루 한 번 등록할 수 있고, 같은 날짜는 최신 게시물로 갱신됩니다.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">학교 코드</label>
                  <input
                    value={schoolCode}
                    readOnly
                    className="block w-full rounded-md border-gray-200 bg-gray-50 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">급식 날짜</label>
                  <input
                    type="date"
                    value={mealDate}
                    onChange={(e) => setMealDate(e.target.value)}
                    className="block w-full rounded-md border-gray-300 text-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">오늘의 한마디</label>
                <textarea
                  rows={3}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="예: 오늘은 반찬 반응이 정말 좋았어요."
                  className="block w-full rounded-md border-gray-300 p-3 text-sm focus:border-primary-500 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">급식 사진</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="block w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-blue-700 shadow-inner shadow-gray-100 file:mr-4 file:rounded-lg file:border file:border-blue-200 file:bg-blue-50 file:px-4 file:py-2 file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              {previewUrl ? (
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
                  <img src={previewUrl} alt="급식 미리보기" className="h-72 w-full object-cover" />
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting || !schoolCode}
                className="inline-flex items-center rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? '업로드 중...' : '오늘의 급식 게시'}
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900">이번 주 급식 피드</h2>
              <p className="mt-1 text-sm text-gray-500">{formatDateLabel(weekStart)} ~ {formatDateLabel(weekEnd)}</p>
            </div>

            <div className="space-y-4">
              {meals.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
                  이번 주 등록된 급식 사진이 없습니다.
                </div>
              ) : (
                meals.map((meal) => (
                  <article key={meal.id} className="overflow-hidden rounded-2xl border border-gray-200">
                    <img src={meal.imageUrl} alt={`${meal.schoolCode} 급식`} className="h-72 w-full object-cover" />
                    <div className="space-y-3 p-5">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <span className="rounded-full bg-primary-50 px-3 py-1 font-medium text-primary-700">{meal.schoolCode}</span>
                        <span>{formatDateLabel(meal.mealDate)}</span>
                      </div>
                      <p className="text-sm leading-6 text-gray-700">{meal.caption || '오늘의 급식이 등록되었습니다.'}</p>
                      <div className="flex items-center justify-between gap-4">
                        <div className="text-sm font-medium text-gray-600">따봉 {meal.likes}</div>
                        <button
                          type="button"
                          onClick={() => handleLike(meal.id)}
                          disabled={likingMealId === meal.id || !userId}
                          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {likingMealId === meal.id ? '처리 중...' : '👍 따봉 보내기'}
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900">이번 주 급식상장 순위</h2>
            <p className="mt-1 text-sm text-gray-500">주간 누적 따봉 수 기준입니다.</p>

            <div className="mt-4 space-y-3">
              {leaderboard.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                  아직 순위 데이터가 없습니다.
                </div>
              ) : (
                leaderboard.map((item, index) => (
                  <div key={`${item.schoolCode}-${index}`} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{index + 1}위 · {item.schoolCode}</div>
                      <div className="text-xs text-gray-500">게시물 {item.postCount}개</div>
                    </div>
                    <div className="text-sm font-bold text-amber-600">👍 {item.totalLikes}</div>
                  </div>
                ))
              )}
            </div>
          </section>

        </aside>
      </div>
    </div>
  );
}

export default TodayMeal;
