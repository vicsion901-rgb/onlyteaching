import React, { useState, useEffect } from 'react';
import client from '../api/client';

function SeatArrangement() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cols, setCols] = useState(5);
  const [seats, setSeats] = useState([]);
  const [shuffled, setShuffled] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    client.get('/api/students').then((res) => {
      const list = res.data || [];
      setStudents(list);
      if (list.length > 0) {
        const defaultCols = Math.ceil(Math.sqrt(list.length));
        setCols(Math.min(defaultCols, 8));
      }
    }).catch(() => {
      setStudents([]);
    }).finally(() => setLoading(false));
  }, []);

  const rows = students.length > 0 ? Math.ceil(students.length / cols) : 0;

  const handleShuffle = () => {
    if (animating || students.length === 0) return;
    setAnimating(true);
    setShuffled(false);

    setTimeout(() => {
      const shuffled = [...students].sort(() => Math.random() - 0.5);
      // Fill seats array row by row
      const grid = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const idx = r * cols + c;
          grid.push(shuffled[idx] || null);
        }
      }
      setSeats(grid);
      setShuffled(true);
      setAnimating(false);
    }, 600);
  };

  const handleReset = () => {
    setSeats([]);
    setShuffled(false);
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
        <span className="text-5xl">🪑</span>
        <p>등록된 학생이 없습니다.</p>
        <p className="text-sm text-gray-400">학생명부 메뉴에서 학생을 먼저 등록해주세요.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
        🪑 자리 정하기
      </h1>
      <p className="text-gray-500 text-sm mb-6">전체 {students.length}명 · {rows}행 × {cols}열</p>

      {/* 설정 & 버튼 */}
      <div className="flex flex-wrap items-center gap-4 mb-6 bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">열 수</label>
          <input
            type="number"
            min={1}
            max={10}
            value={cols}
            onChange={(e) => {
              setCols(Math.max(1, Math.min(10, Number(e.target.value))));
              setSeats([]);
              setShuffled(false);
            }}
            className="w-16 border border-gray-300 rounded-lg px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div className="text-sm text-gray-400">→ {rows}행 × {cols}열 = {rows * cols}자리</div>
        <div className="ml-auto flex gap-2">
          <button
            onClick={handleShuffle}
            disabled={animating}
            className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-40 transition-all shadow-md text-sm"
          >
            {animating ? '배치 중...' : shuffled ? '다시 섞기' : '자리 배치!'}
          </button>
          {shuffled && (
            <button
              onClick={handleReset}
              className="px-4 py-2 border border-gray-300 text-gray-600 rounded-xl hover:bg-gray-50 transition-all text-sm"
            >
              초기화
            </button>
          )}
        </div>
      </div>

      {/* 칠판 */}
      <div className="bg-gray-700 text-white text-center py-2 rounded-t-xl text-sm font-medium tracking-widest mb-1">
        ◀ 칠판 (앞) ▶
      </div>

      {/* 자리 배치도 */}
      {shuffled ? (
        <div
          className="bg-gray-50 border border-gray-200 rounded-b-xl p-4"
          style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: '8px' }}
        >
          {seats.map((student, idx) => (
            <div
              key={idx}
              className={`rounded-lg border-2 p-2 flex flex-col items-center justify-center min-h-[60px] transition-all ${
                student
                  ? 'border-blue-200 bg-white shadow-sm hover:shadow-md'
                  : 'border-dashed border-gray-200 bg-gray-50'
              }`}
            >
              {student ? (
                <>
                  <span className="text-xs text-gray-400">{student.number}번</span>
                  <span className="text-sm font-semibold text-gray-800 mt-0.5">{student.name}</span>
                </>
              ) : (
                <span className="text-gray-300 text-xs">빈자리</span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-b-xl p-8 flex flex-col items-center justify-center min-h-[200px] text-gray-400">
          <span className="text-4xl mb-3">🪑</span>
          <p className="text-sm">위의 "자리 배치!" 버튼을 누르면 학생들이 무작위로 배치됩니다.</p>
        </div>
      )}

      {/* 맨 뒷줄 표시 */}
      {shuffled && (
        <div className="bg-gray-100 text-gray-500 text-center py-1.5 rounded-b-none rounded-t-none mt-1 text-xs">
          ▲ 뒷줄
        </div>
      )}

      {/* 학생 목록 */}
      <div className="mt-6 bg-white border border-gray-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-500 mb-3">전체 학생 ({students.length}명)</h3>
        <div className="flex flex-wrap gap-2">
          {students.map((s) => (
            <span key={s.number} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
              {s.number}번 {s.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SeatArrangement;
