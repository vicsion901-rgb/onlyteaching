import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

function CreativeStudio({ embedded }) {
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [collectionTitle, setCollectionTitle] = useState('');

  const activities = useMemo(() => JSON.parse(localStorage.getItem('morning_activities') || '[]').filter(a => a.status === 'submitted'), []);

  const toggleSelect = (idx) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const handleCreateCollection = () => {
    if (selectedIds.size === 0) return;
    const selected = [...selectedIds].map(i => activities[i]).filter(Boolean);
    const collection = {
      title: collectionTitle || `내 글 모음 - ${new Date().toLocaleDateString('ko-KR')}`,
      items: selected,
      createdAt: new Date().toISOString(),
    };
    const collections = JSON.parse(localStorage.getItem('creative_collections') || '[]');
    collections.unshift(collection);
    localStorage.setItem('creative_collections', JSON.stringify(collections));
    setSelectedIds(new Set());
    setCollectionTitle('');
    alert(`"${collection.title}" 묶음이 만들어졌습니다!`);
  };

  return (
    <div className="space-y-6">
      {!embedded && (<div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📖 창작 편찬실</h1>
          <p className="mt-1 text-sm text-gray-500">내가 쓴 글을 모아 묶음을 만들어보세요</p>
        </div>
        <button onClick={() => navigate('/dashboard')} className="text-primary-600 hover:text-primary-900 font-medium">← 홈으로</button>
      </div>)}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 왼쪽: 글 선택 */}
        <div className="lg:col-span-2 bg-white shadow rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">제출한 글 목록 ({activities.length}개)</h2>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {activities.map((a, i) => (
              <label key={i} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${selectedIds.has(i) ? 'border-purple-400 bg-purple-50' : 'border-gray-100 hover:bg-gray-50'}`}>
                <input type="checkbox" checked={selectedIds.has(i)} onChange={() => toggleSelect(i)} className="mt-1 h-4 w-4 rounded" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{a.title || '제목 없음'}</p>
                  <p className="text-xs text-gray-400">{a.typeLabel} · {new Date(a.createdAt).toLocaleDateString('ko-KR')}</p>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{a.content}</p>
                </div>
              </label>
            ))}
            {activities.length === 0 && <p className="text-xs text-gray-400 text-center py-8">제출한 글이 없습니다</p>}
          </div>
        </div>

        {/* 오른쪽: 묶음 만들기 */}
        <div className="bg-white shadow rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">묶음 만들기</h2>
          <p className="text-xs text-gray-400">{selectedIds.size}개 선택됨</p>

          <input type="text" value={collectionTitle} onChange={e => setCollectionTitle(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" placeholder="묶음 제목 (예: 봄에 쓴 글 모음)" />

          <button onClick={handleCreateCollection} disabled={selectedIds.size === 0}
            className="w-full py-2.5 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 disabled:bg-gray-300">
            묶음 만들기
          </button>

          {/* 기존 묶음 */}
          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-xs font-semibold text-gray-500 mb-2">만든 묶음</h3>
            <ExistingCollections navigate={navigate} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ExistingCollections({ navigate }) {
  const collections = JSON.parse(localStorage.getItem('creative_collections') || '[]');
  if (collections.length === 0) return <p className="text-xs text-gray-400">아직 묶음이 없습니다</p>;

  return (
    <div className="space-y-2">
      {collections.map((c, i) => (
        <div key={i} className="p-2 rounded-lg border border-gray-100 hover:bg-gray-50">
          <p className="text-sm font-medium text-gray-800">{c.title}</p>
          <p className="text-xs text-gray-400">{c.items?.length || 0}개 글 · {new Date(c.createdAt).toLocaleDateString('ko-KR')}</p>
          <button onClick={() => navigate('/my-book')} className="text-[10px] text-purple-600 mt-1 hover:underline">→ 책으로 만들기</button>
        </div>
      ))}
    </div>
  );
}

export default CreativeStudio;
