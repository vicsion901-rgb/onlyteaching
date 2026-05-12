import React from 'react';
import { useNavigate } from 'react-router-dom';

function StudentLayout({ children }) {
  const navigate = useNavigate();
  const sessionCode = localStorage.getItem('qr_session_code');
  const studentName = localStorage.getItem('qr_student_name');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-purple-700">✏️ 아침 활동</h1>
          {studentName && <p className="text-[10px] text-gray-400">{studentName}</p>}
        </div>
        <button onClick={() => {
          localStorage.removeItem('qr_session_code');
          localStorage.removeItem('qr_student_name');
          localStorage.removeItem('qr_student_number');
          localStorage.removeItem('qr_class_id');
          localStorage.removeItem('qr_student_id');
          localStorage.removeItem('morning_activities');
          localStorage.removeItem('manuscript_activities');
          localStorage.removeItem('pending_for_studio');
          localStorage.removeItem('creative_collections');
          navigate('/join');
        }} className="text-xs text-gray-400 hover:text-gray-600">나가기</button>
      </header>
      <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}

export default StudentLayout;
