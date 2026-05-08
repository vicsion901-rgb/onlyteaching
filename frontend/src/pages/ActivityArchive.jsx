import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

const TYPE_LABELS = {
  'poem-copy': { emoji: '📜', label: '시 필사' },
  'story-continue': { emoji: '📖', label: '이야기 이어쓰기' },
  'yesterday-diary': { emoji: '📝', label: '어제 일기' },
  'letter': { emoji: '💌', label: '편지쓰기' },
  'dictation': { emoji: '🎧', label: '받아쓰기' },
  'review': { emoji: '🎬', label: '짧은 감상문' },
  'keyword-sentence': { emoji: '🔑', label: '키워드 문장 쓰기' },
  'free-writing': { emoji: '✨', label: '자유 글쓰기' },
};

function ActivityArchive({ embedded }) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const activities = useMemo(() => {
    const all = JSON.parse(localStorage.getItem('morning_activities') || '[]');
    let filtered = all;
    if (filter !== 'all') filtered = filtered.filter(a => a.type === filter);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(a => a.title?.toLowerCase().includes(q) || a.content?.toLowerCase().includes(q));
    }
    return filtered;
  }, [filter, searchQuery]);

  return (
    <div className="space-y-6">
      {!embedded && (
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">📂 활동 보관함</h1>
            <p className="mt-1 text-sm text-gray-500">내가 쓴 모든 글을 모아봅니다</p>
          </div>
          <button onClick={() => navigate('/dashboard')} className="text-primary-600 hover:text-primary-900 font-medium">← 홈으로</button>
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-48 focus:ring-2 focus:ring-purple-400" placeholder="글 검색..." />
        <button onClick={() => setFilter('all')} className={`text-xs px-3 py-1.5 rounded-full border font-medium ${filter === 'all' ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 border-gray-200'}`}>전체</button>
        {Object.entries(TYPE_LABELS).map(([id, { emoji, label }]) => (
          <button key={id} onClick={() => setFilter(id)} className={`text-xs px-3 py-1.5 rounded-full border font-medium ${filter === id ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 border-gray-200'}`}>
            {emoji} {label}
          </button>
        ))}
      </div>

      <div className="text-sm text-gray-500">{activities.length}개의 글</div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {activities.map((a, i) => {
          const type = TYPE_LABELS[a.type] || { emoji: '📝', label: a.typeLabel || '글' };
          return (
            <div key={i} className="bg-white shadow rounded-xl p-4 hover:shadow-md transition">
              <div className="flex items-start gap-3">
                <span className="text-2xl mt-1">{type.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{a.title || '제목 없음'}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{type.label} · {new Date(a.createdAt).toLocaleDateString('ko-KR')}</p>
                  <p className="text-xs text-gray-600 mt-2 line-clamp-3 leading-relaxed">{a.content}</p>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-3">
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${a.status === 'submitted' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  {a.status === 'submitted' ? '제출 완료' : '임시 저장'}
                </span>
              </div>
            </div>
          );
        })}
        {activities.length === 0 && (
          <div className="col-span-2 text-center py-12 text-gray-400">
            <div className="text-4xl mb-3">📝</div>
            <p>아직 쓴 글이 없습니다</p>
            <button onClick={() => navigate('/morning-activity')} className="mt-3 px-4 py-2 bg-purple-600 text-white text-sm rounded-lg">첫 글 쓰러 가기</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ActivityArchive;
