import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { ChevronRight } from 'lucide-react';
import { getTabItems } from '../config/tabRegistry';
import WalkingAnimation from '../components/WalkingAnimation';
import QrDistribution from '../components/QrDistribution';

const GREETING_TEXT = 'On1yTeaching';

const DIRECT_OUTPUT_IDS = new Set([
  'life-records',
  'counseling',
  'newsletter',
  'autobiography-compilation',
  'exam-grading',
]);

const GENERATION_VERBS = [
  '써줘', '써주세요', '작성해줘', '작성해주세요', '작성',
  '만들어줘', '만들어주세요', '만들어', '만들',
  '정리해줘', '정리해주세요', '정리해',
  '요약해줘', '요약해주세요', '요약',
  '초안', '문장', '4줄', '3줄', '5줄', '두줄', '한줄',
  '추천해줘', '뽑아줘', '뽑아주세요', '써',
];

function hasGenerationIntent(normalized) {
  return GENERATION_VERBS.some((v) => {
    const k = v.toLowerCase().replace(/\s+/g, '');
    return k && normalized.includes(k);
  });
}

// 옛 NestJS prompts.service.ts에서 가져온 키워드 추출 + 1단계 마무리 보강
function extractLineCount(text) {
  const m = (text || '').match(/(\d+)\s*줄/);
  if (m) return Math.max(1, Math.min(8, parseInt(m[1], 10)));
  return null;
}

function extractStudentNumber(text) {
  const m = (text || '').match(/(\d+)\s*번/);
  if (m) return parseInt(m[1], 10);
  return null;
}

function hasStudentRosterSource(text) {
  return /학생명부|명부|학생\s*기록|기록된/.test(text || '');
}

async function fetchStudentByNumber(num) {
  if (!num) return null;
  const userId = (typeof localStorage !== 'undefined' && localStorage.getItem('userId')) || '';
  if (!userId) return null;
  try {
    const { default: client } = await import('../api/client');
    const res = await client.get('/api/students', { params: { userId } });
    const list = Array.isArray(res.data) ? res.data : [];
    return list.find((s) => Number(s.number) === Number(num)) || null;
  } catch { return null; }
}

function extractKeywords(text) {
  const cleaned = (text || '').replace(/[^\w가-힣\s,]/g, ' ');
  const parts = cleaned.split(/[\s,]+/).map((p) => p.trim()).filter(Boolean);
  const stop = new Set([
    '상', '중', '하', '상중하', '상중', '중하', '최상', '최하',
    'a', 'b', 'c', 'd', 'f', 's', 'p', 'np',
    '우수', '미흡', '보통',
    '1등급', '2등급', '3등급', '4등급', '5등급', '6등급', '7등급', '8등급', '9등급',
    '써줘', '써', '작성해줘', '작성', '만들어줘', '만들어', '만들',
    '정리해줘', '정리해', '정리', '요약해줘', '요약',
    '초안', '문장', '한줄', '두줄', '한 줄', '두 줄',
    '학생', '학생명부', '명부', '기록', '기록된', '있는', '있어', '있어요',
    '관련', '생기부', '생활기록부', '상담', '안내문', '가정통신문', '친구',
    '4줄', '3줄', '5줄', '2줄', '4line', '3line',
  ]);
  const isScoreWord = (w) => {
    if (!w) return true;
    if (stop.has(w.toLowerCase())) return true;
    if (/^\d+점$/.test(w)) return true;
    if (/^\d+등급$/.test(w)) return true;
    if (/^\d+번$/.test(w)) return true;
    if (/^\d+줄$/.test(w)) return true;
    if (w.length === 1) return true;
    return false;
  };
  const seen = new Set();
  const uniq = [];
  for (const p of parts) {
    if (isScoreWord(p)) continue;
    if (!seen.has(p)) { seen.add(p); uniq.push(p); }
  }
  return uniq;
}

function josa(word, type) {
  if (!word) return type === '을를' ? '을' : '이';
  const last = word[word.length - 1];
  const code = last.charCodeAt(0);
  const isKorean = code >= 0xac00 && code <= 0xd7a3;
  const jong = isKorean ? (code - 0xac00) % 28 : 0;
  const hasFinal = isKorean ? jong !== 0 : false;
  if (type === '을를') return hasFinal ? '을' : '를';
  return hasFinal ? '이' : '가';
}

const LIFE_RECORD_TEMPLATES = [
  { match: /발표|발표력/, line: '발표 상황에서 자신의 의견을 또렷하게 표현하며 자신감 있게 참여함.' },
  { match: /정리|정돈/, line: '활동 후 학습 자료와 주변을 스스로 정돈하는 습관이 잘 형성되어 있음.' },
  { match: /예의/, line: '친구 및 교사와의 관계에서 예의 바른 언어와 태도를 꾸준히 보임.' },
  { match: /협동|협력|모둠/, line: '모둠 활동에서 친구들과 협력하며 맡은 역할을 성실히 수행함.' },
  { match: /책임/, line: '맡은 일을 끝까지 마무리하며 책임감 있는 모습을 보임.' },
  { match: /집중/, line: '수업 중 집중력을 유지하며 학습에 적극적으로 참여함.' },
  { match: /성실/, line: '학교생활 전반에서 안정적이고 성실한 태도를 보임.' },
  { match: /노력/, line: '꾸준한 노력으로 점차 성장하는 모습을 보임.' },
  { match: /관계/, line: '친구 및 교사와의 관계에서 따뜻하고 존중하는 태도를 보임.' },
  { match: /자신감/, line: '활동에 자신감 있게 참여하며 자신의 생각을 분명히 표현함.' },
  { match: /호기심/, line: '새로운 학습 내용에 호기심을 가지고 적극적으로 탐구함.' },
  { match: /창의/, line: '생각을 자유롭게 표현하며 창의적인 결과물을 만들어 냄.' },
  { match: /리더/, line: '활동에서 또래를 이끌며 자연스러운 리더십을 보임.' },
  { match: /배려/, line: '친구들의 감정과 상황을 살피며 따뜻한 배려를 실천함.' },
  { match: /독서/, line: '독서를 즐기며 읽은 내용을 자신의 언어로 표현하는 힘이 있음.' },
];

