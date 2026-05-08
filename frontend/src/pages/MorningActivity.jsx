import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';

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
  const [selectedType, setSelectedType] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  const handleSave = async (isDraft = false) => {
    if (!selectedType || !content.trim()) return;
    setIsSaving(true);
    const activity = {
      type: selectedType.id,
      typeLabel: selectedType.label,
      title: title.trim() || `${selectedType.label} - ${new Date().toLocaleDateString('ko-KR')}`,
      content: content.trim(),
      status: isDraft ? 'draft' : 'submitted',
      createdAt: new Date().toISOString(),
    };

    // localStorage 저장 (서버 연동 전)
    try {
      const key = 'morning_activities';
      const saved = JSON.parse(localStorage.getItem(key) || '[]');
      saved.unshift(activity);
      localStorage.setItem(key, JSON.stringify(saved));
      setSaveStatus(isDraft ? '임시 저장됨' : '제출 완료!');
      if (!isDraft) {
        setTimeout(() => { setSelectedType(null); setTitle(''); setContent(''); setSaveStatus(''); }, 1500);
      }
    } catch {
      setSaveStatus('저장 실패');
    }
    setIsSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">✏️ 아침 활동</h1>
          <p className="mt-1 text-sm text-gray-500">오늘의 짧은 글쓰기를 시작해보세요</p>
        </div>
        <button onClick={() => navigate('/dashboard')} className="text-primary-600 hover:text-primary-900 font-medium">← 홈으로</button>
      </div>

      {!selectedType ? (
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">오늘은 어떤 활동을 해볼까요?</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {ACTIVITY_TYPES.map(type => (
              <button key={type.id} onClick={() => setSelectedType(type)}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-100 hover:border-purple-300 hover:bg-purple-50 transition text-center">
                <span className="text-3xl">{type.emoji}</span>
                <span className="text-sm font-semibold text-gray-700">{type.label}</span>
                <span className="text-[10px] text-gray-400">{type.hint}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white shadow rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{selectedType.emoji}</span>
              <h2 className="text-lg font-semibold text-gray-800">{selectedType.label}</h2>
            </div>
            <button onClick={() => { setSelectedType(null); setTitle(''); setContent(''); }}
              className="text-sm text-gray-400 hover:text-gray-600">← 활동 선택으로</button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">제목 (선택)</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
              placeholder={`예: 오늘의 ${selectedType.label}`} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">내용</label>
            <textarea value={content} onChange={e => setContent(e.target.value)} rows={8}
              className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 leading-relaxed"
              placeholder={selectedType.placeholder} />
            <p className="text-[10px] text-gray-300 mt-1">{selectedType.hint}</p>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button onClick={() => handleSave(true)} disabled={isSaving || !content.trim()}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-40">
                임시 저장
              </button>
              <button onClick={() => handleSave(false)} disabled={isSaving || !content.trim()}
                className="px-6 py-2 text-sm font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-40">
                {isSaving ? '저장 중...' : '제출하기'}
              </button>
            </div>
            {saveStatus && <span className={`text-sm font-medium ${saveStatus.includes('완료') ? 'text-green-600' : saveStatus.includes('실패') ? 'text-red-500' : 'text-amber-600'}`}>{saveStatus}</span>}
          </div>
        </div>
      )}

      {/* 최근 활동 미리보기 */}
      <div className="bg-white shadow rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">📂 최근 활동</h3>
        <RecentActivities />
      </div>
    </div>
  );
}

function RecentActivities() {
  const activities = JSON.parse(localStorage.getItem('morning_activities') || '[]').slice(0, 5);
  if (activities.length === 0) return <p className="text-xs text-gray-400">아직 활동이 없습니다. 첫 글을 써보세요!</p>;

  return (
    <div className="space-y-2">
      {activities.map((a, i) => (
        <div key={i} className="flex items-center gap-3 p-2 rounded-lg border border-gray-50 hover:bg-gray-50">
          <span className="text-lg">{ACTIVITY_TYPES.find(t => t.id === a.type)?.emoji || '📝'}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{a.title}</p>
            <p className="text-xs text-gray-400">{a.typeLabel} · {new Date(a.createdAt).toLocaleDateString('ko-KR')}</p>
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${a.status === 'submitted' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
            {a.status === 'submitted' ? '제출' : '임시'}
          </span>
        </div>
      ))}
    </div>
  );
}

const ACTIVITY_TYPES_EXPORT = ACTIVITY_TYPES;
export { ACTIVITY_TYPES_EXPORT as ACTIVITY_TYPES };
export default MorningActivity;
