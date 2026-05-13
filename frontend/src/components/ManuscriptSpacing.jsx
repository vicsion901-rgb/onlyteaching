import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';

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
  const [activeGap, setActiveGap] = useState(null);
  const containerRef = useRef(null);

  const totalGaps = stripped.length - 1;

  const toggleGap = useCallback((gapIdx) => {
    if (submitted) return;
    if (gapIdx < 0 || gapIdx >= totalGaps) return;
    setUserGaps(prev => {
      const next = new Set(prev);
      next.has(gapIdx) ? next.delete(gapIdx) : next.add(gapIdx);
      return next;
    });
    setActiveGap(gapIdx);
  }, [submitted, totalGaps]);

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
    setActiveGap(null);
  };

  const visibleGaps = useMemo(() => {
    const gaps = [];
    for (let i = 0; i < stripped.length - 1; i++) {
      if (stripped[i] !== '\n' && stripped[i + 1] !== '\n') gaps.push(i);
    }
    return gaps;
  }, [stripped]);

  const handleKeyDown = useCallback((e) => {
    if (submitted) return;
    const key = e.key;
    if (key === 'ArrowRight') {
      e.preventDefault();
      setActiveGap(prev => {
        if (prev === null) return visibleGaps[0] ?? null;
        const curIdx = visibleGaps.indexOf(prev);
        return curIdx < visibleGaps.length - 1 ? visibleGaps[curIdx + 1] : prev;
      });
    } else if (key === 'ArrowLeft') {
      e.preventDefault();
      setActiveGap(prev => {
        if (prev === null) return visibleGaps[0] ?? null;
        const curIdx = visibleGaps.indexOf(prev);
        return curIdx > 0 ? visibleGaps[curIdx - 1] : prev;
      });
    } else if (key === 'Home') {
      e.preventDefault();
      setActiveGap(visibleGaps[0] ?? null);
    } else if (key === 'End') {
      e.preventDefault();
      setActiveGap(visibleGaps[visibleGaps.length - 1] ?? null);
    } else if (key === ' ' || key === 'Enter') {
      e.preventDefault();
      if (activeGap !== null) toggleGap(activeGap);
    }
  }, [submitted, activeGap, visibleGaps, toggleGap]);

  const handleGapClick = useCallback((gapIdx) => {
    toggleGap(gapIdx);
    containerRef.current?.focus();
  }, [toggleGap]);

  useEffect(() => {
    if (activeGap !== null) {
      const el = containerRef.current?.querySelector(`[data-gap="${activeGap}"]`);
      if (el) el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }, [activeGap]);

  const getGapStatus = (gapIdx) => {
    if (!submitted) return userGaps.has(gapIdx) ? 'user' : 'empty';
    const isCorrect = correctGaps.has(gapIdx);
    const isUser = userGaps.has(gapIdx);
    if (isUser && isCorrect) return 'correct';
    if (isUser && !isCorrect) return 'wrong';
    if (!isUser && isCorrect) return 'missed';
    return 'empty';
  };

  const renderGap = (gapIdx) => {
    const status = getGapStatus(gapIdx);
    const isActive = activeGap === gapIdx;

    const baseClass = 'inline-flex items-center justify-center h-9 rounded-sm transition-all duration-100 select-none flex-shrink-0';

    let visual;
    let widthClass;
    let ariaLabel;

    if (status === 'user') {
      widthClass = 'w-5';
      visual = <span className="text-sm font-bold text-purple-600">␣</span>;
      ariaLabel = `${gapIdx + 1}번째 위치: 띄어쓰기 삽입됨`;
    } else if (status === 'correct') {
      widthClass = 'w-5';
      visual = <span className="text-sm font-bold text-green-600">␣</span>;
      ariaLabel = `${gapIdx + 1}번째 위치: 정답`;
    } else if (status === 'wrong') {
      widthClass = 'w-5';
      visual = <span className="text-sm font-bold text-red-500 line-through">␣</span>;
      ariaLabel = `${gapIdx + 1}번째 위치: 오답`;
    } else if (status === 'missed') {
      widthClass = 'w-5';
      visual = <span className="text-sm font-bold text-red-400">␣</span>;
      ariaLabel = `${gapIdx + 1}번째 위치: 놓침`;
    } else {
      widthClass = 'w-3';
      visual = <span className="text-[10px] text-gray-300 group-hover:text-purple-400 transition-colors">┆</span>;
      ariaLabel = `${gapIdx + 1}번째 위치`;
    }

    const bgClass =
      status === 'user' ? 'bg-purple-100' :
      status === 'correct' ? 'bg-green-100' :
      status === 'wrong' ? 'bg-red-100' :
      status === 'missed' ? 'bg-red-50 border border-dashed border-red-300' :
      'hover:bg-purple-50';

    const activeRing = isActive ? 'ring-2 ring-purple-500 ring-offset-1' : '';

    return (
      <button
        key={`gap-${gapIdx}`}
        data-gap={gapIdx}
        type="button"
        tabIndex={-1}
        onClick={() => handleGapClick(gapIdx)}
        className={`${baseClass} ${widthClass} ${bgClass} ${activeRing} group cursor-pointer`}
        aria-label={ariaLabel}
        role="option"
        aria-selected={status === 'user' || status === 'correct'}
      >
        {visual}
      </button>
    );
  };

  const renderChar = (ch, charIdx) => {
    return (
      <span
        key={`ch-${charIdx}`}
        className="inline-flex items-center justify-center w-8 h-9 text-sm font-medium text-gray-800 select-none flex-shrink-0"
      >
        {ch}
      </span>
    );
  };

  const elements = [];
  for (let i = 0; i < stripped.length; i++) {
    if (stripped[i] === '\n') {
      elements.push(<div key={`br-${i}`} className="w-full h-0" />);
      continue;
    }
    elements.push(renderChar(stripped[i], i));
    if (i < stripped.length - 1 && stripped[i + 1] !== '\n') {
      elements.push(renderGap(i));
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="mb-3 space-y-1">
          <p className="text-xs text-amber-800 font-semibold">
            글자 사이를 클릭해 띄어쓰기를 넣거나 뺄 수 있습니다.
          </p>
          <p className="text-[11px] text-amber-600">
            ← → 방향키로 위치 이동, Space/Enter로 띄어쓰기 토글, Home/End로 처음/끝 이동
          </p>
        </div>
        <div
          ref={containerRef}
          tabIndex={0}
          role="listbox"
          aria-label="띄어쓰기 위치 선택"
          onKeyDown={handleKeyDown}
          className="flex flex-wrap gap-y-1 leading-relaxed outline-none focus:ring-2 focus:ring-purple-300 focus:ring-offset-2 rounded-lg p-1"
        >
          {elements}
        </div>
      </div>

      <div className="flex items-center gap-3 text-[11px] text-gray-400">
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 bg-purple-100 rounded-sm" /> 내가 넣은 띄어쓰기</span>
        {submitted && <>
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 bg-green-100 rounded-sm" /> 정답</span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 bg-red-100 rounded-sm" /> 오답/놓침</span>
        </>}
        {activeGap !== null && !submitted && (
          <span className="text-purple-500 font-medium">선택 위치: {activeGap + 1}번째 사이</span>
        )}
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
