import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import client from '../api/client';

function StudentJoin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const codeFromUrl = searchParams.get('code') || '';

  const [code, setCode] = useState(codeFromUrl);
  const [step, setStep] = useState(codeFromUrl ? 'loading' : 'enter-code');
  const [session, setSession] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [manualName, setManualName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (codeFromUrl) lookupSession(codeFromUrl);
  }, [codeFromUrl]);

  const lookupSession = async (c) => {
    setError('');
    setStep('loading');
    try {
      const res = await client.get('/api/qr-session', { params: { action: 'lookup', code: c } });
      const sess = res.data.data;
      setSession(sess);

      if (sess.teacher_id) {
        try {
          const sRes = await client.get('/api/students', { params: { userId: sess.teacher_id } });
          const list = sRes.data || [];
          if (list.length > 0) { setStudents(list); setStep('select-student'); return; }
        } catch {}
      }
      setStep('manual-name');
    } catch (err) {
      setError(err.response?.data?.message || '코드를 찾을 수 없습니다');
      setStep('enter-code');
    }
  };

  const handleJoin = async (name, number, studentId) => {
    try {
      await client.post('/api/qr-session', {
        code: session.join_code,
        studentName: name,
        studentNumber: number,
        studentId: studentId || undefined,
      }, { params: { action: 'join' } });

      localStorage.setItem('qr_session_code', session.join_code);
      localStorage.setItem('qr_student_name', name);
      localStorage.setItem('qr_student_number', number || '');
      if (studentId) localStorage.setItem('qr_student_id', String(studentId));
      if (session.teacher_id) localStorage.setItem('userId', session.teacher_id);

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
          <p className="text-sm text-gray-500">선생님이 보여준 QR을 찍거나,<br />참여 코드를 입력하세요</p>
          {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg p-2">{error}</p>}
          <input type="text" value={code} onChange={e => setCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && code.trim().length >= 4 && lookupSession(code.trim())}
            className="w-full border-2 border-gray-200 rounded-xl p-4 text-center text-2xl font-bold tracking-[0.3em] uppercase focus:border-purple-400 focus:ring-2 focus:ring-purple-200"
            placeholder="참여 코드" maxLength={8} autoFocus />
          <button onClick={() => lookupSession(code.trim())} disabled={code.trim().length < 4}
            className="w-full py-3 bg-purple-600 text-white font-semibold rounded-xl text-sm hover:bg-purple-700 disabled:bg-gray-300 transition">
            입장하기
          </button>
          <p className="text-[10px] text-gray-400">QR이 잘 안 되면 코드로 다시 입장할 수 있어요</p>
        </div>
      </div>
    );
  }

  if (step === 'select-student') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white shadow-xl rounded-2xl p-6 w-full max-w-sm space-y-4">
          <div className="text-center">
            <div className="text-4xl mb-2">✏️</div>
            <h1 className="text-lg font-bold text-gray-900">내 이름을 선택하세요</h1>
            {session?.class_name && <p className="text-xs text-purple-600 font-medium mt-1">{session.class_name}</p>}
          </div>
          {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg p-2">{error}</p>}
          <div className="space-y-1.5 max-h-[350px] overflow-y-auto">
            {students.map(s => (
              <button key={s.id} onClick={() => setSelectedStudent(s)}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 transition ${
                  selectedStudent?.id === s.id ? 'border-purple-400 bg-purple-50' : 'border-gray-100 hover:border-purple-200 hover:bg-gray-50'
                }`}>
                <span className="text-sm font-medium text-gray-500 mr-2">{s.number}번</span>
                <span className="text-sm font-semibold text-gray-800">{s.name}</span>
              </button>
            ))}
          </div>
          <button onClick={() => selectedStudent && handleJoin(selectedStudent.name, String(selectedStudent.number || ''), selectedStudent.id)}
            disabled={!selectedStudent}
            className="w-full py-3 bg-purple-600 text-white font-semibold rounded-xl text-sm hover:bg-purple-700 disabled:bg-gray-300 transition">
            활동 시작하기
          </button>
          <button onClick={() => { setStep('manual-name'); setSelectedStudent(null); }}
            className="w-full text-xs text-gray-400 hover:text-gray-600">목록에 없어요</button>
        </div>
      </div>
    );
  }

  if (step === 'manual-name') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-sm space-y-5">
          <div className="text-center">
            <div className="text-4xl mb-2">✏️</div>
            <h1 className="text-lg font-bold text-gray-900">이름을 입력하세요</h1>
            {session?.class_name && <p className="text-xs text-purple-600 mt-1">{session.class_name}</p>}
          </div>
          {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg p-2">{error}</p>}
          <input type="text" value={manualName} onChange={e => setManualName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && manualName.trim() && handleJoin(manualName.trim(), '', null)}
            className="w-full border border-gray-300 rounded-lg p-3 text-sm" placeholder="이름" autoFocus />
          <button onClick={() => manualName.trim() && handleJoin(manualName.trim(), '', null)}
            disabled={!manualName.trim()}
            className="w-full py-3 bg-purple-600 text-white font-semibold rounded-xl text-sm hover:bg-purple-700 disabled:bg-gray-300 transition">
            활동 시작하기
          </button>
          {students.length > 0 && (
            <button onClick={() => setStep('select-student')} className="w-full text-xs text-gray-400 hover:text-gray-600">← 목록에서 선택</button>
          )}
        </div>
      </div>
    );
  }

  return null;
}

export default StudentJoin;
