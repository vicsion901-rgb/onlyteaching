const COMPILATION_MODES = [
  { id: 'chapter', emoji: '📖', label: '장별 편집', desc: '1장~10장 책 구조로 정리' },
  { id: 'date', emoji: '📅', label: '날짜순 편집', desc: '날짜별 기록을 시간 순서대로 정리' },
  { id: 'theme', emoji: '🏷️', label: '주제순 편집', desc: '감정·관계·업무 등 주제별로 묶어 정리' },
];

const THEME_CATEGORIES = [
  { id: 'relationship', label: '관계와 사람들', color: 'bg-blue-100 text-blue-700' },
  { id: 'responsibility', label: '책임감과 역할', color: 'bg-green-100 text-green-700' },
  { id: 'endurance', label: '버팀', color: 'bg-amber-100 text-amber-700' },
  { id: 'struggle', label: '흔들림', color: 'bg-red-100 text-red-700' },
  { id: 'comfort', label: '위로', color: 'bg-purple-100 text-purple-700' },
  { id: 'admin', label: '행정', color: 'bg-gray-100 text-gray-600' },
  { id: 'student', label: '학생', color: 'bg-cyan-100 text-cyan-700' },
  { id: 'parent', label: '학부모', color: 'bg-pink-100 text-pink-700' },
  { id: 'teaching', label: '수업', color: 'bg-indigo-100 text-indigo-700' },
  { id: 'achievement', label: '성취', color: 'bg-emerald-100 text-emerald-700' },
  { id: 'fatigue', label: '피로', color: 'bg-orange-100 text-orange-700' },
  { id: 'growth', label: '성장', color: 'bg-teal-100 text-teal-700' },
];

function groupBlocksByDate(blocks) {
  const groups = {};
  blocks.forEach(b => {
    const key = b.sourceDate || b.sourceMonth || '날짜 미지정';
    if (!groups[key]) groups[key] = [];
    groups[key].push(b);
  });
  return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
}

function groupBlocksByTheme(blocks) {
  const groups = {};
  blocks.forEach(b => {
    const tags = b.themeTags?.length > 0 ? b.themeTags : ['미분류'];
    tags.forEach(tag => {
      if (!groups[tag]) groups[tag] = [];
      groups[tag].push(b);
    });
  });
  return Object.entries(groups);
}

function groupBlocksByChapter(blocks, chapters) {
  const groups = {};
  chapters.forEach((ch, i) => { groups[ch.id || i] = { chapter: ch, blocks: [] }; });
  groups['unassigned'] = { chapter: { id: 'unassigned', title: '미배정' }, blocks: [] };
  blocks.forEach(b => {
    const cid = b.chapterId || 'unassigned';
    if (groups[cid]) groups[cid].blocks.push(b);
    else groups['unassigned'].blocks.push(b);
  });
  return Object.values(groups);
}

function addThemeTag(block, tag) {
  if (!block.themeTags) block.themeTags = [];
  if (!block.themeTags.includes(tag)) block.themeTags.push(tag);
  return block;
}

function removeThemeTag(block, tag) {
  if (!block.themeTags) return block;
  block.themeTags = block.themeTags.filter(t => t !== tag);
  return block;
}

function assignChapter(block, chapterId) {
  block.chapterId = chapterId;
  return block;
}

export {
  COMPILATION_MODES,
  THEME_CATEGORIES,
  groupBlocksByDate,
  groupBlocksByTheme,
  groupBlocksByChapter,
  addThemeTag,
  removeThemeTag,
  assignChapter,
};
