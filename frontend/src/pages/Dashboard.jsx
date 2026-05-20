import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { ChevronRight } from 'lucide-react';
import { getTabItems } from '../config/tabRegistry';
import WalkingAnimation from '../components/WalkingAnimation';
import QrDistribution from '../components/QrDistribution';

const GREETING_TEXT = 'On1yTeaching';

// direct generation 허용 탭 — 3개로 제한
// 생활기록부 / 교과평가 / 창의적 체험활동
const DIRECT_OUTPUT_IDS = new Set([
  'life-records',
  'subject-evaluation',
  'creative-activities',
]);

// 아직 구현되지 않은 탭 — direct/capability 모두 차단, 보수적 안내만
const UNIMPLEMENTED_IDS = new Set([
  'counseling',
]);

// workspace형 탭 안내 문구 — 단순 "이동"이 아니라 왜 그 화면에서 이어가는지 설명
const WORKSPACE_HINTS = {
  'autobiography-compilation': {
    why: '자서전은 편찬실에서 챕터를 고르고 질문·재료를 모아 차근차근 쓰는 작업이에요.',
    cta: '자서전 편찬 열기',
  },
  'creative-studio': {
    why: '편찬실에서 학생용/교사용 챕터와 질문을 살펴보며 작품을 이어 만들 수 있어요.',
    cta: '편찬실 열기',
  },
  'qr-distribution': {
    why: 'QR 배포는 전용 화면에서 활동 방식과 시간을 정해 코드/링크를 만드는 작업이에요.',
    cta: 'QR 배포 열기',
  },
  'student-records': {
    why: '학생명부에서 번호·이름·학년/반을 한눈에 볼 수 있어요. 특정 학생만 빠르게 보고 싶다면 "5번 학생 보여줘"처럼 입력해 보세요.',
    cta: '학생명부 열기',
  },
  'today-meal': {
    why: '최근 학교별 급식 사진과 응원 순위, 주간 화제를 한곳에서 볼 수 있어요.',
    cta: '오늘의 급식 열기',
  },
  'newsletter': {
    why: '가정통신문은 전용 화면에서 제목·본문·첨부를 정리해 보내는 작업이에요.',
    cta: '가정통신문 열기',
  },
  'my-book': {
    why: '내 책 만들기는 전용 편집 화면에서 챕터를 묶고 표지/디자인을 정해 마무리하는 작업이에요.',
    cta: '내 책 만들기 열기',
  },
  'exam-grading': {
    why: '시험 채점은 답안 사진과 정답을 업로드해 자동/수동 채점을 이어가는 화면에서 진행돼요.',
    cta: '시험 채점 열기',
  },
  'schedule': {
    why: '학사일정은 월간 흐름과 등록 항목을 함께 보며 정리하는 화면에서 다루는 게 좋아요.',
    cta: '학사일정 열기',
  },
  'care-classroom': {
    why: '돌봄교실 기록은 감정·투두·행사 영역으로 나눠 정리하는 화면에서 이어가요.',
    cta: '돌봄교실 열기',
  },
  'presenter-picker': {
    why: '발표자/자리/1인 1역 등 즉석 추첨 도구는 수업 보조 도구 화면에서 이어 사용할 수 있어요.',
    cta: '발표자 정하기 열기',
  },
};

// 미구현 탭 안내 — 차가운 "준비 중"이 아니라 어떤 방향으로 연결될지 짧게
const UNIMPLEMENTED_HINTS = {
  counseling: {
    headline: '관찰일지·상담 기록은 곧 만나볼 수 있어요',
    body: '학생별 관찰 내용과 상담 흐름을 한 화면에서 정리할 수 있도록 만들고 있어요. 완성되면 이 도우미에서도 키워드만으로 바로 도와드릴 수 있어요.',
    cta: '관찰일지 화면 미리 보기',
  },
};

// LLM intent → 카테고리 id 매핑
const INTENT_TO_CATEGORY = {
  'student-record': 'life-records',
  'counseling-record': 'counseling',
  'subject-evaluation': 'subject-evaluation',
  'meal-feed': 'today-meal',
  'qr-distribute': 'qr-distribution',
  'autobiography': 'autobiography-compilation',
  'student-roster': 'student-records',
  'creative-activity': 'creative-activities',
  'helper-tool': 'presenter-picker',
  'schedule-admin': 'schedule',
};

async function parseIntentWithLLM(text) {
  try {
    const res = await client.post('/api/prompts', { content: text, mode: 'intent' });
    const raw = res.data.result || res.data.generated_document || '';
    if (!raw || !raw.trim()) return null;
    let parsed;
    try { parsed = JSON.parse(raw); } catch { return null; }
    if (!parsed || typeof parsed !== 'object') return null;
    if (!parsed.intent || parsed.intent === 'unknown') return null;
    return parsed;
  } catch {
    return null;
  }
}

function intentToRouteInfo(llmIntent) {
  const catId = INTENT_TO_CATEGORY[llmIntent.intent];
  if (!catId) return null;
  const primary = KEYWORD_MAP.find((e) => e.id === catId);
  if (!primary) return null;
  // confidence 기반 high/medium 결정
  let confidence;
  const c = Number(llmIntent.confidence) || 0;
  if (c >= 0.7) confidence = 'high';
  else if (c >= 0.4) confidence = 'medium';
  else confidence = 'low';
  return {
    primary: { ...primary, score: c * 30 },
    secondary: [],
    confidence,
  };
}

