import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBookableActivities, getTypeInfo, buildActivityMap, getBadges } from '../utils/activityUtils';
import useActivities from '../hooks/useActivities';
import { generateBookPdf } from '../utils/bookPdfGenerator';
import { fetchCollections, fetchCollectionById, createCollection } from '../utils/collectionApi';

const BOOK_TYPES = [
  { id: 'poem',   emoji: '📜', label: '내 시집',       desc: '필사한 시와 내가 쓴 문장 모음', hint: '필사 결과가 들어갑니다' },
  { id: 'story',  emoji: '📖', label: '내 이야기책',    desc: '이어쓰기로 만든 이야기 모음',  hint: '이어쓰기 결과가 들어갑니다' },
  { id: 'essay',  emoji: '✍️', label: '내 에세이집',    desc: '일기, 편지, 감상문 모음',     hint: '일기·편지·감상문이 들어갑니다' },
  { id: 'growth', emoji: '🌱', label: '내 성장 기록집',  desc: '한 학기 문해력 성장 기록',    hint: '대표 글 + 성장 통계가 들어갑니다' },
];

function MyBook({ embedded, onSwitchTab, initialCollectionId, onClearInitialCollection }) {
  const navigate = useNavigate();
  const { activities: allActivityData, isLoading: activitiesLoading } = useActivities();
  const [step, setStep] = useState(1);
  const [bookType, setBookType] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bookTitle, setBookTitle] = useState('');
  const [bookSubtitle, setBookSubtitle] = useState('');
  const [authorName, setAuthorName] = useState('');

  // step 2 모드 — 'recommended' | 'all' | 'collection'
  // - recommended: bookType별 자동 추천 글
  // - all: 전체 글에서 직접 고르기 (옛 창작 편찬실의 핵심 흐름 흡수)
  // - collection: 미리 만들어 둔 편찬실 묶음 사용
  const [selectMode, setSelectMode] = useState('recommended');
  const [selectedCollectionId, setSelectedCollectionId] = useState(null);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [collections, setCollections] = useState(() => {
    try { return JSON.parse(localStorage.getItem('mb_collections') || '[]'); } catch { return []; }
  });
  const [collectionsLoaded, setCollectionsLoaded] = useState(false);
  // all 모드 전용 — 필터 + 묶음 저장 입력
  const [allSourceFilter, setAllSourceFilter] = useState('all');
  const [stashCollectionTitle, setStashCollectionTitle] = useState('');
  const [stashSavedMsg, setStashSavedMsg] = useState('');
  const useCollection = selectMode === 'collection';

  useEffect(() => {
    fetchCollections()
      .then((data) => {
        const arr = Array.isArray(data) ? data : [];
        setCollections(arr);
        try { localStorage.setItem('mb_collections', JSON.stringify(arr)); } catch {}
      })
      .catch(() => {})
      .finally(() => setCollectionsLoaded(true));
  }, []);

  useEffect(() => {
    if (initialCollectionId !== null && initialCollectionId !== undefined) {
      fetchCollectionById(initialCollectionId).then(found => {
        if (found) {
          setSelectMode('collection');
          setSelectedCollectionId(found.id);
          setSelectedCollection(found);
          const items = found.items || [];
          setSelectedIds(new Set(items.map(item => item._id || items.indexOf(item))));
        }
      }).catch(() => {
        const local = collections.find(c => c.id === initialCollectionId);
        if (local) {
          setSelectMode('collection');
          setSelectedCollectionId(local.id);
          setSelectedCollection(local);
          setSelectedIds(new Set((local.items || []).map(item => item._id || (local.items || []).indexOf(item))));
        }
      });
      if (onClearInitialCollection) onClearInitialCollection();
    }
  }, [initialCollectionId]);

  // step 2 본문 리스트 — 모드별로 다른 소스
  const recommendedActivities = useMemo(() => {
    if (!bookType) return [];
    if (selectMode === 'collection' && selectedCollection) return selectedCollection.items || [];
    if (selectMode === 'all') {
      // 전체 글에서 책에 사용 가능한 모든 항목 (옛 창작 편찬실 화면과 동일 기준)
      const all = allActivityData.filter((a) => {
        if (a.status !== 'submitted' && a.sourceType !== 'manuscript') return false;
        return a.canUseInBook;
      });
      if (allSourceFilter === 'morning') return all.filter((a) => a.sourceType === 'morning');
      if (allSourceFilter === 'manuscript') return all.filter((a) => a.sourceType === 'manuscript');
      return all;
    }
    return getBookableActivities(bookType.id);
  }, [bookType, selectMode, selectedCollection, allActivityData, allSourceFilter]);

  // 전체 모드 전용 — 선택된 글들을 별도 묶음으로도 저장 (책에는 그대로 사용)
  const handleStashAsCollection = async () => {
    if (selectedIds.size === 0) return;
    const items = recommendedActivities.filter((a, i) => {
      const id = a._id || i;
      return selectedIds.has(id);
    });
    if (items.length === 0) return;
    const title = stashCollectionTitle.trim() || `내 글 모음 - ${new Date().toLocaleDateString('ko-KR')}`;
    try {
      const result = await createCollection({ title, items });
      setCollections((prev) => [result, ...prev]);
      setStashCollectionTitle('');
      setStashSavedMsg(`"${result.title}" 묶음으로 저장됨`);
      setTimeout(() => setStashSavedMsg(''), 2500);
    } catch {
      setStashSavedMsg('묶음 저장에 실패했어요');
      setTimeout(() => setStashSavedMsg(''), 2500);
    }
  };

  const activityMap = useMemo(() => buildActivityMap(recommendedActivities), [recommendedActivities]);

  const growthStats = useMemo(() => {
    if (bookType?.id !== 'growth') return null;
    const all = allActivityData;
    const total = all.length;
    const submitted = all.filter(a => a.status === 'submitted').length;
    const manuscript = all.filter(a => a.sourceType === 'manuscript');
    const avgAccuracy = manuscript.length > 0
      ? Math.round(manuscript.filter(a => a.accuracy != null).reduce((s, a) => s + a.accuracy, 0) / Math.max(1, manuscript.filter(a => a.accuracy != null).length))
      : null;
    const types = {};
    all.forEach(a => {
      const label = getTypeInfo(a).label;
      types[label] = (types[label] || 0) + 1;
    });
    return { total, submitted, manuscriptCount: manuscript.length, avgAccuracy, types };
  }, [bookType, allActivityData]);

  const selectedItems = useMemo(() => {
    return [...selectedIds].map(id => activityMap.get(id) || recommendedActivities[id]).filter(Boolean);
  }, [selectedIds, activityMap, recommendedActivities]);

  const toggleSelect = (activity) => {
    const id = activity._id || recommendedActivities.indexOf(activity);
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === recommendedActivities.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(recommendedActivities.map(a => a._id || recommendedActivities.indexOf(a))));
    }
  };

  return (
    <div className="space-y-6">
      {!embedded && (<div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📕 내 책 만들기</h1>
          <p className="mt-1 text-sm text-gray-500">내가 쓴 글을 한 권의 책으로 만들어보세요</p>
        </div>
      </div>)}

      <div className="flex items-center gap-2 text-xs text-gray-400">
        {['책 종류', '글 선택', '책 정보', '미리보기'].map((s, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span>→</span>}
            <span className={`px-2 py-1 rounded-full ${step === i + 1 ? 'bg-purple-600 text-white font-semibold' : 'bg-gray-100'}`}>{s}</span>
          </React.Fragment>
        ))}
      </div>

      {step === 1 && (
        <div className="grid grid-cols-2 gap-4">
          {BOOK_TYPES.map(bt => {
            const count = getBookableActivities(bt.id).length;
            return (
              <button key={bt.id} onClick={() => { setBookType(bt); setSelectedIds(new Set()); setStep(2); }}
                className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-gray-100 hover:border-purple-300 hover:bg-purple-50 transition text-center">
                <span className="text-4xl">{bt.emoji}</span>
                <span className="text-base font-semibold text-gray-800">{bt.label}</span>
                <span className="text-[10px] text-gray-400">{bt.desc}</span>
                <span className="text-[10px] text-purple-500 font-medium">{bt.id === 'growth' ? '전체 활동 기반' : `${count}개 글 사용 가능`}</span>
              </button>
            );
          })}
        </div>
      )}

      {step === 2 && (
        <div className="bg-white shadow rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-800">{bookType.emoji} {bookType.label}에 넣을 글</h2>
              <p className="text-[10px] text-gray-400 mt-0.5">{bookType.hint}</p>
            </div>
            {!useCollection && recommendedActivities.length > 0 && (
              <button onClick={selectAll} className="text-[10px] text-purple-600 font-medium hover:underline">
                {selectedIds.size === recommendedActivities.length ? '전체 해제' : '전체 선택'}
              </button>
            )}
          </div>

          {/* 모드 토글 — 추천 / 전체 / 묶음 */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'recommended', label: '이 책에 맞는 추천 글' },
              { id: 'all',         label: '전체 글에서 고르기' },
              ...(collections.length > 0 ? [{ id: 'collection', label: '내가 만든 묶음 사용' }] : []),
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => { setSelectMode(m.id); setSelectedIds(new Set()); setSelectedCollection(null); setSelectedCollectionId(null); }}
                className={`text-[11px] px-2.5 py-1 rounded-full font-medium border transition ${
                  selectMode === m.id
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {selectMode === 'all' && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-gray-500">소스:</span>
                {[
                  { id: 'all', label: '전체' },
                  { id: 'morning', label: '아침 활동' },
                  { id: 'manuscript', label: '원고지' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => { setAllSourceFilter(f.id); setSelectedIds(new Set()); }}
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      allSourceFilter === f.id ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-400">
                책에 바로 넣을 글을 고르거나, 선택한 글을 묶음으로 저장해 나중에 다시 쓸 수 있어요.
              </p>
            </div>
          )}

          {selectMode === 'collection' && selectedCollection && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-purple-700">선택된 묶음: {selectedCollection.title}</p>
                <p className="text-[10px] text-purple-500">{selectedCollection.items?.length || 0}개 글 포함</p>
              </div>
              <button onClick={() => { setSelectedCollectionId(null); setSelectedCollection(null); setSelectedIds(new Set()); }}
                className="text-[10px] text-purple-500 hover:text-purple-700">다른 묶음</button>
            </div>
          )}

          {selectMode === 'collection' && !selectedCollection && (
            <div className="space-y-2">
              {collections.map((c, i) => (
                <label key={c.id || i} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${selectedCollectionId === (c.id || i) ? 'border-purple-400 bg-purple-50' : 'border-gray-100'}`}>
                  <input type="radio" name="collection" checked={selectedCollectionId === c.id}
                    onChange={() => {
                      setSelectedCollectionId(c.id);
                      setSelectedCollection(c);
                      setSelectedIds(new Set((c.items || []).map(a => a._id || (c.items || []).indexOf(a))));
                    }} />
                  <div>
                    <p className="text-sm font-medium">{c.title}</p>
                    <p className="text-xs text-gray-400">{c.items?.length || 0}개 글 · {new Date(c.createdAt).toLocaleDateString('ko-KR')}</p>
                  </div>
                </label>
              ))}
            </div>
          )}

          {bookType.id === 'growth' && growthStats && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-emerald-700 mb-1">성장 기록집에는 아래 내용이 자동 포함됩니다</p>
              <ul className="text-[10px] text-emerald-600 space-y-0.5">
                <li>총 {growthStats.total}개 활동 · 제출 {growthStats.submitted}개</li>
                {growthStats.manuscriptCount > 0 && <li>원고지 연습 {growthStats.manuscriptCount}회{growthStats.avgAccuracy != null && ` · 평균 정확도 ${growthStats.avgAccuracy}%`}</li>}
                <li>활동 유형: {Object.entries(growthStats.types).map(([k, v]) => `${k} ${v}회`).join(', ')}</li>
              </ul>
              <p className="text-[10px] text-emerald-500 mt-1">아래에서 대표 글을 골라 본문에 넣을 수 있습니다</p>
            </div>
          )}

          {selectMode !== 'collection' && (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {recommendedActivities.map((a, i) => {
                const info = getTypeInfo(a);
                const aid = a._id || i;
                const badges = selectMode === 'all' ? getBadges(a) : [];
                return (
                  <label key={aid} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${selectedIds.has(aid) ? 'border-purple-400 bg-purple-50' : 'border-gray-100 hover:bg-gray-50'}`}>
                    <input type="checkbox" checked={selectedIds.has(aid)} onChange={() => toggleSelect(a)} className="mt-1 h-4 w-4 rounded" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{info.emoji}</span>
                        <p className="text-sm font-medium text-gray-800 truncate">{a.title || '제목 없음'}</p>
                      </div>
                      <p className="text-xs text-gray-400">{info.label} · {new Date(a.createdAt).toLocaleDateString('ko-KR')}</p>
                      {badges.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {badges.map((b, j) => (
                            <span key={j} className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${b.color}`}>{b.label}</span>
                          ))}
                        </div>
                      )}
                      {a.content && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{a.content}</p>}
                    </div>
                  </label>
                );
              })}
              {recommendedActivities.length === 0 && activitiesLoading && (
                <div className="space-y-2 py-2">
                  {[0,1,2].map(i => (<div key={i} className="h-12 rounded-lg bg-gray-100 animate-pulse" />))}
                </div>
              )}
              {recommendedActivities.length === 0 && !activitiesLoading && (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-sm">{bookType.id === 'growth' ? '대표 글을 넣으려면 활동을 먼저 해 보세요' : selectMode === 'all' ? '아직 책에 쓸 수 있는 글이 없어요' : '이 유형에 맞는 글이 아직 없습니다'}</p>
                  <button onClick={() => onSwitchTab ? onSwitchTab('today') : navigate('/morning-activity')} className="mt-2 text-purple-600 text-xs underline">활동하러 가기</button>
                </div>
              )}
            </div>
          )}

          {selectMode === 'all' && selectedIds.size > 0 && (
            <div className="border-t border-gray-100 pt-3 mt-2 space-y-2">
              <p className="text-[11px] font-semibold text-gray-600">선택한 글을 묶음으로도 저장 (선택)</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={stashCollectionTitle}
                  onChange={(e) => setStashCollectionTitle(e.target.value)}
                  placeholder="묶음 제목 (예: 봄에 쓴 글 모음)"
                  className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs"
                />
                <button
                  type="button"
                  onClick={handleStashAsCollection}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg bg-white border border-purple-200 text-purple-700 hover:bg-purple-50"
                >
                  묶음으로 저장
                </button>
              </div>
              {stashSavedMsg && <p className="text-[11px] text-emerald-600">{stashSavedMsg}</p>}
            </div>
          )}

          <div className="flex justify-between">
            <button onClick={() => setStep(1)} className="text-sm text-gray-400">← 이전</button>
            <button onClick={() => setStep(3)} disabled={bookType.id !== 'growth' && selectedIds.size === 0 && !(useCollection && selectedCollection)}
              className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg disabled:bg-gray-300">다음 →</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="bg-white shadow rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">책 정보를 입력하세요</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
            <input type="text" value={bookTitle} onChange={e => setBookTitle(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" placeholder={bookType?.label || '내 책'} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">부제 (선택)</label>
            <input type="text" value={bookSubtitle} onChange={e => setBookSubtitle(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" placeholder="예: 2026년 봄, 나의 이야기" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">글쓴이</label>
            <input type="text" value={authorName} onChange={e => setAuthorName(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" placeholder="내 이름" />
          </div>
          <div className="flex justify-between">
            <button onClick={() => setStep(2)} className="text-sm text-gray-400">← 이전</button>
            <button onClick={() => setStep(4)} className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg">미리보기 →</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="bg-white shadow rounded-xl p-6 space-y-6">
          <div className="text-center py-8 bg-amber-50 rounded-xl border-2 border-amber-200">
            <span className="text-5xl">{bookType?.emoji}</span>
            <h2 className="text-xl font-bold text-gray-900 mt-3">{bookTitle || bookType?.label}</h2>
            {bookSubtitle && <p className="text-sm text-gray-500 mt-1">{bookSubtitle}</p>}
            <p className="text-sm text-gray-600 mt-2">글쓴이: {authorName || '나'}</p>
            <p className="text-xs text-gray-400 mt-2">{selectedItems.length}편 수록</p>
          </div>

          {selectedItems.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">목차</h3>
              <ol className="list-decimal list-inside space-y-1">
                {selectedItems.map((item, i) => {
                  const info = getTypeInfo(item);
                  return (
                    <li key={i} className="text-sm text-gray-600">
                      <span>{info.emoji} {item.title || `글 ${i + 1}`}</span>
                      <span className="text-[10px] text-gray-400 ml-2">{info.label}</span>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          {selectedItems.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">본문 미리보기</h3>
              <div className="space-y-4 max-h-[300px] overflow-y-auto">
                {selectedItems.slice(0, 3).map((item, i) => {
                  const info = getTypeInfo(item);
                  return (
                    <div key={i} className="border-l-2 border-purple-200 pl-3">
                      <p className="text-xs font-semibold text-gray-700">{info.emoji} {item.title || `글 ${i + 1}`}</p>
                      <p className="text-xs text-gray-600 mt-1 leading-relaxed whitespace-pre-wrap line-clamp-4">{item.content || '(내용 없음)'}</p>
                      {item.feeling && <p className="text-[10px] text-purple-600 italic mt-1">"{item.feeling}"</p>}
                      {bookType?.id === 'poem' && item.sourceAuthor && <p className="text-[10px] text-gray-400 mt-0.5">원작: {item.sourceAuthor}</p>}
                    </div>
                  );
                })}
                {selectedItems.length > 3 && <p className="text-[10px] text-gray-400">... 외 {selectedItems.length - 3}편</p>}
              </div>
            </div>
          )}

          {bookType?.id === 'growth' && growthStats && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">부록: 성장 기록</h3>
              <div className="bg-emerald-50 rounded-lg p-4 space-y-2 text-xs text-emerald-700">
                <p>총 {growthStats.total}개 활동 수행 · {growthStats.submitted}개 제출 완료</p>
                {growthStats.manuscriptCount > 0 && (
                  <p>원고지 연습 {growthStats.manuscriptCount}회{growthStats.avgAccuracy != null && ` · 평균 정확도 ${growthStats.avgAccuracy}%`}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-1">
                  {Object.entries(growthStats.types).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                    <span key={k} className="px-2 py-0.5 bg-white rounded-full text-[10px] text-emerald-600 border border-emerald-200">{k} {v}회</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center">
            <button onClick={() => setStep(3)} className="text-sm text-gray-400">← 이전</button>
            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="px-4 py-2 text-xs text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200">다시 편집</button>
              <button onClick={() => generateBookPdf({
                bookType: bookType?.id,
                title: bookTitle || bookType?.label,
                subtitle: bookSubtitle,
                author: authorName,
                items: selectedItems,
                growthStats,
              })} className="px-6 py-2.5 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700">📄 PDF 만들기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyBook;
