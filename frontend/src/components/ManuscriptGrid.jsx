import React, { useRef, useCallback, useEffect } from 'react';

const COLS = 20;

function ManuscriptGrid({ originalText, userInput, onInputChange, readOnly = false, showOriginal = true }) {
  const inputRefs = useRef([]);
  const composingRef = useRef(false);
  const chars = originalText.replace(/\n/g, '').split('');
  const totalCells = Math.max(chars.length, (userInput || '').length, COLS);
  const rows = Math.ceil(totalCells / COLS);

  useEffect(() => {
    inputRefs.current.forEach((el, i) => {
      if (!el) return;
      const ch = (userInput || '')[i] || '';
      if (document.activeElement !== el) {
        el.value = ch;
      }
    });
  }, [userInput]);

  const commitChar = useCallback((cellIdx, ch) => {
    const current = (userInput || '').split('');
    while (current.length <= cellIdx) current.push('');
    current[cellIdx] = ch || '';
    onInputChange(current.join(''));
  }, [userInput, onInputChange]);

  const advanceToNext = useCallback((cellIdx) => {
    if (cellIdx < totalCells - 1) {
      setTimeout(() => {
        const next = inputRefs.current[cellIdx + 1];
        if (next) { next.value = ''; next.focus(); }
      }, 0);
    }
  }, [totalCells]);

  const handleKeyDown = useCallback((cellIdx, e) => {
    if (readOnly) return;
    if (composingRef.current) return;

    if (e.key === 'Backspace') {
      e.preventDefault();
      const el = inputRefs.current[cellIdx];
      if (el && el.value) {
        el.value = '';
        commitChar(cellIdx, '');
      } else if (cellIdx > 0) {
        const prev = inputRefs.current[cellIdx - 1];
        if (prev) { prev.value = ''; prev.focus(); }
        commitChar(cellIdx - 1, '');
      }
      return;
    }

    if (e.key === 'ArrowLeft' && cellIdx > 0) { inputRefs.current[cellIdx - 1]?.focus(); return; }
    if (e.key === 'ArrowRight' && cellIdx < totalCells - 1) { inputRefs.current[cellIdx + 1]?.focus(); return; }
    if (e.key === 'ArrowUp' && cellIdx >= COLS) { inputRefs.current[cellIdx - COLS]?.focus(); return; }
    if (e.key === 'ArrowDown' && cellIdx + COLS < totalCells) { inputRefs.current[cellIdx + COLS]?.focus(); return; }
  }, [readOnly, totalCells, commitChar]);

  const handleChange = useCallback((cellIdx, e) => {
    if (readOnly || composingRef.current) return;
    const val = e.target.value;
    if (!val) return;
    const ch = val.slice(-1);
    e.target.value = ch;
    commitChar(cellIdx, ch);
    advanceToNext(cellIdx);
  }, [readOnly, commitChar, advanceToNext]);

  const handleCompositionStart = useCallback(() => {
    composingRef.current = true;
  }, []);

  const handleCompositionEnd = useCallback((cellIdx, e) => {
    composingRef.current = false;
    const val = e.target.value || e.data || '';
    const ch = val.slice(-1);
    if (ch) {
      e.target.value = ch;
      commitChar(cellIdx, ch);
      advanceToNext(cellIdx);
    }
  }, [commitChar, advanceToNext]);

  const getCellStatus = (cellIdx) => {
    const orig = chars[cellIdx] || '';
    const user = (userInput || '')[cellIdx] || '';
    if (!user) return 'empty';
    if (orig === ' ' && user === ' ') return 'correct';
    if (orig === user) return 'correct';
    if (orig && user) return 'wrong';
    return 'extra';
  };

  const statusColors = {
    empty: '',
    correct: 'bg-green-50 border-green-300',
    wrong: 'bg-red-50 border-red-300',
    extra: 'bg-blue-50 border-blue-300',
  };

  return (
    <div className="overflow-x-auto">
      <div className="inline-block">
        {Array.from({ length: rows }).map((_, row) => (
          <div key={row} className="flex">
            {Array.from({ length: COLS }).map((_, col) => {
              const cellIdx = row * COLS + col;
              if (cellIdx >= totalCells && cellIdx >= chars.length) return null;

              const origChar = chars[cellIdx] || '';
              const userChar = (userInput || '')[cellIdx] || '';
              const status = getCellStatus(cellIdx);
              const isSpace = origChar === ' ';

              return (
                <div key={col} className="relative">
                  {showOriginal && (
                    <div className={`w-9 h-9 border border-gray-200 flex items-center justify-center text-[10px] ${isSpace ? 'bg-gray-50 text-gray-300' : 'text-gray-300'}`}>
                      {isSpace ? '␣' : origChar}
                    </div>
                  )}
                  <div className={`w-9 h-9 border ${statusColors[status] || 'border-gray-300'}`}>
                    {readOnly ? (
                      <div className="w-full h-full flex items-center justify-center text-sm font-medium text-gray-800">
                        {userChar}
                      </div>
                    ) : (
                      <input
                        ref={el => inputRefs.current[cellIdx] = el}
                        type="text"
                        defaultValue={userChar}
                        onChange={e => handleChange(cellIdx, e)}
                        onKeyDown={e => handleKeyDown(cellIdx, e)}
                        onCompositionStart={handleCompositionStart}
                        onCompositionEnd={e => handleCompositionEnd(cellIdx, e)}
                        className="w-full h-full text-center text-sm font-medium text-gray-800 outline-none bg-transparent focus:bg-purple-50"
                        autoComplete="off"
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {!readOnly && (
        <div className="flex gap-3 mt-2 text-[10px] text-gray-400">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border border-green-300 bg-green-50 inline-block" /> 맞음</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border border-red-300 bg-red-50 inline-block" /> 틀림</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border border-gray-200 bg-gray-50 inline-block" /> 빈칸=띄어쓰기</span>
        </div>
      )}
    </div>
  );
}

export default ManuscriptGrid;