const LIFE_RECORD_FILLERS = [
  '학교생활 전반에서 안정적이고 성실한 태도를 유지함.',
  '맡은 활동에 책임감 있게 임하며 또래에게 좋은 영향을 줌.',
  '자기 주도적으로 학습에 임하며 긍정적인 변화를 보임.',
  '친구 및 교사와의 관계에서 따뜻한 모습을 꾸준히 보여 줌.',
  '꾸준한 노력으로 한 학기 동안 점차 성장하는 모습을 보임.',
];

function pickLifeRecordLine(kw) {
  for (const t of LIFE_RECORD_TEMPLATES) if (t.match.test(kw)) return t.line;
  return `${kw}${josa(kw, '을를')} 바탕으로 수업에 성실히 참여하며 긍정적인 변화를 보임.`;
}

function generateLifeRecordDraft(keywords, lineCount, studentName) {
  const target = lineCount || 4;
  const seen = new Set();
  const lines = [];
  for (const kw of keywords) {
    const sentence = pickLifeRecordLine(kw);
    if (seen.has(sentence)) continue;
    seen.add(sentence);
    lines.push(sentence);
    if (lines.length >= target) break;
  }
  let fi = 0;
  while (lines.length < target && fi < LIFE_RECORD_FILLERS.length) {
    const f = LIFE_RECORD_FILLERS[fi++];
    if (!seen.has(f)) { seen.add(f); lines.push(f); }
  }
  if (lines.length === 0) lines.push('학교생활에 성실히 참여하며 안정적인 태도를 보임.');
  const final = lines.slice(0, target);
  if (studentName && final.length > 0) {
    final[0] = `${studentName} 학생은 ${final[0].replace(/\.$/, '')}.`;
  }
  return final.map((s) => `- ${s}`).join('\n');
}

const COUNSELING_TEMPLATES = [
  { match: /갈등/, line: '또래 관계에서의 갈등 상황이 학생의 정서에 부담으로 작용하고 있음이 관찰됨.' },
  { match: /관계|친구/, line: '또래 관계에서 어려움을 느끼고 있어 정서 지원이 필요해 보임.' },
  { match: /집중|수업/, line: '수업 시간 집중에 영향이 있어 학습 지속을 함께 살펴볼 필요가 있음.' },
  { match: /스트레스|불안/, line: '스트레스/불안 표현이 관찰되어 정서적 안전감을 확보할 시간이 필요함.' },
  { match: /학부모|부모/, line: '학부모와의 상담을 통해 가정과 학교가 함께 학생을 지원할 방향을 공유함.' },
];

function pickCounselingLine(kw) {
  for (const t of COUNSELING_TEMPLATES) if (t.match.test(kw)) return t.line;
  return `${kw} 관련 상황이 관찰되어 지속적인 관찰과 지원이 필요함.`;
}

function generateCounselingDraft(keywords, lineCount) {
  const target = lineCount || 3;
  const seen = new Set();
  const lines = [];
  for (const kw of keywords) {
    const s = pickCounselingLine(kw);
    if (seen.has(s)) continue;
    seen.add(s); lines.push(s);
    if (lines.length >= target) break;
  }
  const FILLERS = [
    '학교 내 정서 안정과 활동 참여를 함께 지원할 필요가 있음.',
    '교사·또래·가정의 협력으로 학생의 안정감을 형성해 나갈 계획임.',
    '학생의 강점을 살릴 수 있는 활동 기회를 우선적으로 제공할 예정임.',
  ];
  let fi = 0;
  while (lines.length < target && fi < FILLERS.length) {
    if (!seen.has(FILLERS[fi])) { seen.add(FILLERS[fi]); lines.push(FILLERS[fi]); }
    fi++;
  }
  if (lines.length === 0) lines.push('학생의 학교생활 상황에 대한 관찰과 지원이 필요함.');
  return lines.slice(0, target).map((s) => `- ${s}`).join('\n');
}

function generateNewsletterDraft(keywords, lineCount) {
  const topic = keywords[0] || '학교 안내';
  const body = [
    `이번 안내는 ${topic} 관련 내용입니다.`,
    '자세한 사항은 담임 선생님께 문의해 주시면 안내드리겠습니다.',
    '가정의 협조에 늘 감사드립니다.',
  ];
  const target = lineCount || 3;
  const trimmed = body.slice(0, target);
  return ['안녕하세요. 학부모님께 안내 말씀 드립니다.', '', ...trimmed, '', '감사합니다.'].join('\n');
}

async function generateLocalDraftAsync(text, primary) {
  if (!primary) return '';
  const lineCount = extractLineCount(text);
  const studentNum = extractStudentNumber(text);
  const wantStudent = hasStudentRosterSource(text);
  const keywords = extractKeywords(text);
  const id = primary.id;

  let studentName = null;
  if (wantStudent && studentNum) {
    const info = await fetchStudentByNumber(studentNum);
    if (info?.name) studentName = info.name;
  }

  if (id === 'life-records') return generateLifeRecordDraft(keywords, lineCount, studentName);
  if (id === 'counseling') return generateCounselingDraft(keywords, lineCount);
  if (id === 'newsletter') return generateNewsletterDraft(keywords, lineCount);
  if (id === 'autobiography-compilation') {
    const k = keywords[0] || '오늘';
    return [
      `- ${k}${josa(k, '을를')} 중심으로 이번 시기의 기록을 정리합니다.`,
      '- 이 시기를 지나며 느낀 점과 배운 점을 짧게 정리해 챕터에 담아봅니다.',
    ].slice(0, lineCount || 2).join('\n');
  }
  if (id === 'exam-grading') {
    return [
      '- 시험지 채점은 [시험 채점] 탭에서 사진/답안 업로드로 진행할 수 있어요.',
      '- 자동 채점 결과를 확인하고 수동 보정도 가능합니다.',
    ].slice(0, lineCount || 2).join('\n');
  }
  return '';
}

function getThisWeekRange() {
  const c = new Date();
  const day = c.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(c); mon.setDate(c.getDate() + diff);
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  return { weekStart: mon.toISOString().slice(0, 10), weekEnd: sun.toISOString().slice(0, 10) };
}

