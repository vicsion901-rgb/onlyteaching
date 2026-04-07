import React, { useState, useEffect, useRef } from 'react';
import client from '../api/client';

function PresenterPicker() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState(null);
  const [displayName, setDisplayName] = useState('?');
  const [excludeWinners, setExcludeWinners] = useState(true);
  const [pastWinners, setPastWinners] = useState([]);
  const intervalRef = useRef(null);

  useEffect(() => {
    client.get('/student-records/list').then((res) => {
      setStudents(res.data || []);
    }).catch(() => {
      setStudents([]);
    }).finally(() => setLoading(false));
  }, []);

  const available = excludeWinners
    ? students.filter((s) => !pastWinners.includes(s.number))
    : students;

  const handlePick = () => {
    if (available.length === 0 || spinning) return;
    setWinner(null);
    setSpinning(true);

    let speed = 60;
    let elapsed = 0;
    const totalDuration = 2800;

    const tick = () => {
      const rand = available[Math.floor(Math.random() * available.length)];
      setDisplayName(rand.name);
      elapsed += speed;

      if (elapsed < totalDuration * 0.6) {
        speed = 60;
      } else {
        speed = Math.min(speed + 30, 400);
      }

      if (elapsed >= totalDuration) {
        clearInterval(intervalRef.current);
        setSpinning(false);
        setWinner(rand);
        setDisplayName(rand.name);
        setPastWinners((prev) => [...prev, rand.number]);
      } else {
        intervalRef.current = setTimeout(tick, speed);
      }
    };

    intervalRef.current = setTimeout(tick, speed);
  };

  const handleReset = () => {
    setPastWinners([]);
    setWinner(null);
    setDisplayName('?');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        학생 명단 불러오는 중...
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-500">
        <span className="text-5xl">👥</span>
        <p>등록된 학생이 없습니다.</p>
        <p className="text-sm text-gray-400">학생명부 메뉴에서 학생을 먼저 등록해주세요.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
        🎤 발표자 정하기
      </h1>
      <p className="text-gray-500 text-sm mb-8">전체 {students.length}명 · 남은 학생 {available.length}명</p>

      {/* 룰렛 디스플레이 */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-2xl p-10 flex flex-col items-center mb-8 shadow-inner">
        <div
          className={`text-6xl font-bold text-blue-700 transition-all duration-100 min-h-[80px] flex items-center justify-center ${
            spinning ? 'scale-110 opacity-80' : winner ? 'scale-125' : ''
          }`}
        >
          {winner && !spinning ? (
            <span className="animate-bounce">{displayName}</span>
          ) : (
            <span>{displayName}</span>
          )}
        </div>
        {winner && !spinning && (
          <div className="mt-4 text-blue-500 text-lg font-medium animate-fade-in">
            🎉 {winner.number}번 발표자입니다!
          </div>
        )}
      </div>

      {/* 버튼 영역 */}
      <div className="flex gap-3 justify-center mb-6">
        <button
          onClick={handlePick}
          disabled={spinning || available.length === 0}
          className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg text-lg"
        >
          {spinning ? '뽑는 중...' : available.length === 0 ? '모두 뽑힘' : '뽑기!'}
        </button>
        <button
          onClick={handleReset}
          className="px-5 py-3 border border-gray-300 text-gray-600 rounded-xl hover:bg-gray-50 transition-all"
        >
          초기화
        </button>
      </div>

      {/* 옵션 */}
      <div className="flex items-center justify-center gap-2 mb-8">
        <input
          id="excludeWinners"
          type="checkbox"
          checked={excludeWinners}
          onChange={(e) => setExcludeWinners(e.target.checked)}
          className="w-4 h-4 accent-blue-600"
        />
        <label htmlFor="excludeWinners" className="text-sm text-gray-600 cursor-pointer">
          이미 뽑힌 학생 제외
        </label>
      </div>

      {/* 뽑힌 학생 목록 */}
      {pastWinners.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-500 mb-3">이미 발표한 학생</h3>
          <div className="flex flex-wrap gap-2">
            {pastWinners.map((num) => {
              const s = students.find((x) => x.number === num);
              return (
                <span key={num} className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-sm line-through">
                  {s ? `${s.number}번 ${s.name}` : `${num}번`}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* 전체 학생 목록 */}
      <div className="mt-6 bg-white border border-gray-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-500 mb-3">전체 학생 ({students.length}명)</h3>
        <div className="flex flex-wrap gap-2">
          {students.map((s) => (
            <span
              key={s.number}
              className={`px-3 py-1 rounded-full text-sm ${
                pastWinners.includes(s.number)
                  ? 'bg-gray-100 text-gray-400 line-through'
                  : winner?.number === s.number
                  ? 'bg-blue-100 text-blue-700 font-bold'
                  : 'bg-blue-50 text-blue-700'
              }`}
            >
              {s.number}번 {s.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default PresenterPicker;
