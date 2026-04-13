import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { hashPassword } from '../api/hash';
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

      const hashedPw = await hashPassword(teacherCode);
      const res = isLocalhost
        ? await client.post('/users/login', { schoolCode, teacherCode: hashedPw, hashed: true })
        : await client.post(
            '/users/login',
            JSON.stringify({ schoolCode, teacherCode: hashedPw, hashed: true }),
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

  const [registerError, setRegisterError] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegisterResult(null);
    setRegisterError('');

    if (!regAgree) {
      setRegisterError('개인정보 수집·이용에 동의해주세요.');
      return;
    }
    if (!/^[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}$/.test(regEmail)) {
      setRegisterError('올바른 이메일 형식이 아닙니다.');
      return;
    }
    if (regPassword.length < 9 || !/[a-zA-Z]/.test(regPassword) || !/[0-9]/.test(regPassword) || !/[^a-zA-Z0-9]/.test(regPassword)) {
      setRegisterError('비밀번호는 9자 이상이며, 영문·숫자·특수문자를 모두 포함해야 합니다.');
      return;
    }
    if (regName && regName.trim().length >= 2 && regPassword.includes(regName.trim())) {
      setRegisterError('비밀번호에 본인 이름을 포함할 수 없습니다.');
      return;
    }
    if (regPassword !== regPasswordConfirm) {
      setRegisterError('비밀번호가 일치하지 않습니다.');
      return;
    }
    if (!regName || regName.trim().length < 2) {
      setRegisterError('이름을 입력해주세요. (2자 이상)');
      return;
    }
    if (!regPhone || !/^01[016789]-?\d{3,4}-?\d{4}$/.test(regPhone.replace(/\s/g, ''))) {
      setRegisterError('전화번호를 입력해주세요.');
      return;
    }

    setIsRegisterLoading(true);
    try {
      const hashedRegPw = await hashPassword(regPassword);
      const res = await client.post('/users/register', {
        email: regEmail,
        password: hashedRegPw,
        name: regName,
        phone: regPhone,
        hashed: true,
      });
      setRegisterResult(res.data);
      localStorage.setItem('userId', res.data.userId);
      localStorage.setItem('schoolCode', regEmail);
      localStorage.setItem('loginMessage', '가입 완료. 교사 인증을 진행해주세요.');
      setShowRegister(false);
      navigate('/teacher-verification');
    } catch (error) {
      console.error('Register error:', error);
      const msg =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.response?.data?.detail ||
        error.message ||
        '알 수 없는 오류';
      setRegisterError(msg);
    } finally {
      setIsRegisterLoading(false);
    }
  };

  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="w-full max-w-md relative z-0">
        <div className="text-center mb-8">
          <div className="text-3xl font-extrabold text-purple-700 tracking-tight">ONLY TEACHING</div>
          <div className="text-lg font-semibold leading-snug mt-1 shimmer-text">오직 가르치기만 하십시오</div>
        </div>

        <div className="w-full bg-white p-8 rounded-2xl shadow-lg space-y-5">
          <h1 className="text-2xl font-bold text-gray-900 text-center">로그인</h1>

          <form className="space-y-4" onSubmit={handleLogin}>
            {/* 이메일 - 플로팅 라벨 */}
            <div className="relative">
              <input
                id="login-email"
                type="email"
                required
                className="peer w-full px-4 pt-5 pb-2 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-base"
                placeholder=" "
                value={schoolCode}
                onChange={(e) => setSchoolCode(e.target.value)}
                onFocus={() => setShowIdDropdown(true)}
                onBlur={() => setTimeout(() => setShowIdDropdown(false), 150)}
                autoComplete="email"
              />
              <label
                htmlFor="login-email"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-base transition-all pointer-events-none peer-focus:top-3 peer-focus:text-xs peer-focus:text-blue-500 peer-[:not(:placeholder-shown)]:top-3 peer-[:not(:placeholder-shown)]:text-xs"
              >
                이메일 주소
              </label>
              {showIdDropdown && savedIds.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 max-h-60 overflow-auto">
                  <div className="px-4 py-2 text-xs text-gray-400 border-b border-gray-100">
                    저장된 이메일
                  </div>
                  {savedIds.map((id) => (
                    <div
                      key={id}
                      className="flex items-center justify-between px-4 py-2.5 hover:bg-blue-50 cursor-pointer group"
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
                        title="삭제"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 비밀번호 - 플로팅 라벨 + 눈 아이콘 */}
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                className="peer w-full px-4 pt-5 pb-2 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-base"
                placeholder=" "
                value={teacherCode}
                onChange={(e) => setTeacherCode(e.target.value)}
              />
              <label
                htmlFor="login-password"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-base transition-all pointer-events-none peer-focus:top-3 peer-focus:text-xs peer-focus:text-blue-500 peer-[:not(:placeholder-shown)]:top-3 peer-[:not(:placeholder-shown)]:text-xs"
              >
                비밀번호
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>

            {/* 비밀번호 찾기 + 자동 로그인 */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
                <span>자동 로그인</span>
              </label>
              <button
                type="button"
                onClick={() => navigate('/reset-password')}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                비밀번호를 잊으셨나요?
              </button>
            </div>

            {loginError && (
              <p className="text-sm text-red-500 leading-snug">{loginError}</p>
            )}

            {/* 로그인 버튼 */}
            <button
              type="submit"
              disabled={isLoginLoading}
              className="w-full flex justify-center items-center py-3.5 px-4 rounded-full text-base font-semibold text-white bg-gray-900 hover:bg-black shadow-md transition disabled:opacity-60"
            >
              {isLoginLoading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          {/* 구분선 */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200"></div>
            <span className="text-sm text-gray-400">또는</span>
            <div className="flex-1 h-px bg-gray-200"></div>
          </div>

          {/* 회원가입 버튼 */}
          <button
            type="button"
            onClick={() => setShowRegister(true)}
            className="w-full flex justify-center items-center py-3.5 px-4 rounded-full text-base font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 shadow-sm transition"
          >
            회원가입
          </button>
        </div>

        <p className="text-center text-lg text-gray-400 mt-6">업무를 더 쉽게, 교사를 더 자유롭게</p>
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
                    minLength={9}
                    autoComplete="new-password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="9자 이상 (영문+숫자+특수문자)"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호 확인</label>
                  <input
                    type="password"
                    required
                    minLength={9}
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
                    required
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
                <div>· 수집 항목: 이메일(로그인 ID), 비밀번호(암호화), 이름·전화(암호화 저장)</div>
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

              {registerError && (
                <p className="text-sm text-red-500 leading-snug">{registerError}</p>
              )}
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
                  className="px-5 py-2 rounded-md text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition disabled:opacity-40"
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
