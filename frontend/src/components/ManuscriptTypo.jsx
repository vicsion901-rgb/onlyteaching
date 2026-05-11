import React, { useState, useMemo } from 'react';
import { generateTypoVersion } from '../data/manuscriptContents';

function ManuscriptTypo({ text, difficulty = 'medium', onComplete }) {
  const { mutatedText, mutations } = useMemo(() => generateTypoVersion(text, difficulty), [text, difficulty]);

  const [foundMutations, setFoundMutations] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [correctionInput, setCorrectionInput] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const chars = mutatedText.split('');

  const isMutatedAt = (idx) => {
    return mutations.some(m => idx >= m.index && idx < m.index + m.mutated.length);
  };

  const getMutationAt = (idx) => {
    return mutations.find(m => idx >= m.index && idx < m.index + m.mutated.length);
  };

  const handleCharClick = (idx) => {
    if (submitted) return;
    if (selectedIdx === idx) {
      setSelectedIdx(null);
      setCorrectionInput('');
      return;
    }
    setSelectedIdx(idx);
    setCorrectionInput('');
  };

  const handleCorrection = () => {
    if (selectedIdx === null || !correctionInput) return;
    const mutation = getMutationAt(selectedIdx);
    if (mutation) {
      const isCorrect = correctionInput === mutation.original;
      setFoundMutations(prev => [...prev, {
        index: mutation.index,
        userAnswer: correctionInput,
        correct: isCorrect,
        mutation,
      }]);
    } else {
      setFoundMutations(prev => [...prev, {
        index: selectedIdx,
        userAnswer: correctionInput,
        correct: false,
        mutation: null,
      }]);
    }
    setSelectedIdx(null);
    setCorrectionInput('');
  };

  const handleSubmit = () => {
    setSubmitted(true);
    const correctCount = foundMutations.filter(f => f.correct).length;
    onComplete?.({
      found: correctCount,
      total: mutations.length,
      accuracy: mutations.length > 0 ? Math.round((correctCount / mutations.length) * 100) : 100,
      wrongGuesses: foundMutations.filter(f => !f.correct).length,
    });
  };

  const handleReset = () => {
    setFoundMutations([]);
    setSelectedIdx(null);
    setCorrectionInput('');
    setSubmitted(false);
  };

  const getCharStyle = (idx) => {
    const found = foundMutations.find(f => {
      if (f.mutation) return idx >= f.mutation.index && idx < f.mutation.index + f.mutation.mutated.length;
      return f.index === idx;
    });

    if (submitted && isMutatedAt(idx)) {
      const wasFound = foundMutations.find(f => f.correct && f.mutation && idx >= f.mutation.index && idx < f.mutation.index + f.mutation.mutated.length);
      if (wasFound) return 'bg-green-100 text-green-700 border-green-400 line-through';
      return 'bg-red-100 text-red-600 border-red-400 font-bold underline';
    }

    if (found?.correct) return 'bg-green-100 text-green-700 border-green-400 line-through';
    if (found && !found.correct) return 'bg-orange-100 text-orange-600 border-orange-300';
    if (selectedIdx === idx) return 'bg-purple-100 text-purple-700 border-purple-400 ring-2 ring-purple-300';
    return 'hover:bg-yellow-50 border-gray-200';
  };

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-xs text-amber-700 mb-3">틀린 글자를 찾아서 눌러 주세요 ({mutations.length}개 숨어 있어요)</p>
        <div className="flex flex-wrap gap-0.5 leading-loose">
          {chars.map((ch, i) => {
            if (ch === '\n') return <div key={i} className="w-full h-1" />;
            return (
              <span
                key={i}
                onClick={() => handleCharClick(i)}
                className={`inline-flex items-center justify-center w-8 h-8 text-sm font-medium rounded border cursor-pointer select-none transition ${getCharStyle(i)}`}
              >
                {ch}
              </span>
            );
          })}
        </div>
      </div>

      {selectedIdx !== null && !submitted && (
        <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-lg p-3">
          <span className="text-xs text-purple-700">"{getMutationAt(selectedIdx)?.mutated || chars[selectedIdx]}" → 올바른 글자:</span>
          <input
            type="text"
            value={correctionInput}
            onChange={e => setCorrectionInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCorrection()}
            className="w-16 border border-purple-300 rounded px-2 py-1 text-sm text-center focus:ring-2 focus:ring-purple-400"
            maxLength={3}
            autoFocus
          />
          <button onClick={handleCorrection} disabled={!correctionInput}
            className="px-3 py-1 text-xs font-semibold text-white bg-purple-600 rounded hover:bg-purple-700 disabled:bg-gray-300">
            확인
          </button>
          <button onClick={() => { setSelectedIdx(null); setCorrectionInput(''); }}
            className="px-2 py-1 text-xs text-gray-400 hover:text-gray-600">취소</button>
        </div>
      )}

      {submitted && (
        <div className="bg-white border rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-600 mb-2">원문 (정답):</p>
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{text}</p>
          <div className="mt-3 space-y-1">
            {mutations.map((m, i) => {
              const found = foundMutations.find(f => f.correct && f.mutation?.index === m.index);
              return (
                <p key={i} className="text-xs">
                  <span className={found ? 'text-green-600' : 'text-red-500'}>
                    {found ? '✅' : '❌'} "{m.mutated}" → "{m.original}"
                  </span>
                </p>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">{foundMutations.filter(f => f.correct).length}/{mutations.length}개 찾음</span>
        <div className="flex-1" />
        {submitted ? (
          <button onClick={handleReset} className="px-4 py-2 text-xs font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100">
            다시 하기
          </button>
        ) : (
          <button onClick={handleSubmit}
            className="px-5 py-2 text-xs font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700">
            결과 보기
          </button>
        )}
      </div>
    </div>
  );
}

export default ManuscriptTypo;
