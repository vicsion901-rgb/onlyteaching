import React, { useRef, useEffect, useMemo } from 'react';

const COLS = 20;

function ManuscriptGrid({ originalText, userInput, onInputChange, readOnly = false, showOriginal = true, mode = 'default' }) {
  const textareaRef = useRef(null);
  const isPoem = mode === 'poem';

  const origLines = useMemo(() => {
    if (isPoem) return originalText.split('\n');
    return [originalText.replace(/\n/g, '')];
  }, [originalText, isPoem]);

  const userLines = useMemo(() => {
    if (isPoem) return (userInput || '').split('\n');
    return [(userInput || '')];
  }, [userInput, isPoem]);

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

  const getCharStatus = (origChar, userChar) => {
    if (!userChar) return 'empty';
    if (origChar === userChar) return 'correct';
    if (origChar === ' ' && userChar !== ' ') return 'space-miss';
    if (origChar !== ' ' && userChar === ' ') return 'space-extra';
    return 'wrong';
  };

  const statusStyle = {
    empty: 'border-gray-300',
    correct: 'border-green-400 bg-green-50',
    wrong: 'border-red-400 bg-red-50',
    'space-miss': 'border-amber-400 bg-amber-50',
    'space-extra': 'border-amber-400 bg-amber-50',
  };

  if (isPoem) {
    const maxLines = Math.max(origLines.length, userLines.length);
    return (
      <div className="relative">
        {!readOnly && (
          <textarea
            ref={textareaRef}
            value={userInput || ''}
            onChange={handleInput}
            style={{ position: 'absolute', top: 0, left: 0, width: 1, height: 1, opacity: 0.01 }}
            autoComplete="off" autoCorrect="off" spellCheck={false}
          />
        )}
        <div className="overflow-x-auto cursor-text space-y-1" onClick={handleCellClick}>
          {Array.from({ length: maxLines }).map((_, lineIdx) => {
            const origLine = origLines[lineIdx] || '';
            const userLine = userLines[lineIdx] || '';
            const origChars = origLine.split('');
            const userChars = userLine.split('');
            const lineCells = Math.max(origChars.length, userChars.length, 1);
            const lineMatch = lineIdx < origLines.length;

            return (
              <div key={lineIdx}>
                {!lineMatch && lineIdx > 0 && (
                  <div className="text-[9px] text-orange-400 mb-0.5">줄 추가됨</div>
                )}
                <div className="flex flex-wrap">
                  {showOriginal && (
                    <div className="flex mb-0">
                      <div className="w-6 h-7 flex items-center justify-center text-[9px] text-gray-300">{lineIdx + 1}</div>
                      {Array.from({ length: lineCells }).map((_, ci) => {
                        const oc = origChars[ci] || '';
                        const isSpace = oc === ' ';
                        return (
                          <div key={ci} className={`w-8 h-7 border border-gray-200 flex items-center justify-center text-[10px] ${isSpace ? 'bg-gray-50 text-gray-300' : 'text-gray-300'}`}>
                            {isSpace ? '␣' : oc}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="flex">
                    <div className="w-6 h-8" />
                    {Array.from({ length: lineCells }).map((_, ci) => {
                      const oc = origChars[ci] || '';
                      const uc = userChars[ci] || '';
                      const st = getCharStatus(oc, uc);
                      return (
                        <div key={ci} className={`w-8 h-8 border flex items-center justify-center text-sm font-medium text-gray-800 ${statusStyle[st] || 'border-gray-300'}`}>
                          {uc}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
          {userLines.length < origLines.length && (
            <div className="text-[9px] text-orange-400 py-1">원문은 {origLines.length}행, 입력은 {userLines.length}행</div>
          )}
        </div>
        {!readOnly && <PoemLegend />}
      </div>
    );
  }

  const chars = origLines[0].split('');
  const userChars = userLines[0].split('');
  const totalCells = Math.max(chars.length, userChars.length, COLS);
  const rows = Math.ceil(totalCells / COLS);
  const cursorPos = userChars.length;

  return (
    <div className="relative">
      {!readOnly && (
        <textarea
          ref={textareaRef}
          value={userInput || ''}
          onChange={handleInput}
          style={{ position: 'absolute', top: 0, left: 0, width: 1, height: 1, opacity: 0.01 }}
          autoComplete="off" autoCorrect="off" spellCheck={false}
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
                const st = getCharStatus(origChar, userChar);
                const isSpace = origChar === ' ';
                const isCursor = !readOnly && cellIdx === cursorPos;

                return (
                  <div key={col} className="relative" onClick={handleCellClick}>
                    {showOriginal && (
                      <div className={`w-9 h-9 border border-gray-200 flex items-center justify-center text-[10px] ${isSpace ? 'bg-gray-50 text-gray-300' : 'text-gray-300'}`}>
                        {isSpace ? '␣' : origChar}
                      </div>
                    )}
                    <div className={`w-9 h-9 border flex items-center justify-center text-sm font-medium text-gray-800 ${statusStyle[st] || 'border-gray-300'} ${isCursor ? 'ring-2 ring-purple-400' : ''}`}>
                      {userChar}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      {!readOnly && <DefaultLegend />}
    </div>
  );
}

function PoemLegend() {
  return (
    <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-gray-400">
      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border border-green-400 bg-green-50 inline-block" /> 맞음</span>
      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border border-red-400 bg-red-50 inline-block" /> 글자 다름</span>
      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border border-amber-400 bg-amber-50 inline-block" /> 공백 차이</span>
      <span className="flex items-center gap-1"><span className="text-orange-400">●</span> 줄 구조 다름</span>
    </div>
  );
}

function DefaultLegend() {
  return (
    <div className="flex gap-3 mt-2 text-[10px] text-gray-400">
      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border border-green-400 bg-green-50 inline-block" /> 맞음</span>
      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border border-red-400 bg-red-50 inline-block" /> 틀림</span>
      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border border-gray-200 bg-gray-50 inline-block" /> 빈칸=띄어쓰기</span>
    </div>
  );
}

export default ManuscriptGrid;
