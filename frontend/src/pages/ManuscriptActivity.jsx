import React, { useState, useMemo } from 'react';
import ManuscriptGrid from '../components/ManuscriptGrid';
import ManuscriptSpacing from '../components/ManuscriptSpacing';
import ManuscriptTypo from '../components/ManuscriptTypo';
import { MANUSCRIPT_CONTENTS } from '../data/manuscriptContents';
import { submitActivity, saveToLocalCache } from '../utils/submissionApi';

const MODES = [
  { id: 'copy', emoji: '📝', label: '원고지 필사', desc: '한 글자씩 따라 쓰기' },
  { id: 'spacing', emoji: '↔️', label: '띄어쓰기 교정', desc: '올바른 띄어쓰기 찾기' },
  { id: 'typo', emoji: '🔍', label: '오탈자 찾기', desc: '틀린 글자 고치기' },
  { id: 'continue', emoji: '✍️', label: '이어쓰기', desc: '앞부분 필사 후 이어쓰기' },
];

const DIFFICULTY_OPTIONS = [
  { id: 'easy', label: '쉬움', color: 'bg-green-100 text-green-700' },
  { id: 'medium', label: '보통', color: 'bg-amber-100 text-amber-700' },
  { id: 'hard', label: '어려움', color: 'bg-red-100 text-red-700' },
];