const STUDENT_AUTOBIOGRAPHY_CHAPTERS = [
  { chapter: '나의 첫 시작', q: '학교생활에서 가장 기억에 남는 첫 날은 언제인가요?' },
  { chapter: '친구 이야기', q: '가장 친한 친구와 만든 추억을 적어보세요.' },
  { chapter: '내가 좋아하는 것', q: '요즘 가장 좋아하는 활동/책/사람은 무엇인가요?' },
  { chapter: '어려웠던 순간', q: '힘들었던 일과 그때 도와준 사람은 누구였나요?' },
  { chapter: '자랑스러운 일', q: '스스로 자랑스럽다고 느낀 순간을 적어보세요.' },
  { chapter: '미래의 나', q: '1년 뒤 나는 어떤 모습이길 바라나요?' },
];

const CAPABILITY_REGISTRY = [
  {
    id: 'random-presenter',
    matches: (info, n) => (info.primary?.id === 'presenter-picker') || /발표자.*뽑|랜덤.*발표|뽑아줘|뽑아\b|발표자.*정해/.test(n),
    handler: async () => {
      const userId = localStorage.getItem('userId');
      if (!userId) return null;
      const { default: client } = await import('../api/client');
      const res = await client.get('/api/students', { params: { userId } });
      const students = Array.isArray(res.data) ? res.data : [];
      if (students.length === 0) return null;
      const pick = students[Math.floor(Math.random() * students.length)];
      return { type: 'random-presenter', student: pick, total: students.length };
    },
  },
  {
    id: 'student-lookup',
    matches: (info, n, text) => {
      if (hasGenerationIntent(n)) return false;
      const num = extractStudentNumber(text);
      const nameMatch = /([가-힣]{2,4})\s*학생/.test(text);
      const hasIntent = /보여|확인|찾|정보|기록확인|기록보/.test(n);
      const isStudentTopic = info.primary?.id === 'student-records' || hasStudentRosterSource(text);
      return isStudentTopic && hasIntent && (num || nameMatch);
    },
    handler: async (text) => {
      const num = extractStudentNumber(text);
      const nameMatch = text.match(/([가-힣]{2,4})\s*학생/);
      const nameQuery = nameMatch ? nameMatch[1] : null;
      const userId = localStorage.getItem('userId');
      if (!userId) return null;
      const { default: client } = await import('../api/client');
      const res = await client.get('/api/students', { params: { userId } });
      const list = Array.isArray(res.data) ? res.data : [];
      let student = null;
      if (num) student = list.find((s) => Number(s.number) === Number(num));
      if (!student && nameQuery) student = list.find((s) => s.name === nameQuery || (s.name && s.name.includes(nameQuery)));
      return { type: 'student-lookup', student, queried: { num, name: nameQuery }, total: list.length };
    },
  },
  {
    id: 'meal-feed-preview',
    matches: (info, n) => (info.primary?.id === 'today-meal') && /보여|보고|볼래|확인|미리보기|보고싶/.test(n),
    handler: async () => {
      const { weekStart, weekEnd } = getThisWeekRange();
      const { default: client } = await import('../api/client');
      const res = await client.get('/api/meals', { params: { action: 'leaderboard', period: 'weekly', startDate: weekStart, endDate: weekEnd } });
      const list = Array.isArray(res.data) ? res.data : [];
      if (list.length === 0) return null;
      return { type: 'meal-feed-preview', items: list.slice(0, 3) };
    },
  },
  {
    id: 'autobiography-chapters',
    matches: (info, n) => {
      const isTopic = info.primary?.id === 'autobiography-compilation' || info.primary?.id === 'creative-studio';
      const hasIntent = /보여|볼래|확인|챕터|질문/.test(n);
      const isStudentScope = /학생용|학생.*챕터|학생.*질문/.test(n);
      return isTopic && hasIntent && isStudentScope;
    },
    handler: async () => {
      return { type: 'autobiography-chapters', items: STUDENT_AUTOBIOGRAPHY_CHAPTERS };
    },
  },
];

async function tryInvokeCapability(routeInfo, normalized, text) {
  for (const cap of CAPABILITY_REGISTRY) {
    try {
      if (cap.matches(routeInfo, normalized, text)) {
        const result = await cap.handler(text, routeInfo);
        if (result) return result;
      }
    } catch (err) {
      console.error('capability failed', cap.id, err);
    }
  }
  return null;
}

