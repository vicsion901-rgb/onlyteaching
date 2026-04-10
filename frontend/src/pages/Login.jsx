import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo-login.png';

const SESSION_KEY = 'onlyteaching:session';
const SAVED_IDS_KEY = 'onlyteaching:savedIds';
const SESSION_TTL_DAYS = 30;
const MAX_SAVED_IDS = 5;

function Login() {
  const [schoolCode, setSchoolCode] = useState('');
  const [teacherCode, setTeacherCode] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regAgree, setRegAgree] = useState(false);

  const formatPhone = (raw) => {
    const digits = String(raw || '').replace(/\D/g, '').slice(0, 11);
    if (digits.length < 4) return digits;
    if (digits.length < 8) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  };
  const [loginError, setLoginError] = useState('');
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [isRegisterLoading, setIsRegisterLoading] = useState(false);
  const [registerResult, setRegisterResult] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [savedIds, setSavedIds] = useState([]);
  const [showIdDropdown, setShowIdDropdown] = useState(false);
  const navigate = useNavigate();

  // 저장된 ID 목록 로드
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVED_IDS_KEY);
      if (raw) setSavedIds(JSON.parse(raw));
    } catch {
      setSavedIds([]);
    }
  }, []);

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
    setLoginError('');
    setIsLoginLoading(true);
    try {
      // 운영(배포 환경)에서는 text/plain 으로 보내서 CORS preflight(OPTIONS) 우회
      //  → 학교·관공서 방화벽의 preflight 차단 회피
      // 로컬 개발(localhost)에서는 일반 JSON 사용
      const isLocalhost =
        typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' ||
          window.location.hostname === '127.0.0.1');

      const res = isLocalhost
        ? await client.post('/users/login', { schoolCode, teacherCode })
        : await client.post(
            '/users/login',
            JSON.stringify({ schoolCode, teacherCode }),
            {
              headers: { 'Content-Type': 'text/plain' },
              transformRequest: [(d) => d],
            },
          );
      // Backend returns { message, userId } if ACTIVE
      localStorage.setItem('userId', res.data.userId);
      localStorage.setItem('schoolCode', schoolCode);
      localStorage.setItem('loginMessage', res.data.message);

      // 저장된 ID 목록 갱신
      const next = [schoolCode, ...savedIds.filter((x) => x !== schoolCode)].slice(
        0,
        MAX_SAVED_IDS,
      );
      persistSavedIds(next);

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
      const code = error.response?.status;
      const msg = error.response?.data?.message || '';
      if (code === 401 && msg.includes('계정')) {
        setLoginError('아이디 또는 비밀번호가 잘못 되었습니다. 아이디와 비밀번호를 정확히 입력해 주세요.');
      } else if (code === 401) {
        setLoginError('아이디 또는 비밀번호가 잘못 되었습니다. 아이디와 비밀번호를 정확히 입력해 주세요.');
      } else if (code === 403) {
        setLoginError('아직 승인되지 않은 계정입니다. 교사 인증을 완료해 주세요.');
      } else {
        setLoginError(msg || '로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      }
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegisterResult(null);

    if (!regAgree) {
      alert('개인정보 수집·이용에 동의해주세요.');
      return;
    }
    if (regPassword.length < 8) {
      alert('비밀번호는 8자 이상이어야 합니다.');
      return;
    }
    if (regPassword !== regPasswordConfirm) {
      alert('비밀번호가 일치하지 않습니다.');
      return;
    }
    if (!/^[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}$/.test(regEmail)) {
      alert('올바른 이메일 형식이 아닙니다.');
      return;
    }

    setIsRegisterLoading(true);
    try {
      const res = await client.post('/users/register', {
        email: regEmail,
        password: regPassword,
        name: regName,
        phone: regPhone,
      });
      setRegisterResult(res.data);
      localStorage.setItem('userId', res.data.userId);
      localStorage.setItem('schoolCode', regEmail);
      localStorage.setItem('loginMessage', '가입 완료. 교사 인증을 진행해주세요.');
      alert('가입이 완료되었습니다. 교사 인증 페이지로 이동합니다.');
      window.location.reload();
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
              <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
              <input
                type="email"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="이메일을 입력하세요"
                value={schoolCode}
                onChange={(e) => setSchoolCode(e.target.value)}
                onFocus={() => setShowIdDropdown(true)}
                onBlur={() => setTimeout(() => setShowIdDropdown(false), 150)}
                autoComplete="email"
              />
              {showIdDropdown && savedIds.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 max-h-60 overflow-auto">
                  <div className="px-3 py-1.5 text-xs text-gray-400 border-b border-gray-100">
                    저장된 이메일
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
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 accent-blue-600"
              />
              <span>자동 로그인</span>
            </label>
            {loginError && (
              <p className="text-sm text-red-500 leading-snug">{loginError}</p>
            )}
            <button
              type="submit"
              disabled={isLoginLoading}
              className="w-full flex justify-center items-center py-3 px-4 rounded-lg text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition disabled:opacity-60"
            >
              {isLoginLoading ? '로그인 중...' : '로그인'}
            </button>
          </form>
          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate('/reset-password')}
              className="text-sm text-gray-500 hover:text-blue-600 underline"
            >
              비밀번호를 잊으셨나요?
            </button>
          </div>
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
          <div className="bg-white w-full max-w-xl rounded-xl shadow-2xl border border-gray-200 p-6 space-y-4 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl font-bold text-gray-900">회원가입</div>
                <p className="text-sm text-gray-500">
                  가입 후 <b>교사 인증(NEIS 급여명세서)</b>을 완료해야 서비스 이용이 가능합니다.
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
                <label className="block text-sm font-medium text-gray-700 mb-1">이메일 (로그인 ID)</label>
                <input
                  type="email"
                  required
                  autoComplete="username"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="name@example.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                />
                <p className="text-xs text-gray-400 mt-1">비밀번호 찾기 시 이 이메일로 안내가 발송됩니다.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="8자 이상"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호 확인</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="다시 입력"
                    value={regPasswordConfirm}
                    onChange={(e) => setRegPasswordConfirm(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="실명"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">전화번호</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={13}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="010-0000-0000"
                    value={regPhone}
                    onChange={(e) => setRegPhone(formatPhone(e.target.value))}
                  />
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-xs text-gray-600 space-y-1.5">
                <div className="font-semibold text-gray-800">개인정보 수집·이용 동의 (필수)</div>
                <div>· 수집 항목: 아이디, 비밀번호(암호화), 이름·이메일·전화(암호화 저장)</div>
                <div>· 이용 목적: 회원 식별, 교사 자격 확인, 서비스 이용</div>
                <div>· 보유 기간: 회원 탈퇴 시 즉시 파기</div>
                <div>· 비밀번호와 개인정보는 안전하게 암호화되어 저장되며, 관리자도 확인할 수 없습니다.</div>
                <label className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    checked={regAgree}
                    onChange={(e) => setRegAgree(e.target.checked)}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="text-gray-800 font-medium">위 내용에 동의합니다</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowRegister(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isRegisterLoading || !regAgree}
                  className="px-5 py-2 rounded-md text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition disabled:opacity-40"
                >
                  {isRegisterLoading ? '가입 중...' : '회원가입'}
                </button>
              </div>
              {registerResult && (
                <div className="text-sm text-gray-700 bg-emerald-50 border border-emerald-200 rounded-md p-3">
                  가입 완료. 로그인 후 <b>교사 인증</b>을 진행해주세요.
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
