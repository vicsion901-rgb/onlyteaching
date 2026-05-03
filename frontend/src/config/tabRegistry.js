export const TAB_REGISTRY = [
  {
    id: 'care-classroom',
    route: '/care-classroom',
    emoji: '🧠',
    title: '돌봄교실',
    section: 'motivation',
    subtitle: () => '감정·투두·행사 기록',
  },
  {
    id: 'schedule',
    route: '/schedule',
    emoji: '📅',
    title: '학사일정',
    section: 'admin',
    subtitle: ({ currentYear, currentMonth }) => `${currentYear}년 ${currentMonth}월`,
  },
  {
    id: 'student-records',
    route: '/student-records',
    emoji: '👥',
    title: '학생명부',
    section: 'admin',
    subtitle: ({ hasStudentData }) => (hasStudentData ? '명단 등록됨' : '명단 관리'),
  },
{
    id: 'life-records',
    route: '/life-records',
    emoji: '📝',
    title: '생활기록부',
    section: 'admin',
    subtitle: () => '기록 관리',
  },
  {
    id: 'subject-evaluation',
    route: '/subject-evaluation',
    emoji: '📊',
    title: '교과평가',
    section: 'admin',
    subtitle: () => '성적 관리',
  },
  {
    id: 'creative-activities',
    route: '/creative-activities',
    emoji: '🎨',
    title: '창의적 체험활동',
    section: 'admin',
    subtitle: () => '활동 기록',
  },
  {
    id: 'counseling',
    route: '/counseling',
    emoji: '🗨️',
    title: '관찰일지',
    section: 'student',
    subtitle: () => '관찰 기록',
  },
  {
    id: 'autobiography-compilation',
    route: '/autobiography-compilation',
    emoji: '📚',
    title: '자서전 편찬',
    section: 'break',
    subtitle: () => '학생/선생님 버전 생성',
  },
  {
    id: 'today-meal',
    route: '/today-meal',
    emoji: '🍱',
    title: '오늘의 급식',
    section: 'break',
    subtitle: () => '급식 사진과 따봉 기록',
  },
];

export function getTabItems(context = {}) {
  return TAB_REGISTRY.map((tab) => ({
    ...tab,
    subtitle: typeof tab.subtitle === 'function' ? tab.subtitle(context) : tab.subtitle,
  }));
}

export function getTabsBySection(section, context = {}) {
  return getTabItems(context).filter((tab) => tab.section === section);
}

export function getTabById(tabId, context = {}) {
  return getTabItems(context).find((tab) => tab.id === tabId) || null;
}
