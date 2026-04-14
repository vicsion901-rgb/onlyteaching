import { useState, useEffect } from 'react';

/**
 * 첨부 B 기반 실루엣 애니메이션.
 * 교사 1명 + 학생 4명, 완전 검은 실루엣, 왼쪽 옆모습.
 *
 * 기본: 교사 왼쪽 걷기 / 학생 딴짓
 * 3초마다: 교사 뒤 확인 / 학생 걷는 척
 * 모두 제자리, x축 고정, 겹침 없음.
 */

const BK = '#1a1a1a';
const BK2 = '#222';

function WalkingAnimation() {
  const [checking, setChecking] = useState(false);
  const [f, setF] = useState(0);

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
    const i = setInterval(() => setF(v => (v + 1) % 2), 320);
    return () => clearInterval(i);
  }, []);

  return (
    <div className="flex items-end select-none" aria-hidden="true" style={{ height: 50, gap: 2 }}>
      <Slot w={22} h={50}><TeacherSide walking={!checking} f={f} checking={checking} /></Slot>
      <Slot w={20} h={44}><KidBoy walking={checking} f={f} idle={!checking} /></Slot>
      <Slot w={20} h={44}><KidGirlPigtails walking={checking} f={f} idle={!checking} /></Slot>
      <Slot w={20} h={44}><KidBoy2 walking={checking} f={f} idle={!checking} /></Slot>
      <Slot w={20} h={44}><KidGirlLong walking={checking} f={f} idle={!checking} /></Slot>
    </div>
  );
}

function Slot({ w, h, children }) {
  return <div style={{ width: w, height: h, flexShrink: 0, position: 'relative', overflow: 'visible' }}>{children}</div>;
}

/* ─── 교사: 왼쪽 옆모습, 정장, 키 큼 ─── */
function TeacherSide({ walking, f, checking }) {
  const la = walking ? (f === 0 ? -14 : 14) : 0;
  const aa = walking ? (f === 0 ? 12 : -12) : 0;
  const bob = walking && f === 1 ? -1.5 : 0;
  return (
    <svg width="22" height="50" viewBox="0 0 22 50" style={{ transform: `translateY(${bob}px)`, transition: 'transform .15s' }}>
      {/* Head 옆모습 - 타원 */}
      <ellipse cx="9" cy="8" rx="5" ry="6" fill={BK} />
      {/* Hair top */}
      <path d="M4 8 Q4 2 9 2 Q14 2 14 7 Q12 4 9 4 Q6 4 4 8Z" fill={BK} />
      {/* Nose */}
      <path d="M4 9 L2.5 10.5 L4 11" fill={BK} stroke={BK} strokeWidth="0.5" />
      {/* Body suit - 옆모습이라 좁게 */}
      <path d="M5 15 L13 15 L14 32 L4 32Z" fill={BK} />
      {/* Collar/tie */}
      <line x1="9" y1="15" x2="9" y2="22" stroke="#333" strokeWidth="0.8" />
      {/* Arm front */}
      <rect x="2" y="16" width="3" height="12" rx="1.5" fill={BK}
        style={{ transformOrigin: '3.5px 16px', transform: `rotate(${aa}deg)`, transition: 'transform .15s' }} />
      {/* Arm back */}
      <rect x="13" y="16" width="3" height="12" rx="1.5" fill={BK2}
        style={{ transformOrigin: '14.5px 16px', transform: `rotate(${-aa}deg)`, transition: 'transform .15s' }} />
      {/* Leg front */}
      <rect x="5" y="32" width="3.5" height="14" rx="1.5" fill={BK}
        style={{ transformOrigin: '6.75px 32px', transform: `rotate(${la}deg)`, transition: 'transform .15s' }} />
      {/* Leg back */}
      <rect x="10" y="32" width="3.5" height="14" rx="1.5" fill={BK2}
        style={{ transformOrigin: '11.75px 32px', transform: `rotate(${-la}deg)`, transition: 'transform .15s' }} />
      {/* Shoes */}
      <ellipse cx="5.5" cy="46.5" rx="2.5" ry="1.3" fill={BK}
        style={{ transformOrigin: '6.75px 32px', transform: `rotate(${la}deg)`, transition: 'transform .15s' }} />
      <ellipse cx="11.5" cy="46.5" rx="2.5" ry="1.3" fill={BK2}
        style={{ transformOrigin: '11.75px 32px', transform: `rotate(${-la}deg)`, transition: 'transform .15s' }} />
      {/* Checking: 머리를 뒤(오른쪽)로 트는 표현 */}
      {checking && <ellipse cx="14" cy="7" rx="2" ry="2.5" fill={BK} />}
    </svg>
  );
}

