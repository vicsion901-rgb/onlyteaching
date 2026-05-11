import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { submitActivity, saveToLocalCache } from '../utils/submissionApi';

const ACTIVITY_TYPES = [
  { id: 'poem-copy', emoji: '📜', label: '시 필사', placeholder: '좋아하는 시를 따라 적어보세요', hint: '천천히, 한 글자씩 정성스럽게' },
  { id: 'story-continue', emoji: '📖', label: '이야기 이어쓰기', placeholder: '앞 이야기에 이어서 써보세요', hint: '다음에 무슨 일이 벌어질까?' },
  { id: 'yesterday-diary', emoji: '📝', label: '어제 일기', placeholder: '어제 가장 기억에 남는 일을 적어보세요', hint: '어제 뭘 했는지, 어떤 기분이었는지' },
  { id: 'letter', emoji: '💌', label: '편지쓰기', placeholder: '누군가에게 하고 싶은 말을 적어보세요', hint: '친구, 가족, 미래의 나에게' },
  { id: 'review', emoji: '🎬', label: '짧은 감상문', placeholder: '읽은 책이나 본 영상에 대해 적어보세요', hint: '무엇이 가장 인상 깊었나요?' },
  { id: 'free-writing', emoji: '✨', label: '자유 글쓰기', placeholder: '무엇이든 자유롭게 적어보세요', hint: '생각나는 대로 편하게' },
];

function StudentActivity() {
  const navigate = useNavigate();
  const sessionCode = localStorage.getItem('qr_session_code');
  const studentName = localStorage.getItem('qr_student_name') || '';

  const [session, setSession] = useState(null);
  const [expired, setExpired] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    if (!sessionCode) { navigate('/join'); return; }
    client.get('/api/qr-session', { params: { action: 'lookup', code: sessionCode } })
      .then(res => {
        setSession(res.data?.data);
        if (res.data?.data?.activity_type) {
          const found = ACTIVITY_TYPES.find(t => t.id === res.data.data.activity_type);
          if (found) setSelectedType(found);
        }
      })
      .catch(() => setExpired(true));
  }, [sessionCode, navigate]);

  const handleSave = async (isDraft = false) => {
    if (!selectedType || !content.trim()) return;
    const actTitle = title.trim() || `${selectedType.label} - ${new Date().toLocaleDateString('ko-KR')}`;
    const activity = {
      type: selectedType.id, typeLabel: selectedType.label,
      title: actTitle, content: content.trim(),
      status: isDraft ? 'draft' : 'submitted', createdAt: new Date().toISOString(),
    };
    saveToLocalCache(activity, 'morning_activities');
    submitActivity({
      activityType: selectedType.id, sourceType: 'morning',
      title: actTitle, content: content.trim(),
      status: isDraft ? 'draft' : 'submitted',
    });
    setSaveStatus(isDraft ? '임시 저장됨' : '제출 완료! 🎉');
    if (!isDraft) {
      setTimeout(() => { setSelectedType(null); setTitle(''); setContent(''); setSaveStatus(''); }, 2000);
    }
  };

  if (expired) {
    return (
      <div className="text-center py-16 text-gray-400">
        <div className="text-5xl mb-4">⏰</div>
        <p className="text-base font-medium text-gray-600">활동 시간이 끝났습니다</p>
        <p className="text-xs text-gray-400 mt-1">선생님에게 새 QR 코드를 요청하세요</p>
        <button onClick={() => navigate('/join')} className="mt-4 px-5 py-2 bg-purple-600 text-white text-sm rounded-xl">다시 입장하기</button>
      </div>
    );
  }

  if (!selectedType) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-gray-800">
            {studentName ? `${studentName}님, ` : ''}오늘은 어떤 활동을 해볼까요?
          </h2>
          {session?.class_name && <p className="text-xs text-gray-400 mt-0.5">{session.class_name}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {ACTIVITY_TYPES.map(type => (
            <button key={type.id} onClick={() => setSelectedType(type)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-100 hover:border-purple-300 hover:bg-purple-50 transition text-center">
              <span className="text-3xl">{type.emoji}</span>
              <span className="text-xs font-semibold text-gray-700">{type.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{selectedType.emoji}</span>
          <h2 className="text-base font-semibold text-gray-800">{selectedType.label}</h2>
        </div>
        <button onClick={() => { setSelectedType(null); setTitle(''); setContent(''); setSaveStatus(''); }}
          className="text-xs text-gray-400 hover:text-gray-600">← 활동 선택</button>
      </div>

      <input type="text" value={title} onChange={e => setTitle(e.target.value)}
        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" placeholder={`예: 오늘의 ${selectedType.label}`} />

      <textarea value={content} onChange={e => setContent(e.target.value)} rows={8}
        className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none leading-relaxed" placeholder={selectedType.placeholder} />

      <p className="text-[10px] text-gray-300">{selectedType.hint}</p>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button onClick={() => handleSave(true)} disabled={!content.trim()}
            className="px-4 py-2 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg disabled:opacity-40">임시 저장</button>
          <button onClick={() => handleSave(false)} disabled={!content.trim()}
            className="px-6 py-2 text-xs font-semibold text-white bg-purple-600 rounded-lg disabled:opacity-40 hover:bg-purple-700">제출하기</button>
        </div>
        {saveStatus && <span className="text-xs font-medium text-green-600">{saveStatus}</span>}
      </div>
    </div>
  );
}

export default StudentActivity;
