import React, { useRef, useState } from 'react';
import client from '../api/client';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo-login.png';

function Login() {
  const [schoolCode, setSchoolCode] = useState('');
  const [teacherCode, setTeacherCode] = useState('');
  const [regSchoolCode, setRegSchoolCode] = useState('');
  const [regTeacherCode, setRegTeacherCode] = useState('');
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [isRegisterLoading, setIsRegisterLoading] = useState(false);
  const [registerResult, setRegisterResult] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const fileRef = useRef(null);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoginLoading(true);
    try {
      const res = await client.post('/users/login', {
        schoolCode,
        teacherCode,
      });
      // Backend returns { message, userId } if ACTIVE
      localStorage.setItem('userId', res.data.userId);
      localStorage.setItem('loginMessage', res.data.message);
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.response?.data?.detail ||
        error.message ||
        '알 수 없는 오류';
      alert(`로그인에 실패했습니다: ${errorMessage}`);
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegisterResult(null);
    setIsRegisterLoading(true);
    try {
      const formData = new FormData();
      formData.append('schoolCode', regSchoolCode);
      formData.append('teacherCode', regTeacherCode);
      if (fileRef.current?.files?.[0]) {
        formData.append('image', fileRef.current.files[0]);
      }
      const res = await client.post('/users/register', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setRegisterResult(res.data);
      alert(`등록 완료: status=${res.data.status}, score=${res.data.score}`);
    } catch (error) {
      console.error('Register error:', error);
      const msg =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.response?.data?.detail ||
        error.message ||
        '알 수 없는 오류';
      alert(`회원가입 실패: ${msg}`);
    } finally {
      setIsRegisterLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="absolute top-3 left-3 flex items-center gap-3">
        <img
          src={logo}
          alt="온리티칭 로고"
          className="w-28 h-auto bg-white"
        />
      </div>
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-1">
          <div className="text-3xl font-extrabold text-purple-700 tracking-tight">ONLY TEACHING</div>
          <div className="text-lg text-gray-800 font-semibold leading-snug">오직 가르치기만 하십시오</div>
          <div className="text-base text-gray-600 leading-snug">업무를 더 쉽게, 교사를 더 자유롭게</div>
        </div>
        <div className="w-full space-y-6 bg-white p-8 rounded-xl shadow-lg border border-gray-100">
            <div className="space-y-1">
              <div className="text-xl font-bold text-gray-900">로그인</div>
              <p className="text-sm text-gray-500">승인된 교사만 로그인 가능합니다.</p>
            </div>
          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">아이디</label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="아이디를 입력하세요"
                value={schoolCode}
                onChange={(e) => setSchoolCode(e.target.value)}
              />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
              <input
                  type="password"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="비밀번호를 입력하세요"
                value={teacherCode}
                onChange={(e) => setTeacherCode(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={isLoginLoading}
              className="w-full flex justify-center items-center py-3 px-4 rounded-lg text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition disabled:opacity-60"
            >
              {isLoginLoading ? '로그인 중...' : '로그인'}
            </button>
          </form>
          <button
            type="button"
            onClick={() => setShowRegister(true)}
            className="w-full flex justify-center items-center py-3 px-4 rounded-lg text-base font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition"
          >
            회원가입
          </button>
        </div>
      </div>

      {showRegister && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl border border-gray-200 p-6 space-y-4 relative">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl font-bold text-gray-900">교사 등록(승인 요청)</div>
                <p className="text-sm text-gray-500">
                  나이스 화면 캡처를 업로드해 학교/교사 검증을 진행합니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRegister(false)}
                className="text-sm text-gray-500 hover:text-gray-800"
              >
                닫기
              </button>
            </div>
            <form className="space-y-4" onSubmit={handleRegister}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">학교 코드</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="학교 코드를 입력하세요"
                  value={regSchoolCode}
                  onChange={(e) => setRegSchoolCode(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">교사 코드</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="교사 코드를 입력하세요"
                  value={regTeacherCode}
                  onChange={(e) => setRegTeacherCode(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">나이스 캡처 이미지</label>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileRef}
                  required
                  className="w-full text-sm"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRegister(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isRegisterLoading}
                  className="px-4 py-2 rounded-md text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition disabled:opacity-60"
                >
                  {isRegisterLoading ? '등록 중...' : '회원가입'}
                </button>
              </div>
              {registerResult && (
                <div className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-md p-3">
                  <div>상태: {registerResult.status}</div>
                  <div>점수: {registerResult.score}</div>
                  <div>결정: {registerResult.decision}</div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;
