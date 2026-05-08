import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

function GrowthView({ embedded }) {
  const navigate = useNavigate();

  const stats = useMemo(() => {
    const activities = JSON.parse(localStorage.getItem('morning_activities') || '[]');
    const total = activities.length;
    const submitted = activities.filter(a => a.status === 'submitted').length;
    const types = {};
    const months = {};
    let totalLength = 0;

    activities.forEach(a => {
      types[a.typeLabel || a.type] = (types[a.typeLabel || a.type] || 0) + 1;
      const month = new Date(a.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });
      months[month] = (months[month] || 0) + 1;
      totalLength += (a.content || '').length;
    });

    const topType = Object.entries(types).sort((a, b) => b[1] - a[1])[0];
    const avgLength = total > 0 ? Math.round(totalLength / total) : 0;

    return { total, submitted, types, months, topType, avgLength };
  }, []);

  return (
    <div className="space-y-6">
      {!embedded && (<div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🌱 성장 보기</h1>
          <p className="mt-1 text-sm text-gray-500">나의 문해력 성장을 확인합니다</p>
        </div>
        <button onClick={() => navigate('/dashboard')} className="text-primary-600 hover:text-primary-900 font-medium">← 홈으로</button>
      </div>)}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard emoji="📝" label="총 활동 수" value={stats.total} unit="개" />
        <StatCard emoji="✅" label="제출 완료" value={stats.submitted} unit="개" />
        <StatCard emoji="📏" label="평균 글 길이" value={stats.avgLength} unit="자" />
        <StatCard emoji="⭐" label="가장 많이 한 활동" value={stats.topType ? stats.topType[0] : '-'} unit={stats.topType ? `${stats.topType[1]}회` : ''} />
      </div>

      {Object.keys(stats.types).length > 0 && (
        <div className="bg-white shadow rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">활동 유형별</h2>
          <div className="space-y-2">
            {Object.entries(stats.types).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
              <div key={type} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-28 truncate">{type}</span>
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

      {stats.total === 0 && (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-3">🌱</div>
          <p>활동을 시작하면 성장 기록이 여기에 보입니다</p>
          <button onClick={() => navigate('/morning-activity')} className="mt-3 px-4 py-2 bg-purple-600 text-white text-sm rounded-lg">첫 활동 시작</button>
        </div>
      )}
    </div>
  );
}

function StatCard({ emoji, label, value, unit }) {
  return (
    <div className="bg-white shadow rounded-xl p-4 text-center">
      <span className="text-2xl">{emoji}</span>
      <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
      <p className="text-xs text-gray-400">{unit}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}

export default GrowthView;
