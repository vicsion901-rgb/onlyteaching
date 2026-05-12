import React, { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import client from '../api/client';

const ACTIVITY_OPTIONS = [
  { id: '', label: '전체 (학생이 선택)' },
  { id: 'poem-copy', label: '시 필사' },
  { id: 'story-continue', label: '이야기 이어쓰기' },
  { id: 'yesterday-diary', label: '어제 일기' },
  { id: 'letter', label: '편지쓰기' },
  { id: 'review', label: '짧은 감상문' },
  { id: 'free-writing', label: '자유 글쓰기' },
];

function QrDistribution({ onClose }) {
  const [step, setStep] = useState('setup');
  const [className, setClassName] = useState('');
  const [activityType, setActivityType] = useState('');
  const [duration, setDuration] = useState(60);
  const [session, setSession] = useState(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [statusData, setStatusData] = useState(null);
  const [error, setError] = useState('');

  const teacherId = localStorage.getItem('userId') || localStorage.getItem('user_id') || 'teacher';
  const [studentCount, setStudentCount] = useState(null);

  useEffect(() => {
    client.get('/api/students', { params: { userId: teacherId } })
      .then(res => setStudentCount((res.data || []).length))
      .catch(() => setStudentCount(0));
  }, [teacherId]);

  const [creating, setCreating] = useState(false);

  const createSession = async () => {
    setError('');
    setCreating(true);
    try {
      const res = await client.post('/api/qr-session', {
        teacherId,
        className: className.trim(),
        activityType: activityType || null,
        durationMinutes: duration,
      }, { params: { action: 'create' } });
      if (res.data?.error === 'schema_not_migrated') {
        setError('서버 설정이 필요합니다. 관리자에게 문의해 주세요.');
      } else {
        setSession(res.data.data);
        setStep('active');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || '';
      if (msg.includes('Network') || !err.response) {
        setError('서버에 연결할 수 없습니다. 네트워크를 확인해 주세요.');
      } else {
        setError(msg || 'QR 생성에 실패했습니다. 다시 시도해 주세요.');
      }
    } finally {
      setCreating(false);
    }
  };

  const refreshStatus = useCallback(async () => {
    if (!session?.join_code) return;
    try {
      const res = await client.get('/api/qr-session', { params: { action: 'status', code: session.join_code } });
      setStatusData(res.data.data);
    } catch {}
  }, [session]);

  useEffect(() => {
    if (step !== 'active' || !session) return;
    refreshStatus();
    const interval = setInterval(refreshStatus, 5000);
    return () => clearInterval(interval);
  }, [step, session, refreshStatus]);

  const closeSession = async () => {
    if (!session) return;
    try {
      await client.post('/api/qr-session', { teacherId, joinCode: session.join_code }, { params: { action: 'close' } });
      setStep('closed');
    } catch {}
  };

  const getJoinUrl = () => {
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    return `${base}/join?code=${session?.join_code || ''}`;
  };

  const copyLink = () => {
    navigator.clipboard?.writeText(getJoinUrl());
    setError('링크가 복사되었습니다');
    setTimeout(() => setError(''), 1500);
  };

  if (fullscreen && session) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center p-8"
        onClick={() => setFullscreen(false)}>
        <QRCodeSVG value={getJoinUrl()} size={320} level="M" />
        <p className="mt-6 text-4xl font-bold tracking-[0.4em] text-gray-800">{session.join_code}</p>
        <p className="mt-2 text-sm text-gray-400">화면을 누르면 돌아갑니다</p>
        {statusData && (
          <div className="mt-4 flex gap-6 text-sm text-gray-600">
            <span>입장 {statusData.joined_count}명</span>
            <span>제출 {statusData.submitted_count}명</span>
          </div>
        )}
      </div>
    );
  }

  if (step === 'setup' && studentCount === 0) {
    return (
      <div className="bg-white shadow rounded-xl p-6 text-center space-y-4">
        <div className="text-4xl">👥</div>
        <h2 className="text-base font-bold text-gray-800">학생명부를 먼저 등록해주세요</h2>
        <p className="text-xs text-gray-500">QR 입장은 등록된 학생을 기준으로 연결됩니다.<br />학생 정보를 먼저 입력한 뒤 QR을 만들 수 있어요.</p>
        <a href="/student-records" className="inline-block px-5 py-2.5 bg-purple-600 text-white font-semibold rounded-xl text-sm hover:bg-purple-700 transition">학생명부 입력하러 가기</a>
        {onClose && <button onClick={onClose} className="block mx-auto text-xs text-gray-400 mt-2">닫기</button>}
      </div>
    );
  }

  if (step === 'setup') {
    return (
      <div className="bg-white shadow rounded-xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">📱 학생 입장 QR 만들기</h2>
          {onClose && <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600">닫기</button>}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">반/학급 이름</label>
          <input type="text" value={className} onChange={e => setClassName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" placeholder="예: 3학년 2반" />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">활동 유형</label>
          <select value={activityType} onChange={e => setActivityType(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm">
            {ACTIVITY_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">QR 사용 시간</label>
          <div className="flex gap-2">
            {[30, 60, 120].map(m => (
              <button key={m} onClick={() => setDuration(m)}
                className={`flex-1 py-2 text-xs rounded-lg font-medium ${duration === m ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {m}분
              </button>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 mt-1">수업이 끝나면 자동 만료되거나 직접 종료할 수 있어요</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-2.5">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        <button onClick={createSession} disabled={creating}
          className="w-full py-3 bg-purple-600 text-white font-semibold rounded-xl text-sm hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-wait">
          {creating ? '생성 중...' : 'QR 코드 만들기'}
        </button>
        <p className="text-[10px] text-gray-400 text-center">학생이 태블릿으로 스캔해 바로 활동을 시작할 수 있어요</p>
      </div>
    );
  }

  if (step === 'active' && session) {
    return (
      <div className="bg-white shadow rounded-xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">📱 QR 배포 중</h2>
          {onClose && <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600">닫기</button>}
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="bg-gray-50 p-4 rounded-xl cursor-pointer" onClick={() => setFullscreen(true)}>
            <QRCodeSVG value={getJoinUrl()} size={180} level="M" />
          </div>
          <p className="text-3xl font-bold tracking-[0.3em] text-gray-800">{session.join_code}</p>
          <p className="text-[10px] text-gray-400">QR을 누르면 크게 보입니다</p>
        </div>

        <div className="flex gap-2 text-center">
          <div className="flex-1 bg-blue-50 rounded-lg p-3">
            <p className="text-xl font-bold text-blue-700">{statusData?.joined_count ?? 0}</p>
            <p className="text-[10px] text-blue-500">입장</p>
          </div>
          <div className="flex-1 bg-green-50 rounded-lg p-3">
            <p className="text-xl font-bold text-green-700">{statusData?.submitted_count ?? 0}</p>
            <p className="text-[10px] text-green-500">제출</p>
          </div>
        </div>

        <div className="space-y-1 text-xs text-gray-500">
          {session.class_name && <p>반: {session.class_name}</p>}
          {session.activity_type && <p>활동: {ACTIVITY_OPTIONS.find(o => o.id === session.activity_type)?.label || session.activity_type}</p>}
          <p>만료: {new Date(session.expires_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>

        {error && <p className="text-xs text-green-600">{error}</p>}

        <div className="flex gap-2">
          <button onClick={() => setFullscreen(true)} className="flex-1 py-2 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">크게 보기</button>
          <button onClick={copyLink} className="flex-1 py-2 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">링크 복사</button>
        </div>

        <div className="flex gap-2">
          <button onClick={closeSession} className="flex-1 py-2 text-xs font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100">활동 종료</button>
          <button onClick={() => { setSession(null); setStep('setup'); }} className="flex-1 py-2 text-xs font-medium bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100">새 QR 만들기</button>
        </div>
      </div>
    );
  }

  if (step === 'closed') {
    return (
      <div className="bg-white shadow rounded-xl p-6 text-center space-y-4">
        <div className="text-4xl">✅</div>
        <h2 className="text-base font-bold text-gray-900">활동이 종료되었습니다</h2>
        {statusData && (
          <p className="text-sm text-gray-500">입장 {statusData.joined_count}명 · 제출 {statusData.submitted_count}명</p>
        )}
        <div className="flex gap-2">
          <button onClick={() => { setSession(null); setStatusData(null); setStep('setup'); }}
            className="flex-1 py-2 text-xs font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700">새 QR 만들기</button>
          {onClose && <button onClick={onClose} className="flex-1 py-2 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">닫기</button>}
        </div>
      </div>
    );
  }

  return null;
}

export default QrDistribution;
