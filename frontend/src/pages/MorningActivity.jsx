import React, { useState, useMemo, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';

const ActivityArchive = lazy(() => import('./ActivityArchive'));
const GrowthView = lazy(() => import('./GrowthView'));
const CreativeStudio = lazy(() => import('./CreativeStudio'));
const MyBook = lazy(() => import('./MyBook'));

const SUB_TABS = [
  { id: 'today', emoji: '✏️', label: '오늘 활동' },
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

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">✏️ 아침 활동</h1>
          <p className="mt-0.5 text-sm text-gray-500">문해력 성장 · 창작 편찬</p>
        </div>
        <button onClick={() => navigate('/dashboard')} className="text-primary-600 hover:text-primary-900 font-medium text-sm">← 홈으로</button>
      </div>

      {/* 내부 탭 네비게이션 */}
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

      {/* 탭 콘텐츠 */}
      <Suspense fallback={<div className="text-center py-12 text-gray-400">로딩 중...</div>}>
        {activeSubTab === 'today' && <TodayActivity />}
        {activeSubTab === 'archive' && <ActivityArchive embedded />}
        {activeSubTab === 'growth' && <GrowthView embedded />}
        {activeSubTab === 'studio' && <CreativeStudio embedded />}
        {activeSubTab === 'book' && <MyBook embedded />}
      </Suspense>
    </div>
  );
}

function TodayActivity() {
  const [selectedType, setSelectedType] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saveStatus, setSaveStatus] = useState('');

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

  if (!selectedType) {
    return (
      <div>
        <h2 className="text-base font-semibold text-gray-800 mb-3">오늘은 어떤 활동을 해볼까요?</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {ACTIVITY_TYPES.map(type => (
            <button key={type.id} onClick={() => setSelectedType(type)}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 border-gray-100 hover:border-purple-300 hover:bg-purple-50 transition text-center">
              <span className="text-2xl">{type.emoji}</span>
              <span className="text-xs font-semibold text-gray-700">{type.label}</span>
            </button>
          ))}
        </div>
        <RecentActivities />
      </div>
    );
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

function RecentActivities() {
  const activities = JSON.parse(localStorage.getItem('morning_activities') || '[]').slice(0, 3);
  if (activities.length === 0) return null;

  return (
    <div className="mt-4">
      <h3 className="text-xs font-semibold text-gray-500 mb-2">최근 활동</h3>
      <div className="space-y-1.5">
        {activities.map((a, i) => (
          <div key={i} className="flex items-center gap-2 p-2 rounded-lg border border-gray-50 text-xs">
            <span>{ACTIVITY_TYPES.find(t => t.id === a.type)?.emoji || '📝'}</span>
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