function ManuscriptActivity({ embedded }) {
  const [mode, setMode] = useState(null);
  const [selectedContent, setSelectedContent] = useState(null);
  const [difficulty, setDifficulty] = useState('medium');
  const [userInput, setUserInput] = useState('');
  const [continueText, setContinueText] = useState('');
  const [result, setResult] = useState(null);

  const filteredContents = useMemo(() => {
    if (!mode) return [];
    if (mode === 'copy') return MANUSCRIPT_CONTENTS.filter(c => c.tags.includes('필사') || c.tags.includes('시'));
    if (mode === 'spacing') return MANUSCRIPT_CONTENTS.filter(c => c.tags.includes('띄어쓰기') || c.tags.includes('문장') || c.tags.includes('속담'));
    if (mode === 'typo') return MANUSCRIPT_CONTENTS.filter(c => c.tags.includes('오탈자') || c.tags.includes('맞춤법'));
    if (mode === 'continue') return MANUSCRIPT_CONTENTS.filter(c => c.tags.includes('이어쓰기'));
    return [];
  }, [mode]);

  const handleSaveResult = (activityResult) => {
    if (!selectedContent) return;
    const userText = mode === 'continue'
      ? `${userInput}\n\n--- 이어쓰기 ---\n${continueText}`
      : mode === 'copy' ? userInput : '';
    const record = {
      contentId: selectedContent.id,
      mode,
      title: `${MODES.find(m => m.id === mode)?.label} - ${selectedContent.title}`,
      contentTitle: selectedContent.title,
      author: selectedContent.author,
      accuracy: activityResult?.accuracy ?? null,
      completedAt: new Date().toISOString(),
      difficulty,
      userText,
    };
    saveToLocalCache(record, 'manuscript_activities');
    submitActivity({
      activityType: `manuscript-${mode}`, sourceType: 'manuscript',
      title: record.title, content: userText,
      metadata: { accuracy: activityResult?.accuracy, difficulty, contentId: selectedContent.id, mode },
      status: 'submitted',
    });
    setResult(activityResult);
  };

  const handleCopyComplete = () => {
    const original = selectedContent.text.replace(/\n/g, '');
    let correct = 0;
    for (let i = 0; i < original.length; i++) {
      if (userInput[i] === original[i]) correct++;
    }
    const accuracy = original.length > 0 ? Math.round((correct / original.length) * 100) : 0;
    handleSaveResult({ correct, total: original.length, accuracy });
  };

  const handleContinueComplete = () => {
    if (!continueText.trim()) return;
    const original = selectedContent.text.replace(/\n/g, '');
    let correct = 0;
    for (let i = 0; i < original.length; i++) {
      if (userInput[i] === original[i]) correct++;
    }
    const copyAccuracy = original.length > 0 ? Math.round((correct / original.length) * 100) : 0;
    handleSaveResult({
      copyAccuracy,
      continueLength: continueText.trim().length,
      accuracy: copyAccuracy,
    });
  };

  const resetActivity = () => {
    setSelectedContent(null);
    setUserInput('');
    setContinueText('');
    setResult(null);
  };

  const resetAll = () => {
    setMode(null);
    resetActivity();
  };

  // 모드 선택
  if (!mode) {
    return (
      <div className="space-y-4">
        {!embedded && (
          <div>
            <h1 className="text-2xl font-bold text-gray-900">📝 원고지 연습</h1>
            <p className="mt-0.5 text-sm text-gray-500">필사 · 띄어쓰기 · 오탈자 · 이어쓰기</p>
          </div>
        )}
        <h2 className="text-base font-semibold text-gray-800">어떤 연습을 해볼까요?</h2>
        <div className="grid grid-cols-2 gap-3">
          {MODES.map(m => (
            <button key={m.id} onClick={() => setMode(m.id)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-100 hover:border-purple-300 hover:bg-purple-50 transition text-center">
              <span className="text-3xl">{m.emoji}</span>
              <span className="text-sm font-semibold text-gray-700">{m.label}</span>
              <span className="text-[10px] text-gray-400">{m.desc}</span>
            </button>
          ))}
        </div>
        <RecentManuscripts />
      </div>
    );
  }

  // 콘텐츠 선택
  if (!selectedContent) {
    const currentMode = MODES.find(m => m.id === mode);
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{currentMode.emoji}</span>
            <h2 className="text-base font-semibold text-gray-800">{currentMode.label}</h2>
          </div>
          <button onClick={resetAll} className="text-xs text-gray-400 hover:text-gray-600">← 모드 선택</button>
        </div>

        {mode === 'typo' && (
          <div className="flex gap-1">
            {DIFFICULTY_OPTIONS.map(d => (
              <button key={d.id} onClick={() => setDifficulty(d.id)}
                className={`px-3 py-1 text-xs rounded-full font-medium ${difficulty === d.id ? d.color + ' ring-2 ring-offset-1 ring-purple-300' : 'bg-gray-100 text-gray-500'}`}>
                {d.label}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {filteredContents.map(c => (
            <button key={c.id} onClick={() => setSelectedContent(c)}
              className="w-full text-left p-3 rounded-xl border border-gray-100 hover:border-purple-300 hover:bg-purple-50 transition">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{c.title}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{c.author} · {c.text.replace(/\n/g, '').length}자</p>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{c.text.replace(/\n/g, ' ')}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                  c.spacingDifficulty === 'easy' ? 'bg-green-100 text-green-600' :
                  c.spacingDifficulty === 'hard' ? 'bg-red-100 text-red-600' :
                  'bg-amber-100 text-amber-600'
                }`}>{c.spacingDifficulty === 'easy' ? '쉬움' : c.spacingDifficulty === 'hard' ? '어려움' : '보통'}</span>
              </div>
            </button>
          ))}
          {filteredContents.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-8">이 모드에 맞는 콘텐츠가 없습니다</p>
          )}
        </div>
      </div>
    );
  }

  // 활동 진행
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-800">{selectedContent.title}</p>
          <p className="text-[10px] text-gray-400">{selectedContent.author} · {MODES.find(m => m.id === mode)?.label}</p>
        </div>
        <button onClick={resetActivity} className="text-xs text-gray-400 hover:text-gray-600">← 글 선택</button>
      </div>

      {result && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-lg font-bold text-green-700">{result.accuracy >= 80 ? '🎉' : '💪'} 정확도 {result.accuracy}%</p>
          <p className="text-xs text-green-600 mt-1">
            {result.accuracy >= 90 ? '훌륭해요!' :
             result.accuracy >= 70 ? '잘했어요! 조금만 더 연습하면 완벽해요!' :
             '괜찮아요. 다시 한 번 도전해 볼까요?'}
          </p>
          {result.continueLength && <p className="text-xs text-green-600 mt-1">이어쓴 글: {result.continueLength}자</p>}
          <button onClick={resetActivity} className="mt-3 px-4 py-1.5 text-xs font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100">
            다른 글 연습하기
          </button>
        </div>
      )}

      {!result && mode === 'copy' && (
        <div className="space-y-3">
          <ManuscriptGrid
            originalText={selectedContent.text.replace(/\n/g, '')}
            userInput={userInput}
            onInputChange={setUserInput}
            mode={selectedContent.tags?.includes('시') || selectedContent.tags?.includes('동시') ? 'poem' : 'default'}
          />
          <div className="flex justify-end">
            <button onClick={handleCopyComplete} disabled={!userInput.trim()}
              className="px-5 py-2 text-xs font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:bg-gray-300">
              완료하기
            </button>
          </div>
        </div>
      )}

      {!result && mode === 'spacing' && (
        <ManuscriptSpacing
          text={selectedContent.text.replace(/\n/g, ' ')}
          onComplete={handleSaveResult}
        />
      )}

      {!result && mode === 'typo' && (
        <ManuscriptTypo
          text={selectedContent.text.replace(/\n/g, ' ')}
          difficulty={difficulty}
          onComplete={handleSaveResult}
        />
      )}

      {!result && mode === 'continue' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-[10px] text-amber-600 mb-1">먼저 아래 글을 원고지에 따라 쓰세요</p>
          </div>
          <ManuscriptGrid
            originalText={selectedContent.text.replace(/\n/g, '')}
            userInput={userInput}
            onInputChange={setUserInput}
            mode={selectedContent.tags?.includes('시') || selectedContent.tags?.includes('동시') ? 'poem' : 'default'}
          />
          {selectedContent.continuePrompt && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
              <p className="text-xs text-purple-700 font-medium">{selectedContent.continuePrompt}</p>
            </div>
          )}
          <textarea
            value={continueText}
            onChange={e => setContinueText(e.target.value)}
            rows={4}
            className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none leading-relaxed"
            placeholder="이어서 써 보세요..."
          />
          <div className="flex justify-end">
            <button onClick={handleContinueComplete} disabled={!userInput.trim() || !continueText.trim()}
              className="px-5 py-2 text-xs font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:bg-gray-300">
              완료하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RecentManuscripts() {
  const records = JSON.parse(localStorage.getItem('manuscript_activities') || '[]').slice(0, 5);
  if (records.length === 0) return null;

  return (
    <div className="mt-4">
      <h3 className="text-xs font-semibold text-gray-500 mb-2">최근 연습</h3>
      <div className="space-y-1.5">
        {records.map((r, i) => (
          <div key={i} className="flex items-center gap-2 p-2 rounded-lg border border-gray-50 text-xs">
            <span>{MODES.find(m => m.id === r.mode)?.emoji || '📝'}</span>
            <span className="font-medium text-gray-700 truncate flex-1">{r.title}</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
              r.accuracy >= 80 ? 'bg-green-100 text-green-600' :
              r.accuracy >= 50 ? 'bg-amber-100 text-amber-600' :
              'bg-red-100 text-red-600'
            }`}>{r.accuracy}%</span>
            <span className="text-gray-400">{new Date(r.completedAt).toLocaleDateString('ko-KR')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const MODES_EXPORT = MODES;
export { MODES_EXPORT as MODES };
export default ManuscriptActivity;
