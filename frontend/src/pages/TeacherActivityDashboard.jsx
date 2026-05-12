import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';

const SOURCE_LABELS = {
  morning: '아침 활동', manuscript: '원고지',
};
const TYPE_LABELS = {
  'poem-copy': '필사', 'story-continue': '이어쓰기', 'yesterday-diary': '일기',
  'letter': '편지', 'review': '감상문', 'free-writing': '자유 글쓰기',
  'manuscript-copy': '필사', 'manuscript-spacing': '띄어쓰기',
  'manuscript-typo': '오탈자', 'manuscript-continue': '이어쓰기',
};

function TeacherActivityDashboard() {
  const navigate = useNavigate();
  const teacherId = localStorage.getItem('userId') || '';
  const [submissions, setSubmissions] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('list');
  const [selectedSub, setSelectedSub] = useState(null);

  useEffect(() => {
    if (!teacherId) return;
    setLoading(true);
    Promise.all([
      client.get('/api/student-submissions', { params: { action: 'list', teacherId, limit: '200' } }).then(r => r.data?.data || []).catch(() => []),
      client.get('/api/students', { params: { userId: teacherId } }).then(r => r.data || []).catch(() => []),
    ]).then(([subs, studs]) => {
      setSubmissions(subs);
      setStudents(studs);
    }).finally(() => setLoading(false));
  }, [teacherId]);

  const classNames = useMemo(() => {
    const set = new Set(submissions.map(s => s.class_id).filter(Boolean));
    return [...set];
  }, [submissions]);

  const filtered = useMemo(() => {
    let list = submissions;
    if (sourceFilter !== 'all') list = list.filter(s => s.source_type === sourceFilter);
    if (classFilter !== 'all') list = list.filter(s => s.class_id === classFilter);
    if (statusFilter !== 'all') list = list.filter(s => s.status === statusFilter);
    return list;
  }, [submissions, sourceFilter, classFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = submissions.length;
    const today = submissions.filter(s => s.submitted_at && new Date(s.submitted_at).toDateString() === new Date().toDateString()).length;
    const submittedStudents = new Set(submissions.map(s => s.student_name || s.student_id).filter(Boolean)).size;
    return { total, today, submittedStudents, totalStudents: students.length };
  }, [submissions, students]);

  const studentChecklist = useMemo(() => {
    const submittedMap = {};
    submissions.forEach(s => {
      const key = s.student_id || s.student_name;
      if (!key) return;
      if (!submittedMap[key]) submittedMap[key] = [];
      submittedMap[key].push(s);
    });
    return students.map(s => ({
      ...s,
      submissions: submittedMap[s.id] || submittedMap[s.name] || [],
      status: (submittedMap[s.id] || submittedMap[s.name] || []).some(sub => sub.status === 'submitted') ? 'submitted'
        : (submittedMap[s.id] || submittedMap[s.name] || []).length > 0 ? 'draft' : 'none',
    }));
  }, [students, submissions]);

  if (selectedSub) {
    return (
      <div className="space-y-4">
        <button onClick={() => setSelectedSub(null)} className="text-xs text-gray-400 hover:text-gray-600">← 목록으로</button>
        <div className="bg-white shadow rounded-xl p-5 space-y-3">
          <h2 className="text-lg font-bold text-gray-900">{selectedSub.title || '제목 없음'}</h2>
          <div className="flex flex-wrap gap-1.5 text-xs">
            <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">{TYPE_LABELS[selectedSub.activity_type] || selectedSub.activity_type}</span>
            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{SOURCE_LABELS[selectedSub.source_type] || selectedSub.source_type}</span>
            {selectedSub.student_name && <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{selectedSub.student_name}</span>}
            <span className="text-gray-400">{new Date(selectedSub.submitted_at).toLocaleDateString('ko-KR')}</span>
          </div>
          <div className="border-t pt-3 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap min-h-[100px]">
            {selectedSub.content || '(내용 없음)'}
          </div>
          {selectedSub.feeling && (
            <div className="bg-purple-50 rounded-lg p-3">
              <p className="text-[10px] text-purple-600 font-medium">느낌 한 줄</p>
              <p className="text-xs text-purple-800 italic">"{selectedSub.feeling}"</p>
            </div>
          )}
          {selectedSub.accuracy != null && (
            <p className="text-xs text-gray-500">정확도: {selectedSub.accuracy}%</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">학생 활동 관리</h1>
          <p className="mt-0.5 text-sm text-gray-500">학생들의 활동 제출을 확인합니다</p>
        </div>
        <button onClick={() => navigate('/dashboard')} className="text-primary-600 hover:text-primary-900 font-medium text-sm">← 홈으로</button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white shadow rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-gray-700">{stats.totalStudents}</p>
          <p className="text-[10px] text-gray-400">총 학생</p>
        </div>
        <div className="bg-white shadow rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-green-600">{studentChecklist.filter(s => s.status === 'submitted').length}</p>
          <p className="text-[10px] text-gray-400">제출 완료</p>
        </div>
        <div className="bg-white shadow rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-amber-600">{studentChecklist.filter(s => s.status === 'draft').length}</p>
          <p className="text-[10px] text-gray-400">작성 중</p>
        </div>
        <div className="bg-white shadow rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-red-500">{studentChecklist.filter(s => s.status === 'none').length}</p>
          <p className="text-[10px] text-gray-400">미제출</p>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setViewMode('list')} className={`text-[10px] px-3 py-1.5 rounded-full font-medium ${viewMode === 'list' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-500'}`}>제출 목록</button>
        <button onClick={() => setViewMode('checklist')} className={`text-[10px] px-3 py-1.5 rounded-full font-medium ${viewMode === 'checklist' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-500'}`}>학생 체크표</button>
      </div>

      {viewMode === 'checklist' && (
        <div className="bg-white shadow rounded-xl p-4 space-y-1.5">
          {studentChecklist.map(s => (
            <div key={s.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
              <span className="text-xs text-gray-400 w-6 text-right">{s.number}</span>
              <span className="text-sm font-medium text-gray-800 flex-1">{s.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                s.status === 'submitted' ? 'bg-green-100 text-green-700' :
                s.status === 'draft' ? 'bg-amber-100 text-amber-700' :
                'bg-red-50 text-red-500'
              }`}>
                {s.status === 'submitted' ? '✅ 제출완료' : s.status === 'draft' ? '⏳ 작성중' : '❌ 미제출'}
              </span>
              {s.submissions.length > 0 && (
                <button onClick={() => setSelectedSub(s.submissions[0])} className="text-[10px] text-purple-600 hover:underline">보기</button>
              )}
            </div>
          ))}
          {students.length === 0 && <p className="text-xs text-gray-400 text-center py-4">학생명부에 등록된 학생이 없습니다</p>}
        </div>
      )}

      {viewMode === 'list' && <div className="flex flex-wrap gap-1.5 items-center">
        {[
          { id: 'all', label: '전체' },
          { id: 'morning', label: '아침 활동' },
          { id: 'manuscript', label: '원고지' },
        ].map(f => (
          <button key={f.id} onClick={() => setSourceFilter(f.id)}
            className={`text-[10px] px-2.5 py-1.5 rounded-full border font-medium ${sourceFilter === f.id ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-500 border-gray-200'}`}>
            {f.label}
          </button>
        ))}
        <span className="text-gray-300 mx-1">|</span>
        {[
          { id: 'all', label: '전체 상태' },
          { id: 'submitted', label: '제출 완료' },
          { id: 'draft', label: '작성 중' },
        ].map(f => (
          <button key={f.id} onClick={() => setStatusFilter(f.id)}
            className={`text-[10px] px-2.5 py-1.5 rounded-full border font-medium ${statusFilter === f.id ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-500 border-gray-200'}`}>
            {f.label}
          </button>
        ))}
        {classNames.length > 0 && (
          <>
            <span className="text-gray-300 mx-1">|</span>
            <button onClick={() => setClassFilter('all')}
              className={`text-[10px] px-2.5 py-1.5 rounded-full border font-medium ${classFilter === 'all' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200'}`}>
              전체 학급
            </button>
            {classNames.map(cid => (
              <button key={cid} onClick={() => setClassFilter(cid)}
                className={`text-[10px] px-2.5 py-1.5 rounded-full border font-medium ${classFilter === cid ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200'}`}>
                {cid}
              </button>
            ))}
          </>
        )}
      </div>}

      {viewMode === 'list' && (loading ? (
        <div className="text-center py-12 text-gray-400">로딩 중...</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((s, i) => (
            <div key={s.id || i} onClick={() => setSelectedSub(s)}
              className="bg-white shadow rounded-xl p-4 hover:shadow-md cursor-pointer transition">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-800 truncate">{s.title || '제목 없음'}</p>
                    {s.student_name && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">{s.student_name}</span>}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {TYPE_LABELS[s.activity_type] || s.activity_type} · {new Date(s.submitted_at).toLocaleDateString('ko-KR')}
                    {s.accuracy != null && ` · ${s.accuracy}%`}
                  </p>
                  {s.content && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{s.content}</p>}
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${s.status === 'submitted' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  {s.status === 'submitted' ? '완료' : '임시'}
                </span>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p>아직 제출된 활동이 없습니다</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default TeacherActivityDashboard;