const KEYWORD_MAP = [
  { id: 'teaching-tools', title: '수업 보조 도구', emoji: '🧰', route: '/presenter-picker',
    reason: '발표자 정하기, 자리 정하기, 1인 1역 도구를 사용할 수 있어요',
    labels: ['수업 보조 도구', '수업보조도구', '수업도구', '보조도구'],
    keywords: ['수업', '보조도구', '수업도구', '랜덤', '추첨', '모둠', '발표자', '자리', '1인 1역'],
    aliases: ['수업도구', '랜덤뽑기', '추첨도구', '수업보조'] },
  { id: 'presenter-picker', title: '발표자 정하기', emoji: '🎤', route: '/presenter-picker',
    reason: '발표자를 뽑거나 순서를 정할 수 있어요',
    labels: ['발표자 정하기', '발표자정하기'],
    keywords: ['발표자', '발표 뽑기', '뽑기'],
    aliases: ['발표자뽑기', '발표자뽑고싶어', '발표자뽑고십어', '발표자정해줘'] },
  { id: 'seat-arrangement', title: '자리 정하기', emoji: '🪑', route: '/seat-arrangement',
    reason: '자리 배치를 자동으로 정할 수 있어요',
    labels: ['자리 정하기', '자리정하기'],
    keywords: ['자리', '좌석', '자리 배치', '자리배치'],
    aliases: ['자리뽑기', '좌석배치', '자리정해줘'] },
  { id: 'role-assignment', title: '1인 1역', emoji: '🎭', route: '/role-assignment',
    reason: '1인 1역 분담을 만들 수 있어요',
    labels: ['1인 1역 정하기', '1인 1역', '1인1역'],
    keywords: ['1인', '역할', '분담', '일인일역'],
    aliases: ['역할분담', '역할정해줘'] },
  { id: 'life-records', title: '생활기록부', emoji: '📝', route: '/life-records',
    reason: '생기부 문장 초안을 만들 수 있어요',
    labels: ['생활기록부', '생활기록부 작성', '생기부'],
    keywords: ['생기부', '생활기록부', '행발', '발표력', '예의범절', '정리정돈', '서술', '평가문장', '기록 문장', '서술형'],
    aliases: ['생기브', '생긱부', '행바', '행발문장', '생기부써', '생기부써줘'] },
  { id: 'counseling', title: '관찰일지', emoji: '🗨️', route: '/counseling',
    reason: '학생 관찰/상담 내용을 정리할 수 있어요',
    labels: ['관찰일지', '상담 기록', '상담기록', '상담'],
    keywords: ['상담', '학부모', '갈등', '관찰', '관찰일지', '생활지도', '또래', '친구관계', '정서', '문제행동'],
    aliases: ['상듬', '학생관계', '친구갈등', '학부모상담', '지도기록'] },
  { id: 'today-meal', title: '오늘의 급식', emoji: '🍱', route: '/today-meal',
    reason: '학교별 급식 사진과 응원 순위를 볼 수 있어요',
    labels: ['오늘의 급식', '오늘의급식', '급식'],
    keywords: ['급식', '응원', '영양', '영양선생님', '급식상', '식판', '점심', '식단'],
    aliases: ['오늘밥', '급싣', '영양쌤', '급식사진', '급식응원'] },
  { id: 'care-classroom', title: '돌봄교실', emoji: '🧠', route: '/care-classroom',
    reason: '감정·투두·행사 기록을 남길 수 있어요',
    labels: ['돌봄교실', '돌봄 교실', '돌봄'],
    keywords: ['돌봄', '감정', '감정 기록', '투두', '행사기록'],
    aliases: ['돌봄일지', '돌붐교실'] },
  { id: 'student-records', title: '학생명부', emoji: '👥', route: '/student-records',
    reason: '학생 명부와 출결을 관리할 수 있어요',
    labels: ['학생명부', '학생 명부', '명부'],
    keywords: ['학생', '명부', '출석', '학생기록'],
    aliases: ['학생리스트', '학생목록', '명부확인'] },
  { id: 'schedule', title: '학사일정', emoji: '📅', route: '/schedule',
    reason: '학사일정을 등록하고 월간 흐름을 볼 수 있어요',
    labels: ['학사일정', '학사 일정'],
    keywords: ['학사', '일정', '스케줄', '회의'],
    aliases: ['스케쥴', '일정등록', '일정정리'] },
  { id: 'subject-evaluation', title: '교과평가', emoji: '📊', route: '/subject-evaluation',
    reason: '교과별 성취와 평가를 정리할 수 있어요',
    labels: ['교과평가', '교과 평가'],
    keywords: ['교과', '성적', '성취'],
    aliases: ['교과성적', '평가정리'] },
  { id: 'creative-activities', title: '창의적 체험활동', emoji: '🎨', route: '/creative-activities',
    reason: '창체 활동 기록을 관리할 수 있어요',
    labels: ['창의적 체험활동', '창의적체험활동', '창체'],
    keywords: ['창체', '동아리', '봉사', '체험활동'],
    aliases: ['창체활동'] },
  { id: 'morning-activity', title: '아침 활동', emoji: '✏️', route: '/morning-activity',
    reason: '아침 글쓰기/필사/문해력 활동을 할 수 있어요',
    labels: ['아침 활동', '아침활동'],
    keywords: ['아침', '필사', '받아쓰기', '이어쓰기'],
    aliases: ['아침글쓰기'] },
  { id: 'teacher-activities', title: '아침 활동 관리', emoji: '📋', route: '/teacher-activities',
    reason: '학생 제출 현황과 세션을 관리할 수 있어요',
    labels: ['아침 활동 관리', '아침활동관리', '활동 관리'],
    keywords: ['활동 관리', '활동관리', '제출 현황', '제출확인', '세션'],
    aliases: ['활동현황'] },
  { id: 'autobiography-compilation', title: '자서전 편찬', emoji: '📚', route: '/autobiography-compilation',
    reason: '자서전 챕터와 질문을 확인하고 편집할 수 있어요',
    labels: ['자서전 편찬', '자서전편찬', '자서전'],
    keywords: ['자서전', '편찬', '챕터', '회고', '회고록', '책만들기', '원고'],
    aliases: ['자서전쓰기', '챱터', '책편찬', '질문정리'] },
  { id: 'creative-studio', title: '창작 편찬실', emoji: '📖', route: '/creative-studio',
    reason: '창작 활동과 챕터 질문을 관리할 수 있어요',
    labels: ['창작 편찬실', '창작편찬실', '편찬실'],
    keywords: ['창작', '편찬실'],
    aliases: ['편찬싫', '창작실'] },
  { id: 'my-book', title: '내 책 만들기', emoji: '📕', route: '/my-book',
    reason: '나만의 책을 만들 수 있어요',
    labels: ['내 책 만들기', '내책만들기'],
    keywords: ['책 만들기', '책만들기', '내 책'],
    aliases: ['책편집'] },
  { id: 'newsletter', title: '가정통신문', emoji: '📢', route: '/newsletter',
    reason: '가정통신문/안내문 초안을 만들 수 있어요',
    labels: ['가정통신문', '가정 통신문'],
    keywords: ['가정통신문', '안내문', '통신문', '공지', '안내'],
    aliases: ['공지문', '가통문', '공지사항'] },
  { id: 'exam-grading', title: '시험 채점', emoji: '✏️', route: '/exam-grading',
    reason: '시험지 채점을 도와드려요',
    labels: ['시험 채점', '시험채점'],
    keywords: ['채점', '시험지', '시험'],
    aliases: ['시험점수', '채점해줘'] },
  { id: 'absence-report', title: '결석계', emoji: '🏥', route: '/absence-report',
    reason: '결석/출결 신고를 처리할 수 있어요',
    labels: ['결석계'],
    keywords: ['결석', '출결'],
    aliases: ['결석신고', '결석사유'] },
  { id: 'qr-distribution', title: 'QR 배포', emoji: '📱', route: '#qr', action: 'showQr',
    reason: '아침 활동 링크를 QR 코드로 배포할 수 있어요',
    labels: ['qr 배포', 'qr배포', '큐알 배포', '큐알배포', 'qr'],
    keywords: ['qr', '큐알', '배포', '활동지', '아침활동배포'],
    aliases: ['큐알로', 'qr코드', '큐알코드', '링크보내기'] },
];

