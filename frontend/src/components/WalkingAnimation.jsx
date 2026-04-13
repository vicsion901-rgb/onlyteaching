import { useState, useEffect } from 'react';

/**
 * 교사 1명 + 학생 3명 애니메이션.
 *
 * 기본: 교사 왼쪽 옆모습 걷기 / 학생 딴짓
 * 3초마다: 교사 뒤 확인 / 학생 걷는 척
 *
 * 4명은 고정 slot에 배치, 절대 겹치지 않음.
 */

function WalkingAnimation() {
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    let timeout;
    const cycle = () => {
      setChecking(false);
      timeout = setTimeout(() => {
        setChecking(true);
        timeout = setTimeout(cycle, 2000);
      }, 3000);
    };
    cycle();
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="flex items-end select-none" aria-hidden="true" style={{ height: 52, gap: 6 }}>
      {/* Slot 1: Teacher */}
      <div style={{ width: 28, height: 52, position: 'relative', flexShrink: 0 }}>
        <Teacher checking={checking} />
      </div>
      {/* Slot 2: Girl1 (양갈래) */}
      <div style={{ width: 24, height: 52, position: 'relative', flexShrink: 0 }}>
        <Girl1 walking={checking} />
      </div>
      {/* Slot 3: Boy */}
      <div style={{ width: 24, height: 52, position: 'relative', flexShrink: 0 }}>
        <Boy walking={checking} />
      </div>
      {/* Slot 4: Girl2 (긴머리) */}
      <div style={{ width: 24, height: 52, position: 'relative', flexShrink: 0 }}>
        <Girl2 walking={checking} />
      </div>

      <style>{`
        @keyframes walkBob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
        @keyframes legSwing {
          0%, 100% { transform: rotate(-10deg); }
          50% { transform: rotate(10deg); }
        }
        @keyframes legSwingAlt {
          0%, 100% { transform: rotate(10deg); }
          50% { transform: rotate(-10deg); }
        }
        @keyframes armSwing {
          0%, 100% { transform: rotate(-12deg); }
          50% { transform: rotate(12deg); }
        }
        @keyframes armSwingAlt {
          0%, 100% { transform: rotate(12deg); }
          50% { transform: rotate(-12deg); }
        }
        @keyframes idleSway {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(3deg); }
        }
        @keyframes idleArmWave {
          0%, 100% { transform: rotate(-5deg); }
          33% { transform: rotate(-25deg); }
          66% { transform: rotate(-10deg); }
        }
        @keyframes idleHeadTilt {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(8deg); }
        }
        @keyframes idlePoke {
          0%, 100% { transform: rotate(5deg); }
          50% { transform: rotate(-20deg); }
        }
      `}</style>
    </div>
  );
}