/* ─── 학생 공통 유틸 ─── */
function kidLegs({ f, walking, idle, y, h, skirt }) {
  const la = walking ? (f === 0 ? -16 : 16) : (idle ? (f === 0 ? 3 : -3) : 0);
  const base = skirt ? y : y;
  return (
    <>
      <rect x="5" y={base} width="3" height={h} rx="1.5" fill={BK}
        style={{ transformOrigin: `6.5px ${base}px`, transform: `rotate(${la}deg)`, transition: 'transform .15s' }} />
      <rect x="10" y={base} width="3" height={h} rx="1.5" fill={BK2}
        style={{ transformOrigin: `11.5px ${base}px`, transform: `rotate(${-la}deg)`, transition: 'transform .15s' }} />
      <ellipse cx="5.5" cy={base + h + 0.5} rx="2" ry="1" fill={BK}
        style={{ transformOrigin: `6.5px ${base}px`, transform: `rotate(${la}deg)`, transition: 'transform .15s' }} />
      <ellipse cx="11" cy={base + h + 0.5} rx="2" ry="1" fill={BK2}
        style={{ transformOrigin: `11.5px ${base}px`, transform: `rotate(${-la}deg)`, transition: 'transform .15s' }} />
    </>
  );
}

function kidArms({ f, walking, idle, y }) {
  const aa = walking ? (f === 0 ? 14 : -14) : 0;
  const ia = idle ? (f === 0 ? -18 : -28) : 0;
  return (
    <>
      <rect x="1" y={y} width="2.5" height="9" rx="1.2" fill={BK}
        style={{ transformOrigin: `2.25px ${y}px`, transform: `rotate(${walking ? aa : ia}deg)`, transition: 'transform .15s' }} />
      <rect x="14" y={y} width="2.5" height="9" rx="1.2" fill={BK2}
        style={{ transformOrigin: `15.25px ${y}px`, transform: `rotate(${walking ? -aa : 5}deg)`, transition: 'transform .15s' }} />
    </>
  );
}

/* ─── 남자아이1: 짧은 머리, 바지 ─── */
function KidBoy({ walking, f, idle }) {
  const bob = walking && f === 1 ? -1.5 : 0;
  const hr = idle ? (f === 0 ? 5 : -4) : 0;
  return (
    <svg width="18" height="44" viewBox="0 0 18 44" style={{ transform: `translateY(${bob}px)`, transition: 'transform .15s' }}>
      <ellipse cx="9" cy="7" rx="4.5" ry="5" fill={BK}
        style={{ transformOrigin: '9px 7px', transform: `rotate(${hr}deg)`, transition: 'transform .15s' }} />
      <path d="M4.5 7 Q4.5 2 9 2 Q13.5 2 13.5 6 Q12 4 9 4 Q6 4 4.5 7Z" fill={BK} />
      <rect x="5" y="13" width="8" height="11" rx="2" fill={BK} />
      {kidArms({ f, walking, idle, y: 14 })}
      {kidLegs({ f, walking, idle, y: 24, h: 12 })}
    </svg>
  );
}

