import React from 'react';
import { useNavigate } from 'react-router-dom';

function CreativeActivities() {
  const navigate = useNavigate();
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">🎨 창의적 체험활동</h1>
        <button
          onClick={() => navigate('/dashboard')}
          className="text-primary-600 hover:text-primary-900 font-medium"
        >
          &larr; 홈으로 돌아가기
        </button>
      </div>
      <div className="bg-white shadow rounded-lg p-6 text-gray-700">
        창의적 체험활동을 계획·정리하는 페이지입니다. 활동 기록 및 자료를 추가해주세요.
      </div>
    </div>
  );
}

export default CreativeActivities;

