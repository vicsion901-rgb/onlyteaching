import React, { useState, useEffect } from 'react';
import client from '../api/client';

const DEFAULT_ROLES = [
  '주번', '부주번', '일지 기록', '칠판 지우기', '창문 열기',
  '창문 닫기', '에어컨 담당', '분리수거', '청소 당번', '알림장 배부',
];

const STORAGE_KEY = 'roleAssignment:roles';

function RoleAssignment() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_ROLES;
    } catch {
      return DEFAULT_ROLES;
    }
  });
  const [newRole, setNewRole] = useState('');
  const [assignments, setAssignments] = useState({});
  const [assigned, setAssigned] = useState(false);

  useEffect(() => {
    client.get('/api/students', { params: { userId: localStorage.getItem('userId') || '' } }).then((res) => {
      setStudents(res.data || []);
    }).catch(() => {
      setStudents([]);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(roles));
  }, [roles]);

  const handleAssign = () => {
    if (students.length === 0 || roles.length === 0) return;

    const shuffled = [...students].sort(() => Math.random() - 0.5);
    const result = {};
    roles.forEach((role, i) => {
      result[role] = shuffled[i % shuffled.length];
    });
    setAssignments(result);
    setAssigned(true);
  };

  const handleAddRole = () => {
    const trimmed = newRole.trim();
    if (!trimmed || roles.includes(trimmed)) return;
    setRoles([...roles, trimmed]);
    setNewRole('');
    setAssigned(false);
  };

  const handleRemoveRole = (role) => {
    setRoles(roles.filter((r) => r !== role));
    setAssigned(false);
  };

  const handleReassign = (role) => {
    const currentStudent = assignments[role];
    const others = students.filter((s) => s.number !== currentStudent?.number);
    if (others.length === 0) return;
    const pick = others[Math.floor(Math.random() * others.length)];
    setAssignments((prev) => ({ ...prev, [role]: pick }));
  };

  const handleReset = () => {
    setAssignments({});
    setAssigned(false);
  };

  const handleResetRoles = () => {
    setRoles(DEFAULT_ROLES);
    setAssigned(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        학생 명단 불러오는 중...
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-500">
        <span className="text-5xl">🎭</span>
        <p>등록된 학생이 없습니다.</p>
        <p className="text-sm text-gray-400">학생명부 메뉴에서 학생을 먼저 등록해주세요.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
        🎭 1인 1역 정하기
      </h1>
      <p className="text-gray-500 text-sm mb-6">
        전체 {students.length}명 · {roles.length}개 역할
      </p>

      {/* 역할 관리 */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-600">역할 목록</h3>
          <button
            onClick={handleResetRoles}
            className="text-xs text-gray-400 hover:text-gray-600 underline"
          >
            기본 역할로 초기화
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {roles.map((role) => (
            <span
              key={role}
              className="flex items-center gap-1 px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm"
            >
              {role}
              <button
                onClick={() => handleRemoveRole(role)}
                className="ml-1 text-purple-400 hover:text-red-500 font-bold leading-none"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddRole()}
            placeholder="역할 추가 (Enter)"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            onClick={handleAddRole}
            disabled={!newRole.trim()}
            className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-40 transition-all"
          >
            추가
          </button>
        </div>
      </div>

      {/* 배정 버튼 */}
      <div className="flex gap-3 justify-center mb-6">
        <button
          onClick={handleAssign}
          className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-md hover:shadow-lg text-lg"
        >
          {assigned ? '다시 배정하기' : '역할 배정!'}
        </button>
        {assigned && (
          <button
            onClick={handleReset}
            className="px-5 py-3 border border-gray-300 text-gray-600 rounded-xl hover:bg-gray-50 transition-all"
          >
            초기화
          </button>
        )}
      </div>

      {/* 배정 결과 */}
      {assigned && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-blue-50 border-b border-blue-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-blue-700">배정 결과</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {roles.map((role) => {
              const student = assignments[role];
              return (
                <div key={role} className="flex items-center px-4 py-3 hover:bg-gray-50 transition-colors group">
                  <span className="w-36 text-sm font-medium text-gray-700 flex-shrink-0">{role}</span>
                  <span className="flex-1 text-sm">
                    {student ? (
                      <span className="inline-flex items-center gap-1">
                        <span className="text-gray-400 text-xs">{student.number}번</span>
                        <span className="font-semibold text-gray-800">{student.name}</span>
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </span>
                  <button
                    onClick={() => handleReassign(role)}
                    className="text-xs text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-all px-2 py-1 rounded hover:bg-blue-50"
                    title="이 역할만 다시 배정"
                  >
                    🔄 변경
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!assigned && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 flex flex-col items-center text-gray-400">
          <span className="text-4xl mb-3">🎭</span>
          <p className="text-sm">"역할 배정!" 버튼을 누르면 학생들에게 역할이 배정됩니다.</p>
        </div>
      )}
    </div>
  );
}

export default RoleAssignment;
