import React from 'react';
import { useNavigate } from 'react-router-dom';

function ExamGrading() {
  const navigate = useNavigate();
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">✏️ 시험지 채점</h1>
        <button
          onClick={() => navigate('/dashboard')}
          className="text-primary-600 hover:text-primary-900 font-medium"
        >
          &larr; 홈으로 돌아가기
        </button>
      </div>
      <div className="bg-white shadow rounded-lg p-6 text-gray-700">
        시험지를 채점하고 관리하는 페이지입니다. 채점 및 통계 기능을 추가해주세요.
      </div>
    </div>
  );
}

export default ExamGrading;