// 구조적 입력 파서 — stop word 땜질 대신 입력 전체를 한 번에 해석.
// 결과: { domain, action, targetStudents, studentNames, subject, area,
//        lineCount, contentKeywords, fillerWords, confidence, multiStudent }

const SUBJECT_LEXICON = ['국어', '수학', '사회', '과학', '영어', '도덕', '체육', '음악', '미술', '실과', '통합교과'];
const AREA_LEXICON = [
  '듣기·말하기', '듣기말하기', '듣기 말하기',
  '읽기', '쓰기', '문법', '문학',
  '수와 연산', '수와연산', '도형', '측정', '규칙성', '자료와 가능성', '자료와가능성',
];

// 패턴은 위에 있는 것이 더 강한 우선순위
// "창체"는 "평가문장"보다 더 강한 도메인 시그널 — 위쪽에 둠
const DOMAIN_RULES = [
  { id: 'presenter-picker',         regex: /(발표자.*뽑|랜덤.*발표|발표\s*뽑|추첨\s*해|발표자.*정해)/ },
  { id: 'qr-distribution',          regex: /(qr|큐알)/i },
  { id: 'counseling',               regex: /(관찰\s*일지|상담\s*기록|관찰\s*기록)/ },
  { id: 'autobiography-compilation',regex: /(자서전|편찬실|편찬)/ },
  { id: 'today-meal',               regex: /(급식|영양\s*선생님|급식상|식판|식단)/ },
  { id: 'student-records',          regex: /(학생\s*명부|학생\s*목록|^\s*명부|\s명부|명단)/ },
  { id: 'creative-activities',      regex: /(창체|창의적\s*체험\s*활동|동아리\s*활동|봉사\s*활동|진로\s*활동|자율\s*활동)/ },
  { id: 'life-records',             regex: /(생활\s*기록부|생기부|행발|생활\s*기록)/ },
  { id: 'subject-evaluation',       regex: /(교과\s*평가|평가\s*문장|성취\s*기준)/ },
];

const ACTION_RULES = [
  { id: 'help',     regex: /(키워드.*알려|뭐\s*있|뭐\s*쓸|어떻게\s*하|방법\s*알려|무슨.*키워드)/ },
  { id: 'navigate', regex: /(열어\s*줘|들어가|가\s*고\s*싶|들어가고\s*싶)/ },
  { id: 'lookup',   regex: /(보여\s*줘|보여\s*주세요|확인\s*해|볼래|보고\s*싶|확인\s*하|보여)/ },
  { id: 'generate', regex: /(써\s*줘|써\s*주세요|작성\s*해|작성\s*하|만들\s*어|만들기|정리\s*해|요약\s*해|초안)/ },
];

const FILLER_TOKEN_SET = new Set([
  // 군더더기/감탄
  '그냥', '좀', '대충', '일단', '글쎄', '아마', '대략', '음', '아', '어', '뭐',
  // 연결어/지시어
  '관련', '관련해서', '관련한', '관해', '관해서', '대해', '대한', '대해서',
  '그래서', '그리고', '근데', '또', '그럼', '아니',
  // 등급/성취
  '상', '중', '하', '상중하', '상중', '중하', '최상', '최하',
  '우수', '미흡', '보통',
  // 명령/지시어
  '써', '써줘', '써주세요', '써봐', '써봐요', '쓰자', '쓰기', '써라',
  '작성', '작성해', '작성해줘', '작성해주세요', '작성합', '작성하기',
  '만들', '만들어', '만들어줘', '만들어주세요', '만들기',
  '정리', '정리해', '정리해줘', '정리해주세요', '정리하기',
  '요약', '요약해', '요약해줘', '요약해주세요',
  '해줘', '해주세요', '해', '하기',
  '부탁', '부탁해', '부탁드려요', '부탁드립니다',
  '보여줘', '보여', '보고', '볼래', '보여주세요',
  '알려줘', '알려', '알려주세요',
  '주세요', '주실',
  '뽑아', '뽑아줘', '뽑아주세요', '추첨', '추첨해', '추첨해줘',
  '실행', '실행해', '실행해줘',
  '열어', '열어줘', '열어주세요', '들어가', '들어가고', '가고',
  // 형식어
  '초안', '문장', '문구', '구절', '예', '예시', '샘플',
  '한줄', '두줄', '세줄', '네줄', '한문장', '두문장', '세문장',
  '씩', '명', '한명', '두명', '세명', '네명',
  '명씩', '한명씩', '두명씩', '세명씩',
  '줄씩', '한줄씩', '두줄씩', '세줄씩', '네줄씩',
  '각각', '여러', '여러분', '모든', '반', '반전체',
  // 도메인 어휘 (content 아님)
  '학생', '학생들', '학생명부', '명부', '명단',
  '기록', '기록된', '기록부', '기록물',
  '있는', '있어', '있어요', '있는데', '있고',
  '생기부', '생활기록부', '생활기록', '행발',
  '교과평가', '교과', '평가', '평가문장', '성취기준', '학년군',
  '안내문', '가정통신문', '통신문',
  '자서전', '편찬', '편찬실',
  '친구', '학우', '아이',
  '발표자', '랜덤', 'qr', '큐알', '큐알코드', 'qr코드',
  '관찰일지', '관찰', '관찰기록', '상담', '상담기록',
  '오늘의', '오늘', '이번', '저번', '지난',
  '창체', '동아리', '봉사', '체험활동',
  '키워드',
  // subject
  '국어', '수학', '사회', '과학', '영어', '도덕', '체육', '음악', '미술', '실과', '통합교과',
]);

