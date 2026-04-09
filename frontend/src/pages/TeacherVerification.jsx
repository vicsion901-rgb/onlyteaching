import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';

function TeacherVerification() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [file, setFile] = useState(null);
  const [step, setStep] = useState(1); // 1 동의, 2 방법선택, 3 업로드
  const [agreed, setAgreed] = useState(false);

  const userId = localStorage.getItem('userId') || '';

  const loadStatus = async () => {
    try {
      const res = await client.get('/teacher-verification/status', {
        params: { userId },
      });
      setStatus(res.data);
    } catch {
      setStatus({ verifyStatus: 'NONE' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) {
      navigate('/login');
      return;
    }
    loadStatus();

  }, []);

  const handlePick = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.pdf')) {
      setError('PDF 파일만 업로드 가능합니다.');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('파일 용량이 10MB를 초과합니다.');
      return;
    }
    setError('');
    setFile(f);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('파일을 선택해주세요.');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('userId', userId);
      const res = await client.post('/teacher-verification/salary-pdf', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      });
      alert(`인증 완료! ${res.data.verifiedName} / ${res.data.verifiedSchool}`);
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      await loadStatus();
      setStep(1);
    } catch (err) {
      const msg =
        err.response?.data?.message || err.message || '인증에 실패했습니다.';
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  const renderStatusCard = () => {
    if (!status || status.verifyStatus === 'NONE') {
      return (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <div className="font-semibold text-amber-900">미인증 상태</div>
            <div className="text-sm text-amber-800 mt-1">
              아래에서 교사 인증을 진행해주세요.
            </div>
          </div>
        </div>
      );
    }
    if (status.verifyStatus === 'VERIFIED') {
      const expired =
        status.expiresAt && new Date(status.expiresAt).getTime() < Date.now();
      return (
        <div
          className={`rounded-xl p-4 border ${
            expired
              ? 'bg-rose-50 border-rose-200'
              : 'bg-emerald-50 border-emerald-200'
          }`}
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl">{expired ? '⛔' : '✅'}</span>
            <div className="flex-1">
              <div
                className={`font-semibold ${
                  expired ? 'text-rose-900' : 'text-emerald-900'
                }`}
              >
                {expired ? '인증 만료됨' : '인증 완료'}
              </div>
              <dl className="mt-2 text-sm grid grid-cols-2 gap-x-4 gap-y-1 text-gray-700">
                <dt className="text-gray-500">이름</dt>
                <dd>{status.verifiedName}</dd>
                <dt className="text-gray-500">학교</dt>
                <dd>{status.verifiedSchool}</dd>
                <dt className="text-gray-500">직위</dt>
                <dd>
                  {status.verifiedCategory} · {status.verifiedPosition}
                </dd>
                <dt className="text-gray-500">기준 지급월</dt>
                <dd>{status.payPeriod}</dd>
                <dt className="text-gray-500">인증일</dt>
                <dd>
                  {status.verifiedAt
                    ? new Date(status.verifiedAt).toLocaleDateString('ko-KR')
                    : '-'}
                </dd>
                <dt className="text-gray-500">만료일</dt>
                <dd>
                  {status.expiresAt
                    ? new Date(status.expiresAt).toLocaleDateString('ko-KR')
                    : '-'}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      );
    }
    if (status.verifyStatus === 'REJECTED') {
      return (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
          <div className="font-semibold text-rose-900">❌ 이전 인증 실패</div>
          <div className="text-sm text-rose-800 mt-1">
            사유: {status.rejectReason || '알 수 없음'}
          </div>
          <div className="text-xs text-rose-700 mt-2">
            다시 시도해주세요.
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        불러오는 중...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-6 px-3 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">🎓 교사 인증</h1>
        <button
          onClick={() => navigate('/dashboard')}
          className="text-sm text-gray-500 hover:text-gray-800"
        >
          ← 홈으로
        </button>
      </div>

      {renderStatusCard()}

      {/* 단계 표시 */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { n: 1, label: '개인정보 동의' },
          { n: 2, label: '인증방법 선택' },
          { n: 3, label: '급여명세서 제출' },
        ].map((s) => (
          <div
            key={s.n}
            className={`rounded-lg border-t-4 p-3 text-center ${
              step === s.n
                ? 'border-blue-600 bg-blue-50 text-blue-900 font-semibold'
                : 'border-gray-200 bg-white text-gray-500'
            }`}
          >
            <div className="text-xs">{s.n}단계</div>
            <div className="text-sm mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* 1단계 */}
      {step === 1 && (
        <div className="bg-white rounded-xl shadow border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">개인정보 제공 동의</h2>
          <div className="text-sm text-gray-700 space-y-2">
            <p>
              <b>수집 항목:</b> 이름, 학교명, 교원 구분, 직위, 재직 상태, 급여
              지급년월
            </p>
            <p>
              <b>이용 목적:</b> 교사 자격 확인, 중복 가입 방지
            </p>
            <p>
              <b>보유 기간:</b> 인증 완료 후 1년간. 급여 금액 등 세부 내역은{' '}
              <b>저장하지 않습니다</b>. PDF 파일은 인증 처리 후 즉시 파기됩니다.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="w-4 h-4 accent-blue-600"
            />
            위 내용에 동의합니다
          </label>
          <div className="flex justify-end">
            <button
              disabled={!agreed}
              onClick={() => setStep(2)}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold disabled:opacity-40 hover:bg-blue-700"
            >
              동의
            </button>
          </div>
        </div>
      )}

      {/* 2단계 */}
      {step === 2 && (
        <div className="bg-white rounded-xl shadow border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">인증 방법 선택</h2>
          <div className="grid md:grid-cols-2 gap-3">
            <button
              onClick={() => setStep(3)}
              className="border-2 border-blue-200 bg-blue-50 rounded-xl p-5 text-left hover:border-blue-500 transition"
            >
              <div className="font-bold text-blue-900 mb-2">
                📄 간편인증 (권장)
              </div>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>✓ NEIS 급여명세서 PDF 업로드</li>
                <li>✓ 제출 즉시 자동 승인</li>
                <li>✓ 공립/사립 모두 가능</li>
              </ul>
            </button>
            <button
              disabled
              className="border-2 border-gray-200 bg-gray-50 rounded-xl p-5 text-left opacity-50 cursor-not-allowed"
            >
              <div className="font-bold text-gray-600 mb-2">📋 서류인증</div>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>· 퇴직 교원 / 해외 근무</li>
                <li>· 계약제 교원</li>
                <li>· 준비 중 (coming soon)</li>
              </ul>
            </button>
          </div>
          <div className="flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="text-sm text-gray-500 hover:text-gray-800"
            >
              ← 이전
            </button>
          </div>
        </div>
      )}

      {/* 3단계 */}
      {step === 3 && (
        <div className="bg-white rounded-xl shadow border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">
            NEIS 급여명세서 PDF 제출
          </h2>
          <ol className="text-sm text-gray-700 space-y-1 list-decimal pl-5">
            <li>NEIS [나의메뉴] → [급여] → [지급명세서] 이동</li>
            <li>최근 3개월 이내의 급여명세서 선택</li>
            <li>디스켓(저장) 버튼 클릭 → PDF로 저장</li>
            <li>아래에서 저장한 PDF 파일 업로드</li>
          </ol>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
            <b>보안 안내:</b> 업로드된 PDF는 메모리에서만 처리되며,
            이름/학교/재직상태/지급년월 외의 정보(급여 금액 등)는 <b>절대 저장되지 않습니다</b>.
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,.pdf"
            onChange={handlePick}
            className="block w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />

          {file && (
            <div className="text-sm text-gray-600">
              선택된 파일: <b>{file.name}</b> ({(file.size / 1024).toFixed(1)} KB)
            </div>
          )}

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-between">
            <button
              onClick={() => setStep(2)}
              className="text-sm text-gray-500 hover:text-gray-800"
            >
              ← 이전
            </button>
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold disabled:opacity-40 hover:bg-blue-700"
            >
              {uploading ? '인증 처리 중...' : '전송 및 인증'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default TeacherVerification;
