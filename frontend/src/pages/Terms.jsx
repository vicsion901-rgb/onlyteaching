import { useNavigate } from 'react-router-dom';

function Terms() {
  const navigate = useNavigate();
  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">이용약관</h1>
        <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-800">← 뒤로</button>
      </div>

      <div className="bg-white rounded-xl shadow border border-gray-200 p-6 space-y-5 text-sm text-gray-700 leading-relaxed">
        <section>
          <h2 className="font-semibold text-gray-900 text-base mb-2">제1조 (목적)</h2>
          <p>본 약관은 온리티칭(이하 "서비스")이 제공하는 교사 업무 지원 서비스의 이용 조건 및 절차, 회원과 서비스 간의 권리·의무를 규정함을 목적으로 합니다.</p>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 text-base mb-2">제2조 (회원 가입 및 자격)</h2>
          <ol className="list-decimal pl-5 space-y-1">
            <li>서비스는 현직 교원을 대상으로 하며, 교사 인증(NEIS 급여명세서 등)을 완료한 자에 한하여 전체 기능을 이용할 수 있습니다.</li>
            <li>허위 정보로 가입하거나 타인의 명의를 도용한 경우, 사전 통보 없이 계정이 삭제될 수 있습니다.</li>
            <li>교사 인증은 1년 주기로 갱신해야 하며, 만료 시 일부 기능이 제한됩니다.</li>
          </ol>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 text-base mb-2">제3조 (서비스 내용)</h2>
          <p>서비스는 학생 관리, 생활기록부 작성 보조, 교육과정 관리, 학교 일정 관리 등 교사 업무를 지원하는 기능을 제공합니다. 서비스 내용은 사전 공지 후 변경될 수 있습니다.</p>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 text-base mb-2">제4조 (저작권)</h2>
          <ol className="list-decimal pl-5 space-y-1">
            <li>서비스 내에서 공유되는 모든 자료의 저작권은 원저작자에게 있습니다.</li>
            <li>서비스 내 자료는 온리티칭 내에서만 수정 및 재배포가 가능하며, 외부 유출을 금지합니다.</li>
            <li>서비스 자체의 소프트웨어, 디자인, 로고 등에 대한 권리는 온리티칭에 있습니다.</li>
          </ol>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 text-base mb-2">제5조 (회원 의무)</h2>
          <ol className="list-decimal pl-5 space-y-1">
            <li>회원은 관련 법령과 본 약관을 준수해야 합니다.</li>
            <li>학생 개인정보를 서비스 외부로 유출해서는 안 됩니다.</li>
            <li>서비스를 부정한 목적으로 이용해서는 안 됩니다.</li>
          </ol>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 text-base mb-2">제6조 (서비스 중단)</h2>
          <p>서비스는 시스템 점검, 천재지변, 기타 불가항력적 사유로 일시 중단될 수 있으며, 이 경우 사전 공지합니다.</p>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 text-base mb-2">제7조 (면책)</h2>
          <p>서비스는 무료로 제공되며, 서비스 이용으로 발생한 손해에 대해 법적 책임을 지지 않습니다. 단, 서비스의 고의 또는 중과실로 인한 손해는 예외로 합니다.</p>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 text-base mb-2">제8조 (탈퇴 및 계정 삭제)</h2>
          <p>회원은 언제든지 탈퇴할 수 있으며, 탈퇴 시 모든 개인정보는 즉시 파기됩니다. 단, 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관됩니다.</p>
        </section>

        <p className="text-xs text-gray-400 pt-4 border-t border-gray-100">시행일: 2026년 4월 12일</p>
      </div>
    </div>
  );
}

export default Terms;
