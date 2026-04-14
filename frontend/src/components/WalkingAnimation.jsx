import seodang from '../assets/seodang.png';

/**
 * 서당 수묵 담채 삽화 + 은은한 생동감 모션.
 * 거의 정지 상태에서 아주 미세하게 살아있는 느낌.
 */
function WalkingAnimation() {
  return (
    <div className="select-none" aria-hidden="true">
      <img
        src={seodang}
        alt=""
        draggable={false}
        className="h-14 sm:h-16 md:h-20 w-auto object-contain seodang-breathe"
      />
      <style>{`
        @keyframes seodangBreathe {
          0%, 100% {
            transform: translateY(0) rotate(0deg) scale(1);
            filter: brightness(1);
          }
          30% {
            transform: translateY(-0.5px) rotate(0.15deg) scale(1.003);
            filter: brightness(1.01);
          }
          60% {
            transform: translateY(0.3px) rotate(-0.1deg) scale(0.998);
            filter: brightness(0.995);
          }
        }
        .seodang-breathe {
          animation: seodangBreathe 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

export default WalkingAnimation;
