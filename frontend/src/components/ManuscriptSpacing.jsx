import React, { useState, useMemo } from 'react';

function ManuscriptSpacing({ text, onComplete }) {
  const originalSpaces = useMemo(() => {
    const spaces = new Set();
    for (let i = 0; i < text.length; i++) {
      if (text[i] === ' ') spaces.add(i);
    }
    return spaces;
  }, [text]);

  const stripped = useMemo(() => text.replace(/ /g, ''), [text]);

  const correctGaps = useMemo(() => {
    const gaps = new Set();
    for (const spaceIdx of originalSpaces) {
      let charsBefore = 0;
      for (let i = 0; i < spaceIdx; i++) {
        if (text[i] !== ' ') charsBefore++;
      }
      gaps.add(charsBefore - 1);
    }
    return gaps;
  }, [text, originalSpaces]);

  const [userGaps, setUserGaps] = useState(new Set());
  const [submitted, setSubmitted] = useState(false);

  const toggleGap = (afterIdx) => {
    if (submitted) return;
    setUserGaps(prev => {
      const next = new Set(prev);
      next.has(afterIdx) ? next.delete(afterIdx) : next.add(afterIdx);
      return next;
    });
  };

  const handleSubmit = () => {
    setSubmitted(true);
    const correct = [...correctGaps].filter(g => userGaps.has(g)).length;
    const total = correctGaps.size;
    const wrong = [...userGaps].filter(g => !correctGaps.has(g)).length;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    onComplete?.({ correct, total, wrong, accuracy });
  };

  const handleReset = () => {
    setUserGaps(new Set());
    setSubmitted(false);
  };

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-xs text-amber-700 mb-3">글자 사이를 눌러 띄어쓰기를 넣으세요 (다시 누르면 제거)</p>
        <div className="flex flex-wrap gap-y-2 leading-relaxed">
          {stripped.split('').map((ch, i) => {
            const hasGap = userGaps.has(i);
            let gapStatus = '';
            if (submitted) {
              const isCorrectGap = correctGaps.has(i);
              if (hasGap && isCorrectGap) gapStatus = 'correct';
              else if (hasGap && !isCorrectGap) gapStatus = 'wrong';
              else if (!hasGap && isCorrectGap) gapStatus = 'missed';
            }

            return (
              <React.Fragment key={i}>
                <span
                  onClick={() => i > 0 && toggleGap(i - 1)}
                  className={`inline-flex items-center justify-center w-8 h-8 text-sm font-medium rounded cursor-pointer select-none transition
                    ${submitted && gapStatus === 'missed' ? 'border-2 border-dashed border-red-400 text-gray-800' : 'text-gray-800 hover:bg-amber-100'}
                    ${ch === '\n' ? 'w-full h-0' : ''}
                  `}
                >
                  {ch}
                </span>
                {hasGap && (
                  <span className={`inline-flex items-center justify-center w-4 h-8 text-xs font-bold rounded mx-0.5
                    ${!submitted ? 'bg-purple-100 text-purple-600' : ''}
                    ${gapStatus === 'correct' ? 'bg-green-100 text-green-600' : ''}
                    ${gapStatus === 'wrong' ? 'bg-red-100 text-red-600 line-through' : ''}
                  `}>
                    ·
                  </span>
                )}
                {submitted && !hasGap && correctGaps.has(i) && (
                  <span className="inline-flex items-center justify-center w-4 h-8 text-xs font-bold rounded mx-0.5 bg-red-50 text-red-400 border border-dashed border-red-300">
                    ·
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {submitted && (
        <div className="bg-white border rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-600 mb-2">정답:</p>
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{text}</p>
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">{userGaps.size}개 띄어쓰기 표시</span>
        <div className="flex-1" />
        {submitted ? (
          <button onClick={handleReset} className="px-4 py-2 text-xs font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100">
            다시 하기
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={userGaps.size === 0}
            className="px-5 py-2 text-xs font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:bg-gray-300">
            확인하기
          </button>
        )}
      </div>
    </div>
  );
}

export default ManuscriptSpacing;
