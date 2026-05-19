// 프로필 정보 공통 접근 헬퍼
// localStorage에 캐시된 닉네임/학년/반을 단일 진입점에서 읽음

export function getProfile() {
  if (typeof localStorage === 'undefined') return { nickname: '', gradeLevel: null, classNumber: null };
  const gl = localStorage.getItem('gradeLevel');
  const cn = localStorage.getItem('classNumber');
  return {
    nickname: localStorage.getItem('nickname') || '',
    gradeLevel: gl ? Number(gl) : null,
    classNumber: cn ? Number(cn) : null,
  };
}

export function gradeToGroup(grade) {
  const g = Number(grade);
  if (!Number.isFinite(g) || g < 1 || g > 6) return null;
  if (g <= 2) return '1-2';
  if (g <= 4) return '3-4';
  return '5-6';
}

// 표시용 이름 — 닉네임 우선, 없으면 fallback
export function getDisplayName(fallback) {
  const { nickname } = getProfile();
  if (nickname && nickname.trim()) return nickname.trim();
  return fallback || '';
}