/** 교사 - 왼쪽 옆모습 */
function Teacher({ checking }) {
  return (
    <svg width="28" height="52" viewBox="0 0 28 52" style={{ animation: 'walkBob 0.5s ease-in-out infinite' }}>
      {/* 전체를 왼쪽 옆모습으로 그림 - 왼쪽을 향함 */}
      {/* Head - 옆모습: 타원형 */}
      <ellipse cx="11" cy="10" rx="5" ry="6" fill="#d4a574" />
      {/* Hair - 옆모습 */}
      <path d="M6 10 Q6 3 12 3 Q17 4 16 10 Q14 6 10 6 Q7 6 6 10Z" fill="#1a1a1a" />
      {/* Glasses */}
      <rect x="6" y="8" width="5" height="3.5" rx="1" stroke="#555" strokeWidth="0.6" fill="none" />
      <line x1="11" y1="9.5" x2="13" y2="9" stroke="#555" strokeWidth="0.5" />
      {/* Eye */}
      <circle cx="8.5" cy="9.5" r="0.8" fill="#1a1a1a" />
      {/* Nose hint */}
      <path d="M6 10.5 L5 11.5" stroke="#c4956a" strokeWidth="0.5" />
      {/* 교사 확인 동작: 고개를 뒤(오른쪽)로 트는 표현 */}
      {checking && (
        <g>
          {/* 뒤를 보는 눈 */}
          <circle cx="14" cy="9" r="0.6" fill="#1a1a1a" />
          {/* 뒤돌아보는 선 */}
          <path d="M13 7 Q16 6 17 8" stroke="#1a1a1a" strokeWidth="0.4" fill="none" />
        </g>
      )}
      {/* Body - 옆모습: 좁은 직사각형 */}
      <rect x="8" y="17" width="7" height="16" rx="2" fill="#1e293b" />
      {/* Arm front */}
      <rect x="6" y="18" width="3" height="10" rx="1.5" fill="#1e293b"
        style={{ transformOrigin: '7.5px 18px', animation: 'armSwing 0.5s ease-in-out infinite' }} />
      {/* Arm back */}
      <rect x="14" y="18" width="3" height="10" rx="1.5" fill="#2d3748"
        style={{ transformOrigin: '15.5px 18px', animation: 'armSwingAlt 0.5s ease-in-out infinite' }} />
      {/* Leg front */}
      <rect x="8" y="33" width="3.5" height="12" rx="1.5" fill="#334155"
        style={{ transformOrigin: '9.75px 33px', animation: 'legSwing 0.5s ease-in-out infinite' }} />
      {/* Leg back */}
      <rect x="12" y="33" width="3.5" height="12" rx="1.5" fill="#3d4f63"
        style={{ transformOrigin: '13.75px 33px', animation: 'legSwingAlt 0.5s ease-in-out infinite' }} />
      {/* Shoe hints */}
      <rect x="6" y="44" width="4" height="2" rx="1" fill="#1a1a1a"
        style={{ transformOrigin: '9.75px 33px', animation: 'legSwing 0.5s ease-in-out infinite' }} />
      <rect x="11" y="44" width="4" height="2" rx="1" fill="#1a1a1a"
        style={{ transformOrigin: '13.75px 33px', animation: 'legSwingAlt 0.5s ease-in-out infinite' }} />
    </svg>
  );
}

/** 여자아이1 - 양갈래 머리, 핑크 치마 */
function Girl1({ walking }) {
  const anim = walking ? 'walkBob 0.4s ease-in-out infinite' : 'idleSway 1.5s ease-in-out infinite';
  return (
    <svg width="24" height="52" viewBox="0 0 24 52" style={{ animation: anim }}>
      {/* Head - 옆모습 */}
      <ellipse cx="10" cy="12" rx="4.5" ry="5" fill="#fcd5b8"
        style={!walking ? { transformOrigin: '10px 12px', animation: 'idleHeadTilt 1.2s ease-in-out infinite' } : undefined} />
      {/* 양갈래 머리 */}
      <path d="M5.5 12 Q5.5 6 10 6 Q14.5 6 14.5 11" fill="#5b3a1a" />
      {/* 왼쪽 갈래 */}
      <ellipse cx="5" cy="10" rx="2.5" ry="3" fill="#5b3a1a" />
      {/* 오른쪽 갈래 */}
      <ellipse cx="15" cy="10" rx="2.5" ry="3" fill="#5b3a1a" />
      {/* Ribbons */}
      <circle cx="5" cy="7.5" r="1.5" fill="#ec4899" />
      <circle cx="15" cy="7.5" r="1.5" fill="#ec4899" />
      {/* Eye */}
      <circle cx="8" cy="12" r="0.7" fill="#1a1a1a" />
      {/* Body - 옆모습 */}
      <rect x="7" y="18" width="6" height="8" rx="1" fill="#ec4899" />
      {/* Skirt - 치마 A라인 */}
      <path d="M5 26 L7 18 L13 18 L15 26Z" fill="#f472b6" />
      {/* Arms */}
      {walking ? (
        <>
          <rect x="5" y="19" width="2.5" height="8" rx="1" fill="#fcd5b8"
            style={{ transformOrigin: '6.25px 19px', animation: 'armSwing 0.4s ease-in-out infinite' }} />
          <rect x="13" y="19" width="2.5" height="8" rx="1" fill="#fcd5b8"
            style={{ transformOrigin: '14.25px 19px', animation: 'armSwingAlt 0.4s ease-in-out infinite' }} />
        </>
      ) : (
        <>
          <rect x="5" y="19" width="2.5" height="8" rx="1" fill="#fcd5b8"
            style={{ transform: 'rotate(-8deg)', transformOrigin: '6.25px 19px' }} />
          <rect x="13" y="19" width="2.5" height="8" rx="1" fill="#fcd5b8"
            style={{ transformOrigin: '14.25px 19px', animation: 'idleArmWave 1.2s ease-in-out infinite' }} />
        </>
      )}
      {/* Legs */}
      <rect x="7.5" y="26" width="2.5" height="10" rx="1" fill="#fcd5b8"
        style={walking ? { transformOrigin: '8.75px 26px', animation: 'legSwing 0.4s ease-in-out infinite' } : undefined} />
      <rect x="11" y="26" width="2.5" height="10" rx="1" fill="#fcd5b8"
        style={walking ? { transformOrigin: '12.25px 26px', animation: 'legSwingAlt 0.4s ease-in-out infinite' } : undefined} />
      {/* Shoes */}
      <ellipse cx="8" cy="36.5" rx="2" ry="1" fill="#ec4899"
        style={walking ? { transformOrigin: '8.75px 26px', animation: 'legSwing 0.4s ease-in-out infinite' } : undefined} />
      <ellipse cx="12.5" cy="36.5" rx="2" ry="1" fill="#ec4899"
        style={walking ? { transformOrigin: '12.25px 26px', animation: 'legSwingAlt 0.4s ease-in-out infinite' } : undefined} />
    </svg>
  );
}

