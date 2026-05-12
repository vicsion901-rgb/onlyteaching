import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import client from '../api/client';

const TYPE_LABELS = {
  'poem-copy': '시 필사', 'story-continue': '이어쓰기', 'yesterday-diary': '일기',
  'letter': '편지', 'review': '감상문', 'free-writing': '자유 글쓰기',
  'manuscript-copy': '필사', 'manuscript-spacing': '띄어쓰기',
  'manuscript-typo': '오탈자', 'manuscript-continue': '이어쓰기',
  'dictation': '받아쓰기', 'keyword-sentence': '키워드 문장',
};

function TeacherActivityDashboard() {
  const navigate = useNavigate();
  const teacherId = localStorage.getItem('userId') || '';
  const [submissions, setSubmissions] = useState([]);
  const [students, setStudents] = useState([]);
  const [qrSessions, setQrSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSessionKey, setSelectedSessionKey] = useState(null);
  const [selectedSub, setSelectedSub] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [qrModal, setQrModal] = useState(null);
  const [copiedMsg, setCopiedMsg] = useState('');

  useEffect(() => {
    if (!teacherId) return;
    setLoading(true);
    Promise.all([
      client.get('/api/student-submissions', { params: { action: 'list', teacherId, limit: '500' } }).then(r => r.data?.data || []).catch(() => []),
      client.get('/api/students', { params: { userId: teacherId } }).then(r => r.data || []).catch(() => []),
      client.get('/api/qr-session', { params: { action: 'my-sessions', teacherId } }).then(r => r.data?.data || []).catch(() => []),
    ]).then(([subs, studs, qrs]) => { setSubmissions(subs); setStudents(studs); setQrSessions(qrs); })
      .finally(() => setLoading(false));
  }, [teacherId]);

  const sessions = useMemo(() => {
    const map = {};
    submissions.forEach(s => {
      const date = s.submitted_at ? new Date(s.submitted_at).toLocaleDateString('ko-KR') : '날짜 없음';
      const type = s.activity_type || 'unknown';
      const sid = s.session_id || `${date}__${type}`;
      const key = `${sid}__${s.class_id || ''}`;
      if (!map[key]) map[key] = { key, date, type, sessionId: s.session_id, className: s.class_id || '', studentMap: {} };
      const stKey = s.student_id || s.student_name || `anon_${map[key].studentMap.length}`;
      if (!map[key].studentMap[stKey] || new Date(s.submitted_at || s.created_at) > new Date(map[key].studentMap[stKey].submitted_at || map[key].studentMap[stKey].created_at)) {
        map[key].studentMap[stKey] = s;
      }
    });
    const list = Object.values(map).map(sess => ({
      ...sess,
      latestSubs: Object.values(sess.studentMap),
      uniqueStudentCount: Object.keys(sess.studentMap).length,
      submittedStudentCount: Object.values(sess.studentMap).filter(s => s.status === 'submitted').length,
    }));
    list.sort((a, b) => new Date(b.latestSubs[0]?.submitted_at || 0) - new Date(a.latestSubs[0]?.submitted_at || 0));
    return list;
  }, [submissions]);

  const filteredSessions = useMemo(() => {
    if (typeFilter === 'all') return sessions;
    return sessions.filter(s => s.type === typeFilter);
  }, [sessions, typeFilter]);

  const activityTypes = useMemo(() => {
    const set = new Set(sessions.map(s => s.type));
    return [...set];
  }, [sessions]);

  const selectedSession = selectedSessionKey ? sessions.find(s => s.key === selectedSessionKey) : null;

  const sessionChecklist = useMemo(() => {
    if (!selectedSession) return [];
    const latestMap = selectedSession.studentMap || {};
    return students.map(st => {
      const sub = latestMap[st.id] || latestMap[st.name] || null;
      return {
        ...st,
        latestSub: sub,
        status: sub ? (sub.status === 'submitted' ? 'submitted' : 'draft') : 'none',
        submittedAt: sub?.submitted_at || sub?.created_at || null,
      };
    });
  }, [selectedSession, students]);

  if (selectedSub) {
    return (
      <div className="space-y-4">
        <button onClick={() => setSelectedSub(null)} className="text-xs text-gray-400 hover:text-gray-600">← 학생 목록으로</button>
        <div className="bg-white shadow rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-900">{selectedSub.title || '제목 없음'}</h2>
            {selectedSub.student_name && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{selectedSub.student_name}</span>}
          </div>
          <div className="flex flex-wrap gap-1.5 text-xs">
            <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">{TYPE_LABELS[selectedSub.activity_type] || selectedSub.activity_type}</span>
            {selectedSub.accuracy != null && <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700">{selectedSub.accuracy}%</span>}
            <span className="text-gray-400">{selectedSub.submitted_at ? new Date(selectedSub.submitted_at).toLocaleString('ko-KR') : ''}</span>
          </div>
          <div className="border-t pt-3 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap min-h-[100px]">{selectedSub.content || '(내용 없음)'}</div>
          {selectedSub.feeling && (
            <div className="bg-purple-50 rounded-lg p-3">
              <p className="text-[10px] text-purple-600 font-medium">느낌 한 줄</p>
              <p className="text-xs text-purple-800 italic">"{selectedSub.feeling}"</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (selectedSession) {
    const submitted = sessionChecklist.filter(s => s.status === 'submitted').length;
    const draft = sessionChecklist.filter(s => s.status === 'draft').length;
    const none = sessionChecklist.filter(s => s.status === 'none').length;

    return (
      <div className="space-y-4">
        <button onClick={() => setSelectedSessionKey(null)} className="text-xs text-gray-400 hover:text-gray-600">← 세션 목록으로</button>

        <div className="bg-white shadow rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg font-bold text-gray-900">{selectedSession.date}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">{TYPE_LABELS[selectedSession.type] || selectedSession.type}</span>
          </div>
          {selectedSession.className && <p className="text-xs text-gray-400">{selectedSession.className}</p>}
          <div className="grid grid-cols-3 gap-3 mt-3">
            <div className="text-center"><p className="text-lg font-bold text-green-600">{submitted}</p><p className="text-[10px] text-gray-400">제출 완료</p></div>
            <div className="text-center"><p className="text-lg font-bold text-amber-600">{draft}</p><p className="text-[10px] text-gray-400">작성 중</p></div>
            <div className="text-center"><p className="text-lg font-bold text-red-500">{none}</p><p className="text-[10px] text-gray-400">미제출</p></div>
          </div>
        </div>

        <div className="bg-white shadow rounded-xl p-4 space-y-1">
          {sessionChecklist.map(s => (
            <div key={s.id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
              <span className="text-xs text-gray-400 w-6 text-right">{s.number}</span>
              <span className="text-sm font-medium text-gray-800 flex-1">{s.name}
                {s.submittedAt && <span className="text-[9px] text-gray-400 ml-1">{new Date(s.submittedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                s.status === 'submitted' ? 'bg-green-100 text-green-700' :
                s.status === 'draft' ? 'bg-amber-100 text-amber-700' :
                'bg-red-50 text-red-500'
              }`}>
                {s.status === 'submitted' ? '✅ 제출' : s.status === 'draft' ? '⏳ 작성중' : '❌ 미제출'}
              </span>
              {s.latestSub && (
                <button onClick={() => setSelectedSub(s.latestSub)} className="text-[10px] text-purple-600 hover:underline">보기</button>
              )}
            </div>
          ))}
          {students.length === 0 && <p className="text-xs text-gray-400 text-center py-4">학생명부에 등록된 학생이 없습니다</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">학생 활동 관리</h1>
          <p className="mt-0.5 text-sm text-gray-500">수업 세션별 제출 현황을 확인합니다</p>
        </div>
        <button onClick={() => navigate('/dashboard')} className="text-primary-600 hover:text-primary-900 font-medium text-sm">← 홈으로</button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white shadow rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-purple-600">{sessions.length}</p>
          <p className="text-[10px] text-gray-400">총 세션</p>
        </div>
        <div className="bg-white shadow rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-green-600">{submissions.filter(s => s.status === 'submitted').length}</p>
          <p className="text-[10px] text-gray-400">제출 완료</p>
        </div>
        <div className="bg-white shadow rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-gray-700">{students.length}</p>
          <p className="text-[10px] text-gray-400">총 학생</p>
        </div>
      </div>

      {activityTypes.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setTypeFilter('all')} className={`text-[10px] px-2.5 py-1.5 rounded-full border font-medium ${typeFilter === 'all' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-500 border-gray-200'}`}>전체</button>
          {activityTypes.map(t => (
            <button key={t} onClick={() => setTypeFilter(t)} className={`text-[10px] px-2.5 py-1.5 rounded-full border font-medium ${typeFilter === t ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-500 border-gray-200'}`}>
              {TYPE_LABELS[t] || t}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">로딩 중...</div>
      ) : (
        <div className="space-y-3">
          {filteredSessions.map(sess => {
            const recentNames = [...new Set(sess.latestSubs.slice(0, 3).map(s => s.student_name).filter(Boolean))];
            const qr = qrSessions.find(q => q.activity_type === sess.type && new Date(q.created_at).toLocaleDateString('ko-KR') === sess.date);
            const isActive = qr && qr.is_active && new Date(qr.expires_at) > new Date();
            return (
              <div key={sess.key} className="bg-white shadow rounded-xl p-4 hover:shadow-md transition">
                <div className="flex items-start justify-between cursor-pointer" onClick={() => setSelectedSessionKey(sess.key)}>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-800">{sess.date}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">{TYPE_LABELS[sess.type] || sess.type}</span>
                      {qr && <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>{isActive ? 'QR 사용 가능' : '세션 종료'}</span>}
                    </div>
                    {sess.className && <p className="text-xs text-gray-400 mt-0.5">{sess.className}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-600">{sess.submittedStudentCount}<span className="text-gray-400 font-normal">/{students.length || sess.uniqueStudentCount}</span></p>
                    <p className="text-[10px] text-gray-400">제출</p>
                  </div>
                </div>
                {qr && (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-50">
                    <span className="text-xs text-gray-500">코드: <span className="font-bold tracking-wider">{qr.join_code}</span></span>
                    <div className="flex-1" />
                    <button onClick={(e) => { e.stopPropagation(); setQrModal(qr); }} className="text-[10px] px-2 py-1 text-purple-600 bg-purple-50 rounded font-medium hover:bg-purple-100">QR 보기</button>
                    <button onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(`${window.location.origin}/join?code=${qr.join_code}`); setCopiedMsg(qr.join_code); setTimeout(() => setCopiedMsg(''), 1500); }}
                      className="text-[10px] px-2 py-1 text-gray-500 bg-gray-50 rounded font-medium hover:bg-gray-100">{copiedMsg === qr.join_code ? '복사됨' : '링크 복사'}</button>
                  </div>
                )}
                {recentNames.length > 0 && <p className="text-[10px] text-gray-400 mt-1.5">최근: {recentNames.join(', ')}</p>}
              </div>
            );
          })}
          {filteredSessions.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p>아직 활동 세션이 없습니다</p>
            </div>
          )}
        </div>
      )}
      {qrModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setQrModal(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-xs text-center space-y-4" onClick={e => e.stopPropagation()}>
            <p className="text-sm font-semibold text-gray-800">{qrModal.class_name || '학급'} · {TYPE_LABELS[qrModal.activity_type] || qrModal.activity_type || '활동'}</p>
            <div className="flex justify-center"><QRCodeSVG value={`${window.location.origin}/join?code=${qrModal.join_code}`} size={200} level="M" /></div>
            <p className="text-3xl font-bold tracking-[0.3em] text-gray-800">{qrModal.join_code}</p>
            <div className="text-xs text-gray-400 space-y-0.5">
              <p>참여 학생 {qrModal.joined_count || 0}명 · 제출 {qrModal.submitted_count || 0}명</p>
              <p>유효: {qrModal.expires_at ? new Date(qrModal.expires_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '120분'}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { navigator.clipboard?.writeText(qrModal.join_code); setCopiedMsg('code'); setTimeout(() => setCopiedMsg(''), 1500); }}
                className="flex-1 py-2 text-xs font-medium bg-gray-100 rounded-lg hover:bg-gray-200">{copiedMsg === 'code' ? '복사됨' : '코드 복사'}</button>
              <button onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}/join?code=${qrModal.join_code}`); setCopiedMsg('link'); setTimeout(() => setCopiedMsg(''), 1500); }}
                className="flex-1 py-2 text-xs font-medium bg-gray-100 rounded-lg hover:bg-gray-200">{copiedMsg === 'link' ? '복사됨' : '링크 복사'}</button>
            </div>
            <button onClick={() => setQrModal(null)} className="text-xs text-gray-400 hover:text-gray-600">닫기</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default TeacherActivityDashboard;
