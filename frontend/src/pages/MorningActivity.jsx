import React, { useState, useMemo, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import QrDistribution from '../components/QrDistribution';
import { MANUSCRIPT_CONTENTS } from '../data/manuscriptContents';

const ActivityArchive = lazy(() => import('./ActivityArchive'));
const GrowthView = lazy(() => import('./GrowthView'));
const CreativeStudio = lazy(() => import('./CreativeStudio'));
const MyBook = lazy(() => import('./MyBook'));
const ManuscriptActivity = lazy(() => import('./ManuscriptActivity'));

const SUB_TABS = [
  { id: 'today', emoji: '✏️', label: '오늘 활동' },
  { id: 'manuscript', emoji: '📝', label: '원고지 연습' },
  { id: 'archive', emoji: '📂', label: '활동 보관함' },
  { id: 'growth', emoji: '🌱', label: '성장 보기' },
  { id: 'studio', emoji: '📖', label: '창작 편찬실' },
  { id: 'book', emoji: '📕', label: '내 책 만들기' },
];

const ACTIVITY_TYPES = [
  { id: 'poem-copy', emoji: '📜', label: '시 필사', placeholder: '좋아하는 시를 따라 적어보세요', hint: '천천히, 한 글자씩 정성스럽게' },
  { id: 'story-continue', emoji: '📖', label: '이야기 이어쓰기', placeholder: '앞 이야기에 이어서 써보세요', hint: '다음에 무슨 일이 벌어질까?' },
  { id: 'yesterday-diary', emoji: '📝', label: '어제 일기', placeholder: '어제 가장 기억에 남는 일을 적어보세요', hint: '어제 뭘 했는지, 어떤 기분이었는지' },
  { id: 'letter', emoji: '💌', label: '편지쓰기', placeholder: '누군가에게 하고 싶은 말을 적어보세요', hint: '친구, 가족, 미래의 나에게' },
  { id: 'dictation', emoji: '🎧', label: '받아쓰기', placeholder: '들은 내용을 적어보세요', hint: '정확하게 들으며 적기' },
  { id: 'review', emoji: '🎬', label: '짧은 감상문', placeholder: '읽은 책이나 본 영상에 대해 적어보세요', hint: '무엇이 가장 인상 깊었나요?' },
  { id: 'keyword-sentence', emoji: '🔑', label: '키워드 문장 쓰기', placeholder: '주어진 단어를 사용해 문장을 만들어보세요', hint: '재미있는 문장을 만들어봐요' },
  { id: 'free-writing', emoji: '✨', label: '자유 글쓰기', placeholder: '무엇이든 자유롭게 적어보세요', hint: '생각나는 대로 편하게' },
];

function MorningActivity() {
  const navigate = useNavigate();
  const [activeSubTab, setActiveSubTab] = useState('today');
  const [bookCollectionId, setBookCollectionId] = useState(null);

  const goToBookWithCollection = (collectionId) => {
    setBookCollectionId(collectionId);
    setActiveSubTab('book');
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">✏️ 아침 활동</h1>
          <p className="mt-0.5 text-sm text-gray-500">문해력 성장 · 창작 편찬</p>
        </div>
        <button onClick={() => navigate('/dashboard')} className="text-primary-600 hover:text-primary-900 font-medium text-sm">← 홈으로</button>
      </div>

      <div className="flex gap-1 bg-white shadow rounded-lg p-1">
        {SUB_TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveSubTab(tab.id)}
            className={`flex-1 py-2 px-2 text-xs font-semibold rounded-md transition text-center ${
              activeSubTab === tab.id ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'
            }`}>
            <span className="block text-base mb-0.5">{tab.emoji}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <Suspense fallback={<div className="text-center py-12 text-gray-400">로딩 중...</div>}>
        {activeSubTab === 'today' && <TodayActivity onGoToManuscript={() => setActiveSubTab('manuscript')} />}
        {activeSubTab === 'manuscript' && <ManuscriptActivity embedded />}
        {activeSubTab === 'archive' && <ActivityArchive embedded onSwitchTab={setActiveSubTab} />}
        {activeSubTab === 'growth' && <GrowthView embedded onSwitchTab={setActiveSubTab} />}
        {activeSubTab === 'studio' && <CreativeStudio embedded onSwitchTab={setActiveSubTab} onGoToBookWithCollection={goToBookWithCollection} />}
        {activeSubTab === 'book' && <MyBook embedded onSwitchTab={setActiveSubTab} initialCollectionId={bookCollectionId} onClearInitialCollection={() => setBookCollectionId(null)} />}
      </Suspense>
    </div>
  );
}

function TodayActivity({ onGoToManuscript }) {
  const [selectedType, setSelectedType] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saveStatus, setSaveStatus] = useState('');
  const [showQr, setShowQr] = useState(false);

  const handleSave = (isDraft = false) => {
    if (!selectedType || !content.trim()) return;
    const activity = {
      type: selectedType.id, typeLabel: selectedType.label,
      title: title.trim() || `${selectedType.label} - ${new Date().toLocaleDateString('ko-KR')}`,
      content: content.trim(), status: isDraft ? 'draft' : 'submitted', createdAt: new Date().toISOString(),
    };
    const saved = JSON.parse(localStorage.getItem('morning_activities') || '[]');
    saved.unshift(activity);
    localStorage.setItem('morning_activities', JSON.stringify(saved));
    setSaveStatus(isDraft ? '임시 저장됨' : '제출 완료! 🎉');
    if (!isDraft) setTimeout(() => { setSelectedType(null); setTitle(''); setContent(''); setSaveStatus(''); }, 1500);
  };

  if (showQr) {
    return <QrDistribution onClose={() => setShowQr(false)} />;
  }

  if (!selectedType) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">오늘은 어떤 활동을 해볼까요?</h2>
          <button onClick={() => setShowQr(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-medium hover:bg-purple-100 border border-purple-200 transition">
            📱 QR 배포
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {ACTIVITY_TYPES.map(type => (
            <button key={type.id} onClick={() => setSelectedType(type)}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 border-gray-100 hover:border-purple-300 hover:bg-purple-50 transition text-center">
              <span className="text-2xl">{type.emoji}</span>
              <span className="text-xs font-semibold text-gray-700">{type.label}</span>
            </button>
          ))}
        </div>

        <button onClick={onGoToManuscript}
          className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border-2 border-purple-200 hover:border-purple-400 hover:shadow-md transition text-left group">
          <span className="text-3xl">📝</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-purple-800 group-hover:text-purple-900">원고지 연습</p>
            <p className="text-[11px] text-purple-500 mt-0.5">필사 · 띄어쓰기 · 오탈자 · 이어쓰기로 문해력을 키워요</p>
          </div>
          <span className="text-purple-400 group-hover:text-purple-600 text-lg">→</span>
        </button>

        <RecentActivities />
      </div>
    );
  }

  if (selectedType.id === 'poem-copy') {
    return <PoemCopyActivity selectedType={selectedType} onBack={() => { setSelectedType(null); setTitle(''); setContent(''); }} onSave={handleSave} saveStatus={saveStatus} />;
  }

  return (
    <div className="bg-white shadow rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{selectedType.emoji}</span>
          <h2 className="text-base font-semibold text-gray-800">{selectedType.label}</h2>
        </div>
        <button onClick={() => { setSelectedType(null); setTitle(''); setContent(''); }} className="text-xs text-gray-400 hover:text-gray-600">← 활동 선택</button>
      </div>
      <input type="text" value={title} onChange={e => setTitle(e.target.value)}
        className="w-full border border-gray-300 rounded-lg p-2 text-sm" placeholder={`예: 오늘의 ${selectedType.label}`} />
      <textarea value={content} onChange={e => setContent(e.target.value)} rows={6}
        className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none leading-relaxed" placeholder={selectedType.placeholder} />
      <p className="text-[10px] text-gray-300">{selectedType.hint}</p>
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button onClick={() => handleSave(true)} disabled={!content.trim()} className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg disabled:opacity-40">임시 저장</button>
          <button onClick={() => handleSave(false)} disabled={!content.trim()} className="px-5 py-1.5 text-xs font-semibold text-white bg-purple-600 rounded-lg disabled:opacity-40">제출하기</button>
        </div>
        {saveStatus && <span className="text-xs font-medium text-green-600">{saveStatus}</span>}
      </div>
    </div>
  );
}

