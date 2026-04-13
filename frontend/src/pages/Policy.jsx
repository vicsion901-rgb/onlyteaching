import { useNavigate } from 'react-router-dom';

function Policy() {
  const navigate = useNavigate();
  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">온리티칭 운영정책</h1>
        <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-800">← 뒤로</button>
      </div>

      <div className="bg-white rounded-xl shadow border border-gray-200 p-6 space-y-5 text-sm text-gray-700 leading-relaxed">
        <section>
          <h2 className="font-semibold text-gray-900 text-base mb-2">1. 서비스 목적</h2>
          <p>온리티칭은 초등교사의 업무 부담을 줄이고, 교육 활동에 집중할 수 있는 환경을 만드는 것을 목표로 합니다. "오직 가르치기만 하십시오"라는 철학 아래, 행정 업무를 더 쉽고 효율적으로 처리할 수 있도록 지원합니다.</p>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 text-base mb-2">2. 이용 대상</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>현직 국공립/사립 교원 (교사 인증 완료자)</li>
            <li>교사 인증은 NEIS 급여명세서 PDF를 통해 진행합니다.</li>
            <li>인증은 1년 주기로 갱신이 필요합니다.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 text-base mb-2">3. 자료 이용 규칙</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>서비스 내에서 공유되는 자료의 저작권은 원저작자에게 있습니다.</li>
            <li>자료는 온리티칭 내에서만 수정 및 재배포가 가능합니다.</li>
            <li>외부 사이트, SNS 등에 무단 전재하는 것을 금지합니다.</li>
            <li>학생 개인정보가 포함된 자료를 공유해서는 안 됩니다.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 text-base mb-2">4. 금지 행위</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>타인의 계정을 사용하거나 공유하는 행위</li>
            <li>허위 정보로 교사 인증을 시도하는 행위</li>
            <li>서비스를 상업적 목적으로 이용하는 행위</li>
            <li>다른 회원에게 불쾌감을 주는 행위</li>
            <li>서비스의 정상적인 운영을 방해하는 행위</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 text-base mb-2">5. 제재 조치</h2>
          <p>운영정책을 위반한 회원에게는 경고, 기능 제한, 계정 정지 등의 조치를 취할 수 있습니다. 중대한 위반의 경우 사전 통보 없이 계정이 삭제될 수 있습니다.</p>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 text-base mb-2">6. 문의</h2>
          <p>운영정책에 대한 문의는 <a href="mailto:vicsion901@gmail.com" className="text-blue-600 underline">vicsion901@gmail.com</a>으로 연락주세요.</p>
        </section>

        <p className="text-xs text-gray-400 pt-4 border-t border-gray-100">시행일: 2026년 4월 12일</p>
      </div>
    </div>
  );
}

export default Policy;
