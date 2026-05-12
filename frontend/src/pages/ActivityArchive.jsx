import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllActivities, getBadges, getTypeInfo, fetchAllActivitiesFromServer, getAllActivitiesWithMeta, saveMetadataToServer, toggleFavoriteOnServer } from '../utils/activityUtils';

const FILTER_GROUPS = [
  { id: 'all', label: '전체' },
  { id: '_morning', label: '아침 활동' },
  { id: '_manuscript', label: '원고지' },
  { id: '_fav', label: '즐겨찾기' },
];

function ActivityArchive({ embedded, onSwitchTab }) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [addedMsg, setAddedMsg] = useState('');
  const [detailIdx, setDetailIdx] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [allActivities, setAllActivities] = useState([]);

  useEffect(() => {
    fetchAllActivitiesFromServer().then(setAllActivities).catch(() => setAllActivities(getAllActivities()));
  }, [refreshKey]);

  const activities = useMemo(() => {
    let filtered = allActivities;
    if (filter === '_morning') filtered = filtered.filter(a => a.sourceType === 'morning');
    else if (filter === '_manuscript') filtered = filtered.filter(a => a.sourceType === 'manuscript');
    else if (filter === '_fav') filtered = filtered.filter(a => a.favorited);
    else if (filter !== 'all') filtered = filtered.filter(a => a.type === filter);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(a => a.title?.toLowerCase().includes(q) || a.content?.toLowerCase().includes(q));
    }
    return filtered;
  }, [filter, searchQuery, allActivities]);

  const pendingItems = useMemo(() => {
    return JSON.parse(localStorage.getItem('pending_for_studio') || '[]');
  }, [addedMsg]);

  const isInPending = useCallback((activity) => {
    return pendingItems.some(p => p.title === activity.title && p.createdAt === activity.createdAt);
  }, [pendingItems]);

  const toggleSelect = (idx) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const addToStudio = (activity) => {
    if (!activity.canUseInBook || isInPending(activity)) return;
    const pending = JSON.parse(localStorage.getItem('pending_for_studio') || '[]');
    pending.push(activity);
    localStorage.setItem('pending_for_studio', JSON.stringify(pending));
    setAddedMsg(`"${activity.title}" 편찬실에 담김`);
    setTimeout(() => setAddedMsg(''), 1500);
  };

  const addBulkToStudio = () => {
    const toAdd = [...selectedIds].map(i => activities[i]).filter(a => a?.canUseInBook && !isInPending(a));
    if (toAdd.length === 0) return;
    const pending = JSON.parse(localStorage.getItem('pending_for_studio') || '[]');
    pending.push(...toAdd);
    localStorage.setItem('pending_for_studio', JSON.stringify(pending));
    setAddedMsg(`${toAdd.length}개 글 편찬실에 담김`);
    setSelectedIds(new Set());
    setTimeout(() => setAddedMsg(''), 1500);
  };

  const handleSaveActivity = (updated) => {
    if (updated.sourceType === 'morning') {
      const all = JSON.parse(localStorage.getItem('morning_activities') || '[]');
      const idx = all.findIndex(a => a.createdAt === updated.createdAt && a.title === updated._origTitle);
      if (idx !== -1) {
        all[idx] = { ...all[idx], title: updated.title, content: updated.content, memo: updated.memo, favorited: updated.favorited };
        localStorage.setItem('morning_activities', JSON.stringify(all));
      }
    } else if (updated.sourceType === 'manuscript') {
      const all = JSON.parse(localStorage.getItem('manuscript_activities') || '[]');
      const idx = all.findIndex(a => a.completedAt === updated.createdAt && a.contentId === updated.contentId);
      if (idx !== -1) {
        all[idx] = { ...all[idx], memo: updated.memo, favorited: updated.favorited };
        localStorage.setItem('manuscript_activities', JSON.stringify(all));
      }
    }
    saveMetadataToServer(updated, { favorited: updated.favorited, memo: updated.memo });
    setRefreshKey(k => k + 1);
  };

  const handleToggleFavorite = (activity) => {
    const toggled = { ...activity, favorited: !activity.favorited, _origTitle: activity.title };
    if (toggled.sourceType === 'morning') {
      const all = JSON.parse(localStorage.getItem('morning_activities') || '[]');
      const idx = all.findIndex(a => a.createdAt === toggled.createdAt && a.title === toggled._origTitle);
      if (idx !== -1) { all[idx] = { ...all[idx], favorited: toggled.favorited }; localStorage.setItem('morning_activities', JSON.stringify(all)); }
    } else if (toggled.sourceType === 'manuscript') {
      const all = JSON.parse(localStorage.getItem('manuscript_activities') || '[]');
      const idx = all.findIndex(a => a.completedAt === toggled.createdAt && a.contentId === toggled.contentId);
      if (idx !== -1) { all[idx] = { ...all[idx], favorited: toggled.favorited }; localStorage.setItem('manuscript_activities', JSON.stringify(all)); }
    }
    toggleFavoriteOnServer(activity);
    setRefreshKey(k => k + 1);
  };

  const goToTab = (tabId) => {
    if (onSwitchTab) onSwitchTab(tabId);
    else navigate('/morning-activity');
  };

  if (detailIdx !== null && activities[detailIdx]) {
    return (
      <ActivityDetail
        activity={activities[detailIdx]}
        onBack={() => { setDetailIdx(null); setRefreshKey(k => k + 1); }}
        onSave={handleSaveActivity}
        onAddToStudio={addToStudio}
        isInPending={isInPending(activities[detailIdx])}
        onToggleFavorite={() => handleToggleFavorite(activities[detailIdx])}
        onGoToTab={goToTab}
      />
    );
  }

  return (
    <div className="space-y-4">
      {!embedded && (
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">📂 활동 보관함</h1>
            <p className="mt-1 text-sm text-gray-500">내가 한 모든 활동을 모아봅니다</p>
          </div>
          <button onClick={() => navigate('/dashboard')} className="text-primary-600 hover:text-primary-900 font-medium">← 홈으로</button>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 items-center">
        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-44 focus:ring-2 focus:ring-purple-400" placeholder="검색..." />
        {FILTER_GROUPS.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`text-[10px] px-2.5 py-1.5 rounded-full border font-medium ${filter === f.id ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-500 border-gray-200'}`}>
            {f.label}
          </button>
        ))}
        <div className="flex-1" />
        <span className="text-xs text-gray-400">{activities.length}개</span>
      </div>

      {addedMsg && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 text-xs text-purple-700 font-medium">{addedMsg}</div>
      )}

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
          <span className="text-xs text-gray-600">{selectedIds.size}개 선택</span>
          <button onClick={addBulkToStudio} className="text-[10px] px-3 py-1 bg-purple-600 text-white rounded-full font-medium hover:bg-purple-700">편찬실에 담기</button>
          <button onClick={() => setSelectedIds(new Set())} className="text-[10px] px-2 py-1 text-gray-400 hover:text-gray-600">취소</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {activities.map((a, i) => {
          const info = getTypeInfo(a);
          const badges = getBadges(a);
          const inPending = isInPending(a);
          return (
            <div key={`${a.createdAt}-${i}`}
              className={`bg-white shadow rounded-xl p-4 hover:shadow-md transition cursor-pointer ${selectedIds.has(i) ? 'ring-2 ring-purple-300' : ''}`}
              onClick={() => setDetailIdx(i)}>
              <div className="flex items-start gap-3">
                {a.canUseInBook && (
                  <input type="checkbox" checked={selectedIds.has(i)}
                    onChange={(e) => { e.stopPropagation(); toggleSelect(i); }}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1.5 h-4 w-4 rounded accent-purple-600" />
                )}
                <span className="text-2xl mt-0.5">{info.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    {a.favorited && <span className="text-amber-400 text-xs">★</span>}
                    <p className="text-sm font-semibold text-gray-800 truncate">{a.title || '제목 없음'}</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{info.label} · {new Date(a.createdAt).toLocaleDateString('ko-KR')}</p>
                  {a.content && <p className="text-xs text-gray-600 mt-1.5 line-clamp-2 leading-relaxed">{a.content}</p>}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-3">
                {a.accuracy != null && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${a.accuracy >= 80 ? 'bg-green-100 text-green-700' : a.accuracy >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{a.accuracy}%</span>
                )}
                {a.sessionId && <span className="text-[10px] font-bold text-purple-700">선생님 과제</span>}
                {badges.map((b, j) => (
                  <span key={j} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${b.color}`}>{b.label}</span>
                ))}
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${a.status === 'submitted' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  {a.status === 'submitted' ? '완료' : '임시'}
                </span>
                <div className="flex-1" />
                {a.canUseInBook && (
                  inPending
                    ? <span className="text-[10px] text-purple-500 font-medium" onClick={e => e.stopPropagation()}>편찬실에 담김</span>
                    : <button onClick={(e) => { e.stopPropagation(); addToStudio(a); }}
                        className="text-[10px] px-2.5 py-1 text-purple-600 bg-purple-50 rounded-full font-medium hover:bg-purple-100">편찬실에 담기</button>
                )}
              </div>
            </div>
          );
        })}
        {activities.length === 0 && (
          <div className="col-span-2 text-center py-14 text-gray-400">
            <div className="text-5xl mb-4">📝</div>
            <p className="text-base font-medium text-gray-600">아직 쓴 글이 없습니다</p>
            <p className="text-xs text-gray-400 mt-1">오늘 활동에서 첫 글을 써보세요</p>
            <button onClick={() => onSwitchTab ? onSwitchTab('today') : navigate('/morning-activity')}
              className="mt-4 px-6 py-2.5 bg-purple-600 text-white text-sm font-semibold rounded-xl hover:bg-purple-700 transition">
              첫 글 쓰러 가기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityDetail({ activity, onBack, onSave, onAddToStudio, isInPending, onToggleFavorite, onGoToTab }) {
  const info = getTypeInfo(activity);
  const badges = getBadges(activity);
  const isMorning = activity.sourceType === 'morning';
  const isManuscript = activity.sourceType === 'manuscript';
  const mode = activity.type?.replace('manuscript-', '') || '';
  const isTraining = mode === 'spacing' || mode === 'typo';

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(activity.title || '');
  const [editContent, setEditContent] = useState(activity.content || '');
  const [memo, setMemo] = useState(activity.memo || '');
  const [memoEditing, setMemoEditing] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const handleSaveEdit = () => {
    onSave({ ...activity, title: editTitle.trim() || activity.title, content: editContent.trim(), memo, _origTitle: activity.title });
    setEditing(false);
    setSaveMsg('저장됨');
    setTimeout(() => setSaveMsg(''), 1200);
  };

  const handleSaveMemo = () => {
    onSave({ ...activity, memo, _origTitle: activity.title });
    setMemoEditing(false);
    setSaveMsg('메모 저장됨');
    setTimeout(() => setSaveMsg(''), 1200);
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-xs text-gray-400 hover:text-gray-600">← 목록으로</button>

      {saveMsg && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 text-xs text-green-700 font-medium">{saveMsg}</div>
      )}

      <div className="bg-white shadow rounded-xl p-5 space-y-4">
        <div className="flex items-start gap-3">
          <span className="text-3xl">{info.emoji}</span>
          <div className="flex-1 min-w-0">
            {editing ? (
              <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm font-semibold" />
            ) : (
              <div className="flex items-center gap-1.5">
                <h2 className="text-lg font-bold text-gray-900">{activity.title || '제목 없음'}</h2>
                <button onClick={onToggleFavorite} className="text-lg" title={activity.favorited ? '즐겨찾기 해제' : '좋아하는 글로 표시'}>
                  {activity.favorited ? '★' : '☆'}
                </button>
              </div>
            )}
            <p className="text-xs text-gray-400 mt-1">
              {info.label} · {new Date(activity.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {activity.accuracy != null && (
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${activity.accuracy >= 80 ? 'bg-green-100 text-green-700' : activity.accuracy >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
              정확도 {activity.accuracy}%
            </span>
          )}
          {activity.sessionId && <span className="text-xs font-bold text-purple-700">선생님 과제</span>}
          {badges.map((b, j) => (
            <span key={j} className={`text-xs px-2.5 py-1 rounded-full font-medium ${b.color}`}>{b.label}</span>
          ))}
          <span className={`text-xs px-2.5 py-1 rounded-full ${activity.status === 'submitted' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
            {activity.status === 'submitted' ? '완료' : '임시 저장'}
          </span>
        </div>

        <div className="border-t border-gray-100 pt-4">
          {editing ? (
            <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={8}
              className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none leading-relaxed" />
          ) : (
            <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap min-h-[80px]">
              {activity.content || '(내용 없음)'}
            </div>
          )}
        </div>

        {activity.sourceAuthor && <p className="text-xs text-gray-400">출처: {activity.sourceAuthor} — {activity.sourceTitle || ''}</p>}
        {!activity.sourceAuthor && activity.author && <p className="text-xs text-gray-400">출처: {activity.author}</p>}
      </div>

      {activity.type === 'poem-copy' && activity.originalText && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-[10px] font-semibold text-amber-700 mb-2">원문 시</p>
          <p className="text-xs font-medium text-gray-700 mb-1">{activity.sourceTitle} — {activity.sourceAuthor}</p>
          <div className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{activity.originalText}</div>
        </div>
      )}

      {activity.feeling && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <p className="text-[10px] font-semibold text-purple-700 mb-1">느낌 한 줄</p>
          <p className="text-sm text-purple-800 italic">"{activity.feeling}"</p>
        </div>
      )}

      {/* 메모 */}
      <div className="bg-white shadow rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-gray-500">메모</h3>
          {!memoEditing && (
            <button onClick={() => setMemoEditing(true)} className="text-[10px] text-purple-600 hover:underline">{memo ? '수정' : '메모 남기기'}</button>
          )}
        </div>
        {memoEditing ? (
          <div className="space-y-2">
            <textarea value={memo} onChange={e => setMemo(e.target.value)} rows={2}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-xs resize-none" placeholder="이 글에 대한 생각을 남겨보세요..." />
            <div className="flex gap-1.5 justify-end">
              <button onClick={() => { setMemo(activity.memo || ''); setMemoEditing(false); }} className="text-[10px] text-gray-400">취소</button>
              <button onClick={handleSaveMemo} className="text-[10px] px-3 py-1 bg-purple-600 text-white rounded-full font-medium">저장</button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-500 leading-relaxed">{memo || '아직 메모가 없습니다'}</p>
        )}
      </div>

      {/* 이 글 관리 */}
      {!editing && (
        <div className="bg-white shadow rounded-xl p-4 space-y-2">
          <h3 className="text-xs font-semibold text-gray-500 mb-1">이 글 관리</h3>
          <div className="flex flex-wrap gap-2">
            {isMorning && (
              <button onClick={() => setEditing(true)} className="text-xs px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">
                수정하기
              </button>
            )}
            <button onClick={onToggleFavorite} className="text-xs px-4 py-2 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 font-medium">
              {activity.favorited ? '즐겨찾기 해제' : '좋아하는 글로 표시'}
            </button>
          </div>
        </div>
      )}

      {/* 편집 모드 */}
      {editing && (
        <div className="flex gap-2">
          <button onClick={handleSaveEdit} className="text-xs px-5 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium">저장</button>
          <button onClick={() => { setEditing(false); setEditTitle(activity.title || ''); setEditContent(activity.content || ''); }}
            className="text-xs px-3 py-2 text-gray-400 hover:text-gray-600">취소</button>
        </div>
      )}

      {/* 다음 활동 */}
      {!editing && (
        <div className="bg-white shadow rounded-xl p-4 space-y-2">
          <h3 className="text-xs font-semibold text-gray-500 mb-1">다음 활동</h3>
          <div className="flex flex-wrap gap-2">
            {activity.canUseInBook && (
              isInPending
                ? <span className="text-xs px-4 py-2 text-purple-500 bg-purple-50 rounded-lg font-medium">편찬실에 담김</span>
                : <button onClick={() => onAddToStudio(activity)} className="text-xs px-4 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 font-medium">편찬실에 담기</button>
            )}
            {isManuscript && (
              <button onClick={() => onGoToTab('manuscript')} className="text-xs px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 font-medium">
                다시 연습하기
              </button>
            )}
            {(isMorning || mode === 'continue') && (
              <button onClick={() => onGoToTab('today')} className="text-xs px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 font-medium">
                비슷한 글 새로 쓰기
              </button>
            )}
            {isTraining && (
              <span className="text-xs px-4 py-2 bg-gray-50 text-gray-400 rounded-lg">성장 기록에 반영됩니다</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ActivityArchive;
