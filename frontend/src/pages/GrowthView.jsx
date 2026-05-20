import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTypeInfo } from '../utils/activityUtils';
import useActivities from '../hooks/useActivities';
import StatCard from '../components/StatCard';

const MONTH_LABELS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

function GrowthView({ embedded, onSwitchTab }) {
  const navigate = useNavigate();
  const { activities, isLoading } = useActivities();

  // 활동 유형 + 월 drill-down 상태
  const [selectedType, setSelectedType] = useState(null);     // 활동 유형 label
  const [selectedMonth, setSelectedMonth] = useState(null);   // 0~11

  const { stats, recentActivities } = useMemo(() => {
    const total = activities.length;
    const submitted = activities.filter(a => a.status === 'submitted').length;
    const types = {};
    const months = {};
    let totalLength = 0;

    const manuscriptModes = {};
    let totalAccuracy = 0;
    let accuracyCount = 0;

    activities.forEach(a => {
      const label = getTypeInfo(a).label;
      types[label] = (types[label] || 0) + 1;
      const month = new Date(a.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });
      months[month] = (months[month] || 0) + 1;
      totalLength += (a.content || '').length;
      if (a.sourceType === 'manuscript') {
        const mode = a.type.replace('manuscript-', '');
        manuscriptModes[mode] = (manuscriptModes[mode] || 0) + 1;
        if (a.accuracy != null) {
          totalAccuracy += a.accuracy;
          accuracyCount++;
        }
      }
    });

    const topType = Object.entries(types).sort((a, b) => b[1] - a[1])[0];
    const avgLength = total > 0 ? Math.round(totalLength / total) : null;
    const avgAccuracy = accuracyCount > 0 ? Math.round(totalAccuracy / accuracyCount) : null;
    const manuscriptTotal = Object.values(manuscriptModes).reduce((s, v) => s + v, 0);

    return {
      stats: { total, submitted, types, months, topType, avgLength, manuscriptTotal, manuscriptModes, avgAccuracy },
      recentActivities: activities.slice(0, 5),
    };
  }, [activities]);

  // 활동 유형 × 월 (0~11) 카운트 맵 — drill-down에서 어떤 월에 활동이 있었는지 알려줌
  const typeMonthCounts = useMemo(() => {
    const map = {}; // { [typeLabel]: number[12] }
    activities.forEach((a) => {
      const label = getTypeInfo(a).label;
      const month = new Date(a.createdAt).getMonth();
      if (!map[label]) map[label] = Array.from({ length: 12 }, () => 0);
      map[label][month] += 1;
    });
    return map;
  }, [activities]);

  // 선택된 유형 + 월에 해당하는 실제 기록 목록 (최신순)
  const drillItems = useMemo(() => {
    if (!selectedType || selectedMonth == null) return [];
    return activities
      .filter((a) => getTypeInfo(a).label === selectedType
                  && new Date(a.createdAt).getMonth() === selectedMonth)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [activities, selectedType, selectedMonth]);

  const handleTypeClick = (label) => {
    if (selectedType === label) {
      setSelectedType(null);
      setSelectedMonth(null);
    } else {
      setSelectedType(label);
      setSelectedMonth(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {!embedded && (<div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🌱 성장 보기</h1>
            <p className="mt-1 text-sm text-gray-500">나의 문해력 성장을 확인합니다</p>
          </div>
        </div>)}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard emoji="📝" label="총 활동 수" />
          <StatCard emoji="✅" label="제출 완료" />
          <StatCard emoji="📏" label="평균 글 길이" />
          <StatCard emoji="⭐" label="가장 많이 한 활동" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!embedded && (<div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🌱 성장 보기</h1>
          <p className="mt-1 text-sm text-gray-500">나의 문해력 성장을 확인합니다</p>
        </div>
      </div>)}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard emoji="📝" label="총 활동 수" value={stats.total} unit="개" />
        <StatCard emoji="✅" label="제출 완료" value={stats.submitted} unit="개" />
        <StatCard emoji="📏" label="평균 글 길이" value={stats.avgLength} unit="자" />
        <StatCard emoji="⭐" label="가장 많이 한 활동" value={stats.topType ? stats.topType[0] : '-'} unit={stats.topType ? `${stats.topType[1]}회` : ''} />
      </div>

      {stats.manuscriptTotal > 0 && (
        <div className="bg-white shadow rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">원고지 연습</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="text-center">
              <p className="text-xl font-bold text-purple-600">{stats.manuscriptTotal}</p>
              <p className="text-[10px] text-gray-400">총 연습</p>
            </div>
            {stats.avgAccuracy !== null && (
              <div className="text-center">
                <p className={`text-xl font-bold ${stats.avgAccuracy >= 80 ? 'text-green-600' : stats.avgAccuracy >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{stats.avgAccuracy}%</p>
                <p className="text-[10px] text-gray-400">평균 정확도</p>
              </div>
            )}
            {Object.entries(stats.manuscriptModes).map(([mode, count]) => {
              const modeLabels = { copy: '필사', spacing: '띄어쓰기', typo: '오탈자', continue: '이어쓰기' };
              return (
                <div key={mode} className="text-center">
                  <p className="text-xl font-bold text-gray-700">{count}</p>
                  <p className="text-[10px] text-gray-400">{modeLabels[mode] || mode}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {Object.keys(stats.types).length > 0 && (
        <div className="bg-white shadow rounded-xl p-5">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">활동 유형별</h2>
            <p className="text-[11px] text-gray-400">유형을 누르면 월별로 어떤 작품을 했는지 볼 수 있어요</p>
          </div>
          <div className="space-y-2">
            {Object.entries(stats.types).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
              const isOpen = selectedType === type;
              const monthCounts = typeMonthCounts[type] || Array.from({ length: 12 }, () => 0);
              return (
                <div key={type} className={`rounded-lg transition ${isOpen ? 'bg-purple-50/60 border border-purple-200 p-2' : ''}`}>
                  <button
                    type="button"
                    onClick={() => handleTypeClick(type)}
                    className="w-full flex items-center gap-3 text-left rounded-md hover:bg-gray-50 px-1 py-1"
                  >
                    <span className={`text-sm w-24 truncate ${isOpen ? 'font-semibold text-purple-800' : 'text-gray-600'}`}>{type}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-4">
                      <div className="bg-purple-500 rounded-full h-4 transition-all" style={{ width: `${Math.min(100, (count / stats.total) * 100)}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 w-8 text-right">{count}</span>
                    <span className={`text-[11px] w-5 text-right ${isOpen ? 'text-purple-700' : 'text-gray-300'}`}>{isOpen ? '▾' : '▸'}</span>
                  </button>

                  {isOpen && (
                    <div className="mt-2 pl-1 -mx-1 px-1 overflow-x-auto">
                      <div className="flex gap-1.5 min-w-max sm:flex-wrap sm:min-w-0">
                        {MONTH_LABELS.map((m, idx) => {
                          const c = monthCounts[idx];
                          const active = selectedMonth === idx;
                          const disabled = c === 0;
                          return (
                            <button
                              key={m}
                              type="button"
                              onClick={() => !disabled && setSelectedMonth(active ? null : idx)}
                              disabled={disabled}
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium border transition shrink-0 ${
                                active
                                  ? 'bg-purple-600 text-white border-purple-600'
                                  : disabled
                                  ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                                  : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-50'
                              }`}
                            >
                              {m}
                              {c > 0 && (
                                <span className={`text-[10px] ${active ? 'text-white/80' : 'text-purple-500/70'}`}>
                                  {c}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* drill-down 결과 — 선택된 유형 + 월의 실제 기록 목록 */}
          {selectedType && selectedMonth != null && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-baseline justify-between mb-2">
                <p className="text-sm font-semibold text-gray-800">
                  {selectedType} · {MONTH_LABELS[selectedMonth]} 활동
                </p>
                <button
                  type="button"
                  onClick={() => { setSelectedType(null); setSelectedMonth(null); }}
                  className="text-[11px] text-gray-400 hover:text-gray-600"
                >
                  닫기
                </button>
              </div>
              {drillItems.length === 0 ? (
                <p className="text-xs text-gray-400 py-3">이 달에는 {selectedType} 활동 기록이 없어요.</p>
              ) : (
                <ul className="space-y-1.5">
                  {drillItems.map((a, i) => {
                    const info = getTypeInfo(a);
                    const preview = (a.content || '').trim().replace(/\s+/g, ' ').slice(0, 60);
                    return (
                      <li key={`${a.id || i}-${a.createdAt}`} className="flex items-start gap-2 p-2 rounded-lg border border-gray-100 hover:border-purple-200 hover:bg-purple-50/30 transition">
                        <span className="text-base shrink-0">{info.emoji}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2">
                            <p className="text-xs font-semibold text-gray-800 truncate">{a.title || '(제목 없음)'}</p>
                            {a.accuracy != null && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${
                                a.accuracy >= 80 ? 'bg-green-100 text-green-700'
                                : a.accuracy >= 50 ? 'bg-amber-100 text-amber-700'
                                : 'bg-red-100 text-red-600'
                              }`}>
                                정확도 {a.accuracy}%
                              </span>
                            )}
                          </div>
                          {preview && (
                            <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2 leading-snug">{preview}{(a.content || '').length > 60 ? '…' : ''}</p>
                          )}
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {new Date(a.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                            {a.status && <span className="ml-2">· {a.status === 'submitted' ? '제출 완료' : a.status}</span>}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {Object.keys(stats.months).length > 0 && (
        <div className="bg-white shadow rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">월별 활동</h2>
          <div className="space-y-2">
            {Object.entries(stats.months).map(([month, count]) => (
              <div key={month} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-28">{month}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-4">
                  <div className="bg-emerald-500 rounded-full h-4 transition-all" style={{ width: `${Math.min(100, (count / Math.max(...Object.values(stats.months))) * 100)}%` }} />
                </div>
                <span className="text-xs text-gray-500 w-8 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {recentActivities.length > 0 && (
        <div className="bg-white shadow rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">최근 활동</h2>
          <div className="space-y-1.5">
            {recentActivities.map((a, i) => {
              const info = getTypeInfo(a);
              return (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg border border-gray-50 text-xs">
                  <span>{info.emoji}</span>
                  <span className="font-medium text-gray-700 truncate flex-1">{a.title}</span>
                  {a.accuracy != null && <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${a.accuracy >= 80 ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>{a.accuracy}%</span>}
                  <span className="text-gray-400">{new Date(a.createdAt).toLocaleDateString('ko-KR')}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {stats.total === 0 && (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-3">🌱</div>
          <p>활동을 시작하면 성장 기록이 여기에 보입니다</p>
          <button onClick={() => onSwitchTab ? onSwitchTab('today') : navigate('/morning-activity')}
            className="mt-3 px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition">첫 활동 시작</button>
        </div>
      )}
    </div>
  );
}

export default GrowthView;
