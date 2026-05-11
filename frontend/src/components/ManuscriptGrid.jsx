import React, { useRef, useEffect } from 'react';

const COLS = 20;

function ManuscriptGrid({ originalText, userInput, onInputChange, readOnly = false, showOriginal = true, mode = 'default' }) {
  const textareaRef = useRef(null);
  const isPoem = mode === 'poem';

  const chars = originalText.replace(/\n/g, '').split('');
  const userChars = (userInput || '').replace(/\n/g, '').split('');
  const totalCells = Math.max(chars.length, userChars.length, COLS);
  const rows = Math.ceil(totalCells / COLS);
  const cursorPos = userChars.length;

  useEffect(() => {
    if (textareaRef.current && !readOnly) textareaRef.current.focus();
  }, [readOnly]);

  const handleInput = (e) => {
    if (readOnly) return;
    onInputChange(e.target.value);
  };

  const handleCellClick = () => {
    if (!readOnly && textareaRef.current) textareaRef.current.focus();
  };

  const getCharStatus = (cellIdx) => {
    const orig = chars[cellIdx] || '';
    const user = userChars[cellIdx] || '';
    if (!user) return 'empty';
    if (orig === user) return 'correct';
    if (isPoem) {
      if (orig === ' ' && user !== ' ') return 'space-miss';
      if (orig !== ' ' && user === ' ') return 'space-extra';
    }
    return 'wrong';
  };

  const statusBorder = {
    empty: 'border-gray-300',
    correct: 'border-green-400 bg-green-50',
    wrong: 'border-red-400 bg-red-50',
    'space-miss': 'border-amber-400 bg-amber-50',
    'space-extra': 'border-amber-400 bg-amber-50',
  };

  return (
    <div className="relative">
      {!readOnly && (
        <textarea
          ref={textareaRef}
          value={userInput || ''}
          onChange={handleInput}
          style={{ position: 'absolute', top: 0, left: 0, width: 1, height: 1, opacity: 0.01 }}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
      )}

      <div className="overflow-x-auto cursor-text" onClick={handleCellClick}>
        <div className="inline-block">
          {Array.from({ length: rows }).map((_, row) => (
            <div key={row} className="flex">
              {Array.from({ length: COLS }).map((_, col) => {
                const cellIdx = row * COLS + col;
                if (cellIdx >= totalCells && cellIdx >= chars.length) return null;

                const origChar = chars[cellIdx] || '';
                const userChar = userChars[cellIdx] || '';
                const status = getCharStatus(cellIdx);
                const isSpace = origChar === ' ';
                const isCursor = !readOnly && cellIdx === cursorPos;

                return (
                  <div key={col} className="relative" onClick={handleCellClick}>
                    {showOriginal && (
                      <div className={`w-9 h-9 border border-gray-200 flex items-center justify-center text-[10px] ${isSpace ? 'bg-gray-50 text-gray-300' : 'text-gray-300'}`}>
                        {isSpace ? '␣' : origChar}
                      </div>
                    )}
                    <div className={`w-9 h-9 border flex items-center justify-center text-sm font-medium text-gray-800 ${statusBorder[status] || 'border-gray-300'} ${isCursor ? 'ring-2 ring-purple-400' : ''}`}>
                      {userChar}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {!readOnly && (
        <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-gray-400">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border border-green-400 bg-green-50 inline-block" /> 맞음</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border border-red-400 bg-red-50 inline-block" /> {isPoem ? '글자 다름' : '틀림'}</span>
          {isPoem && <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border border-amber-400 bg-amber-50 inline-block" /> 공백 차이</span>}
          {!isPoem && <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border border-gray-200 bg-gray-50 inline-block" /> 빈칸=띄어쓰기</span>}
        </div>
      )}
    </div>
  );
}

export default ManuscriptGrid;
