import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import client from '../api/client';
import { hashPassword } from '../api/hash';

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  // 1단계: 이메일 입력 (토큰 없을 때)
  const [email, setEmail] = useState('');
  const [requestSent, setRequestSent] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestError, setRequestError] = useState('');

  // 2단계: 새 비밀번호 입력 (토큰 있을 때)
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetDone, setResetDone] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setRequestError('');
    setRequestLoading(true);
    try {
      await client.post('/api/password-reset-request', { email: email.trim() });
      setRequestSent(true);
    } catch (err) {
      setRequestError(err.response?.data?.message || '요청 처리 중 오류가 발생했습니다.');
    } finally {
      setRequestLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setResetError('');
    if (newPassword.length < 9 || !/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[^a-zA-Z0-9]/.test(newPassword)) {
      setResetError('비밀번호는 9자 이상이며, 영문·숫자·특수문자를 모두 포함해야 합니다.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError('비밀번호가 일치하지 않습니다.');
      return;
    }
    setResetLoading(true);
    try {
      const hashedPw = await hashPassword(newPassword);
      await client.post('/api/password-reset', { token, newPassword: hashedPw, hashed: true });
      setResetDone(true);
    } catch (err) {
      setResetError(err.response?.data?.message || '처리 중 오류가 발생했습니다.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-white">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="text-3xl font-extrabold text-purple-700 tracking-tight">ONLY TEACHING</div>
          <div className="text-base text-gray-600 mt-1">비밀번호 재설정</div>
        </div>

        <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 space-y-4">
          {!token ? (
            // ── 1단계: 이메일 입력 ──
            requestSent ? (
              <div className="text-center space-y-4">
                <div className="text-5xl">📧</div>
                <p className="text-gray-800 font-semibold">이메일을 확인해주세요</p>
                <p className="text-sm text-gray-500">
                  <b>{email}</b>으로 비밀번호 재설정 링크를 보냈습니다.
                  <br />메일함을 확인해주세요. (스팸함도 확인)
                </p>
                <button
                  onClick={() => navigate('/login')}
                  className="mt-4 px-6 py-2 text-sm font-medium text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50"
                >
                  로그인으로 돌아가기
                </button>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleRequestReset}>
                <p className="text-sm text-gray-600">가입 시 사용한 이메일을 입력하시면 비밀번호 재설정 링크를 보내드립니다.</p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                  <input
                    type="email"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                {requestError && <p className="text-sm text-red-500">{requestError}</p>}
                <button
                  type="submit"
                  disabled={requestLoading}
                  className="w-full py-3 rounded-lg text-base font-semibold text-white bg-purple-600 hover:bg-purple-700 shadow transition disabled:opacity-60"
                >
                  {requestLoading ? '전송 중...' : '재설정 링크 보내기'}
                </button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="text-sm text-gray-500 hover:text-blue-600 underline"
                  >
                    로그인으로 돌아가기
                  </button>
                </div>
              </form>
            )
          ) : (
            // ── 2단계: 새 비밀번호 입력 ──
            resetDone ? (
              <div className="text-center space-y-4">
                <div className="text-5xl">✅</div>
                <p className="text-gray-800 font-semibold">비밀번호가 변경되었습니다</p>
                <p className="text-sm text-gray-500">새 비밀번호로 로그인해주세요.</p>
                <button
                  onClick={() => navigate('/login')}
                  className="mt-4 w-full py-3 rounded-lg text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow transition"
                >
                  로그인하기
                </button>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleReset}>
                <p className="text-sm text-gray-600">새로운 비밀번호를 입력해주세요.</p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">새 비밀번호</label>
                  <input
                    type="password"
                    required
                    minLength={9}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="9자 이상 (영문+숫자+특수문자)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호 확인</label>
                  <input
                    type="password"
                    required
                    minLength={9}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="다시 입력"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                {resetError && <p className="text-sm text-red-500">{resetError}</p>}
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full py-3 rounded-lg text-base font-semibold text-white bg-purple-600 hover:bg-purple-700 shadow transition disabled:opacity-60"
                >
                  {resetLoading ? '변경 중...' : '비밀번호 변경'}
                </button>
              </form>
            )
          )}
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