// 자주 등장하는 조사 — 토큰 끝에서 한 번 떼어내 어간을 추출
const JOSA_RE = /(으로서|으로|로서|로써|에서는|에서도|에서|에게서|에게|에는|에도|에만|에|을|를|이|가|은|는|도|만|과|와|랑|이랑|의|까지|부터|마저|밖에|보다)$/;

function stripJosa(word) {
  if (!word) return '';
  return word.replace(JOSA_RE, '') || word;
}

function normalize(s) { return (s || '').replace(/[\s·]/g, '').toLowerCase(); }

const NUMERIC_FILLER_RE = /^\d+(번|줄|줄씩|명|명씩|등급|점)?$/;

function extractStudentNumbersInternal(text) {
  if (!text) return [];
  const nums = new Set();
  for (const m of text.matchAll(/(\d+)\s*번/g)) {
    const n = parseInt(m[1], 10);
    if (n > 0 && n <= 50) nums.add(n);
  }
  const commaMatch = text.match(/(\d+(?:\s*,\s*\d+)+)\s*번/);
  if (commaMatch) {
    commaMatch[1].split(',').forEach((s) => {
      const n = parseInt(s.trim(), 10);
      if (n > 0 && n <= 50) nums.add(n);
    });
  }
  return [...nums].sort((a, b) => a - b);
}

function parseLineCount(text) {
  if (!text) return null;
  const m = text.match(/(\d+)\s*줄/);
  if (m) return Math.max(1, Math.min(8, parseInt(m[1], 10)));
  if (/한\s*줄/.test(text)) return 1;
  if (/두\s*줄/.test(text)) return 2;
  if (/세\s*줄/.test(text)) return 3;
  if (/네\s*줄/.test(text)) return 4;
  if (/다섯\s*줄/.test(text)) return 5;
  return null;
}

function findDomain(text) {
  for (const r of DOMAIN_RULES) if (r.regex.test(text)) return r.id;
  return null;
}

function findAction(text) {
  for (const r of ACTION_RULES) if (r.regex.test(text)) return r.id;
  return null;
}

function parseUserInput(text) {
  const raw = (text || '').trim();
  const targetStudents = extractStudentNumbersInternal(raw);
  const studentNames = [];
  for (const m of raw.matchAll(/([가-힣]{2,4})\s*학생/g)) studentNames.push(m[1]);

  const subject = SUBJECT_LEXICON.find((s) => raw.includes(s)) || null;
  const area = AREA_LEXICON.find((a) => normalize(raw).includes(normalize(a))) || null;
  const lineCount = parseLineCount(raw);

  let domain = findDomain(raw);
  let domainConfidence = domain ? 0.8 : 0;
  if (!domain && subject) { domain = 'subject-evaluation'; domainConfidence = 0.6; }

  let action = findAction(raw);
  const actionExplicit = action !== null;
  if (domain === 'presenter-picker' && /(뽑아|추첨|랜덤)/.test(raw)) action = 'execute';
  if (!action) action = 'navigate';

  let multiStudent = targetStudents.length >= 2;
  if (!multiStudent) {
    const mn = raw.match(/(\d+)\s*명/);
    if (mn && parseInt(mn[1], 10) >= 2) multiStudent = true;
    if (/여러\s*학생|학생들|모든\s*학생|반\s*전체/.test(raw)) multiStudent = true;
  }

  // 토큰화 → content / filler 분리
  const cleaned = raw.replace(/[^\w가-힣\s,]/g, ' ');
  const parts = cleaned.split(/[\s,]+/).map((p) => p.trim()).filter(Boolean);
  const contentKeywords = [];
  const fillerWords = [];
  const seen = new Set();
  for (const p of parts) {
    const lower = p.toLowerCase();
    if (NUMERIC_FILLER_RE.test(lower) || /^\d+$/.test(lower)) { fillerWords.push(p); continue; }
    const stripped = stripJosa(p);
    if (!stripped || stripped.length < 2) { fillerWords.push(p); continue; }
    const slow = stripped.toLowerCase();
    if (FILLER_TOKEN_SET.has(slow) || FILLER_TOKEN_SET.has(lower)) { fillerWords.push(p); continue; }
    if (SUBJECT_LEXICON.includes(stripped)) { fillerWords.push(p); continue; }
    if (/^[a-z0-9]$/.test(slow)) { fillerWords.push(p); continue; }
    if (seen.has(slow)) continue;
    seen.add(slow);
    contentKeywords.push(stripped);
  }

  let confidence = domainConfidence;
  if (action !== 'navigate') confidence += 0.1;
  if (lineCount) confidence += 0.05;
  if (contentKeywords.length > 0) confidence += 0.1;
  if (targetStudents.length > 0) confidence += 0.05;
  if (subject) confidence += 0.05;
  confidence = Math.min(1, confidence);

  return {
    domain, action, actionExplicit, targetStudents, studentNames,
    subject, area, lineCount,
    contentKeywords, fillerWords,
    confidence, multiStudent,
  };
}

// direct 생성 허용 조건 — direct 3개 도메인은 우선순위로 시도.
// 명시적 비-generate 의도(보여줘/뭐 있지/열어줘 등)가 있을 때만 차단.
function canDirectGenerate(parsed) {
  if (!parsed || !DIRECT_OUTPUT_IDS.has(parsed.domain)) return false;
  if (parsed.multiStudent) return false;
  // 명시적으로 비-generate 의도가 매치된 경우만 차단 (lookup/help/navigate/execute가 명시 어휘로 매치)
  if (parsed.actionExplicit && parsed.action !== 'generate') return false;
  // subject-evaluation: 교과 미지정 시 안내 메시지가 자체 출력되므로 항상 direct 시도
  // life-records / creative-activities: 키워드 비어도 안전한 generic 템플릿으로 채움
  return true;
}