/** 남자아이 */
function Boy({ walking }) {
  const anim = walking ? 'walkBob 0.4s ease-in-out infinite' : 'idleSway 0.9s ease-in-out infinite';
  return (
    <svg width="24" height="52" viewBox="0 0 24 52" style={{ animation: anim }}>
      {/* Head - 옆모습 */}
      <ellipse cx="10" cy="14" rx="4.5" ry="5" fill="#fcd5b8" />
      {/* 짧은 머리 */}
      <path d="M5.5 14 Q5.5 8 10 8 Q14.5 8 14.5 13 Q13 10 10 10 Q7 10 5.5 14Z" fill="#1a1a1a" />
      {/* Eye */}
      <circle cx="8" cy="14" r="0.7" fill="#1a1a1a" />
      {/* Body */}
      <rect x="7" y="20" width="6" height="10" rx="1" fill="#3b82f6" />
      {/* Arms */}
      {walking ? (
        <>
          <rect x="5" y="21" width="2.5" height="8" rx="1" fill="#fcd5b8"
            style={{ transformOrigin: '6.25px 21px', animation: 'armSwing 0.4s ease-in-out infinite' }} />
          <rect x="13" y="21" width="2.5" height="8" rx="1" fill="#fcd5b8"
            style={{ transformOrigin: '14.25px 21px', animation: 'armSwingAlt 0.4s ease-in-out infinite' }} />
        </>
      ) : (
        <>
          {/* 딴짓: 옆 친구 쪽으로 팔 뻗기 */}
          <rect x="4" y="21" width="2.5" height="8" rx="1" fill="#fcd5b8"
            style={{ transformOrigin: '5.25px 21px', animation: 'idlePoke 0.8s ease-in-out infinite' }} />
          <rect x="13" y="21" width="2.5" height="8" rx="1" fill="#fcd5b8"
            style={{ transform: 'rotate(8deg)', transformOrigin: '14.25px 21px' }} />
        </>
      )}
      {/* Pants */}
      <rect x="7.5" y="30" width="2.5" height="10" rx="1" fill="#1e3a5f"
        style={walking ? { transformOrigin: '8.75px 30px', animation: 'legSwing 0.4s ease-in-out infinite' } : undefined} />
      <rect x="11" y="30" width="2.5" height="10" rx="1" fill="#1e3a5f"
        style={walking ? { transformOrigin: '12.25px 30px', animation: 'legSwingAlt 0.4s ease-in-out infinite' } : undefined} />
      {/* Shoes */}
      <ellipse cx="8.5" cy="40.5" rx="2" ry="1" fill="#333"
        style={walking ? { transformOrigin: '8.75px 30px', animation: 'legSwing 0.4s ease-in-out infinite' } : undefined} />
      <ellipse cx="12.5" cy="40.5" rx="2" ry="1" fill="#333"
        style={walking ? { transformOrigin: '12.25px 30px', animation: 'legSwingAlt 0.4s ease-in-out infinite' } : undefined} />
    </svg>
  );
}

