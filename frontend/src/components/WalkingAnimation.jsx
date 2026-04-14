import seodang from '../assets/seodang.png';

/**
 * 서당 수묵 담채 삽화.
 * 실루엣 캐릭터 로직 전체 제거, 정적 이미지로 교체.
 */
function WalkingAnimation() {
  return (
    <div className="select-none" aria-hidden="true">
      <img
        src={seodang}
        alt=""
        draggable={false}
        className="h-14 sm:h-16 md:h-20 w-auto object-contain"
      />
    </div>
  );
}

export default WalkingAnimation;