const POEM_CONTENTS = MANUSCRIPT_CONTENTS.filter(c => c.tags.includes('시') || c.tags.includes('동시'));

const GRADE_FILTERS = [
  { id: 'all', label: '전체' },
  { id: 'low', label: '저학년', grades: [3, 4] },
  { id: 'high', label: '고학년', grades: [5, 6] },
];

const DIFFICULTY_LABELS = { easy: '쉬움', medium: '보통', hard: '어려움' };

function PoemCopyActivity({ selectedType, onBack, onSave, saveStatus }) {
  const [selectedPoem, setSelectedPoem] = useState(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [feeling, setFeeling] = useState('');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [useGrid, setUseGrid] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  const ManuscriptGrid = useMemo(() => {
    return React.lazy(() => import('../components/ManuscriptGrid'));
  }, []);

  const filteredPoems = useMemo(() => {
    if (gradeFilter === 'all') return POEM_CONTENTS;
    const target = GRADE_FILTERS.find(f => f.id === gradeFilter);
    if (!target) return POEM_CONTENTS;
    return POEM_CONTENTS.filter(p => p.grade?.some(g => target.grades.includes(g)));
  }, [gradeFilter]);

  const handleSubmit = (isDraft) => {
    if (!selectedPoem || !content.trim()) return;
    const activity = {
      type: selectedType.id, typeLabel: selectedType.label,
      title: title.trim() || `${selectedPoem.title} 필사`,
      content: content.trim(),
      status: isDraft ? 'draft' : 'submitted',
      createdAt: new Date().toISOString(),
      poemId: selectedPoem.id,
      sourceTitle: selectedPoem.title,
      sourceAuthor: selectedPoem.author,
      sourceTheme: selectedPoem.theme || '',
      originalText: selectedPoem.text,
      copyrightStatus: selectedPoem.copyrightStatus || 'public_domain',
      feeling: feeling.trim(),
    };
    const saved = JSON.parse(localStorage.getItem('morning_activities') || '[]');
    saved.unshift(activity);
    localStorage.setItem('morning_activities', JSON.stringify(saved));
    if (!isDraft) {
      setSubmitted(true);
      setTimeout(() => { setSelectedPoem(null); setContent(''); setTitle(''); setFeeling(''); setSubmitted(false); onBack(); }, 1500);
    }
  };

  if (!selectedPoem) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{selectedType.emoji}</span>
            <h2 className="text-base font-semibold text-gray-800">오늘의 시를 골라보세요</h2>
          </div>
          <button onClick={onBack} className="text-xs text-gray-400 hover:text-gray-600">← 활동 선택</button>
        </div>

        <div className="flex gap-1">
          {GRADE_FILTERS.map(f => (
            <button key={f.id} onClick={() => setGradeFilter(f.id)}
              className={`text-[10px] px-2.5 py-1 rounded-full font-medium ${gradeFilter === f.id ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
              {f.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredPoems.map(poem => (
            <button key={poem.id} onClick={() => setSelectedPoem(poem)}
              className="text-left p-4 bg-white shadow rounded-xl border border-gray-100 hover:border-purple-300 hover:bg-purple-50 transition">
              <div className="flex items-start justify-between">
                <p className="text-sm font-semibold text-gray-800">{poem.title}</p>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                  poem.spacingDifficulty === 'easy' ? 'bg-green-100 text-green-600' :
                  poem.spacingDifficulty === 'hard' ? 'bg-red-100 text-red-600' :
                  'bg-amber-100 text-amber-600'
                }`}>{DIFFICULTY_LABELS[poem.spacingDifficulty] || '보통'}</span>
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5">{poem.author} · {poem.text.replace(/\n/g, '').length}자{poem.theme ? ` · ${poem.theme}` : ''}</p>
              <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">{poem.text.split('\n')[0]}...</p>
            </button>
          ))}
          {filteredPoems.length === 0 && <p className="col-span-2 text-xs text-gray-400 text-center py-6">해당 조건의 시가 없습니다</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">📜</span>
          <h2 className="text-base font-semibold text-gray-800">시 필사</h2>
        </div>
        <button onClick={() => setSelectedPoem(null)} className="text-xs text-gray-400 hover:text-gray-600">← 시 선택</button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold text-amber-700">오늘의 시</span>
          <span className="text-[10px] text-amber-500">{selectedPoem.author}</span>
          {selectedPoem.copyrightStatus === 'public_domain' && (
            <span className="text-[9px] text-amber-400">공유 저작물</span>
          )}
        </div>
        <h3 className="text-base font-bold text-gray-900 mb-3">{selectedPoem.title}</h3>
        <div className="text-sm text-gray-800 leading-[2] whitespace-pre-wrap font-medium">
          {selectedPoem.text}
        </div>
      </div>

      <div className="bg-white shadow rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-600 font-medium">위의 시를 보고 아래 원고지에 따라 적어보세요</p>
          <button onClick={() => setUseGrid(!useGrid)}
            className={`text-[10px] px-2.5 py-1 rounded-full font-medium ${useGrid ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
            {useGrid ? '일반 보기' : '원고지 보기'}
          </button>
        </div>

        <input type="text" value={title} onChange={e => setTitle(e.target.value)}
          className="w-full border border-gray-300 rounded-lg p-2 text-sm" placeholder={`예: ${selectedPoem.title} 필사`} />

        {useGrid ? (
          <Suspense fallback={<div className="text-center py-4 text-gray-400 text-xs">원고지 로딩 중...</div>}>
            <ManuscriptGrid
              originalText={selectedPoem.text.replace(/\n/g, '')}
              userInput={content}
              onInputChange={setContent}
              showOriginal={true}
              mode="poem"
            />
          </Suspense>
        ) : (
          <textarea value={content} onChange={e => setContent(e.target.value)} rows={8}
            className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none leading-[2]" placeholder="천천히, 한 글자씩 정성스럽게 따라 적어보세요" />
        )}

        <div className="border-t border-gray-100 pt-3">
          <label className="text-[10px] text-gray-400 block mb-1">이 시를 쓰며 든 느낌 한 줄 (선택)</label>
          <input type="text" value={feeling} onChange={e => setFeeling(e.target.value)}
            className="w-full border border-gray-200 rounded-lg p-2 text-xs" placeholder="마음에 남은 표현, 떠오른 생각..." maxLength={100} />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button onClick={() => handleSubmit(true)} disabled={!content.trim()} className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg disabled:opacity-40">임시 저장</button>
            <button onClick={() => handleSubmit(false)} disabled={!content.trim()} className="px-5 py-1.5 text-xs font-semibold text-white bg-purple-600 rounded-lg disabled:opacity-40">제출하기</button>
          </div>
          {submitted && <span className="text-xs font-medium text-green-600">제출 완료!</span>}
        </div>
      </div>
    </div>
  );
}

function RecentActivities() {
  const morning = JSON.parse(localStorage.getItem('morning_activities') || '[]');
  const manuscript = JSON.parse(localStorage.getItem('manuscript_activities') || '[]')
    .map(r => ({ ...r, type: `manuscript-${r.mode}`, title: r.title, createdAt: r.completedAt }));
  const all = [...morning, ...manuscript]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 3);
  if (all.length === 0) return null;

  const emojiMap = {
    'manuscript-copy': '📝', 'manuscript-spacing': '↔️',
    'manuscript-typo': '🔍', 'manuscript-continue': '✍️',
  };

  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-500 mb-2">최근 활동</h3>
      <div className="space-y-1.5">
        {all.map((a, i) => (
          <div key={i} className="flex items-center gap-2 p-2 rounded-lg border border-gray-50 text-xs">
            <span>{emojiMap[a.type] || ACTIVITY_TYPES.find(t => t.id === a.type)?.emoji || '📝'}</span>
            <span className="font-medium text-gray-700 truncate flex-1">{a.title}</span>
            <span className="text-gray-400">{new Date(a.createdAt).toLocaleDateString('ko-KR')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export { ACTIVITY_TYPES };
export default MorningActivity;