/* ─── 여자아이1: 양갈래 머리, 치마 ─── */
function KidGirlPigtails({ walking, f, idle }) {
  const bob = walking && f === 1 ? -1.5 : 0;
  const hr = idle ? (f === 0 ? 6 : -3) : 0;
  return (
    <svg width="18" height="44" viewBox="0 0 18 44" style={{ transform: `translateY(${bob}px)`, transition: 'transform .15s' }}>
      <ellipse cx="9" cy="8" rx="4.5" ry="5" fill={BK}
        style={{ transformOrigin: '9px 8px', transform: `rotate(${hr}deg)`, transition: 'transform .15s' }} />
      {/* 양갈래 */}
      <circle cx="4" cy="5.5" r="2.5" fill={BK} />
      <circle cx="14" cy="5.5" r="2.5" fill={BK} />
      <path d="M4.5 8 Q4.5 3 9 3 Q13.5 3 13.5 7" fill={BK} />
      {/* Body */}
      <rect x="5" y="14" width="8" height="7" rx="2" fill={BK} />
      {/* Skirt */}
      <path d="M3 21 L5 14 L13 14 L15 21Z" fill={BK} />
      {kidArms({ f, walking, idle, y: 14 })}
      {kidLegs({ f, walking, idle, y: 21, h: 13, skirt: true })}
    </svg>
  );
}

/* ─── 남자아이2: 모자, 바지 ─── */
function KidBoy2({ walking, f, idle }) {
  const bob = walking && f === 1 ? -1.5 : 0;
  const hr = idle ? (f === 0 ? -4 : 4) : 0;
  return (
    <svg width="18" height="44" viewBox="0 0 18 44" style={{ transform: `translateY(${bob}px)`, transition: 'transform .15s' }}>
      <ellipse cx="9" cy="7" rx="4.5" ry="5" fill={BK}
        style={{ transformOrigin: '9px 7px', transform: `rotate(${hr}deg)`, transition: 'transform .15s' }} />
      {/* 모자 */}
      <rect x="4" y="1" width="11" height="3" rx="1" fill={BK} />
      <rect x="6" y="0" width="7" height="3" rx="1" fill={BK} />
      <path d="M4.5 7 Q5 3 9 3 Q13 3 13.5 6" fill={BK} />
      <rect x="5" y="13" width="8" height="11" rx="2" fill={BK} />
      {kidArms({ f, walking, idle, y: 14 })}
      {kidLegs({ f, walking, idle, y: 24, h: 12 })}
    </svg>
  );
}

/* ─── 여자아이2: 긴머리, 치마 ─── */
function KidGirlLong({ walking, f, idle }) {
  const bob = walking && f === 1 ? -1.5 : 0;
  const hr = idle ? (f === 0 ? 4 : -5) : 0;
  return (
    <svg width="18" height="44" viewBox="0 0 18 44" style={{ transform: `translateY(${bob}px)`, transition: 'transform .15s' }}>
      <ellipse cx="9" cy="8" rx="4.5" ry="5" fill={BK}
        style={{ transformOrigin: '9px 8px', transform: `rotate(${hr}deg)`, transition: 'transform .15s' }} />
      {/* 긴머리 */}
      <path d="M4.5 8 Q4.5 3 9 3 Q13.5 3 13.5 7" fill={BK} />
      <rect x="3.5" y="6" width="2.5" height="12" rx="1.2" fill={BK} />
      <rect x="12" y="6" width="2.5" height="12" rx="1.2" fill={BK} />
      {/* 뒤로 늘어진 머리 */}
      <rect x="13" y="4" width="3" height="14" rx="1.5" fill={BK} />
      {/* Body */}
      <rect x="5" y="14" width="8" height="7" rx="2" fill={BK} />
      {/* Skirt */}
      <path d="M3 21 L5 14 L13 14 L15 21Z" fill={BK} />
      {kidArms({ f, walking, idle, y: 14 })}
      {kidLegs({ f, walking, idle, y: 21, h: 13, skirt: true })}
    </svg>
  );
}

export default WalkingAnimation;