function directBlockReason(parsed) {
  if (!parsed) return null;
  if (parsed.multiStudent) return 'multiStudent';
  if (parsed.domain && !DIRECT_OUTPUT_IDS.has(parsed.domain)) return 'nonDirectDomain';
  if (parsed.actionExplicit && parsed.action !== 'generate') return 'nonGenerateAction';
  return null;
}

// ── 기존 시그니처 호환 wrapper (CAPABILITY_REGISTRY / generateLocalDraftAsync 등에서 호출)
function extractKeywords(text) { return parseUserInput(text).contentKeywords; }
function extractLineCount(text) { return parseLineCount(text); }
function extractStudentNumber(text) {
  const arr = extractStudentNumbersInternal(text);
  return arr.length ? arr[0] : null;
}
function hasMultipleStudents(text) { return parseUserInput(text).multiStudent; }
function hasGenerationIntent(normalized) {
  return /(써줘|써주세요|작성|만들|정리해|초안|뽑아|뽑기)/.test(normalized);
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

const SUBJECT_EVAL_TEMPLATES = {
  '국어': [
    '국어 활동에서 자신의 생각을 또렷하게 표현하며 수업에 꾸준히 참여함.',
    '친구의 말을 경청하고 상황에 맞게 의견을 말하며 의사소통 능력을 길러 가고 있음.',
    '글의 내용을 정확히 파악하며 자신의 경험과 관련지어 이해하는 능력을 보임.',
    '읽기와 쓰기 활동에 적극 참여하며 표현의 폭을 넓혀 가고 있음.',
  ],
  '수학': [
    '수와 연산의 의미를 이해하며 다양한 방법으로 문제를 해결함.',
    '풀이 과정을 논리적으로 설명하며 수학적 사고력을 보임.',
    '도형과 측정 활동에 흥미를 가지고 적극적으로 참여함.',
    '실생활 문제 상황에서 식을 세우고 답을 구하는 능력이 향상됨.',
  ],
  '영어': [
    '영어 듣기·말하기 활동에 자신감 있게 참여하며 표현하려 노력함.',
    '낯선 표현도 맥락을 살려 의미를 추측하며 사용하는 모습을 보임.',
    '간단한 문장을 정확히 읽고 쓰는 능력이 안정적으로 향상됨.',
    '바른 발음과 억양으로 영어를 즐겁게 익히는 태도를 보임.',
  ],
  '과학': [
    '관찰과 실험 활동에 적극적으로 참여하며 과학적 의문을 가짐.',
    '실험 결과를 정리하고 자신의 언어로 설명하는 능력을 보임.',
    '자연 현상에 관심을 가지고 탐구하는 태도를 꾸준히 보임.',
    '결과를 친구들과 공유하며 과학적으로 의사소통함.',
  ],
  '사회': [
    '사회 현상에 관심을 가지고 자신의 생각을 표현하며 수업에 참여함.',
    '자료를 활용해 다양한 관점에서 사고하는 능력을 기름.',
    '공동체 활동에 적극 참여하며 시민 의식을 키워 감.',
    '역사·지리 학습 내용을 자신의 언어로 정리하여 발표함.',
  ],
  '도덕': [
    '바른 생활 태도를 일상에서 실천하며 또래에게 좋은 모범이 됨.',
    '도덕적 판단의 의미를 이해하고 자신의 행동을 돌아보는 자세를 보임.',
    '친구를 배려하고 공동체 규칙을 지키려 노력함.',
    '감사·존중의 가치를 일상에서 실천함.',
  ],
  '체육': [
    '신체 활동에 즐겁게 참여하며 체력과 협동심을 길러 감.',
    '규칙을 지키며 상대를 존중하는 스포츠맨십을 보임.',
    '도전 과제에 끈기 있게 참여하며 자기 관리 능력을 기름.',
    '안전 수칙을 잘 지키며 활동에 임함.',
  ],
  '음악': [
    '음악 활동에 흥미를 가지고 다양한 표현 방법을 시도함.',
    '음악 요소를 이해하며 노래와 연주에 적극 참여함.',
    '친구들과 어울려 합창·합주 활동에 즐겁게 참여함.',
    '감상한 음악의 느낌을 자신의 언어로 표현함.',
  ],
  '미술': [
    '자신의 느낌과 생각을 다양한 방법으로 자유롭게 표현함.',
    '재료와 기법을 탐색하며 창의적인 결과물을 만듦.',
    '친구의 작품을 존중하며 감상하는 태도를 보임.',
    '주제에 맞는 표현 방법을 고민하며 작품을 완성함.',
  ],
  '실과': [
    '실생활 활동에 적극적으로 참여하며 책임감 있게 과제를 수행함.',
    '도구와 재료를 안전하게 사용하는 태도를 보임.',
    '가정·기술 활동에서 자기 관리 능력을 기름.',
    '실습 결과를 정리하고 친구와 공유하는 모습을 보임.',
  ],
  '통합교과': [
    '학교생활에 즐겁게 적응하며 기본 생활 습관을 익혀 감.',
    '주변을 관찰하고 호기심을 가지고 탐구함.',
    '다양한 놀이와 표현 활동에 적극 참여함.',
    '바른 생활 규칙을 알고 일상에서 실천함.',
  ],
};

const SUBJECT_NAMES = ['국어', '수학', '사회', '과학', '영어', '도덕', '체육', '음악', '미술', '실과', '통합교과'];

function generateSubjectEvalDraft(text, lineCount, multiStudents) {
  if (multiStudents) {
    return [
      'ℹ️ 여러 학생의 교과평가는 교과평가 탭에서 학생별로 나눠 작성하는 것이 정확해요.',
      '[교과평가 열기] 버튼으로 학생을 한 명씩 선택해 작성해 주세요.',
      '예시: "12번 학생 국어 평가문장 2줄 써줘"',
    ].join('\n');
  }
  const target = lineCount || 2;
  const matched = SUBJECT_NAMES.find((s) => text.includes(s));
  // 교과명도 없으면 안내
  if (!matched) {
    return [
      'ℹ️ 어느 교과의 평가문장을 만들지 알려주세요.',
      '예: 국어, 수학, 사회, 과학, 영어, 도덕, 체육, 음악, 미술, 실과, 통합교과',
    ].join('\n');
  }
  const lines = [...(SUBJECT_EVAL_TEMPLATES[matched] || [])];
  const out = lines.slice(0, target);
  while (out.length < target) {
    out.push('학습 활동에 꾸준히 참여하며 안정적인 태도를 보임.');
  }
  return out.map((s) => `- ${s}`).join('\n');
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

function generateLifeRecordDraft(keywords, lineCount, studentName, multiStudents) {
  // 다중 학생 요청 — 단일 direct 부적합, 탭 fallback 안내
  if (multiStudents) {
    return [
      'ℹ️ 여러 학생의 생활기록부는 학생별로 나눠 작성하는 것이 더 정확해요.',
      '[생활기록부 열기] 버튼으로 학생을 한 명씩 선택해 작성해 주세요.',
      '예시: "3번 학생 발표력, 책임감으로 생활기록부 3줄 작성해"',
    ].join('\n');
  }
  // 키워드 비어 있어도 direct 우선 정책 — fillers로 안전한 generic 문장 채움
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

const CREATIVE_ACT_TEMPLATES = [
  { match: /협동|협력|모둠/, line: '모둠 활동에서 친구들과 협력하며 맡은 역할을 끝까지 수행하는 모습을 보임.' },
  { match: /배려/, line: '친구의 입장을 살피며 따뜻한 말과 행동으로 배려를 실천함.' },
  { match: /자율|자율활동/, line: '학급 자율 활동에 주도적으로 참여하며 공동체 의식을 길러 감.' },
  { match: /동아리/, line: '동아리 활동에 꾸준히 참여하며 흥미와 적성을 깊이 있게 탐색함.' },
  { match: /봉사/, line: '봉사 활동에 자발적으로 참여하며 나눔과 책임의 가치를 실천함.' },
  { match: /진로/, line: '진로 활동에 적극 참여하며 자신의 흥미와 강점을 살펴보는 기회를 가짐.' },
  { match: /체험/, line: '체험 활동에 호기심을 가지고 적극적으로 참여하며 새로운 경험을 자신의 언어로 정리함.' },
  { match: /리더|리더십/, line: '활동에서 또래를 이끌며 자연스러운 리더십과 책임감을 보임.' },
  { match: /발표|표현/, line: '활동 결과를 친구들 앞에서 자신감 있게 발표하며 표현력을 길러 감.' },
  { match: /성실|노력/, line: '활동에 성실하게 임하며 꾸준한 노력으로 점차 성장하는 모습을 보임.' },
];

const CREATIVE_ACT_FILLERS = [
  '창의적 체험활동 전반에서 적극적이고 안정된 태도를 꾸준히 보임.',
  '활동 과정에서 친구들과 협력하며 공동체 의식을 길러 감.',
  '맡은 역할에 책임을 다하며 활동을 끝까지 마무리하는 자세를 보임.',
];

function pickCreativeActivityLine(kw) {
  for (const t of CREATIVE_ACT_TEMPLATES) if (t.match.test(kw)) return t.line;
  return `${kw}${josa(kw, '을를')} 중심으로 창의적 체험활동에 적극 참여하며 의미 있는 성장을 보임.`;
}

function generateCreativeActivityDraft(keywords, lineCount, multiStudents) {
  if (multiStudents) {
    return [
      'ℹ️ 여러 학생의 창체 평가문장은 창의적 체험활동 탭에서 학생별로 나눠 작성하는 것이 정확해요.',
      '[창의적 체험활동 열기] 버튼으로 학생을 한 명씩 선택해 작성해 주세요.',
      '예시: "3번 학생 협동, 배려 중심 창체 평가문장 4줄 써줘"',
    ].join('\n');
  }
  // 키워드 비어 있어도 direct 우선 정책 — fillers로 안전한 generic 문장 채움
  const target = lineCount || 4;
  const seen = new Set();
  const lines = [];
  for (const kw of keywords) {
    const s = pickCreativeActivityLine(kw);
    if (seen.has(s)) continue;
    seen.add(s); lines.push(s);
    if (lines.length >= target) break;
  }
  let fi = 0;
  while (lines.length < target && fi < CREATIVE_ACT_FILLERS.length) {
    const f = CREATIVE_ACT_FILLERS[fi++];
    if (!seen.has(f)) { seen.add(f); lines.push(f); }
  }
  return lines.slice(0, target).map((s) => `- ${s}`).join('\n');
}

async function generateLocalDraftAsync(text, primary, parsed) {
  if (!primary) return '';
  const p = parsed || parseUserInput(text);
  const id = primary.id;
  const lineCount = p.lineCount;
  const keywords = p.contentKeywords;
  const studentNum = p.targetStudents[0] || null;
  const wantStudent = hasStudentRosterSource(text);

  let studentName = null;
  let lookupNote = '';
  if (wantStudent && studentNum && !p.multiStudent) {
    const info = await fetchStudentByNumber(studentNum);
    if (info?.name) studentName = info.name;
    else lookupNote = `ℹ️ 학생명부에서 ${studentNum}번 학생 정보를 찾지 못해 일반 초안으로 작성했어요.`;
  }

  const withNote = (body) => lookupNote ? `${lookupNote}\n\n${body}` : body;

  // direct generation 허용 3개 탭만 — 나머지는 빈 문자열 → ResultPanel에서 탭 안내 fallback
  if (id === 'subject-evaluation') return generateSubjectEvalDraft(text, lineCount, p.multiStudent);
  if (id === 'life-records') return withNote(generateLifeRecordDraft(keywords, lineCount, studentName, p.multiStudent));
  if (id === 'creative-activities') return generateCreativeActivityDraft(keywords, lineCount, p.multiStudent);
  return '';
}

// direct 차단 사유에 따른 안내 메시지 (generic 문장 대신)
function directBlockMessage(parsed, primary) {
  const reason = directBlockReason(parsed);
  if (!reason) return '';
  const title = primary?.title || '관련 화면';
  if (reason === 'multiStudent') {
    return [
      `ℹ️ 여러 학생을 한 번에 작성하면 결과가 부정확해질 수 있어요.`,
      `[${title} 열기] 버튼에서 학생을 한 명씩 선택해 작성해 주세요.`,
    ].join('\n');
  }
  if (reason === 'noContent') {
    if (parsed.domain === 'life-records') {
      const who = parsed.targetStudents[0] ? `${parsed.targetStudents[0]}번 학생` : '학생';
      return [
        `ℹ️ ${who}에 대한 관찰 키워드를 함께 입력하면 더 정확한 생활기록부 문장을 만들 수 있어요.`,
        '예: 발표력, 책임감, 정리정돈, 협동, 예의범절',
        `[${title} 열기]에서 학생별로 이어 작성할 수도 있어요.`,
      ].join('\n');
    }
    if (parsed.domain === 'creative-activities') {
      return [
        'ℹ️ 어떤 활동/덕목 중심으로 만들지 키워드를 함께 입력해 주세요.',
        '예: 협동, 배려, 자율활동, 동아리, 봉사, 진로, 리더십',
      ].join('\n');
    }
    return 'ℹ️ 어떤 내용으로 만들지 키워드를 함께 입력해 주세요.';
  }
  if (reason === 'noSubject') {
    return [
      'ℹ️ 어느 교과의 평가문장을 만들지 알려주세요.',
      '예: 국어, 수학, 사회, 과학, 영어, 도덕, 체육, 음악, 미술, 실과, 통합교과',
    ].join('\n');
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
    labels: ['관찰일지', '관찰 일지', '상담 기록', '상담기록'],
    keywords: ['관찰일지', '관찰기록', '관찰 내용', '상담기록', '학부모', '갈등', '생활지도', '문제행동', '친구관계', '또래'],
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
    reason: '교과별 성취기준 기반 평가문장을 만들 수 있어요',
    labels: ['교과평가', '교과 평가', '평가문장'],
    keywords: ['교과평가', '교과', '성취기준', '학년군', '영역', '평가문장', '성취', '수행수준',
      '국어', '수학', '사회', '과학', '영어', '도덕', '체육', '음악', '미술', '실과', '통합교과',
      '듣기말하기', '듣기·말하기', '읽기', '쓰기', '수와 연산'],
    aliases: ['교과성적', '평가정리', '평가문장써', '교과평가써'] },
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
    reason: 'QR 배포는 전용 화면에서 코드 생성·링크 복사를 이어 설정할 수 있어요',
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
    setResponse('');
    setUsedModel('');
    setCapabilityResult(null);
    setIsLoading(true);

    const normalized = text.toLowerCase().replace(/\s+/g, '');

    try {
      // 1) 구조적 파싱 — 입력을 한 번에 domain/action/keywords/multiStudent 등으로 분해
      const parsed = parseUserInput(text);

      // 2) 라우팅 — LLM intent 우선, 실패 시 키워드 매칭 fallback
      const llmIntent = await parseIntentWithLLM(text);
      let route;
      if (llmIntent) {
        const fromLLM = intentToRouteInfo(llmIntent);
        if (fromLLM?.primary) route = fromLLM;
      }
      if (!route || !route.primary) {
        route = detectRoutesFromPrompt(text);
      }
      // parsed.domain이 명확한데 라우팅이 비었거나 다르면 parsed 우선 (한국어 패턴은 LLM보다 결정적)
      if (parsed.domain && parsed.domain !== route.primary?.id) {
        const overridden = KEYWORD_MAP.find((e) => e.id === parsed.domain);
        if (overridden) {
          route = {
            primary: { ...overridden, score: Math.max(route.primary?.score || 0, parsed.confidence * 10) },
            secondary: route.secondary || [],
            confidence: parsed.confidence >= 0.7 ? 'high' : parsed.confidence >= 0.4 ? 'medium' : 'low',
          };
        }
      }
      setRouteInfo(route);

      const isDirectCategory = route.primary && DIRECT_OUTPUT_IDS.has(route.primary.id);
      const isUnimplemented = route.primary && UNIMPLEMENTED_IDS.has(route.primary.id);
      const allowedDirect = canDirectGenerate(parsed);
      const llmMode = llmIntent?.mode;
      const wantsExec = parsed.action === 'execute' || parsed.action === 'lookup' || llmMode === 'execute' || llmMode === 'lookup';

      // 3) 실행 분기 — 파싱 기반 우선순위:
      //    a) 미구현 탭이면 결과창 보수 안내만
      //    b) direct 조건 모두 충족 → direct generation
      //    c) direct 도메인인데 조건 미달 → 안내 메시지(generic 생성 금지)
      //    d) capability 가능 → 실행
      //    e) 그 외 → ResultPanel workspace/탭 안내
      if (isUnimplemented) {
        // 미구현 — 어떤 입력이어도 안내만
      } else if (allowedDirect) {
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
        if (!aiResult.trim()) {
          const local = await generateLocalDraftAsync(text, route.primary, parsed);
          if (local) { setResponse(local); setUsedModel('local-template'); }
        }
      } else if (isDirectCategory && parsed.action === 'generate') {
        // direct 도메인 + 생성 의도지만 조건 미달 (내용 키워드/교과/단일학생 결여)
        const msg = directBlockMessage(parsed, route.primary);
        if (msg) { setResponse(msg); setUsedModel('local-guidance'); }
      } else if (wantsExec) {
        const cap = await tryInvokeCapability(route, normalized, text);
        if (cap) setCapabilityResult(cap);
      } else if (!isDirectCategory && parsed.action !== 'help' && parsed.action !== 'navigate') {
        const cap = await tryInvokeCapability(route, normalized, text);
        if (cap) setCapabilityResult(cap);
      }
      // 그 외 → ResultPanel이 workspace/탭 안내로 fallback
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

function CapabilityResult({ result, primary, onSelect }) {
  if (!result) return null;
  const FollowUp = ({ label, color = 'gray' }) => {
    if (!primary || !onSelect) return null;
    const palette = {
      purple: 'border-purple-200 text-purple-700 hover:border-purple-400 hover:text-purple-800',
      blue: 'border-blue-200 text-blue-700 hover:border-blue-400 hover:text-blue-800',
      amber: 'border-amber-200 text-amber-700 hover:border-amber-400 hover:text-amber-800',
      gray: 'border-gray-200 text-gray-700 hover:border-indigo-300 hover:text-indigo-700',
    }[color] || 'border-gray-200 text-gray-700';
    return (
      <button
        type="button"
        onClick={() => onSelect(primary)}
        className={`mt-2 inline-flex items-center gap-1 rounded-full bg-white border px-3 py-1 text-xs font-medium transition ${palette}`}
      >
        <span>{primary.emoji}</span>{label || `${primary.title} 열기`} →
      </button>
    );
  };

  if (result.type === 'random-presenter') {
    const s = result.student || {};
    const who = `${s.number ? `${s.number}번 ` : ''}${s.name || '학생'}`;
    return (
      <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-3">
        <p className="text-[11px] font-semibold tracking-wider text-purple-700 uppercase">실행 결과 · 발표자 추첨</p>
        <p className="mt-2 text-base sm:text-lg font-bold text-purple-900">
          🎤 오늘 발표자는 {who}이에요.
        </p>
        <p className="mt-1 text-[11px] text-purple-700/70">{result.total}명 중 무작위로 뽑았어요. 다시 뽑거나 수업 보조 도구로 이어서 사용할 수 있어요.</p>
        <FollowUp label="발표자 정하기 열기" color="purple" />
      </div>
    );
  }
  if (result.type === 'student-lookup') {
    const s = result.student;
    if (!s) {
      const q = result.queried || {};
      const who = `${q.num ? `${q.num}번 ` : ''}${q.name ? `${q.name} ` : ''}`.trim();
      return (
        <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-3">
          <p className="text-[11px] font-semibold tracking-wider text-blue-700 uppercase">실행 결과 · 학생 조회</p>
          <p className="mt-2 text-sm text-blue-900">{who ? `${who} 학생을 찾지 못했어요.` : '해당 학생을 찾지 못했어요.'}</p>
          <p className="mt-1 text-[11px] text-blue-700/70">학생명부에서 등록 여부를 확인할 수 있어요. (전체 {result.total}명)</p>
          <FollowUp label="학생명부 열기" color="blue" />
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
        <p className="mt-1.5 text-[11px] text-blue-700/70">학생명부에서 전체 명단과 출결을 같이 볼 수 있어요.</p>
        <FollowUp label="학생명부 열기" color="blue" />
      </div>
    );
  }
  if (result.type === 'autobiography-chapters') {
    return (
      <div className="rounded-xl border border-purple-200 bg-purple-50/40 p-3 space-y-2">
        <p className="text-[11px] font-semibold tracking-wider text-purple-700 uppercase">실행 결과 · 학생용 챕터 질문</p>
        <p className="text-[11px] text-purple-800/70 leading-relaxed">편찬실에서 챕터를 고르고 학생과 함께 질문에 답을 채워 가며 이어 쓸 수 있어요.</p>
        <ul className="space-y-1.5">
          {result.items.map((it, idx) => (
            <li key={`${it.chapter}-${idx}`} className="rounded-lg bg-white border border-purple-100 px-2.5 py-1.5">
              <p className="text-[11px] font-semibold text-purple-800">{it.chapter}</p>
              <p className="text-xs text-purple-900/80 leading-relaxed mt-0.5">{it.q}</p>
            </li>
          ))}
        </ul>
        <FollowUp label="자서전 편찬 열기" color="purple" />
      </div>
    );
  }
  if (result.type === 'meal-feed-preview') {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3 space-y-2">
        <p className="text-[11px] font-semibold tracking-wider text-amber-700 uppercase">실행 결과 · 이번 주 인기 급식</p>
        <p className="text-[11px] text-amber-800/70 leading-relaxed">최근 급식 사진과 학교별 응원 순위를 함께 볼 수 있어요.</p>
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
        <FollowUp label="오늘의 급식 전체 보기" color="amber" />
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
        바로 초안을 만들거나 알맞은 작업 화면으로 이어드려요.
      </p>
    );
  }

  // 2) 생성 중
  if (isLoading) {
    return (
      <div className="space-y-3">
        <RequestEcho text={submitted} primary={routeInfo.primary} />
        <div className="rounded-xl bg-gray-50 border border-gray-200 px-3 py-4 text-center text-sm text-gray-500">
          요청을 살펴보고 알맞은 결과를 준비하고 있어요...
        </div>
      </div>
    );
  }

  const hasResponse = !!(response && response.trim());
  const hasCapability = !!capabilityResult;
  const hasMainResult = hasResponse || hasCapability;
  const primaryTitle = routeInfo.primary?.title || '관련 탭';
  const isDirect = !!routeInfo.primary && DIRECT_OUTPUT_IDS.has(routeInfo.primary.id);
  const workspaceHint = routeInfo.primary ? WORKSPACE_HINTS[routeInfo.primary.id] : null;
  const unimplementedHint = routeInfo.primary ? UNIMPLEMENTED_HINTS[routeInfo.primary.id] : null;

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

      {hasCapability && (
        <CapabilityResult
          result={capabilityResult}
          primary={routeInfo.primary}
          onSelect={onSelect}
        />
      )}

      {!hasMainResult && routeInfo.primary && UNIMPLEMENTED_IDS.has(routeInfo.primary.id) && (
        <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3 space-y-2">
          <p className="text-[11px] font-semibold tracking-wider text-gray-600 uppercase">아직 준비 중이에요</p>
          <p className="text-sm text-gray-800 font-medium leading-snug">
            {unimplementedHint?.headline || `${primaryTitle} 기능은 아직 준비 중이에요`}
          </p>
          {unimplementedHint?.body && (
            <p className="text-xs text-gray-600 leading-relaxed">{unimplementedHint.body}</p>
          )}
          <button
            type="button"
            onClick={() => onSelect(routeInfo.primary)}
            className="inline-flex items-center gap-1 rounded-full bg-white border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:border-indigo-300 hover:text-indigo-700 transition"
          >
            <span>{routeInfo.primary.emoji}</span>{unimplementedHint?.cta || `${primaryTitle} 화면 열기`} →
          </button>
        </div>
      )}

      {hasMainResult && routeInfo.primary && (() => {
        const threshold = Math.max(4, (routeInfo.primary.score || 0) * 0.5);
        const relatedSecondary = (routeInfo.secondary || [])
          .filter((s) => (s.score || 0) >= threshold)
          .slice(0, 1);
        return (
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold tracking-wider text-indigo-700 uppercase">관련 작업</p>
            <div className="flex flex-wrap gap-1.5">
              <button type="button" onClick={() => onSelect(routeInfo.primary)}
                className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs font-semibold text-indigo-800 hover:bg-indigo-100 transition">
                <span>{routeInfo.primary.emoji}</span>{routeInfo.primary.title} 열기 →
              </button>
              {relatedSecondary.map((s) => (
                <button key={s.id} type="button" onClick={() => onSelect(s)}
                  className="inline-flex items-center gap-1 rounded-full bg-white border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-gray-700 hover:border-indigo-300 hover:text-indigo-700 transition">
                  <span>{s.emoji}</span>{s.title}
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      {!hasMainResult && routeInfo.confidence === 'high' && routeInfo.primary && !UNIMPLEMENTED_IDS.has(routeInfo.primary.id) && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-3 space-y-2">
          <p className="text-[11px] font-semibold tracking-wider text-indigo-700 uppercase">전용 화면에서 이어가요</p>
          <p className="text-sm text-gray-800 leading-relaxed">
            {workspaceHint?.why || routeInfo.primary.reason}
          </p>
          <button
            type="button"
            onClick={() => onSelect(routeInfo.primary)}
            className="inline-flex items-center gap-1 rounded-full bg-white border border-indigo-200 px-3 py-1 text-xs font-semibold text-indigo-800 hover:border-indigo-400 transition"
          >
            <span>{routeInfo.primary.emoji}</span>{workspaceHint?.cta || `${routeInfo.primary.title} 열기`} →
          </button>
          {routeInfo.secondary && routeInfo.secondary.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="text-[11px] text-gray-500">비슷한 작업:</span>
              {routeInfo.secondary.slice(0, 3).map((s) => (
                <button key={s.id} type="button" onClick={() => onSelect(s)}
                  className="inline-flex items-center gap-1 rounded-full bg-white border border-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-700 hover:border-indigo-300 hover:text-indigo-700 transition">
                  <span>{s.emoji}</span>{s.title}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {(routeInfo.confidence === 'medium' || routeInfo.confidence === 'low') && routeInfo.primary && (
        <DidYouMeanCard primary={routeInfo.primary} secondary={routeInfo.secondary} onSelect={onSelect} />
      )}

      {!routeInfo.primary && !hasResponse && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 space-y-2">
          <p className="text-xs text-amber-900 leading-relaxed">
            요청을 어느 작업으로 보낼지 정하지 못했어요. 자주 쓰는 작업 중에서 골라 보시거나, 키워드를 조금 더 구체적으로 적어 보세요.
          </p>
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
