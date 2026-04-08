import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo-login.png';

const SESSION_KEY = 'onlyteaching:session';
const SAVED_IDS_KEY = 'onlyteaching:savedIds';
const DO_NOT_REMEMBER_KEY = 'onlyteaching:doNotRemember';
const SESSION_TTL_DAYS = 30;
const MAX_SAVED_IDS = 5;

function Login() {
  const [schoolCode, setSchoolCode] = useState('');
  const [teacherCode, setTeacherCode] = useState('');
  const [regSchoolCode, setRegSchoolCode] = useState('');
  const [regTeacherCode, setRegTeacherCode] = useState('');
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [isRegisterLoading, setIsRegisterLoading] = useState(false);
  const [registerResult, setRegisterResult] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [savedIds, setSavedIds] = useState([]);
  const [doNotRemember, setDoNotRemember] = useState(() => {
    try {
      return localStorage.getItem(DO_NOT_REMEMBER_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [showIdDropdown, setShowIdDropdown] = useState(false);
  const navigate = useNavigate();

  // 저장된 ID 목록 로드
  useEffect(() => {
    if (doNotRemember) {
      setSavedIds([]);
      return;
    }
    try {
      const raw = localStorage.getItem(SAVED_IDS_KEY);
      if (raw) setSavedIds(JSON.parse(raw));
    } catch {
      setSavedIds([]);
    }
  }, [doNotRemember]);

  const persistSavedIds = (ids) => {
    setSavedIds(ids);
    try {
      localStorage.setItem(SAVED_IDS_KEY, JSON.stringify(ids));
    } catch {
      /* ignore */
    }
  };

  const handleRemoveSavedId = (id) => {
    persistSavedIds(savedIds.filter((x) => x !== id));
  };

  const handlePickSavedId = (id) => {
    setSchoolCode(id);
    setShowIdDropdown(false);
  };

  const handleToggleDoNotRemember = (checked) => {
    setDoNotRemember(checked);
    try {
      if (checked) {
        localStorage.setItem(DO_NOT_REMEMBER_KEY, '1');
        localStorage.removeItem(SAVED_IDS_KEY);
        localStorage.removeItem(SESSION_KEY);
        setSavedIds([]);
        setRememberMe(false);
      } else {
        localStorage.removeItem(DO_NOT_REMEMBER_KEY);
      }
    } catch {
      /* ignore */
    }
  };

  // 자동 로그인: 세션이 유효하면 즉시 대시보드로
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return;
      const session = JSON.parse(raw);
      const now = Date.now();
      if (session.expiresAt && session.expiresAt > now && session.userId) {
        localStorage.setItem('userId', session.userId);
        localStorage.setItem('schoolCode', session.schoolCode);
        localStorage.setItem('loginMessage', session.message || '자동 로그인');
        navigate('/dashboard', { replace: true });
      } else {
        localStorage.removeItem(SESSION_KEY);
      }
    } catch {
      localStorage.removeItem(SESSION_KEY);
    }
  }, [navigate]);

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
      localStorage.setItem('schoolCode', schoolCode);
      localStorage.setItem('loginMessage', res.data.message);

      // 저장된 ID 목록 갱신 (이 기기 기억 안 함이 아닐 때만)
      if (!doNotRemember) {
        const next = [schoolCode, ...savedIds.filter((x) => x !== schoolCode)].slice(
          0,
          MAX_SAVED_IDS,
        );
        persistSavedIds(next);
      }

      // 자동 로그인 체크 시에만 7일 세션 저장
      if (rememberMe) {
        const expiresAt = Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
        localStorage.setItem(
          SESSION_KEY,
          JSON.stringify({
            userId: res.data.userId,
            schoolCode,
            message: res.data.message,
            expiresAt,
          }),
        );
      } else {
        localStorage.removeItem(SESSION_KEY);
      }

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
      const res = await client.post('/users/register', {
        schoolCode: regSchoolCode,
        teacherCode: regTeacherCode,
      });
      setRegisterResult(res.data);
      alert(`등록 완료: status=${res.data.status}`);
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
      <div className="w-full max-w-md space-y-8 relative z-0">
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
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">아이디</label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="아이디를 입력하세요"
                value={schoolCode}
                onChange={(e) => setSchoolCode(e.target.value)}
                onFocus={() => setShowIdDropdown(true)}
                onBlur={() => setTimeout(() => setShowIdDropdown(false), 150)}
                autoComplete="off"
              />
              {showIdDropdown && savedIds.length > 0 && !doNotRemember && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 max-h-60 overflow-auto">
                  <div className="px-3 py-1.5 text-xs text-gray-400 border-b border-gray-100">
                    저장된 아이디
                  </div>
                  {savedIds.map((id) => (
                    <div
                      key={id}
                      className="flex items-center justify-between px-3 py-2 hover:bg-blue-50 cursor-pointer group"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handlePickSavedId(id);
                      }}
                    >
                      <span className="text-sm text-gray-800">{id}</span>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleRemoveSavedId(id);
                        }}
                        className="text-gray-300 hover:text-red-500 text-lg leading-none px-1 opacity-0 group-hover:opacity-100"
                        title="이 아이디 삭제"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
            <div className="space-y-2">
              <label className={`flex items-center gap-2 text-sm cursor-pointer select-none ${doNotRemember ? 'text-gray-300' : 'text-gray-600'}`}>
                <input
                  type="checkbox"
                  checked={rememberMe && !doNotRemember}
                  disabled={doNotRemember}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 accent-blue-600"
                />
                <span>자동 로그인</span>
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={doNotRemember}
                  onChange={(e) => handleToggleDoNotRemember(e.target.checked)}
                  className="w-4 h-4 accent-red-600"
                />
                <span>이 기기 기억 안 함 <span className="text-xs text-gray-400">(공용 PC 권장)</span></span>
              </label>
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
                  OCR/이미지 업로드 기반 검증을 제거했습니다. 등록 후 관리자 승인까지 기다려주세요.
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
