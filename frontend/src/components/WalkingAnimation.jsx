import { useState, useEffect } from 'react';

/**
 * 교사 1명 + 학생 3명 실루엣 애니메이션.
 * 레퍼런스: 둥근 머리 + 뚜렷한 옆모습 실루엣 (이미지 188 기반)
 *
 * 기본: 교사 왼쪽 걷기 / 학생 딴짓
 * 3초마다: 교사 뒤 확인 / 학생 걷는 척
 */

function WalkingAnimation() {
  const [checking, setChecking] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let t;
    const cycle = () => {
      setChecking(false);
      t = setTimeout(() => { setChecking(true); t = setTimeout(cycle, 2000); }, 3000);
    };
    cycle();
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const i = setInterval(() => setTick(t => t + 1), 300);
    return () => clearInterval(i);
  }, []);

  const f = tick % 2; // 0 or 1 for walk frame

  return (
    <div className="flex items-end select-none" aria-hidden="true" style={{ height: 48, gap: 3 }}>
      <Teacher walking={!checking} frame={f} checking={checking} />
      <Student type="boy" active={checking} frame={f} />
      <Student type="girl-pigtails" active={checking} frame={f} />
      <Student type="boy-cap" active={checking} frame={f} />

      <style>{`
        @keyframes wb{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}
        .wbob{animation:wb .35s ease-in-out infinite}
      `}</style>
    </div>
  );
}

function Teacher({ walking, frame, checking }) {
  // 교사: 정장, 왼쪽 옆모습, 키가 더 큼
  const legAng = walking ? (frame === 0 ? -12 : 12) : 0;
  const armAng = walking ? (frame === 0 ? 10 : -10) : 0;
  return (
    <svg width="24" height="48" viewBox="0 0 24 48" className={walking ? 'wbob' : ''} style={{ flexShrink: 0 }}>
      {/* Head - 큰 둥근 머리 */}
      <circle cx="10" cy="8" r="7" fill="#1a1a1a" />
      {/* Neck */}
      <rect x="8" y="15" width="4" height="3" fill="#1a1a1a" />
      {/* Body - 정장 */}
      <rect x="4" y="18" width="12" height="14" rx="2" fill="#1a1a1a" />
      {/* Tie hint */}
      <line x1="10" y1="19" x2="10" y2="27" stroke="#444" strokeWidth="1.2" />
      {/* Arm front */}
      <rect x="2" y="19" width="3" height="11" rx="1.5" fill="#1a1a1a"
        style={{ transformOrigin: '3.5px 19px', transform: `rotate(${armAng}deg)`, transition: 'transform .15s' }} />
      {/* Arm back */}
      <rect x="15" y="19" width="3" height="11" rx="1.5" fill="#2d2d2d"
        style={{ transformOrigin: '16.5px 19px', transform: `rotate(${-armAng}deg)`, transition: 'transform .15s' }} />
      {/* Leg front */}
      <rect x="5" y="32" width="4" height="13" rx="1.5" fill="#1a1a1a"
        style={{ transformOrigin: '7px 32px', transform: `rotate(${legAng}deg)`, transition: 'transform .15s' }} />
      {/* Leg back */}
      <rect x="11" y="32" width="4" height="13" rx="1.5" fill="#2d2d2d"
        style={{ transformOrigin: '13px 32px', transform: `rotate(${-legAng}deg)`, transition: 'transform .15s' }} />
      {/* Shoe front */}
      <ellipse cx="6" cy="45" rx="3" ry="1.5" fill="#1a1a1a"
        style={{ transformOrigin: '7px 32px', transform: `rotate(${legAng}deg)`, transition: 'transform .15s' }} />
      {/* Checking indicator - 머리 살짝 돌림 */}
      {checking && <circle cx="15" cy="7" r="2" fill="#1a1a1a" />}
    </svg>
  );
}

function Student({ type, active, frame }) {
  // active = 교사가 확인 중 → 걷는 척
  const walking = active;
  const legAng = walking ? (frame === 0 ? -14 : 14) : (frame % 2 === 0 ? 2 : -2);
  const armAng = walking ? (frame === 0 ? 12 : -12) : 0;
  const h = 42;

  // 딴짓 모션
  const idleHeadRot = !walking ? (frame === 0 ? 5 : -3) : 0;
  const idleArmRot = !walking ? (frame === 0 ? -15 : -25) : 0;

  let headExtra = null;
  let bodyColor = '#1a1a1a';
  let skirt = false;

  if (type === 'girl-pigtails') {
    skirt = true;
    // 양갈래 머리
    headExtra = (
      <>
        <circle cx="4" cy="6" r="3" fill="#1a1a1a" />
        <circle cx="16" cy="6" r="3" fill="#1a1a1a" />
      </>
    );
  } else if (type === 'boy-cap') {
    // 모자 달린 남자아이
    headExtra = (
      <rect x="5" y="1" width="12" height="3" rx="1" fill="#1a1a1a" />
    );
  }
  // boy: 기본, 추가 장식 없음

  return (
    <svg width="20" height={h} viewBox={`0 0 20 ${h}`} className={walking ? 'wbob' : ''} style={{ flexShrink: 0 }}>
      {/* Head */}
      <circle cx="10" cy="8" r="6" fill="#1a1a1a"
        style={{ transformOrigin: '10px 8px', transform: `rotate(${idleHeadRot}deg)`, transition: 'transform .2s' }} />
      {headExtra}
      {/* Body */}
      <rect x="5" y="15" width="10" height={skirt ? 8 : 12} rx="2" fill={bodyColor} />
      {/* Skirt */}
      {skirt && <path d="M3 23 L5 15 L15 15 L17 23Z" fill="#1a1a1a" />}
      {/* Arm front */}
      <rect x="1" y="16" width="3" height="9" rx="1.5" fill="#1a1a1a"
        style={{ transformOrigin: '2.5px 16px', transform: `rotate(${walking ? armAng : idleArmRot}deg)`, transition: 'transform .15s' }} />
      {/* Arm back */}
      <rect x="16" y="16" width="3" height="9" rx="1.5" fill="#2d2d2d"
        style={{ transformOrigin: '17.5px 16px', transform: `rotate(${walking ? -armAng : 5}deg)`, transition: 'transform .15s' }} />
      {/* Legs */}
      <rect x="5" y={skirt ? 23 : 27} width="3.5" height={skirt ? 14 : 12} rx="1.5" fill="#1a1a1a"
        style={{ transformOrigin: `6.75px ${skirt ? 23 : 27}px`, transform: `rotate(${legAng}deg)`, transition: 'transform .15s' }} />
      <rect x="11" y={skirt ? 23 : 27} width="3.5" height={skirt ? 14 : 12} rx="1.5" fill="#2d2d2d"
        style={{ transformOrigin: `12.75px ${skirt ? 23 : 27}px`, transform: `rotate(${-legAng}deg)`, transition: 'transform .15s' }} />
      {/* Shoes */}
      <ellipse cx="6" cy={skirt ? 37 : 39} rx="2.5" ry="1.3" fill="#1a1a1a"
        style={{ transformOrigin: `6.75px ${skirt ? 23 : 27}px`, transform: `rotate(${legAng}deg)`, transition: 'transform .15s' }} />
      <ellipse cx="13" cy={skirt ? 37 : 39} rx="2.5" ry="1.3" fill="#2d2d2d"
        style={{ transformOrigin: `12.75px ${skirt ? 23 : 27}px`, transform: `rotate(${-legAng}deg)`, transition: 'transform .15s' }} />
    </svg>
  );
}

export default WalkingAnimation;