function Dashboard() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState('');
  const [selectedModel] = useState('claude-3-5-sonnet-20241022');
  const [usedModel, setUsedModel] = useState('');
  const [events, setEvents] = useState({});
  const [showQr, setShowQr] = useState(false);
  const [currentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear] = useState(new Date().getFullYear());
  const [tabUsage, setTabUsage] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tabUsage') || localStorage.getItem('tabClickCounts');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const migrated = {};
          Object.keys(parsed).forEach(key => {
            const val = parsed[key];
            if (typeof val === 'number') {
              migrated[key] = { count: val, lastUsed: 0 };
            } else {
              migrated[key] = val;
            }
          });
          return migrated;
        } catch {
          return {};
        }
      }
    }
    return {};
  });
  const [greeting, setGreeting] = useState(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('greetingTypedOnce') === '1') {
      return GREETING_TEXT;
    }
    return '';
  });

  const allTabs = useMemo(() => getTabItems({
    currentMonth,
    currentYear,
    hasStudentData: events && Object.keys(events).length > 0,
  }), [currentMonth, currentYear, events]);

  const recentTabs = useMemo(() => {
    const hasAnyUsage = Object.values(tabUsage).some(v => v?.lastUsed > 0);
    if (!hasAnyUsage) {
      // No usage data yet — show default order
      return allTabs.slice(0, 6);
    }
    return [...allTabs].sort((a, b) => {
      const timeA = tabUsage[a.id]?.lastUsed || 0;
      const timeB = tabUsage[b.id]?.lastUsed || 0;
      
      if (timeB !== timeA) {
        return timeB - timeA;
      }
      
      const countA = tabUsage[a.id]?.count || 0;
      const countB = tabUsage[b.id]?.count || 0;
      if (countB !== countA) {
        return countB - countA;
      }
      
      return 0;
    }).slice(0, 6);
  }, [allTabs, tabUsage]);


  const [submittedPrompt, setSubmittedPrompt] = useState('');
  const [routeInfo, setRouteInfo] = useState({ primary: null, secondary: [], confidence: 'none' });
  const [capabilityResult, setCapabilityResult] = useState(null);

  const handleRecommendClick = (item) => {
    if (!item) return;
    if (item.action === 'showQr') { setShowQr(true); return; }
    handleTabClick(item.id, item.route);
  };

  // Fetch events from backend
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const userId = localStorage.getItem('userId') || localStorage.getItem('user_id');
        if (!userId) return;
        const res = await client.get('/api/schedules', { params: { userId } });
        // Group events by date
        const eventsByDate = {};
        res.data.forEach(event => {
          const date = event.start_date;
          if (!eventsByDate[date]) {
            eventsByDate[date] = [];
          }
          eventsByDate[date].push(event);
        });
        setEvents(eventsByDate);
      } catch (error) {
        console.error("Failed to fetch events", error);
      }
    };
    fetchEvents();
  }, []);

  // One-time typing animation for greeting on first visit after login
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem('greetingTypedOnce') === '1') return;

    let index = 0;
    const interval = setInterval(() => {
      index += 1;
      setGreeting(GREETING_TEXT.slice(0, index));
      if (index >= GREETING_TEXT.length) {
        clearInterval(interval);
        localStorage.setItem('greetingTypedOnce', '1');
      }
    }, 80);

    return () => clearInterval(interval);
  }, []);

  // Handle tab clicks and update localStorage
  const handleTabClick = (tabId, route) => {
    const now = Date.now();
    const newStats = { ...tabUsage };
    const current = newStats[tabId] || { count: 0, lastUsed: 0 };
    
    newStats[tabId] = { 
      count: current.count + 1, 
      lastUsed: now 
    };
    
    setTabUsage(newStats);
    localStorage.setItem('tabUsage', JSON.stringify(newStats));
    navigate(route);
  };


  const handlePromptSubmit = async (e) => {
    e.preventDefault();
    const text = prompt.trim();
    if (!text) return;
    setSubmittedPrompt(text);
    const route = detectRoutesFromPrompt(text);
    setRouteInfo(route);
    setResponse('');
    setUsedModel('');
    setCapabilityResult(null);
    setIsLoading(true);

    const normalized = text.toLowerCase().replace(/\s+/g, '');
    const shouldGenerate = route.primary && DIRECT_OUTPUT_IDS.has(route.primary.id);

    try {
      // 1) directAnswer — AI 생성 (DIRECT_OUTPUT 카테고리)
      if (shouldGenerate) {
        let aiResult = '';
        try {
          const res = await client.post('/api/prompts', { content: text, ai_model: selectedModel });
          aiResult = res.data.result || res.data.generated_document || '';
          if (aiResult.trim()) {
            setResponse(aiResult);
            setUsedModel(res.data.model || res.data.ai_model || '');
          }
        } catch (err) {
          console.error('directAnswer failed', err);
        }
        // AI 응답이 비었거나 실패한 경우 — 클라이언트 로컬 템플릿 폴백 (학생 정보 조회 포함)
        if (!aiResult.trim()) {
          const local = await generateLocalDraftAsync(text, route.primary);
          if (local) {
            setResponse(local);
            setUsedModel('local-template');
          }
        }
      }

      // 2) invokeTabCapability — 직접 답변이 없으면 기능 실행 시도
      if (!shouldGenerate) {
        const cap = await tryInvokeCapability(route, normalized, text);
        if (cap) setCapabilityResult(cap);
      }
      // 3) navigateToTab fallback은 결과창에서 자동 처리 (RecommendationCard)
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3 flex flex-col min-h-[calc(100vh-2rem)]">
      <div className="flex items-start gap-6 sm:gap-10">
        <div className="flex flex-col">
          <h1
            className="text-3xl font-bold text-gray-900 italic"
            style={{ letterSpacing: '0.06em' }}
          >
            {greeting || GREETING_TEXT}
          </h1>
          <span className="text-base font-semibold shimmer-text">오직 가르치기만 하십시오.</span>
        </div>
        <div className="hidden sm:block pt-1">
          <WalkingAnimation />
        </div>
      </div>
      
      <div className="space-y-8">
        <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-100">
          <div className="px-4 py-4 sm:px-6 border-b border-gray-100 bg-gray-50/50">
            <h3 className="text-lg leading-6 font-bold text-gray-900 flex items-center gap-2">
              최근 이용하신 업무 목록
            </h3>
          </div>
          <div className="px-4 py-5 sm:p-6">
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {recentTabs.map((tab, index) => {
                const hasUsage = tabUsage[tab.id]?.lastUsed > 0;
                return (
                  <div
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id, tab.route)}
                    className={`group relative flex items-center space-x-3 sm:space-x-4 rounded-xl border bg-white px-3 sm:px-5 py-2 sm:py-2.5 shadow-sm hover:shadow-md cursor-pointer transition-all duration-200 ${
                      index === 0 && hasUsage
                        ? 'border-indigo-300 ring-2 ring-indigo-100'
                        : 'border-gray-200 hover:border-indigo-300'
                    }`}
                  >
                    {hasUsage && (
                      <span className={`absolute -top-2 -left-2 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shadow-sm z-10 ${
                        index === 0 ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {index + 1}
                      </span>
                    )}
                    <div className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-indigo-50 rounded-lg group-hover:bg-indigo-100 transition-colors">
                      <span className="text-xl sm:text-2xl" aria-hidden="true">{tab.emoji}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="absolute inset-0" aria-hidden="true" />
                      <p className="text-sm sm:text-base font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors truncate">
                        {tab.title}
                      </p>
                      <p className="text-[11px] sm:text-xs text-gray-500 truncate mt-0.5">{tab.subtitle}</p>
                    </div>
                    <div className="flex-shrink-0 self-center hidden sm:block">
                      <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-indigo-400 transition-colors" aria-hidden="true" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* QR 배포 */}
        <div className="mt-4">
          {showQr ? (
            <QrDistribution onClose={() => setShowQr(false)} />
          ) : (
            <button onClick={() => setShowQr(true)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-purple-50 text-purple-700 rounded-xl border border-purple-200 hover:bg-purple-100 transition text-sm font-medium">
              📱 QR로 아침 활동 배포하기
            </button>
          )}
        </div>
      </div>

      {/* AI Prompt Section - Split layout */}
      <div className="bg-white overflow-hidden shadow rounded-lg flex-1 flex flex-col">
        <div className="px-4 py-5 sm:p-6 flex-1 flex flex-col">
          <form onSubmit={handlePromptSubmit} className="flex-1 flex flex-col">
            {/* 제목 행 - 같은 높이 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-2">
              <h2 className="text-lg font-medium leading-6 text-gray-900">통합형 업무 도우미</h2>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">결과</h3>
                  {routeInfo.primary && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-100 text-indigo-800">
                      <span>{routeInfo.primary.emoji}</span>{routeInfo.primary.title}
                    </span>
                  )}
                </div>
                {usedModel && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                    OnlyTeaching DB
                  </span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
              {/* Left: textarea */}
              <div className="flex flex-col">
                <textarea
                  id="prompt"
                  className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md p-3 pb-4 flex-1 resize-none min-h-[100px] overflow-y-auto"
                  placeholder={'예시) 000학생 관련해서 발표능력 상, 정리정돈 중, 예의범절 하로 생기부 4줄 작성해줘.'}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                      e.preventDefault();
                      handlePromptSubmit(e);
                    }
                  }}
                />
              </div>

              {/* Right: result */}
              <div className="flex flex-col min-h-[100px]">
                <div className="bg-white border border-gray-300 rounded-md p-3 flex-1 overflow-y-auto shadow-sm">
                  <ResultPanel
                    submitted={submittedPrompt}
                    routeInfo={routeInfo}
                    response={response}
                    capabilityResult={capabilityResult}
                    isLoading={isLoading}
                    onSelect={handleRecommendClick}
                  />
                </div>
              </div>
            </div>

            {/* Submit button - below grid, aligned to left column */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 ${isLoading ? 'bg-gray-100' : 'bg-white hover:bg-gray-50'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400`}
                >
                  {isLoading ? '생성 중...' : '생성하기 (Ctrl + Enter)'}
                </button>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setPrompt('');
                    setResponse('');
                    setUsedModel('');
                    setSubmittedPrompt('');
                    setRouteInfo({ primary: null, secondary: [], confidence: 'none' });
                    setCapabilityResult(null);
                  }}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
                >
                  초기화
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

    </div>
  );
}

export default Dashboard;

function ResultRenderer({ text }) {
  if (!text) {
    return <p className="text-sm text-gray-400" style={{ fontFamily: 'inherit' }}>결과가 여기에 표시됩니다.</p>;
  }

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const bulletLines = lines.filter((l) => l.startsWith('- '));
  const otherLines = lines.filter((l) => !l.startsWith('- '));
  const combinedParagraph = bulletLines.map((l) => l.replace(/^- /, '')).join(' ');

  return (
    <div className="space-y-3">
      {otherLines.map((line, idx) => (
        <p key={`other-${idx}`} className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
          {line}
        </p>
      ))}

      {bulletLines.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-semibold text-gray-900">추천 문장 예시:</div>
          <ul className="list-disc list-inside text-sm text-gray-800 space-y-1">
            {bulletLines.map((line, idx) => (
              <li key={`bullet-${idx}`}>{line.replace(/^- /, '')}</li>
            ))}
          </ul>
          <div className="pt-2">
            <div className="text-xs font-semibold text-gray-900 mb-1">종합 문단</div>
            <p className="text-sm text-gray-800 leading-relaxed bg-gray-50 border border-gray-200 rounded-md p-3">
              {combinedParagraph}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function editDistance(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  if (Math.abs(m - n) > 2) return 99;
  let prev = new Array(n + 1);
  let curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      curr[j] = a[i - 1] === b[j - 1] ? prev[j - 1] : Math.min(prev[j - 1], curr[j - 1], prev[j]) + 1;
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

function hasFuzzyMatch(input, keyword, threshold = 1) {
  if (!keyword || keyword.length < 2) return false;
  const lo = Math.max(2, keyword.length - 1);
  const hi = keyword.length + 1;
  for (let len = lo; len <= hi; len++) {
    for (let i = 0; i + len <= input.length; i++) {
      if (editDistance(input.slice(i, i + len), keyword) <= threshold) return true;
    }
  }
  return false;
}

function detectRoutesFromPrompt(text) {
  if (!text || !text.trim()) return { primary: null, secondary: [], confidence: 'none' };
  const normalized = text.toLowerCase().replace(/\s+/g, '');
  const wantsGeneration = hasGenerationIntent(normalized);

  const scored = KEYWORD_MAP.map((entry) => {
    let score = 0;
    let labelExact = false;

    // 1) labels — 한 카테고리 안의 변형들은 누적 안 함, 가장 강한 매치만
    let labelScore = 0;
    for (const lbl of (entry.labels || [])) {
      const l = lbl.toLowerCase().replace(/\s+/g, '');
      if (!l) continue;
      if (normalized === l) { labelScore = Math.max(labelScore, 20); labelExact = true; }
      else if (normalized.includes(l)) { labelScore = Math.max(labelScore, 10); }
    }
    score += labelScore;
    // 2) strong keywords
    for (const kw of (entry.keywords || [])) {
      const k = kw.toLowerCase().replace(/\s+/g, '');
      if (!k) continue;
      if (normalized.includes(k)) score += k.length >= 4 ? 5 : 4;
      else if (hasFuzzyMatch(normalized, k)) score += 1;
    }
    // 3) aliases
    for (const al of (entry.aliases || [])) {
      const k = al.toLowerCase().replace(/\s+/g, '');
      if (!k) continue;
      if (normalized.includes(k)) score += 3;
      else if (hasFuzzyMatch(normalized, k)) score += 1;
    }
    // 4) 생성 의도 부스트 — 직접 출력 카테고리에 한해 점수 압도
    if (wantsGeneration && DIRECT_OUTPUT_IDS.has(entry.id) && score > 0) {
      score += 15;
    }
    return { ...entry, score, labelExact };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return { primary: null, secondary: [], confidence: text.trim().length >= 2 ? 'unknown' : 'none' };
  }
  let [primary, ...rest] = scored;
  let secondary = rest.slice(0, 3);

  // 생성 의도 + DIRECT_OUTPUT 카테고리가 1순위가 아니면 swap
  // (학생명부 같은 데이터 source가 1순위라도, 사용자 목표는 문장 생성)
  if (wantsGeneration) {
    const directCandidate = scored.find((s) => DIRECT_OUTPUT_IDS.has(s.id));
    if (directCandidate && directCandidate.id !== primary.id) {
      secondary = [primary, ...rest.filter((s) => s.id !== directCandidate.id)].slice(0, 3);
      primary = directCandidate;
    }
  }

  let confidence;
  if (primary.labelExact || primary.score >= 4) confidence = 'high';
  else if (primary.score >= 3) confidence = 'medium';
  else confidence = 'low';
  return { primary, secondary, confidence };
}

function RecommendationCard({ primary, secondary, onSelect }) {
  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-3 space-y-2">
      <p className="text-[11px] font-semibold tracking-wider text-indigo-700 uppercase">추천 작업</p>
      <button type="button" onClick={() => onSelect(primary)}
        className="w-full text-left flex items-center gap-3 rounded-lg bg-white border border-indigo-200 p-3 hover:border-indigo-400 hover:shadow-sm transition">
        <span className="text-2xl shrink-0">{primary.emoji}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-gray-900">{primary.title}</p>
          <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{primary.reason}</p>
        </div>
        <span className="text-indigo-600 text-sm font-semibold shrink-0">이동 →</span>
      </button>
      {secondary && secondary.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-[11px] text-gray-500">비슷한 작업:</span>
          {secondary.map((s) => (
            <button key={s.id} type="button" onClick={() => onSelect(s)}
              className="inline-flex items-center gap-1 rounded-full bg-white border border-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-700 hover:border-indigo-300 hover:text-indigo-700 transition">
              <span>{s.emoji}</span>{s.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DidYouMeanCard({ primary, secondary, onSelect }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 space-y-2">
      <p className="text-[11px] font-semibold tracking-wider text-amber-800 uppercase">혹시 이건가요?</p>
      <button type="button" onClick={() => onSelect(primary)}
        className="w-full text-left flex items-center gap-3 rounded-lg bg-white border border-amber-200 p-3 hover:border-amber-400 hover:shadow-sm transition">
        <span className="text-2xl shrink-0">{primary.emoji}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-gray-900">{primary.title}</p>
          <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{primary.reason}</p>
        </div>
        <span className="text-amber-700 text-sm font-semibold shrink-0">맞아요 →</span>
      </button>
      {secondary && secondary.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-[11px] text-gray-500">아니면:</span>
          {secondary.map((s) => (
            <button key={s.id} type="button" onClick={() => onSelect(s)}
              className="inline-flex items-center gap-1 rounded-full bg-white border border-amber-200 px-2 py-0.5 text-[11px] font-medium text-amber-800 hover:border-amber-400 transition">
              <span>{s.emoji}</span>{s.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CapabilityResult({ result }) {
  if (!result) return null;
  if (result.type === 'random-presenter') {
    const s = result.student || {};
    return (
      <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-3">
        <p className="text-[11px] font-semibold tracking-wider text-purple-700 uppercase">실행 결과 · 발표자 추첨</p>
        <p className="mt-2 text-base sm:text-lg font-bold text-purple-900">
          🎤 오늘 발표자: {s.number ? `${s.number}번 ` : ''}{s.name || '학생'}
        </p>
        <p className="mt-1 text-[11px] text-purple-700/70">{result.total}명 중 무작위 추첨</p>
      </div>
    );
  }
  if (result.type === 'student-lookup') {
    const s = result.student;
    if (!s) {
      const q = result.queried || {};
      return (
        <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-3">
          <p className="text-[11px] font-semibold tracking-wider text-blue-700 uppercase">실행 결과 · 학생 조회</p>
          <p className="mt-2 text-sm text-blue-900">{q.num ? `${q.num}번 ` : ''}{q.name ? `${q.name} ` : ''}학생을 찾지 못했어요.</p>
          <p className="mt-1 text-[11px] text-blue-700/70">학생명부에서 등록 여부를 확인할 수 있어요. (전체 {result.total}명)</p>
        </div>
      );
    }
    return (
      <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3">
        <p className="text-[11px] font-semibold tracking-wider text-blue-700 uppercase">실행 결과 · 학생 조회</p>
        <p className="mt-2 text-base sm:text-lg font-bold text-blue-900">👤 {s.number ? `${s.number}번 ` : ''}{s.name || '학생'}</p>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-blue-800/80">
          {s.grade && <span>학년 {s.grade}</span>}
          {s.class && <span>반 {s.class}</span>}
          {s.gender && <span>{s.gender}</span>}
        </div>
      </div>
    );
  }
  if (result.type === 'autobiography-chapters') {
    return (
      <div className="rounded-xl border border-purple-200 bg-purple-50/40 p-3 space-y-2">
        <p className="text-[11px] font-semibold tracking-wider text-purple-700 uppercase">실행 결과 · 학생용 챕터 질문</p>
        <ul className="space-y-1.5">
          {result.items.map((it, idx) => (
            <li key={`${it.chapter}-${idx}`} className="rounded-lg bg-white border border-purple-100 px-2.5 py-1.5">
              <p className="text-[11px] font-semibold text-purple-800">{it.chapter}</p>
              <p className="text-xs text-purple-900/80 leading-relaxed mt-0.5">{it.q}</p>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (result.type === 'meal-feed-preview') {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3 space-y-2">
        <p className="text-[11px] font-semibold tracking-wider text-amber-700 uppercase">실행 결과 · 이번 주 인기 급식</p>
        <div className="grid grid-cols-3 gap-2">
          {result.items.map((it, idx) => (
            <div key={`${it.schoolCode}-${idx}`} className="rounded-lg bg-white border border-amber-100 overflow-hidden">
              <div className="aspect-[4/3] bg-amber-50">
                {it.topImageUrl ? (
                  <img src={it.topImageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-2xl text-amber-300">🍱</div>
                )}
              </div>
              <div className="p-1.5 text-center">
                <p className="text-[11px] font-semibold text-amber-900 truncate">{it.schoolCode}</p>
                <p className="text-[10px] text-amber-700/70">👏 {it.totalLikes}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

function ResultPanel({ submitted, routeInfo, response, capabilityResult, isLoading, onSelect }) {
  // 1) 제출 전 — 기본 안내문 (좌상단, 입력창 placeholder와 같은 시작점)
  if (!submitted) {
    return (
      <p className="text-sm text-gray-400 leading-relaxed">
        업무 요청을 입력하고 <span className="font-medium text-gray-600">생성하기</span>를 누르면,
        바로 답변하거나 관련 작업으로 안내해드려요.
      </p>
    );
  }

  // 2) 생성 중
  if (isLoading) {
    return (
      <div className="space-y-3">
        <RequestEcho text={submitted} primary={routeInfo.primary} />
        <div className="rounded-xl bg-gray-50 border border-gray-200 px-3 py-4 text-center text-sm text-gray-500">
          답변을 만들고 있어요...
        </div>
      </div>
    );
  }

  const hasResponse = !!(response && response.trim());
  const hasCapability = !!capabilityResult;
  const hasMainResult = hasResponse || hasCapability;

  return (
    <div className="space-y-3">
      <RequestEcho text={submitted} primary={routeInfo.primary} />

      {hasResponse && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold tracking-wider text-emerald-700 uppercase">바로 결과</p>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
            <ResultRenderer text={response} />
          </div>
        </div>
      )}

      {hasCapability && <CapabilityResult result={capabilityResult} />}

      {hasMainResult && routeInfo.primary && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold tracking-wider text-indigo-700 uppercase">관련 작업</p>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={() => onSelect(routeInfo.primary)}
              className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs font-semibold text-indigo-800 hover:bg-indigo-100 transition">
              <span>{routeInfo.primary.emoji}</span>{routeInfo.primary.title} 열기 →
            </button>
            {routeInfo.secondary.map((s) => (
              <button key={s.id} type="button" onClick={() => onSelect(s)}
                className="inline-flex items-center gap-1 rounded-full bg-white border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-gray-700 hover:border-indigo-300 hover:text-indigo-700 transition">
                <span>{s.emoji}</span>{s.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {!hasMainResult && routeInfo.confidence === 'high' && routeInfo.primary && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold tracking-wider text-indigo-700 uppercase">추천 작업</p>
          <RecommendationCard primary={routeInfo.primary} secondary={routeInfo.secondary} onSelect={onSelect} />
        </div>
      )}

      {(routeInfo.confidence === 'medium' || routeInfo.confidence === 'low') && routeInfo.primary && (
        <DidYouMeanCard primary={routeInfo.primary} secondary={routeInfo.secondary} onSelect={onSelect} />
      )}

      {!routeInfo.primary && !hasResponse && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 space-y-2">
          <p className="text-xs text-amber-800">요청을 정확히 하나로 좁히지 못했어요. 혹시 아래 작업을 찾으시나요?</p>
          <div className="flex flex-wrap gap-1.5">
            {KEYWORD_MAP.slice(0, 6).map((s) => (
              <button key={s.id} type="button" onClick={() => onSelect(s)}
                className="inline-flex items-center gap-1 rounded-full bg-white border border-amber-200 px-2.5 py-0.5 text-[11px] font-medium text-amber-800 hover:border-amber-400 transition">
                <span>{s.emoji}</span>{s.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RequestEcho({ text, primary }) {
  return (
    <div className="flex items-start gap-2">
      <p className="text-[11px] font-semibold tracking-wider text-gray-500 uppercase shrink-0 mt-0.5">요청 해석</p>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-700 leading-relaxed line-clamp-2">"{text}"</p>
        {primary && (
          <p className="mt-0.5 text-[11px] text-indigo-700 font-medium">
            <span>{primary.emoji}</span> {primary.title}
          </p>
        )}
      </div>
    </div>
  );
}
