import { useState, useEffect } from 'react';

/**
 * 교사 1명 + 학생 3명 실루엣 애니메이션.
 * 이미지 레퍼런스: 검은 실루엣, 왼쪽 옆모습.
 *
 * 기본: 교사 왼쪽 걷기 / 학생 딴짓
 * 3초마다: 교사 뒤 확인 / 학생 걷는 척
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
    <div className="flex items-end select-none" aria-hidden="true" style={{ height: 52, gap: 4 }}>
      {/* Teacher */}
      <div style={{ width: 30, height: 52, flexShrink: 0 }}>
        <TeacherSilhouette checking={checking} />
      </div>
      {/* Girl 1 - 양갈래 */}
      <div style={{ width: 26, height: 52, flexShrink: 0 }}>
        <Girl1Silhouette walking={checking} />
      </div>
      {/* Boy */}
      <div style={{ width: 26, height: 52, flexShrink: 0 }}>
        <BoySilhouette walking={checking} />
      </div>
      {/* Girl 2 - 긴머리 */}
      <div style={{ width: 26, height: 52, flexShrink: 0 }}>
        <Girl2Silhouette walking={checking} />
      </div>

      <style>{`
        @keyframes silWalk { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-2px)} }
        @keyframes silLegF { 0%,100%{transform:rotate(-15deg)} 50%{transform:rotate(15deg)} }
        @keyframes silLegB { 0%,100%{transform:rotate(15deg)} 50%{transform:rotate(-15deg)} }
        @keyframes silArmF { 0%,100%{transform:rotate(15deg)} 50%{transform:rotate(-15deg)} }
        @keyframes silArmB { 0%,100%{transform:rotate(-15deg)} 50%{transform:rotate(15deg)} }
        @keyframes silIdle { 0%,100%{transform:rotate(0)} 50%{transform:rotate(3deg)} }
        @keyframes silIdleArm { 0%,100%{transform:rotate(5deg)} 33%{transform:rotate(-20deg)} 66%{transform:rotate(10deg)} }
        @keyframes silIdleHead { 0%,100%{transform:rotate(0)} 50%{transform:rotate(8deg)} }
        .sil-walk { animation: silWalk 0.45s ease-in-out infinite; }
        .sil-idle { animation: silIdle 1.2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

/* 교사 실루엣 - 정장, 왼쪽 옆모습 */
function TeacherSilhouette({ checking }) {
  return (
    <svg width="30" height="52" viewBox="0 0 30 52" className="sil-walk">
      {/* Head */}
      <ellipse cx="12" cy="8" rx="5.5" ry="6.5" fill="#1a1a1a" />
      {/* Hair/hat hint */}
      <path d="M6.5 7 Q7 2 12 2 Q17 2 17.5 6 Q15 4 12 4 Q9 4 6.5 7Z" fill="#1a1a1a" />
      {/* Neck */}
      <rect x="10" y="14" width="4" height="3" fill="#1a1a1a" />
      {/* Body - suit jacket */}
      <path d="M6 17 L18 17 L19 34 L5 34Z" fill="#1a1a1a" />
      {/* Arm front */}
      <rect x="3" y="18" width="3.5" height="12" rx="1.5" fill="#1a1a1a"
        style={{ transformOrigin: '4.75px 18px', animation: 'silArmF 0.45s ease-in-out infinite' }} />
      {/* Arm back */}
      <rect x="17" y="18" width="3.5" height="12" rx="1.5" fill="#2a2a2a"
        style={{ transformOrigin: '18.75px 18px', animation: 'silArmB 0.45s ease-in-out infinite' }} />
      {/* Leg front */}
      <rect x="7" y="34" width="4" height="14" rx="1.5" fill="#1a1a1a"
        style={{ transformOrigin: '9px 34px', animation: 'silLegF 0.45s ease-in-out infinite' }} />
      {/* Leg back */}
      <rect x="13" y="34" width="4" height="14" rx="1.5" fill="#2a2a2a"
        style={{ transformOrigin: '15px 34px', animation: 'silLegB 0.45s ease-in-out infinite' }} />
      {/* Shoe front */}
      <ellipse cx="8" cy="48" rx="3" ry="1.5" fill="#1a1a1a"
        style={{ transformOrigin: '9px 34px', animation: 'silLegF 0.45s ease-in-out infinite' }} />
      {/* Shoe back */}
      <ellipse cx="15" cy="48" rx="3" ry="1.5" fill="#2a2a2a"
        style={{ transformOrigin: '15px 34px', animation: 'silLegB 0.45s ease-in-out infinite' }} />
      {/* Checking: head turns */}
      {checking && <ellipse cx="15" cy="7" rx="2" ry="2.5" fill="#1a1a1a" />}
    </svg>
  );
}

/* 여자아이1 실루엣 - 양갈래 머리, 치마 */
function Girl1Silhouette({ walking }) {
  const cls = walking ? 'sil-walk' : 'sil-idle';
  return (
    <svg width="26" height="52" viewBox="0 0 26 52" className={cls}>
      {/* Head */}
      <ellipse cx="11" cy="10" rx="5" ry="5.5" fill="#1a1a1a"
        style={!walking ? { transformOrigin: '11px 10px', animation: 'silIdleHead 1.3s ease-in-out infinite' } : undefined} />
      {/* 양갈래 머리 */}
      <circle cx="5" cy="8" r="3" fill="#1a1a1a" />
      <circle cx="17" cy="8" r="3" fill="#1a1a1a" />
      <path d="M6 10 Q6 4 11 4 Q16 4 16 10" fill="#1a1a1a" />
      {/* Body */}
      <rect x="7" y="16" width="8" height="10" rx="1" fill="#1a1a1a" />
      {/* Skirt */}
      <path d="M4 26 L7 16 L15 16 L18 26Z" fill="#1a1a1a" />
      {/* Arms */}
      {walking ? (
        <>
          <rect x="3" y="17" width="3" height="10" rx="1.5" fill="#1a1a1a"
            style={{ transformOrigin: '4.5px 17px', animation: 'silArmF 0.4s ease-in-out infinite' }} />
          <rect x="16" y="17" width="3" height="10" rx="1.5" fill="#2a2a2a"
            style={{ transformOrigin: '17.5px 17px', animation: 'silArmB 0.4s ease-in-out infinite' }} />
        </>
      ) : (
        <>
          <rect x="3" y="17" width="3" height="10" rx="1.5" fill="#1a1a1a"
            style={{ transform: 'rotate(-8deg)', transformOrigin: '4.5px 17px' }} />
          <rect x="16" y="17" width="3" height="10" rx="1.5" fill="#2a2a2a"
            style={{ transformOrigin: '17.5px 17px', animation: 'silIdleArm 1.2s ease-in-out infinite' }} />
        </>
      )}
      {/* Legs */}
      <rect x="7" y="26" width="3.5" height="12" rx="1.5" fill="#1a1a1a"
        style={walking ? { transformOrigin: '8.75px 26px', animation: 'silLegF 0.4s ease-in-out infinite' } : undefined} />
      <rect x="12" y="26" width="3.5" height="12" rx="1.5" fill="#2a2a2a"
        style={walking ? { transformOrigin: '13.75px 26px', animation: 'silLegB 0.4s ease-in-out infinite' } : undefined} />
      {/* Shoes */}
      <ellipse cx="8" cy="38.5" rx="2.5" ry="1.2" fill="#1a1a1a"
        style={walking ? { transformOrigin: '8.75px 26px', animation: 'silLegF 0.4s ease-in-out infinite' } : undefined} />
      <ellipse cx="13.5" cy="38.5" rx="2.5" ry="1.2" fill="#2a2a2a"
        style={walking ? { transformOrigin: '13.75px 26px', animation: 'silLegB 0.4s ease-in-out infinite' } : undefined} />
    </svg>
  );
}

/* 남자아이 실루엣 */
function BoySilhouette({ walking }) {
  const cls = walking ? 'sil-walk' : 'sil-idle';
  return (
    <svg width="26" height="52" viewBox="0 0 26 52" className={cls} style={!walking ? { animationDuration: '0.9s' } : undefined}>
      {/* Head */}
      <ellipse cx="11" cy="12" rx="5" ry="5.5" fill="#1a1a1a" />
      {/* Short hair */}
      <path d="M6 12 Q6 5.5 11 5.5 Q16 5.5 16 11 Q14 8 11 8 Q8 8 6 12Z" fill="#1a1a1a" />
      {/* Body */}
      <rect x="7" y="18" width="8" height="12" rx="1" fill="#1a1a1a" />
      {/* Arms */}
      {walking ? (
        <>
          <rect x="3" y="19" width="3" height="10" rx="1.5" fill="#1a1a1a"
            style={{ transformOrigin: '4.5px 19px', animation: 'silArmF 0.4s ease-in-out infinite' }} />
          <rect x="16" y="19" width="3" height="10" rx="1.5" fill="#2a2a2a"
            style={{ transformOrigin: '17.5px 19px', animation: 'silArmB 0.4s ease-in-out infinite' }} />
        </>
      ) : (
        <>
          <rect x="2" y="19" width="3" height="10" rx="1.5" fill="#1a1a1a"
            style={{ transformOrigin: '3.5px 19px', animation: 'silIdleArm 0.8s ease-in-out infinite' }} />
          <rect x="16" y="19" width="3" height="10" rx="1.5" fill="#2a2a2a"
            style={{ transform: 'rotate(8deg)', transformOrigin: '17.5px 19px' }} />
        </>
      )}
      {/* Pants/Legs */}
      <rect x="7" y="30" width="3.5" height="13" rx="1.5" fill="#1a1a1a"
        style={walking ? { transformOrigin: '8.75px 30px', animation: 'silLegF 0.4s ease-in-out infinite' } : undefined} />
      <rect x="12" y="30" width="3.5" height="13" rx="1.5" fill="#2a2a2a"
        style={walking ? { transformOrigin: '13.75px 30px', animation: 'silLegB 0.4s ease-in-out infinite' } : undefined} />
      {/* Shoes */}
      <ellipse cx="8.5" cy="43.5" rx="2.5" ry="1.2" fill="#1a1a1a"
        style={walking ? { transformOrigin: '8.75px 30px', animation: 'silLegF 0.4s ease-in-out infinite' } : undefined} />
      <ellipse cx="14" cy="43.5" rx="2.5" ry="1.2" fill="#2a2a2a"
        style={walking ? { transformOrigin: '13.75px 30px', animation: 'silLegB 0.4s ease-in-out infinite' } : undefined} />
    </svg>
  );
}

/* 여자아이2 실루엣 - 긴머리, 치마 */
function Girl2Silhouette({ walking }) {
  const cls = walking ? 'sil-walk' : 'sil-idle';
  return (
    <svg width="26" height="52" viewBox="0 0 26 52" className={cls} style={!walking ? { animationDuration: '1.1s' } : undefined}>
      {/* Head */}
      <ellipse cx="11" cy="10" rx="5" ry="5.5" fill="#1a1a1a"
        style={!walking ? { transformOrigin: '11px 10px', animation: 'silIdleHead 1.4s ease-in-out infinite' } : undefined} />
      {/* Long hair */}
      <path d="M6 10 Q6 4 11 4 Q16 4 16 10" fill="#1a1a1a" />
      <rect x="5" y="8" width="3" height="14" rx="1.5" fill="#1a1a1a" />
      <rect x="14" y="8" width="3" height="14" rx="1.5" fill="#1a1a1a" />
      {/* Ponytail/long back hair */}
      <rect x="15" y="6" width="3.5" height="16" rx="1.5" fill="#1a1a1a" />
      {/* Body */}
      <rect x="7" y="16" width="8" height="10" rx="1" fill="#1a1a1a" />
      {/* Skirt */}
      <path d="M4 26 L7 16 L15 16 L18 26Z" fill="#1a1a1a" />
      {/* Arms */}
      {walking ? (
        <>
          <rect x="3" y="17" width="3" height="10" rx="1.5" fill="#1a1a1a"
            style={{ transformOrigin: '4.5px 17px', animation: 'silArmF 0.4s ease-in-out infinite' }} />
          <rect x="16" y="17" width="3" height="10" rx="1.5" fill="#2a2a2a"
            style={{ transformOrigin: '17.5px 17px', animation: 'silArmB 0.4s ease-in-out infinite' }} />
        </>
      ) : (
        <>
          <rect x="3" y="17" width="3" height="10" rx="1.5" fill="#1a1a1a"
            style={{ transform: 'rotate(5deg)', transformOrigin: '4.5px 17px' }} />
          <rect x="16" y="17" width="3" height="10" rx="1.5" fill="#2a2a2a"
            style={{ transformOrigin: '17.5px 17px', animation: 'silIdleArm 0.9s ease-in-out infinite' }} />
        </>
      )}
      {/* Legs */}
      <rect x="7" y="26" width="3.5" height="12" rx="1.5" fill="#1a1a1a"
        style={walking ? { transformOrigin: '8.75px 26px', animation: 'silLegF 0.4s ease-in-out infinite' } : undefined} />
      <rect x="12" y="26" width="3.5" height="12" rx="1.5" fill="#2a2a2a"
        style={walking ? { transformOrigin: '13.75px 26px', animation: 'silLegB 0.4s ease-in-out infinite' } : undefined} />
      {/* Shoes */}
      <ellipse cx="8" cy="38.5" rx="2.5" ry="1.2" fill="#1a1a1a"
        style={walking ? { transformOrigin: '8.75px 26px', animation: 'silLegF 0.4s ease-in-out infinite' } : undefined} />
      <ellipse cx="13.5" cy="38.5" rx="2.5" ry="1.2" fill="#2a2a2a"
        style={walking ? { transformOrigin: '13.75px 26px', animation: 'silLegB 0.4s ease-in-out infinite' } : undefined} />
    </svg>
  );
}

export default WalkingAnimation;
