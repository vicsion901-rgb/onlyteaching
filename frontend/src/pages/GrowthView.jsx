import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTypeInfo } from '../utils/activityUtils';
import useActivities from '../hooks/useActivities';
import StatCard from '../components/StatCard';

function GrowthView({ embedded, onSwitchTab }) {
  const navigate = useNavigate();
  const { activities, isLoading } = useActivities();
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
          <h2 className="text-sm font-semibold text-gray-700 mb-3">활동 유형별</h2>
          <div className="space-y-2">
            {Object.entries(stats.types).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
              <div key={type} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-24 truncate">{type}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-4">
                  <div className="bg-purple-500 rounded-full h-4 transition-all" style={{ width: `${Math.min(100, (count / stats.total) * 100)}%` }} />
                </div>
                <span className="text-xs text-gray-500 w-8 text-right">{count}</span>
              </div>
            ))}
          </div>
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
