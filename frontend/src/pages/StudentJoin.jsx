import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import client from '../api/client';

const ACTIVITY_TYPE_LABELS = {
  'poem-copy': '시 필사', 'story-continue': '이야기 이어쓰기', 'yesterday-diary': '어제 일기',
  'letter': '편지쓰기', 'dictation': '받아쓰기', 'review': '짧은 감상문',
  'keyword-sentence': '키워드 문장', 'free-writing': '자유 글쓰기',
};

function StudentJoin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const codeFromUrl = searchParams.get('code') || '';

  const [code, setCode] = useState(codeFromUrl);
  const [step, setStep] = useState(codeFromUrl ? 'loading' : 'enter-code');
  const [session, setSession] = useState(null);
  const [studentName, setStudentName] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (codeFromUrl) lookupSession(codeFromUrl);
  }, [codeFromUrl]);

  const lookupSession = async (c) => {
    setError('');
    setStep('loading');
    try {
      const res = await client.get('/api/qr-session', { params: { action: 'lookup', code: c } });
      setSession(res.data.data);
      setStep('identify');
    } catch (err) {
      setError(err.response?.data?.message || '코드를 찾을 수 없습니다');
      setStep('enter-code');
    }
  };

  const handleCodeSubmit = () => {
    if (code.trim().length < 4) return;
    lookupSession(code.trim());
  };

  const handleJoin = async () => {
    if (!studentName.trim()) return;
    try {
      await client.post('/api/qr-session', {
        code: session.join_code,
        studentName: studentName.trim(),
        studentNumber: studentNumber.trim(),
      }, { params: { action: 'join' } });

      localStorage.setItem('qr_session_code', session.join_code);
      localStorage.setItem('qr_student_name', studentName.trim());
      localStorage.setItem('qr_student_number', studentNumber.trim());

      navigate('/student-activity');
    } catch {
      setError('입장에 실패했습니다. 다시 시도해 주세요.');
    }
  };

  if (step === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-400">
          <div className="text-4xl mb-3 animate-pulse">📱</div>
          <p>확인 중...</p>
        </div>
      </div>
    );
  }

  if (step === 'enter-code') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-sm text-center space-y-5">
          <div className="text-5xl">✏️</div>
          <h1 className="text-xl font-bold text-gray-900">아침 활동 입장</h1>
          <p className="text-sm text-gray-500">선생님이 알려준 코드를 입력하세요</p>

          {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg p-2">{error}</p>}

          <input
            type="text"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleCodeSubmit()}
            className="w-full border-2 border-gray-200 rounded-xl p-4 text-center text-2xl font-bold tracking-[0.3em] uppercase focus:border-purple-400 focus:ring-2 focus:ring-purple-200"
            placeholder="코드 입력"
            maxLength={8}
            autoFocus
          />

          <button onClick={handleCodeSubmit} disabled={code.trim().length < 4}
            className="w-full py-3 bg-purple-600 text-white font-semibold rounded-xl text-sm hover:bg-purple-700 disabled:bg-gray-300 transition">
            입장하기
          </button>
        </div>
      </div>
    );
  }

  if (step === 'identify' && session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-sm space-y-5">
          <div className="text-center">
            <div className="text-4xl mb-2">✏️</div>
            <h1 className="text-lg font-bold text-gray-900">아침 활동</h1>
            <div className="mt-2 space-y-1">
              {session.class_name && <p className="text-sm text-purple-600 font-medium">{session.class_name}</p>}
              <p className="text-xs text-gray-400">{new Date(session.activity_date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}</p>
              {session.activity_type && (
                <p className="text-xs text-gray-500">{ACTIVITY_TYPE_LABELS[session.activity_type] || session.activity_type}</p>
              )}
            </div>
          </div>

          {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg p-2">{error}</p>}

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">이름</label>
              <input type="text" value={studentName} onChange={e => setStudentName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 text-sm" placeholder="이름을 입력하세요" autoFocus />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">번호 (선택)</label>
              <input type="text" value={studentNumber} onChange={e => setStudentNumber(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
                className="w-full border border-gray-300 rounded-lg p-3 text-sm" placeholder="출석번호" />
            </div>
          </div>

          <button onClick={handleJoin} disabled={!studentName.trim()}
            className="w-full py-3 bg-purple-600 text-white font-semibold rounded-xl text-sm hover:bg-purple-700 disabled:bg-gray-300 transition">
            활동 시작하기
          </button>

          <button onClick={() => { setStep('enter-code'); setSession(null); setError(''); }}
            className="w-full text-xs text-gray-400 hover:text-gray-600">← 코드 다시 입력</button>
        </div>
      </div>
    );
  }

  return null;
}

export default StudentJoin;