/** 여자아이2 - 긴머리, 노란 치마 */
function Girl2({ walking }) {
  const anim = walking ? 'walkBob 0.4s ease-in-out infinite' : 'idleSway 1.1s ease-in-out infinite';
  return (
    <svg width="24" height="52" viewBox="0 0 24 52" style={{ animation: anim }}>
      {/* Head - 옆모습 */}
      <ellipse cx="10" cy="12" rx="4.5" ry="5" fill="#fcd5b8"
        style={!walking ? { transformOrigin: '10px 12px', animation: 'idleHeadTilt 1.4s ease-in-out infinite' } : undefined} />
      {/* 긴머리 */}
      <path d="M5.5 12 Q5.5 6 10 6 Q14.5 6 14.5 11" fill="#8b4513" />
      {/* 뒤로 늘어진 긴 머리카락 */}
      <rect x="12" y="8" width="3" height="14" rx="1.5" fill="#8b4513" />
      <rect x="5" y="8" width="2.5" height="12" rx="1.2" fill="#8b4513" />
      {/* Eye */}
      <circle cx="8" cy="12" r="0.7" fill="#1a1a1a" />
      {/* Body */}
      <rect x="7" y="18" width="6" height="8" rx="1" fill="#f59e0b" />
      {/* Skirt - 치마 */}
      <path d="M5 26 L7 18 L13 18 L15 26Z" fill="#fbbf24" />
      {/* Arms */}
      {walking ? (
        <>
          <rect x="5" y="19" width="2.5" height="8" rx="1" fill="#fcd5b8"
            style={{ transformOrigin: '6.25px 19px', animation: 'armSwing 0.4s ease-in-out infinite' }} />
          <rect x="13" y="19" width="2.5" height="8" rx="1" fill="#fcd5b8"
            style={{ transformOrigin: '14.25px 19px', animation: 'armSwingAlt 0.4s ease-in-out infinite' }} />
        </>
      ) : (
        <>
          <rect x="5" y="19" width="2.5" height="8" rx="1" fill="#fcd5b8"
            style={{ transform: 'rotate(5deg)', transformOrigin: '6.25px 19px' }} />
          <rect x="13" y="19" width="2.5" height="8" rx="1" fill="#fcd5b8"
            style={{ transformOrigin: '14.25px 19px', animation: 'idleArmWave 0.9s ease-in-out infinite' }} />
        </>
      )}
      {/* Legs */}
      <rect x="7.5" y="26" width="2.5" height="10" rx="1" fill="#fcd5b8"
        style={walking ? { transformOrigin: '8.75px 26px', animation: 'legSwing 0.4s ease-in-out infinite' } : undefined} />
      <rect x="11" y="26" width="2.5" height="10" rx="1" fill="#fcd5b8"
        style={walking ? { transformOrigin: '12.25px 26px', animation: 'legSwingAlt 0.4s ease-in-out infinite' } : undefined} />
      {/* Shoes */}
      <ellipse cx="8" cy="36.5" rx="2" ry="1" fill="#f59e0b"
        style={walking ? { transformOrigin: '8.75px 26px', animation: 'legSwing 0.4s ease-in-out infinite' } : undefined} />
      <ellipse cx="12.5" cy="36.5" rx="2" ry="1" fill="#f59e0b"
        style={walking ? { transformOrigin: '12.25px 26px', animation: 'legSwingAlt 0.4s ease-in-out infinite' } : undefined} />
    </svg>
  );
}

export default WalkingAnimation;
