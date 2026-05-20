import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTypeInfo, getBadges } from '../utils/activityUtils';
import { fetchCollections, createCollection } from '../utils/collectionApi';
import useActivities from '../hooks/useActivities';

function CreativeStudio({ embedded, onSwitchTab, onGoToBookWithCollection }) {
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [collectionTitle, setCollectionTitle] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [pendingRefresh, setPendingRefresh] = useState(0);
  const [collections, setCollections] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cs_collections') || '[]'); } catch { return []; }
  });
  const [collectionsLoaded, setCollectionsLoaded] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { activities: allActivities, isLoading: activitiesLoading } = useActivities();

  useEffect(() => {
    fetchCollections()
      .then((data) => {
        const arr = Array.isArray(data) ? data : [];
        setCollections(arr);
        try { localStorage.setItem('cs_collections', JSON.stringify(arr)); } catch {}
      })
      .catch(() => {})
      .finally(() => setCollectionsLoaded(true));
  }, [refreshKey]);

  const pendingItems = useMemo(() => {
    return JSON.parse(localStorage.getItem('pending_for_studio') || '[]');
  }, [pendingRefresh]);

  const clearPendingItem = (idx) => {
    const pending = [...pendingItems];
    pending.splice(idx, 1);
    localStorage.setItem('pending_for_studio', JSON.stringify(pending));
    setPendingRefresh(v => v + 1);
  };

  const activities = useMemo(() => {
    const all = allActivities.filter(a => {
      if (a.status !== 'submitted' && a.sourceType !== 'manuscript') return false;
      return a.canUseInBook;
    });
    if (sourceFilter === 'morning') return all.filter(a => a.sourceType === 'morning');
    if (sourceFilter === 'manuscript') return all.filter(a => a.sourceType === 'manuscript');
    return all;
  }, [sourceFilter, allActivities]);

  const toggleSelect = (idx) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const handleCreateCollection = async () => {
    if (selectedIds.size === 0) return;
    const selected = [...selectedIds].map(i => activities[i]).filter(Boolean);
    const title = collectionTitle || `내 글 모음 - ${new Date().toLocaleDateString('ko-KR')}`;
    const result = await createCollection({ title, items: selected });
    setCollections(prev => [result, ...prev]);
    setSelectedIds(new Set());
    setCollectionTitle('');
    alert(`"${result.title}" 묶음이 만들어졌습니다!`);
  };

  return (
    <div className="space-y-6">
      {!embedded && (<div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📖 창작 편찬실</h1>
          <p className="mt-1 text-sm text-gray-500">편찬 가능한 글을 모아 묶음을 만들어보세요</p>
        </div>
      </div>)}

      {pendingItems.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-purple-700">보관함에서 담은 글 ({pendingItems.length}개)</h3>
            <button onClick={() => {
              const existing = [...selectedIds];
              pendingItems.forEach((p) => {
                const idx = activities.findIndex(a => a.title === p.title && a.createdAt === p.createdAt);
                if (idx !== -1) existing.push(idx);
              });
              setSelectedIds(new Set(existing));
              localStorage.setItem('pending_for_studio', '[]');
              setPendingRefresh(v => v + 1);
            }} className="text-[10px] px-2 py-1 bg-purple-600 text-white rounded-full font-medium hover:bg-purple-700">
              전부 선택에 반영
            </button>
          </div>
          <div className="space-y-1">
            {pendingItems.map((p, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="text-gray-700 truncate flex-1">{p.title || '제목 없음'}</span>
                <span className="text-gray-400">{p.typeLabel || ''}</span>
                <button onClick={() => clearPendingItem(i)} className="text-red-400 hover:text-red-600 text-[10px]">제거</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white shadow rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-semibold text-gray-700">편찬 가능한 글 ({activities.length}개)</h2>
            <div className="flex gap-1 ml-auto">
              {[
                { id: 'all', label: '전체' },
                { id: 'morning', label: '아침 활동' },
                { id: 'manuscript', label: '원고지' },
              ].map(f => (
                <button key={f.id} onClick={() => { setSourceFilter(f.id); setSelectedIds(new Set()); }}
                  className={`text-[10px] px-2 py-1 rounded-full font-medium ${sourceFilter === f.id ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          {activities.length > 0 && <SelectAllBar activities={activities} selectedIds={selectedIds} setSelectedIds={setSelectedIds} />}
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {activities.map((a, i) => {
              const info = getTypeInfo(a);
              const badges = getBadges(a);
              return (
                <label key={a._id || i} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${selectedIds.has(i) ? 'border-purple-400 bg-purple-50' : 'border-gray-100 hover:bg-gray-50'}`}>
                  <input type="checkbox" checked={selectedIds.has(i)} onChange={() => toggleSelect(i)} className="mt-1 h-4 w-4 rounded" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{info.emoji}</span>
                      <p className="text-sm font-medium text-gray-800 truncate">{a.title || '제목 없음'}</p>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{info.label} · {new Date(a.createdAt).toLocaleDateString('ko-KR')}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {badges.map((b, j) => (
                        <span key={j} className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${b.color}`}>{b.label}</span>
                      ))}
                    </div>
                    {a.content && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{a.content}</p>}
                  </div>
                </label>
              );
            })}
            {activities.length === 0 && activitiesLoading && (
              <div className="space-y-2 py-2">
                {[0,1,2].map(i => (<div key={i} className="h-10 rounded-lg bg-gray-100 animate-pulse" />))}
              </div>
            )}
            {activities.length === 0 && !activitiesLoading && <p className="text-xs text-gray-400 text-center py-8">편찬 가능한 글이 없습니다</p>}
          </div>
        </div>

        <div className="bg-white shadow rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">묶음 만들기</h2>
          <p className="text-xs text-gray-400">{selectedIds.size}개 선택됨</p>

          <input type="text" value={collectionTitle} onChange={e => setCollectionTitle(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" placeholder="묶음 제목 (예: 봄에 쓴 글 모음)" />

          <button onClick={handleCreateCollection} disabled={selectedIds.size === 0}
            className="w-full py-2.5 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 disabled:bg-gray-300">
            묶음 만들기
          </button>

          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-xs font-semibold text-gray-500 mb-2">만든 묶음</h3>
            <ExistingCollections collections={collections} loaded={collectionsLoaded} navigate={navigate} onSwitchTab={onSwitchTab} onGoToBookWithCollection={onGoToBookWithCollection} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ExistingCollections({ collections, loaded, navigate, onSwitchTab, onGoToBookWithCollection }) {
  if (!loaded && collections.length === 0) {
    return (
      <div className="space-y-1.5">
        {[0,1].map(i => (<div key={i} className="h-9 rounded-lg bg-gray-100 animate-pulse" />))}
      </div>
    );
  }
  if (collections.length === 0) return <p className="text-xs text-gray-400">아직 묶음이 없습니다</p>;

  return (
    <div className="space-y-2">
      {collections.map((c) => (
        <div key={c.id} className="p-2 rounded-lg border border-gray-100 hover:bg-gray-50">
          <p className="text-sm font-medium text-gray-800">{c.title}</p>
          <p className="text-xs text-gray-400">{c.items?.length || 0}개 글 · {new Date(c.createdAt).toLocaleDateString('ko-KR')}</p>
          <button onClick={() => onGoToBookWithCollection ? onGoToBookWithCollection(c.id) : onSwitchTab ? onSwitchTab('book') : navigate('/my-book')}
            className="text-[10px] text-purple-600 mt-1 hover:underline">→ 책으로 만들기</button>
        </div>
      ))}
    </div>
  );
}

function SelectAllBar({ activities, selectedIds, setSelectedIds }) {
  const checkRef = useRef(null);
  const allIndices = useMemo(() => activities.map((_, i) => i), [activities]);
  const selectedCount = allIndices.filter(i => selectedIds.has(i)).length;
  const allSelected = selectedCount === allIndices.length && allIndices.length > 0;
  const someSelected = selectedCount > 0 && !allSelected;

  useEffect(() => {
    if (checkRef.current) checkRef.current.indeterminate = someSelected;
  }, [someSelected]);

  const handleToggleAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        allIndices.forEach(i => next.delete(i));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        allIndices.forEach(i => next.add(i));
        return next;
      });
    }
  }, [allSelected, allIndices, setSelectedIds]);

  return (
    <div className="flex items-center gap-3 mb-2 px-1 py-1.5 bg-gray-50 rounded-lg border border-gray-100">
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          ref={checkRef}
          type="checkbox"
          checked={allSelected}
          onChange={handleToggleAll}
          className="h-4 w-4 rounded"
          aria-label="현재 보이는 항목 전체 선택"
        />
        <span className="text-xs text-gray-600 font-medium">전체 선택</span>
      </label>
      <span className="text-[11px] text-gray-400">
        {selectedCount > 0 ? `${selectedCount} / ${allIndices.length}개 선택됨` : `${allIndices.length}개 항목`}
      </span>
    </div>
  );
}

export default CreativeStudio;
