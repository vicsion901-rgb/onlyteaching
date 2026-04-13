import { useNavigate } from 'react-router-dom';

function Privacy() {
  const navigate = useNavigate();
  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">개인정보처리방침</h1>
        <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-800">← 뒤로</button>
      </div>

      <div className="bg-white rounded-xl shadow border border-gray-200 p-6 space-y-5 text-sm text-gray-700 leading-relaxed">
        <p>온리티칭(이하 "서비스")은 회원의 개인정보를 중요시하며, 「개인정보 보호법」에 따라 다음과 같이 개인정보를 처리합니다.</p>

        <section>
          <h2 className="font-semibold text-gray-900 text-base mb-2">1. 수집하는 개인정보 항목</h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 px-3 py-2 text-left">구분</th>
                <th className="border border-gray-200 px-3 py-2 text-left">항목</th>
                <th className="border border-gray-200 px-3 py-2 text-left">저장 방식</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-200 px-3 py-2">필수</td>
                <td className="border border-gray-200 px-3 py-2">이메일(로그인 ID), 비밀번호</td>
                <td className="border border-gray-200 px-3 py-2">이메일: 평문, 비밀번호: bcrypt 해시</td>
              </tr>
              <tr>
                <td className="border border-gray-200 px-3 py-2">필수</td>
                <td className="border border-gray-200 px-3 py-2">이름, 전화번호</td>
                <td className="border border-gray-200 px-3 py-2">AES-256-GCM 암호화</td>
              </tr>
              <tr>
                <td className="border border-gray-200 px-3 py-2">교사인증</td>
                <td className="border border-gray-200 px-3 py-2">이름, 학교명, 교원구분, 직위, 재직상태, 지급년월</td>
                <td className="border border-gray-200 px-3 py-2">평문 (인증 결과만 저장)</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-2 text-xs text-gray-500">급여 금액, 세부 내역 등 민감 정보는 수집·저장하지 않습니다. PDF 파일은 인증 처리 후 즉시 파기됩니다.</p>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 text-base mb-2">2. 개인정보 이용 목적</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>회원 식별 및 로그인</li>
            <li>교사 자격 확인 및 중복 가입 방지</li>
            <li>서비스 이용 및 고객 문의 대응</li>
            <li>비밀번호 재설정 이메일 발송</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 text-base mb-2">3. 보유 및 이용 기간</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><b>회원 정보:</b> 회원 탈퇴 시 즉시 파기</li>
            <li><b>교사 인증 기록:</b> 인증 완료 후 1년간 보관, 이후 자동 삭제</li>
            <li><b>법령에 따른 보존:</b> 관련 법률이 요구하는 경우 해당 기간 동안 보관</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 text-base mb-2">4. 개인정보 제3자 제공</h2>
          <p>서비스는 회원의 개인정보를 제3자에게 제공하지 않습니다. 단, 법령에 의한 요청이 있는 경우 예외로 합니다.</p>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 text-base mb-2">5. 개인정보 보호 조치</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>비밀번호: bcrypt 단방향 해시 (관리자도 확인 불가)</li>
            <li>이름·전화번호: AES-256-GCM 암호화 저장</li>
            <li>전송 구간: HTTPS(TLS) 암호화 통신</li>
            <li>데이터베이스: SSL 연결, 접근 제한</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 text-base mb-2">6. 회원의 권리</h2>
          <p>회원은 언제든지 본인의 개인정보 열람, 수정, 삭제를 요청할 수 있으며, 회원 탈퇴를 통해 모든 정보를 삭제할 수 있습니다.</p>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 text-base mb-2">7. 개인정보 보호책임자</h2>
          <p>문의: <a href="mailto:vicsion901@gmail.com" className="text-blue-600 underline">vicsion901@gmail.com</a></p>
        </section>

        <p className="text-xs text-gray-400 pt-4 border-t border-gray-100">시행일: 2026년 4월 12일</p>
      </div>
    </div>
  );
}

export default Privacy;
