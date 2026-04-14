import { useState, useEffect } from 'react';
import walkRow from '../assets/walk_row.png';
import idleRow from '../assets/idle_row.png';

/**
 * 첨부 B 원본 픽셀을 직접 사용하는 실루엣 애니메이션.
 * walk_row.png = 걷기 포즈 (교사 + 학생 4명)
 * idle_row.png = 딴짓 포즈 (교사 + 학생 4명)
 *
 * 기본: 교사 걷기(walk_row) / 학생 딴짓(idle_row)
 * 3초마다: 교사 딴짓(idle_row) / 학생 걷기(walk_row)
 * 3초 1사이클 무한반복, x축 고정, 겹침 없음.
 */
function WalkingAnimation() {
  const [checking, setChecking] = useState(false);
  const [bob, setBob] = useState(false);

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
    const i = setInterval(() => setBob(b => !b), 350);
    return () => clearInterval(i);
  }, []);

  // 교사: 걷기=walk_row, 확인=idle_row
  // 학생: 딴짓=idle_row, 걷는척=walk_row
  const teacherSrc = checking ? idleRow : walkRow;
  const studentSrc = checking ? walkRow : idleRow;
  const teacherBob = !checking && bob ? -2 : 0;
  const studentBob = checking && bob ? -2 : 0;

  return (
    <div className="flex items-end select-none" aria-hidden="true" style={{ height: 48, gap: 0 }}>
      {/* 교사 (왼쪽 첫번째 캐릭터만 보이게 crop) */}
      <div style={{
        width: 28, height: 48, overflow: 'hidden', flexShrink: 0,
        transform: `translateY(${teacherBob}px)`,
        transition: 'transform 0.15s ease',
      }}>
        <img src={teacherSrc} alt="" draggable={false}
          style={{
            height: 48, width: 'auto',
            marginLeft: -12,
            imageRendering: 'auto',
          }}
        />
      </div>

      {/* 학생 4명 (교사 제외 나머지 부분만 보이게 crop) */}
      <div style={{
        width: 100, height: 42, overflow: 'hidden', flexShrink: 0,
        transform: `translateY(${studentBob}px)`,
        transition: 'transform 0.15s ease',
      }}>
        <img src={studentSrc} alt="" draggable={false}
          style={{
            height: 42, width: 'auto',
            marginLeft: -25,
            imageRendering: 'auto',
          }}
        />
      </div>
    </div>
  );
}

export default WalkingAnimation;
