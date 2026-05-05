import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import client from '../api/client';

const VALID_TABS = ['student', 'teacher'];

const TEACHER_ROLE_OPTIONS = [
  { value: '담임교사', label: '담임교사' },
  { value: '전담교사', label: '전담교사 (과목 선택)' },
  { value: '교감', label: '교감' },
  { value: '교장', label: '교장' },
];

const SUBJECT_OPTIONS = [
  '국어', '수학', '영어', '사회', '과학', '도덕', '음악', '미술', '체육',
  '실과', '정보', '역사', '기술·가정', '한문', '제2외국어',
];
const STUDENT_LINKAGE_OPTIONS = [
  { key: 'radioStory', label: '라디오 사연 보내기' },
  { key: 'careClassroom', label: '돌봄교실' },
  { key: 'schedule', label: '학사일정' },
  { key: 'studentRecords', label: '학생명부' },
  { key: 'lifeRecords', label: '생활기록부' },
  { key: 'subjectEvaluation', label: '교과평가' },
  { key: 'observationJournal', label: '관찰일지' },
  { key: 'todayMeal', label: '오늘의 급식' },
];

const TEACHER_LINKAGE_OPTIONS = [
  { key: 'careClassroom', label: '돌봄교실' },
  { key: 'schedule', label: '학사일정' },
  { key: 'studentRecords', label: '학생명부' },
  { key: 'lifeRecords', label: '생활기록부' },
  { key: 'subjectEvaluation', label: '교과평가' },
  { key: 'observationJournal', label: '관찰일지' },
  { key: 'todayMeal', label: '오늘의 급식' },
];

const INITIAL_TEACHER_FORM = {
  teacherName: '',
  teacherRole: '담임교사',
  subject: '',
  focus: '',
};

// ─── 연간 자서전 질문 (장별 3개, 객관식/주관식 혼합) ───
// type: 'objective'(객관식) | 'subjective'(주관식) | 'mixed'(객관식+주관식 보충)
const TEACHER_QUESTIONS = [
  { id: 'tq1a', chapter: 0, type: 'objective', text: '올해를 시작할 때 어떤 마음이었나요?', choices: [
    { value: 'hopeful', label: '기대와 설렘' }, { value: 'anxious', label: '걱정과 불안' }, { value: 'tired', label: '이미 지침' }, { value: 'determined', label: '다짐과 의지' }, { value: 'neutral', label: '담담함' },
  ]},
  { id: 'tq1b', chapter: 0, type: 'mixed', text: '올해의 나는 어떤 교사가 되고 싶었나요?', choices: [
    { value: 'warm', label: '따뜻한 교사' }, { value: 'professional', label: '전문적인 교사' }, { value: 'balanced', label: '균형 잡힌 교사' }, { value: 'surviving', label: '버티는 교사' },
  ]},
  { id: 'tq1c', chapter: 0, type: 'subjective', text: '올해 학교생활을 한마디로 표현하면 무엇인가요?' },
  { id: 'tq2a', chapter: 1, type: 'objective', text: '올해 학교에서 내가 놓인 환경은 어땠나요?', choices: [
    { value: 'heavy', label: '업무 과중' }, { value: 'conflict', label: '갈등이 많았음' }, { value: 'supportive', label: '지지적인 환경' }, { value: 'isolated', label: '고립된 느낌' }, { value: 'chaotic', label: '혼란스러움' },
  ]},
  { id: 'tq2b', chapter: 1, type: 'mixed', text: '올해의 배경이 된 학교 분위기나 업무 상황은 어땠나요?', choices: [
    { value: 'admin', label: '행정업무에 지침' }, { value: 'class', label: '학급 운영이 힘듦' }, { value: 'relation', label: '인간관계가 어려움' }, { value: 'ok', label: '나름 괜찮았음' },
  ]},
  { id: 'tq2c', chapter: 1, type: 'subjective', text: '올해를 힘들게 만든 구조적 배경은 무엇이었나요?' },
  { id: 'tq3a', chapter: 2, type: 'objective', text: '올해 초반 가장 먼저 마주한 현실은 무엇이었나요?', choices: [
    { value: 'newclass', label: '새 학급 구성' }, { value: 'curriculum', label: '교육과정 준비' }, { value: 'parents', label: '학부모 대응' }, { value: 'colleagues', label: '동료 관계' }, { value: 'paperwork', label: '서류/행정' },
  ]},
  { id: 'tq3b', chapter: 2, type: 'mixed', text: '올해 초반 가장 많은 에너지를 쏟은 일은 무엇이었나요?', choices: [
    { value: 'class-mgmt', label: '학급 운영' }, { value: 'lesson-prep', label: '수업 준비' }, { value: 'student-care', label: '학생 돌봄' }, { value: 'admin-work', label: '행정 업무' },
  ]},
  { id: 'tq3c', chapter: 2, type: 'subjective', text: '학기 초 가장 긴장했던 일은 무엇이었나요?' },
  { id: 'tq4a', chapter: 3, type: 'objective', text: '시간이 지나며 어떤 업무에 익숙해졌나요?', choices: [
    { value: 'routine', label: '일상 루틴' }, { value: 'teaching', label: '수업 흐름' }, { value: 'admin-adapt', label: '행정 처리' }, { value: 'relations', label: '관계 맺기' }, { value: 'nothing', label: '아직 익숙하지 않음' },
  ]},
  { id: 'tq4b', chapter: 3, type: 'mixed', text: '처음엔 버거웠지만 나중엔 감당 가능해진 것은 무엇인가요?', choices: [
    { value: 'workload', label: '업무량 조절' }, { value: 'emotion', label: '감정 조절' }, { value: 'speed', label: '업무 속도' }, { value: 'boundaries', label: '경계 설정' },
  ]},
  { id: 'tq4c', chapter: 3, type: 'subjective', text: '올해 중반 이후 적응했다고 느낀 지점은 무엇인가요?' },
  { id: 'tq5a', chapter: 4, type: 'objective', text: '올해 나를 가장 지치게 한 관계는 무엇이었나요?', choices: [
    { value: 'parents-rel', label: '학부모와의 관계' }, { value: 'colleague-rel', label: '동료 교사 관계' }, { value: 'admin-rel', label: '관리자와의 관계' }, { value: 'student-rel', label: '학생과의 관계' }, { value: 'none', label: '관계로 지치진 않았음' },
  ]},
  { id: 'tq5b', chapter: 4, type: 'mixed', text: '올해 가장 위로가 되었던 사람, 말, 장면은 무엇이었나요?', choices: [
    { value: 'colleague-comfort', label: '동료에게 위로받음' }, { value: 'student-moment', label: '학생에게서 힘 얻음' }, { value: 'family', label: '가족의 지지' }, { value: 'self-care', label: '나만의 회복 시간' },
  ]},
  { id: 'tq5c', chapter: 4, type: 'subjective', text: '학교 안에서 내가 기대거나 의지했던 존재가 있었나요?' },
  { id: 'tq6a', chapter: 5, type: 'objective', text: '올해 내가 가장 크게 책임을 느꼈던 일은 무엇이었나요?', choices: [
    { value: 'class-resp', label: '학급 담임 역할' }, { value: 'student-issue', label: '특정 학생 문제' }, { value: 'school-event', label: '학교 행사 담당' }, { value: 'records', label: '기록/평가 업무' }, { value: 'everything', label: '모든 것' },
  ]},
  { id: 'tq6b', chapter: 5, type: 'mixed', text: '결국 내가 감당해야 한다고 느낀 일은 무엇인가요?', choices: [
    { value: 'alone', label: '혼자 해결해야 했음' }, { value: 'role', label: '역할이 나에게 집중됨' }, { value: 'emotional', label: '감정적 부담' }, { value: 'structural', label: '구조적 한계' },
  ]},
  { id: 'tq6c', chapter: 5, type: 'subjective', text: '교사로서 놓지 못했던 역할은 무엇이었나요?' },
  { id: 'tq7a', chapter: 6, type: 'objective', text: '올해 가장 크게 흔들렸던 순간은 언제였나요?', choices: [
    { value: 'burnout', label: '번아웃이 왔을 때' }, { value: 'conflict-event', label: '갈등 상황' }, { value: 'doubt', label: '교사로서의 의문' }, { value: 'health', label: '건강/체력 한계' }, { value: 'external', label: '외부 압력' },
  ]},
  { id: 'tq7b', chapter: 6, type: 'mixed', text: '다시 버티게 된 전환점은 무엇이었나요?', choices: [
    { value: 'someone', label: '누군가의 한마디' }, { value: 'student-change', label: '학생의 변화' }, { value: 'rest', label: '쉬는 시간' }, { value: 'mindset', label: '마음가짐 전환' }, { value: 'nothing-yet', label: '아직 찾지 못함' },
  ]},
  { id: 'tq7c', chapter: 6, type: 'subjective', text: '올해 나를 바꾼 사건이나 시기는 무엇이었나요?' },
  { id: 'tq8a', chapter: 7, type: 'objective', text: '지금 돌아보면 올해의 나는 어떤 교사였나요?', choices: [
    { value: 'dedicated', label: '최선을 다한 교사' }, { value: 'survivor', label: '버텨낸 교사' }, { value: 'grower', label: '성장한 교사' }, { value: 'tired-teacher', label: '지친 교사' }, { value: 'seeker', label: '답을 찾는 교사' },
  ]},
  { id: 'tq8b', chapter: 7, type: 'mixed', text: '올해를 지나며 달라진 점은 무엇인가요?', choices: [
    { value: 'patience', label: '인내심이 늘었음' }, { value: 'realistic', label: '현실적이 됨' }, { value: 'soft', label: '유연해짐' }, { value: 'hard', label: '단단해짐' }, { value: 'unclear', label: '잘 모르겠음' },
  ]},
  { id: 'tq8c', chapter: 7, type: 'subjective', text: '지금 내게 가장 깊게 남은 감정은 무엇인가요?' },
  { id: 'tq9a', chapter: 8, type: 'objective', text: '내년의 나는 어떤 모습이면 좋겠나요?', choices: [
    { value: 'calmer', label: '더 여유로운 교사' }, { value: 'healthier', label: '건강을 챙기는 교사' }, { value: 'braver', label: '도전하는 교사' }, { value: 'boundaries', label: '선 긋는 교사' }, { value: 'same', label: '지금 그대로' },
  ]},
  { id: 'tq9b', chapter: 8, type: 'mixed', text: '앞으로도 지키고 싶은 태도는 무엇인가요?', choices: [
    { value: 'sincerity', label: '진심을 다하는 것' }, { value: 'learning', label: '배움을 멈추지 않는 것' }, { value: 'self-first', label: '나를 먼저 챙기는 것' }, { value: 'connection', label: '사람과의 연결' },
  ]},
  { id: 'tq9c', chapter: 8, type: 'subjective', text: '후배 교사에게 남기고 싶은 현실적인 말은 무엇인가요?' },
  { id: 'tq10a', chapter: 9, type: 'subjective', text: '올해의 나에게 남기고 싶은 말은 무엇인가요?' },
  { id: 'tq10b', chapter: 9, type: 'subjective', text: '내년의 나에게 건네고 싶은 한마디는 무엇인가요?' },
  { id: 'tq10c', chapter: 9, type: 'subjective', text: '마지막 문장에 꼭 넣고 싶은 말은 무엇인가요?' },
];

const CHOICE_SENTENCES = {
  tq1a: {
    hopeful: ['새로운 학년을 맞이하며 올해는 무언가 달라지리라는 기대를 품었다.', '설레는 마음으로 교실 문을 열었던 그 첫날의 공기가 아직도 기억난다.', '올해는 좋은 일이 많을 것 같다는 막연한 희망이 발걸음을 가볍게 했다.', '새 출발이라는 말이 올해만큼은 진짜로 느껴졌다.', '기대 반 설렘 반으로 시작된 올해의 첫날이 아직도 선명하다.'],
    anxious: ['새 학년이 시작될 때마다 찾아오는 걱정은 올해도 어김없이 찾아왔다.', '아직 만나지 못한 아이들 앞에서 괜히 마음이 무거웠다.', '올해도 잘 해낼 수 있을까 하는 불안이 조용히 따라붙었다.', '준비를 아무리 해도 부족한 느낌이 올해 초를 지배했다.', '새 학년의 시작은 항상 긴장의 연속이었고 올해도 다르지 않았다.'],
    tired: ['올해가 시작되기도 전에 이미 에너지가 바닥난 느낌이었다.', '새 학년이라는 말이 설렘보다 피로로 먼저 다가왔다.', '시작점에서부터 지쳐 있었다는 것을 인정하는 데 시간이 걸렸다.', '작년의 피로가 채 가시기도 전에 올해가 시작됐다.', '쉬지 못한 채 맞이한 새 학년은 무겁게만 느껴졌다.'],
    determined: ['올해만큼은 다르게 해보겠다는 다짐으로 새 학년을 열었다.', '작년의 후회를 반복하지 않겠다는 의지가 올해의 출발점이었다.', '스스로 세운 목표를 지키겠다는 마음으로 첫발을 내디뎠다.', '올해는 흔들리지 않겠다는 결심이 새 학년의 시작이었다.', '다짐 하나를 가슴에 품고 교실로 향한 첫날이 기억난다.'],
    neutral: ['특별한 감정 없이, 해야 할 일을 하겠다는 마음으로 시작했다.', '담담하게 새 학년을 맞이했고, 그것이 오히려 편안했다.', '큰 기대도 걱정도 없이 일상의 연장처럼 시작된 한 해였다.', '올해도 어김없이 찾아온 새 학년을 묵묵히 받아들였다.', '평범한 시작이 오히려 마음을 가볍게 해주었다.'],
  },
  tq1b: {
    warm: ['아이들에게 따뜻한 한마디를 건네는 교사가 되고 싶었다.', '교실에서 아이들이 안심할 수 있는 존재가 되고 싶었다.'],
    professional: ['수업의 전문성을 높이고 싶다는 마음이 올해의 시작이었다.', '교사로서 역량을 키우는 데 집중하고 싶었다.'],
    balanced: ['일과 삶 사이에서 균형을 잡는 교사가 되고 싶었다.', '무리하지 않으면서도 최선을 다하는 교사가 되고 싶었다.'],
    surviving: ['올해는 버티는 것만으로도 충분하다고 스스로에게 말했다.', '무사히 한 해를 마치는 것이 올해의 가장 큰 목표였다.'],
  },
  tq2a: {
    heavy: ['올해는 업무의 무게가 유독 크게 느껴지는 한 해였다.', '끝없이 쌓이는 업무 앞에서 하루하루가 빠듯했다.'],
    conflict: ['학교 안 곳곳에서 크고 작은 갈등이 끊이지 않았다.', '서로 다른 입장이 부딪히는 일이 올해 유독 잦았다.'],
    supportive: ['동료와 관리자의 지지 속에서 올해를 보낼 수 있었다.', '서로 도우며 일할 수 있는 환경이 올해의 큰 힘이었다.'],
    isolated: ['주변에 기댈 곳 없이 혼자라는 느낌이 올해를 관통했다.', '같은 학교에 있으면서도 외로운 순간이 많았다.'],
    chaotic: ['예측할 수 없는 상황이 반복되며 혼란 속에 한 해가 흘렀다.', '계획대로 되는 일이 거의 없었던 정신없는 한 해였다.'],
  },
  tq2b: {
    admin: ['반복되는 행정업무 속에서 하루의 에너지가 빠르게 소진되곤 했다.', '수업보다 행정이 더 크게 느껴지는 날에는 마음의 여유를 잃기 쉬웠다.', '끝없이 이어지는 서류와 기록 앞에서 스스로 메말라간다고 느낀 날도 있었다.', '해야 할 일은 쌓이는데 정작 중요한 것에 집중하기 어려운 시간이 많았다.', '업무를 해내는 것과 버텨내는 것이 같은 뜻처럼 느껴졌던 순간도 있었다.'],
    class: ['학급 운영의 무게가 어깨를 짓누르는 한 해였다.', '30명의 아이들 각자의 이야기를 담아내기엔 하루가 너무 짧았다.', '학급을 안정시키는 데 올해의 대부분의 에너지를 쏟아야 했다.', '아이들 한 명 한 명을 챙기는 일이 보람이면서 동시에 무게였다.', '교실 안의 모든 상황이 결국 나의 몫이라는 사실이 벅찰 때가 있었다.'],
    relation: ['사람과의 관계에서 오는 피로가 업무보다 더 큰 무게로 다가왔다.', '말 한마디에 상처받고, 또 말 한마디에 회복하는 하루가 반복됐다.', '관계의 온도를 맞추는 일이 올해 가장 어려운 과제 중 하나였다.', '서로 다른 기대 사이에서 균형을 잡는 일이 쉽지 않았다.', '사람 사이의 미묘한 긴장이 하루를 더 길게 느끼게 만들었다.'],
    ok: ['올해는 나름 감당할 만한 환경 속에서 일할 수 있었다.', '큰 어려움 없이 한 해를 보낼 수 있었던 것에 감사한다.', '평탄한 한 해가 주는 안정감이 올해의 가장 큰 선물이었다.', '특별히 힘든 일 없이 무사히 지나가는 것도 감사한 일이었다.', '올해의 환경은 나를 지치게 하지 않았고 그것만으로 충분했다.'],
  },
  tq3a: {
    newclass: ['새 반 아이들의 얼굴을 하나씩 익히는 것이 올해 첫 번째 과제였다.', '낯선 이름들을 부르며 서로를 알아가는 시간이 올해의 시작이었다.'],
    curriculum: ['교육과정을 새로 짜는 일이 학기 초의 대부분을 차지했다.', '수업 준비와 계획 수립에 첫 달을 온전히 쏟았다.'],
    parents: ['학기 초부터 학부모 상담과 소통이 큰 비중을 차지했다.', '학부모의 기대와 우려를 마주하는 일이 올해 초반의 현실이었다.'],
    colleagues: ['새로운 동료들과의 관계를 형성하는 것이 올해 초반의 과제였다.', '함께 일할 사람들과의 호흡을 맞추는 데 시간이 필요했다.'],
    paperwork: ['학기 초부터 쏟아지는 서류 처리가 올해의 첫 관문이었다.', '행정 서류 더미 속에서 올해가 시작되었다.'],
  },
  tq3b: {
    'class-mgmt': ['학급을 안정시키는 데 올해 초반의 모든 에너지를 쏟았다.', '아이들과 함께 만드는 교실 문화에 정성을 다했다.'],
    'lesson-prep': ['수업 하나를 준비하는 데 들이는 시간과 노력이 올해는 유독 컸다.', '아이들 앞에서 좋은 수업을 하겠다는 마음이 매일의 동력이었다.'],
    'student-care': ['한 명 한 명의 학생을 세심하게 살피는 데 가장 많은 마음을 썼다.', '수업 못지않게 아이들의 마음을 돌보는 일에 에너지를 쏟았다.'],
    'admin-work': ['수업 외 업무에 쏟는 시간이 올해 초반의 대부분이었다.', '행정 업무에 밀려 수업 준비가 뒷전이 되는 날이 잦았다.'],
  },
  tq4a: {
    routine: ['반복되는 일상 속에서 나만의 루틴이 생기기 시작했다.', '매일의 흐름이 익숙해지면서 마음에도 여유가 찾아왔다.'],
    teaching: ['수업의 흐름을 잡는 데 자신감이 붙기 시작했다.', '아이들의 반응을 읽고 수업을 조절하는 감각이 생겼다.'],
    'admin-adapt': ['반복되는 행정 처리에 손이 빨라지기 시작했다.', '서류 앞에서 당황하지 않게 된 것이 올해의 작은 성장이었다.'],
    relations: ['사람들과의 거리감을 조절하는 법을 조금씩 배워갔다.', '관계에서 오는 에너지 소모를 줄이는 방법을 찾기 시작했다.'],
    nothing: ['시간이 흘러도 쉽게 익숙해지지 않는 것들이 있었다.', '적응이라는 말이 아직은 먼 이야기처럼 느껴졌다.'],
  },
  tq4b: {
    workload: ['한때 감당할 수 없었던 업무량을 어느새 소화하고 있는 나를 발견했다.', '일의 우선순위를 정하는 법을 배우면서 숨통이 트이기 시작했다.'],
    emotion: ['감정의 파도를 다스리는 법을 조금씩 익혀갔다.', '마음이 흔들릴 때 스스로를 잡는 방법을 찾은 것이 올해의 성과였다.'],
    speed: ['처음에는 한참 걸리던 일들이 점점 빠르게 처리되기 시작했다.', '속도가 붙으면서 여유가 생기고, 그 여유가 다시 힘이 되었다.'],
    boundaries: ['나를 지키기 위한 선을 긋는 법을 배워가고 있다.', '모든 것을 떠안지 않아도 된다는 것을 올해 비로소 알게 되었다.'],
  },
  tq5a: {
    'parents-rel': ['학부모와의 관계에서 오는 긴장이 올해 가장 큰 감정적 소모였다.', '서로 다른 기대 사이에서 중심을 잡는 일이 힘겨웠다.'],
    'colleague-rel': ['동료 교사와의 관계가 올해 예상 외로 큰 에너지를 소모시켰다.', '함께 일해야 하는 사람과의 온도 차이가 피로감을 키웠다.'],
    'admin-rel': ['관리자와의 관계에서 오는 압박이 올해의 가장 큰 스트레스였다.', '위에서 내려오는 요구와 현실 사이에서 끊임없이 조율해야 했다.'],
    'student-rel': ['한 학생과의 관계가 올해의 가장 큰 감정적 짐이 되었다.', '아이를 이해하고 싶으면서도 지치는 날이 반복됐다.'],
    none: ['올해는 관계로 인한 소모가 비교적 적은 편이었다.', '사람과의 관계에서 큰 어려움 없이 한 해를 보낼 수 있었다.'],
  },
  tq5b: {
    'colleague-comfort': ['바쁜 일상 속에서도 동료의 짧은 한마디가 오래 버틸 힘이 되어주었다.', '같은 자리에 선 동료의 이해는 올해를 버텨내는 데 큰 위로가 되었다.', '힘든 날마다 건네받은 작은 공감이 다시 마음을 추슬러 세우게 했다.', '누군가 내 상황을 설명하지 않아도 알아준다는 사실이 큰 힘이 되었다.', '혼자가 아니라는 감각은 생각보다 오래 마음을 지탱해주었다.'],
    'student-moment': ['아이들의 순수한 한마디가 지친 마음을 다시 일으켜 세웠다.', '교실에서 마주한 작은 변화가 올해의 가장 큰 보상이었다.', '예상하지 못한 순간에 학생들의 말과 태도가 큰 위로가 되어주었다.', '말보다 장면으로 남은 학생들의 온기가 오래 마음에 머물렀다.', '결국 다시 교실로 돌아오게 만드는 이유는 학생들 곁에 있었다.'],
    family: ['학교 밖에서 가족이 건네는 일상적 위로가 하루를 마감하는 힘이었다.', '가족의 존재가 흔들리는 나를 잡아주는 닻이 되어주었다.', '학교 밖의 따뜻한 일상이 지친 마음을 회복시켜주었다.', '집에 돌아왔을 때 느끼는 안도감이 매일의 버팀이었다.', '가족과 함께하는 평범한 시간이 가장 큰 충전이었다.'],
    'self-care': ['나만의 회복 시간을 지키는 것이 올해를 버티는 방법이었다.', '잠깐이라도 나를 위한 시간을 만드는 것이 가장 큰 위로였다.', '스스로를 돌보는 시간을 허락한 것이 올해의 가장 중요한 결정이었다.', '멈추어도 괜찮다는 것을 배운 후 다시 걸을 수 있었다.', '나를 먼저 챙기는 것이 이기적인 일이 아님을 올해 비로소 알았다.'],
  },
  tq6a: {
    'class-resp': ['담임으로서 30명의 한 해를 책임져야 한다는 무게는 올해도 가볍지 않았다.', '학급의 모든 일이 결국 나의 책임이라는 사실이 올해를 무겁게 만들었다.'],
    'student-issue': ['특정 학생의 문제를 끝까지 안고 간 것이 올해의 가장 큰 책임이었다.', '한 아이를 놓지 않기 위해 모든 에너지를 쏟아야 했던 시간이 있었다.'],
    'school-event': ['학교 행사의 기획과 진행이 올해 가장 크게 느낀 책임이었다.', '행사 뒤에 남는 피로보다 무사히 마쳤다는 안도가 더 컸다.'],
    records: ['기록과 평가에 대한 책임이 올해 가장 큰 부담이었다.', '한 줄의 기록이 아이의 미래에 영향을 줄 수 있다는 사실이 무거웠다.'],
    everything: ['학급의 모든 것이 나의 책임처럼 느껴진 한 해였다.', '교실 안팎의 모든 일이 결국 나에게 돌아온다는 감각이 올해를 관통했다.'],
  },
  tq7a: {
    burnout: ['몸도 마음도 더 이상 움직이지 않는 날이 찾아왔다.', '번아웃이라는 단어가 남의 이야기가 아닌 내 이야기가 된 순간이었다.'],
    'conflict-event': ['예기치 못한 갈등이 올해의 가장 큰 전환점이 되었다.', '부딪힘 속에서 내가 무엇을 지키고 싶은지 처음으로 선명해졌다.'],
    doubt: ['교사라는 자리에 대한 근본적 의문이 찾아온 시기가 있었다.', '이 일을 계속해도 되는 걸까 하는 물음이 깊어진 순간이 있었다.'],
    health: ['몸이 먼저 한계를 알려왔을 때 비로소 멈추어야 한다는 걸 알았다.', '건강이 흔들리면서 일의 의미보다 삶의 의미를 다시 생각하게 되었다.'],
    external: ['외부에서 오는 압력이 내면의 균형을 무너뜨린 시기가 있었다.', '통제할 수 없는 상황 앞에서 무력감을 느낀 것이 올해의 가장 큰 흔들림이었다.'],
  },
  tq7b: {
    someone: ['누군가의 진심 어린 한마디가 다시 일어설 힘이 되었다.', '잊힐 법한 짧은 말 한마디가 올해를 버티게 한 전환점이었다.'],
    'student-change': ['아이의 작은 변화를 목격한 순간, 포기하지 않길 잘했다는 생각이 들었다.', '한 학생의 성장이 지쳐있던 나에게 다시 의미를 찾게 해주었다.'],
    rest: ['쉬는 시간을 허락한 것이 올해의 가장 중요한 전환이었다.', '멈추어도 괜찮다는 것을 배운 후 다시 걸을 수 있었다.'],
    mindset: ['생각을 바꾸는 것만으로도 하루의 무게가 달라질 수 있었다.', '완벽하지 않아도 된다는 마음이 나를 다시 세워주었다.'],
    'nothing-yet': ['아직 명확한 전환점을 찾지 못한 채 올해를 보내고 있다.', '버팀의 이유를 아직 찾는 중이고, 그 과정도 기록으로 남기고 싶다.'],
  },
  tq8a: {
    dedicated: ['돌아보면 올해의 나는 최선을 다한 교사였다고 믿고 싶다.', '부족함이 있었지만, 그 안에서 할 수 있는 최선을 놓지 않았다.'],
    survivor: ['올해의 나는 버텨낸 교사였다. 그것만으로도 충분히 의미 있었다.', '화려하지 않았지만, 끝까지 자리를 지킨 것이 올해의 나였다.'],
    grower: ['올해의 나는 조금씩 성장한 교사였다고 말할 수 있다.', '작은 변화들이 모여 올해의 나를 한 뼘 더 키워주었다.'],
    'tired-teacher': ['솔직히 올해의 나는 지친 교사였다. 그리고 그것을 인정한다.', '지쳐 있었지만 교실을 떠나지 않은 것도 하나의 용기였다.'],
    seeker: ['올해의 나는 답을 찾는 중인 교사였다.', '정답은 없었지만 질문을 멈추지 않은 것이 올해의 나였다.'],
  },
  tq8b: {
    patience: ['올해를 지나며 기다리는 법을 조금 더 배웠다.', '참는 것이 아니라 기다리는 것이라는 차이를 알게 된 한 해였다.'],
    realistic: ['이상보다 현실을 먼저 보게 된 것이 올해의 가장 큰 변화였다.', '할 수 있는 것과 할 수 없는 것의 경계를 알게 되었다.'],
    soft: ['날카로웠던 마음이 조금 둥글어진 것을 느낀다.', '유연하게 대처하는 법을 올해 비로소 배워가고 있다.'],
    hard: ['흔들리지 않기 위해 마음을 단단하게 만드는 법을 배웠다.', '올해의 경험이 나를 더 강하게 만들었다고 믿는다.'],
    unclear: ['달라진 것이 무엇인지 아직 선명하지 않지만, 무언가 달라졌다는 감각은 있다.', '변화의 윤곽이 서서히 드러나고 있는 중이다.'],
  },
  tq9a: {
    calmer: ['내년에는 조금 더 여유로운 마음으로 교실에 서고 싶다.', '급하지 않게, 나의 속도로 가는 교사가 되고 싶다.', '바쁜 일상 속에서도 한숨 돌릴 수 있는 교사가 되고 싶다.', '학생들을 더 차분하게 바라볼 수 있는 여유를 갖고 싶다.', '서두르지 않고도 단단하게 하루를 이끄는 교사가 되고 싶다.'],
    healthier: ['내년에는 나의 건강을 먼저 챙기는 교사가 되고 싶다.', '몸과 마음이 건강해야 아이들도 돌볼 수 있다는 것을 올해 배웠다.', '오래 버티기 위해서는 스스로를 챙기는 일이 먼저라는 걸 잊지 않고 싶다.', '바쁜 학교 일상 속에서도 나를 돌보는 시간을 꼭 지키고 싶다.', '건강해야 더 오래 학생들 곁에 설 수 있다는 마음으로 살아가고 싶다.'],
    braver: ['내년에는 더 과감하게 도전하는 교사가 되고 싶다.', '올해 움츠렸던 만큼 내년에는 한 발 더 나아가고 싶다.', '익숙함에 머무르기보다 새로운 시도를 두려워하지 않는 교사가 되고 싶다.', '작은 변화라도 먼저 시작할 수 있는 용기를 가진 교사가 되고 싶다.', '매년 조금씩이라도 새롭게 배우고 도전하는 교사로 살고 싶다.'],
    boundaries: ['내년에는 나를 지키는 선을 더 분명히 긋고 싶다.', '모든 것을 떠안지 않는 용기를 내년에는 더 키우고 싶다.', '모든 일을 끌어안기보다 필요한 선을 분명히 긋는 교사가 되고 싶다.', '지치지 않기 위해 나를 지키는 선을 세울 수 있는 교사가 되고 싶다.', '무조건 견디기보다 건강한 거리감을 지킬 줄 아는 사람이 되고 싶다.'],
    same: ['내년에도 지금의 나처럼, 묵묵히 자리를 지키는 교사이고 싶다.', '특별히 달라지지 않아도, 오늘의 나를 이어가는 것으로 충분하다.', '크게 달라지기보다 지금의 진심을 지켜가는 교사가 되고 싶다.', '흔들리더라도 결국 지금의 나를 잃지 않는 한 해가 되었으면 한다.', '거창한 변화보다 지금 가진 좋은 결을 지켜내고 싶다.'],
  },
  tq9b: {
    sincerity: ['진심을 다해 마주하는 태도를 앞으로도 놓지 않고 싶다.', '진정성은 가장 느리지만 가장 깊은 힘이라는 것을 올해 배웠다.'],
    learning: ['배움을 멈추지 않는 교사로 남고 싶다.', '새로운 것을 배우는 즐거움이 교사로서의 활력을 유지해준다.'],
    'self-first': ['나를 먼저 돌보는 것이 이기적인 것이 아님을 앞으로도 기억하고 싶다.', '스스로를 챙기는 것이 결국 교실을 지키는 일이라는 것을 잊지 않겠다.'],
    connection: ['사람과의 연결을 소중히 여기는 태도를 앞으로도 지키고 싶다.', '혼자가 아니라는 감각을 잃지 않는 것이 앞으로의 목표이다.'],
  },
};

const STUDENT_QUESTIONS = [
  { id: 'sq1a', chapter: 0, text: '올해를 시작할 때 어떤 마음이었나요?' },
  { id: 'sq1b', chapter: 0, text: '올해 학교에서 가장 기대했던 것은 무엇이었나요?' },
  { id: 'sq1c', chapter: 0, text: '올해를 한마디로 표현하면 무엇인가요?' },
  { id: 'sq2a', chapter: 1, text: '올해 나의 학교, 반 분위기는 어땠나요?' },
  { id: 'sq2b', chapter: 1, text: '올해 나를 둘러싼 환경 중 기억나는 것은 무엇인가요?' },
  { id: 'sq2c', chapter: 1, text: '올해 학교생활의 배경이 된 특별한 상황이 있었나요?' },
  { id: 'sq3a', chapter: 2, text: '학기 초에 가장 먼저 겪은 일은 무엇이었나요?' },
  { id: 'sq3b', chapter: 2, text: '올해 초반 가장 긴장되거나 설렜던 순간은 언제인가요?' },
  { id: 'sq3c', chapter: 2, text: '학기 초에 가장 어려웠던 것은 무엇이었나요?' },
  { id: 'sq4a', chapter: 3, text: '학교생활에 익숙해진 것은 언제쯤이었나요?' },
  { id: 'sq4b', chapter: 3, text: '처음엔 어려웠지만 나중엔 잘하게 된 것이 있나요?' },
  { id: 'sq4c', chapter: 3, text: '학교에서 편해졌다고 느낀 순간은 언제인가요?' },
  { id: 'sq5a', chapter: 4, text: '올해 가장 좋았던 친구 관계는 무엇이었나요?' },
  { id: 'sq5b', chapter: 4, text: '올해 함께해서 즐거웠던 활동이나 사람은 누구인가요?' },
  { id: 'sq5c', chapter: 4, text: '친구나 선생님과의 관계에서 기억에 남는 장면은 무엇인가요?' },
  { id: 'sq6a', chapter: 5, text: '올해 내가 맡았던 역할 중 기억에 남는 것은 무엇인가요?' },
  { id: 'sq6b', chapter: 5, text: '내가 책임감을 느꼈던 순간은 언제인가요?' },
  { id: 'sq6c', chapter: 5, text: '나에게 맡겨진 일 중 끝까지 해낸 것은 무엇인가요?' },
  { id: 'sq7a', chapter: 6, text: '올해 나에게 일어난 가장 큰 변화는 무엇인가요?' },
  { id: 'sq7b', chapter: 6, text: '힘들었지만 결국 성장하게 된 경험이 있나요?' },
  { id: 'sq7c', chapter: 6, text: '올해 나를 바꾼 사건이나 순간은 무엇인가요?' },
  { id: 'sq8a', chapter: 7, text: '올해를 떠올리면 가장 먼저 생각나는 장면은 무엇인가요?' },
  { id: 'sq8b', chapter: 7, text: '지금의 나는 올해 초와 어떻게 달라졌나요?' },
  { id: 'sq8c', chapter: 7, text: '올해 가장 뿌듯했던 순간은 언제인가요?' },
  { id: 'sq9a', chapter: 8, text: '앞으로 하고 싶은 것이 있나요?' },
  { id: 'sq9b', chapter: 8, text: '내년에 되고 싶은 모습은 어떤 모습인가요?' },
  { id: 'sq9c', chapter: 8, text: '앞으로도 계속하고 싶은 것은 무엇인가요?' },
  { id: 'sq10a', chapter: 9, text: '올해의 나에게 해주고 싶은 말이 있다면 무엇인가요?' },
  { id: 'sq10b', chapter: 9, text: '내년의 나에게 건네고 싶은 한마디는 무엇인가요?' },
  { id: 'sq10c', chapter: 9, text: '마지막으로 꼭 남기고 싶은 말은 무엇인가요?' },
];

const FOLLOW_UP_RULES = [
  { keywords: ['힘들', '지쳤', '버거', '고됐', '벅찼', '어려'], questions: ['어떤 점이 가장 버거웠나요?', '그 시기를 버티게 한 작은 힘이 있었나요?'] },
  { keywords: ['학생', '아이들', '반 아이', '우리 반', '친구'], questions: ['어떤 학생(친구)이 가장 기억에 남나요?', '그 관계에서 배운 점이 있나요?'] },
  { keywords: ['생활기록부', '생기부', '기록'], questions: ['기록 과정에서 가장 어려운 부분은 무엇이었나요?'] },
  { keywords: ['수업', '교과', '발표', '활동'], questions: ['그 활동에서 가장 보람찼던 순간은 언제였나요?'] },
  { keywords: ['후회', '아쉬', '미안'], questions: ['그때 다시 돌아간다면 어떻게 하고 싶나요?'] },
  { keywords: ['변화', '달라', '성장', '배웠'], questions: ['그 변화를 알아차린 순간이 있었나요?'] },
  { keywords: ['행사', '체험', '운동회', '소풍'], questions: ['그 행사에서 가장 기억에 남는 장면은 무엇인가요?'] },
];

function generateFollowUps(answer) {
  if (!answer || answer.trim().length < 5) return [];
  const lower = answer.toLowerCase();
  const matched = [];
  for (const rule of FOLLOW_UP_RULES) {
    if (rule.keywords.some(kw => lower.includes(kw))) matched.push(...rule.questions);
  }
  if (matched.length === 0) matched.push('그 상황을 조금 더 이야기해줄 수 있나요?');
  return matched.slice(0, 2);
}

// ─── 빠른 생성 모드 핵심 질문 ───
const QUICK_QUESTIONS = [
  { id: 'qq1', text: '올해 가장 버거웠던 일은 무엇이었나요?',
    chapters: [1, 2, 3, 5, 6],
    choices: [
      { value: 'admin', label: '행정업무' }, { value: 'records', label: '생활기록부' },
      { value: 'counseling', label: '상담' }, { value: 'parents', label: '학부모 응대' },
      { value: 'lesson', label: '수업 준비' }, { value: 'relations', label: '관계 조율' },
    ],
  },
  { id: 'qq2', text: '그럼에도 올해를 버티게 한 힘은 무엇이었나요?',
    chapters: [3, 4, 6, 7, 8],
    choices: [
      { value: 'students', label: '학생' }, { value: 'colleagues', label: '동료 교사' },
      { value: 'duty', label: '책임감' }, { value: 'family', label: '가족' },
      { value: 'routine', label: '익숙한 루틴' }, { value: 'achievement', label: '성취감' },
    ],
  },
  { id: 'qq3', text: '올해를 가장 잘 보여주는 장면 하나를 적어주세요.',
    chapters: [0, 7, 8, 9],
    choices: [],
  },
];

const QUICK_SENTENCES = {
  qq1: {
    admin: ['반복되는 행정업무에 하루의 에너지가 빠르게 소진되곤 했다.', '수업보다 행정이 더 크게 느껴지는 날이 잦았다.'],
    records: ['생활기록부 시즌이 다가올수록 마음이 무거워졌다.', '기록의 무게가 올해 가장 큰 부담이었다.'],
    counseling: ['상담 과정에서 오는 감정 소모가 올해 가장 컸다.', '아이들의 이야기를 들으며 내 마음도 함께 흔들렸다.'],
    parents: ['학부모와의 소통에서 오는 긴장이 올해 큰 짐이었다.', '서로 다른 기대 사이에서 균형을 잡기가 쉽지 않았다.'],
    lesson: ['매일의 수업을 준비하는 데 올해는 유독 많은 에너지가 필요했다.', '수업 하나를 만드는 데 들이는 시간이 올해는 더 길게 느껴졌다.'],
    relations: ['학교 안 관계 조율에 올해 가장 많은 에너지를 썼다.', '사람 사이에서 중심을 잡는 일이 올해 가장 힘겨운 과제였다.'],
  },
  qq2: {
    students: ['아이들의 순수한 한마디가 지친 마음을 다시 일으켜 세웠다.', '교실에서 마주한 작은 변화가 올해의 가장 큰 보상이었다.'],
    colleagues: ['동료의 짧은 한마디가 오래 버틸 힘이 되어주었다.', '같은 자리에 선 동료의 이해가 올해를 버텨내는 큰 위로가 되었다.'],
    duty: ['교사라는 책임감이 흔들리는 나를 잡아주는 닻이었다.', '아이들 앞에 서야 한다는 사실이 매일 나를 일으켜 세웠다.'],
    family: ['학교 밖 가족의 일상적 위로가 하루를 마감하는 힘이었다.', '가족의 존재가 흔들리는 나를 지탱해주는 버팀목이었다.'],
    routine: ['매일 반복되는 익숙한 흐름 속에서 안정을 찾았다.', '루틴이 주는 예측 가능함이 올해 나를 지킨 방식이었다.'],
    achievement: ['작은 성취가 쌓이며 포기하지 않을 이유가 만들어졌다.', '무언가를 해냈다는 감각이 다음 날을 시작하게 만들었다.'],
  },
};

const SOURCE_CHAPTER_KEYWORDS = {
  studentRecords: ['학생', '친구', '반', '이름'],
  lifeRecords: ['기록', '생기부', '생활기록'],
  careClassroom: ['돌봄', '방과후'],
  schedule: ['일정', '행사', '체험', '운동회'],
  subjectEvaluation: ['평가', '시험', '성적', '교과'],
  observationJournal: ['관찰', '상담'],
};

// ─── 고정 챕터 구조 (연간 자서전) ───
const FIXED_CHAPTERS = [
  { id: 'opening', title: '시작하는 글', period: '올해를 여는 마음', placeholder: '올해의 전체 분위기와 시작점을 정리하는 프롤로그입니다.' },
  { id: 'environment', title: '올해의 환경과 현실', period: '환경과 분위기', placeholder: '올해의 조건, 학교 분위기, 업무 현실을 설명합니다.' },
  { id: 'early', title: '학교생활의 초반', period: '시작과 긴장', placeholder: '연초 적응기, 첫 업무, 초반의 긴장과 몰입을 담습니다.' },
  { id: 'settling', title: '익숙해지는 과정', period: '적응과 버팀', placeholder: '적응 과정, 업무 루틴 형성, 버티는 방식이 생긴 흐름을 담습니다.' },
  { id: 'relations', title: '관계와 사람들', period: '위로와 소모', placeholder: '사람과 관계, 소모와 회복, 학교 안의 정서적 연결을 담습니다.' },
  { id: 'responsibility', title: '책임감과 역할', period: '끝까지 맡은 자리', placeholder: '책임, 역할 의식, 교사로서의 자리를 기록합니다.' },
  { id: 'turning', title: '전환의 순간', period: '다시 버티게 한 계기', placeholder: '감정의 전환점, 회복 계기, 올해의 결정적 변화를 담습니다.' },
  { id: 'present', title: '지금의 나', period: '올해를 지난 모습', placeholder: '현재 자기 인식, 올해의 나 정리, 감정의 압축을 담습니다.' },
  { id: 'future', title: '앞으로의 마음', period: '내년을 향한 시선', placeholder: '미래 시선, 다음 해를 향한 다짐, 후배/동료에게 남기는 말을 담습니다.' },
  { id: 'closing', title: '맺는 글', period: '올해를 닫으며', placeholder: '에필로그, 올해의 마무리, 마지막 문장을 정리합니다.' },
];

// ─── 블록 관련 상수 ───
const SOURCE_LABELS = {
  radioStory: '라디오 사연',
  careClassroom: '돌봄교실',
  schedule: '학사일정',
  studentRecords: '학생명부',
  lifeRecords: '생활기록부',
  subjectEvaluation: '교과평가',
  observationJournal: '관찰일지',
  todayMeal: '오늘의 급식',
  'ai-generated': 'AI 생성',
};

const SOURCE_TO_CHAPTERS = {
  radioStory: ['intro', 'relations'],
  studentRecords: ['intro', 'background'],
  lifeRecords: ['early', 'settling', 'relations'],
  careClassroom: ['relations', 'responsibility'],
  subjectEvaluation: ['early', 'responsibility'],
  observationJournal: ['responsibility', 'turning'],
  schedule: ['present'],
  todayMeal: ['present'],
};

let _blockIdCounter = 0;
const generateBlockId = () => `blk_${Date.now()}_${++_blockIdCounter}`;

function createBlock(type, text, source = null, sourceLabel = null) {
  return {
    id: generateBlockId(),
    type,
    source,
    sourceLabel: sourceLabel || (source ? SOURCE_LABELS[source] || source : null),
    originalText: text,
    currentText: text,
  };
}

function formatSourceItem(source, item) {
  switch (source) {
    case 'studentRecords':
      return `${item.number ? item.number + '번 ' : ''}${item.name || ''}`.trim();
    case 'lifeRecords':
      return typeof item === 'string' ? item : (item.content || item.comment || item.record || JSON.stringify(item));
    case 'careClassroom': {
      const parts = [item.date];
      if (item.mood) parts.push(`기분: ${item.mood}`);
      if (item.todos) parts.push(`활동: ${item.todos}`);
      if (item.events) parts.push(item.events);
      return parts.join(' | ');
    }
    case 'schedule':
      return typeof item === 'string' ? item : (item.title || item.event || item.description || JSON.stringify(item));
    case 'subjectEvaluation':
      return typeof item === 'string' ? item : (item.achievement || item.description || item.comment || JSON.stringify(item));
    case 'todayMeal':
      return typeof item === 'string' ? item : (item.menu || item.name || JSON.stringify(item));
    case 'radioStory':
      return typeof item === 'string' ? item : (item.content || item.story || JSON.stringify(item));
    default:
      return typeof item === 'string' ? item : JSON.stringify(item);
  }
}

function importSourceBlocks(sourceData) {
  const chapterBlocksMap = {};
  FIXED_CHAPTERS.forEach(ch => { chapterBlocksMap[ch.id] = []; });

  if (!sourceData) return chapterBlocksMap;

  for (const [sourceKey, items] of Object.entries(sourceData)) {
    if (!Array.isArray(items) || items.length === 0) continue;
    const targetChapters = SOURCE_TO_CHAPTERS[sourceKey] || ['present'];
    const label = SOURCE_LABELS[sourceKey] || sourceKey;

    items.forEach((item, idx) => {
      const text = formatSourceItem(sourceKey, item);
      if (!text || text.trim().length < 2) return;
      const targetChapter = targetChapters[idx % targetChapters.length];
      if (chapterBlocksMap[targetChapter]) {
        chapterBlocksMap[targetChapter].push(createBlock('linked', text, sourceKey, label));
      }
    });
  }

  return chapterBlocksMap;
}

function createBlocksFromAIContent(text) {
  if (!text) return [];
  return text.split('\n').filter(l => l.trim()).map(line =>
    createBlock('linked', line.trim(), 'ai-generated', 'AI 생성')
  );
}

// ─── 메인 컴포넌트 ───
function AutobiographyCompilation() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentPrompt, setStudentPrompt] = useState('');
  const [teacherPrompt, setTeacherPrompt] = useState('');
  const [teacherForm, setTeacherForm] = useState(INITIAL_TEACHER_FORM);
  const [registeredName, setRegisteredName] = useState('');
  const [nameMode, setNameMode] = useState('registered');
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [response, setResponse] = useState('');
  const [usedModel, setUsedModel] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [chapterOrder, setChapterOrder] = useState(() => FIXED_CHAPTERS.map((_, i) => i));
  const [dragIdx, setDragIdx] = useState(null);
  const [isSourcePickerOpen, setIsSourcePickerOpen] = useState(false);
  const [lastSourceData, setLastSourceData] = useState(null);
  const [questionAnswers, setQuestionAnswers] = useState(() => {
    try { const s = localStorage.getItem('autobio_questionAnswers'); return s ? JSON.parse(s) : {}; } catch { return {}; }
  });
  const [followUpAnswers, setFollowUpAnswers] = useState(() => {
    try { const s = localStorage.getItem('autobio_followUpAnswers'); return s ? JSON.parse(s) : {}; } catch { return {}; }
  });
  const [followUps, setFollowUps] = useState(() => {
    try { const s = localStorage.getItem('autobio_followUps'); return s ? JSON.parse(s) : {}; } catch { return {}; }
  });
  const [isQuestionsOpen, setIsQuestionsOpen] = useState(false);
  const [expandedQ, setExpandedQ] = useState(null);
  const [genMode, setGenMode] = useState('quick'); // 'quick' | 'detailed'
  const [quickAnswers, setQuickAnswers] = useState(() => {
    try { const s = localStorage.getItem('autobio_quickAnswers'); return s ? JSON.parse(s) : {}; } catch { return {}; }
  });
  const [quickChoices, setQuickChoices] = useState(() => {
    try { const s = localStorage.getItem('autobio_quickChoices'); return s ? JSON.parse(s) : {}; } catch { return {}; }
  });

  useEffect(() => { localStorage.setItem('autobio_questionAnswers', JSON.stringify(questionAnswers)); }, [questionAnswers]);
  useEffect(() => { localStorage.setItem('autobio_followUpAnswers', JSON.stringify(followUpAnswers)); }, [followUpAnswers]);
  useEffect(() => { localStorage.setItem('autobio_followUps', JSON.stringify(followUps)); }, [followUps]);
  useEffect(() => { localStorage.setItem('autobio_quickAnswers', JSON.stringify(quickAnswers)); }, [quickAnswers]);
  useEffect(() => { localStorage.setItem('autobio_quickChoices', JSON.stringify(quickChoices)); }, [quickChoices]);
  const [selectedSources, setSelectedSources] = useState({
    radioStory: false,
    careClassroom: false,
    schedule: false,
    studentRecords: false,
    lifeRecords: false,
    subjectEvaluation: false,
    observationJournal: false,
    todayMeal: false,
  });

  const activeTab = VALID_TABS.includes(searchParams.get('tab'))
    ? searchParams.get('tab')
    : 'student';

  useEffect(() => {
    if (!VALID_TABS.includes(searchParams.get('tab'))) {
      setSearchParams({ tab: 'student' }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const fetchStudents = async () => {
      setIsLoadingStudents(true);
      try {
        const res = await client.get('/api/students');
        const list = Array.isArray(res.data) ? res.data : [];
        const cleaned = list
          .filter((student) => student && typeof (student.student_id ?? student.id) !== 'undefined')
          .map((student) => ({
            id: String(student.student_id ?? student.id),
            number: student.number,
            name: student.name || '',
          }))
          .sort((a, b) => Number(a.number || 0) - Number(b.number || 0));

        setStudents(cleaned);
        if (cleaned.length > 0) {
          setSelectedStudentId((current) => current || cleaned[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch students', error);
        setErrorMsg('학생 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
      } finally {
        setIsLoadingStudents(false);
      }
    };

    fetchStudents();

    const userId = localStorage.getItem('userId');
    if (userId) {
      client.get('/api/account', { params: { userId } })
        .then(res => {
          if (res.data?.name) {
            setRegisteredName(res.data.name);
            setTeacherForm(prev => prev.teacherName ? prev : { ...prev, teacherName: res.data.name });
          }
        })
        .catch(() => {});
    }
  }, []);

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === selectedStudentId) || null,
    [students, selectedStudentId],
  );
  const isAllSourcesSelected = Object.values(selectedSources).every(Boolean);

  const setTab = (tab) => {
    setSearchParams({ tab });
    setErrorMsg('');
    setResponse('');
    setUsedModel('');
  };

  const toggleSource = (key) => {
    setSelectedSources((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleAllSources = () => {
    const nextValue = !isAllSourcesSelected;
    setSelectedSources({
      radioStory: nextValue,
      careClassroom: nextValue,
      schedule: nextValue,
      studentRecords: nextValue,
      lifeRecords: nextValue,
      subjectEvaluation: nextValue,
      observationJournal: nextValue,
      todayMeal: nextValue,
    });
  };

  const handleTeacherFieldChange = (key, value) => {
    setTeacherForm((prev) => ({ ...prev, [key]: value }));
  };

  const getPromptByTab = () => (activeTab === 'student' ? studentPrompt : teacherPrompt);

  const collectSourceData = async () => {
    const data = {};

    if (selectedSources.careClassroom) {
      try {
        const raw = localStorage.getItem('careClassroomRecords');
        const records = raw ? JSON.parse(raw) : {};
        const entries = Object.entries(records)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, rec]) => {
            const todos = Array.isArray(rec.todos)
              ? rec.todos.filter((t) => t.text?.trim()).map((t) => `${t.done ? '✓' : '○'} ${t.text}`).join(', ')
              : '';
            const mood = rec.customMood?.trim() || rec.mood || '';
            const events = rec.importantEvents?.trim() || '';
            return { date, mood, todos, events };
          })
          .filter((e) => e.mood || e.todos || e.events);
        data.careClassroom = entries;
      } catch {
        data.careClassroom = [];
      }
    }

    if (selectedSources.schedule) {
      try {
        const res = await client.get('/api/schedules');
        data.schedule = Array.isArray(res.data) ? res.data.slice(0, 30) : [];
      } catch {
        data.schedule = [];
      }
    }

    if (selectedSources.studentRecords) {
      try {
        const res = await client.get('/api/students');
        data.studentRecords = Array.isArray(res.data)
          ? res.data.map((s) => ({ number: s.number, name: s.name }))
          : [];
      } catch {
        data.studentRecords = [];
      }
    }

    if (selectedSources.lifeRecords) {
      try {
        const res = await client.get('/api/liferecords?action=keywords&query=');
        data.lifeRecords = Array.isArray(res.data) ? res.data.slice(0, 20) : [];
      } catch {
        data.lifeRecords = [];
      }
    }

    if (selectedSources.subjectEvaluation) {
      try {
        const res = await client.get('/api/achievements');
        data.subjectEvaluation = Array.isArray(res.data) ? res.data.slice(0, 20) : [];
      } catch {
        data.subjectEvaluation = [];
      }
    }

    if (selectedSources.todayMeal) {
      try {
        const res = await client.get('/api/meals');
        data.todayMeal = Array.isArray(res.data?.items) ? res.data.items.slice(0, 10) : [];
      } catch {
        data.todayMeal = [];
      }
    }

    if (selectedSources.observationJournal) {
      data.observationJournal = [];
    }

    return data;
  };

  const handleGenerate = async (event) => {
    event.preventDefault();

    const prompt = getPromptByTab().trim();

    if (activeTab === 'student' && !selectedStudentId) {
      setErrorMsg('학생 탭에서는 학생을 먼저 선택해주세요.');
      return;
    }

    // 빠른 모드: 핵심 질문 답변만으로도 생성 가능
    const hasQuickAnswers = QUICK_QUESTIONS.some(q => quickAnswers[q.id]?.trim() || quickChoices[q.id]);
    if (!prompt && !hasQuickAnswers) {
      setErrorMsg('요청 내용을 입력하거나 핵심 질문에 답변해주세요.');
      return;
    }

    setIsGenerating(true);
    setErrorMsg('');

    try {
      const sourceData = await collectSourceData();
      setLastSourceData(sourceData);

      // 빠른 모드 답변 반영
      let quickText = '';
      if (genMode === 'quick' || hasQuickAnswers) {
        const parts = QUICK_QUESTIONS.map(q => {
          const choice = quickChoices[q.id];
          const ans = quickAnswers[q.id]?.trim();
          const choiceLabel = choice ? q.choices.find(c => c.value === choice)?.label : '';
          const sentences = QUICK_SENTENCES[q.id]?.[choice] || [];
          const sentence = sentences.length > 0 ? sentences[Date.now() % sentences.length] : '';
          if (!choice && !ans) return '';
          return `질문: ${q.text}\n${choiceLabel ? `선택: ${choiceLabel}\n` : ''}${sentence ? `제안: ${sentence}\n` : ''}${ans ? `답변: ${ans}` : ''}`;
        }).filter(Boolean);
        if (parts.length > 0) quickText = '\n\n─── 핵심 질문 답변 ───\n' + parts.join('\n\n');
      }

      // 정밀 모드 질문 답변 반영
      const questions = activeTab === 'student' ? STUDENT_QUESTIONS : TEACHER_QUESTIONS;
      const qaText = questions
        .filter(q => questionAnswers[q.id]?.trim())
        .map(q => {
          let text = `질문: ${q.text}\n답변: ${questionAnswers[q.id].trim()}`;
          const fups = followUps[q.id] || [];
          fups.forEach((fu, i) => {
            const fa = followUpAnswers[`${q.id}_${i}`];
            if (fa?.trim()) text += `\n심화: ${fu}\n답변: ${fa.trim()}`;
          });
          return text;
        })
        .join('\n\n');
      const detailedText = qaText ? '\n\n─── 장별 질문 답변 ───\n' + qaText : '';
      const fullPrompt = (prompt || '올해의 교사 자서전을 작성해주세요.') + quickText + detailedText;

      const payload = {
        tab: activeTab,
        version: activeTab,
        prompt: fullPrompt,
        student_id: selectedStudent ? Number(selectedStudent.id) : null,
        student_name: selectedStudent?.name || '',
        student_number: selectedStudent?.number || '',
        teacher_name: teacherForm.teacherName.trim(),
        teacher_role: teacherForm.teacherRole.trim(),
        teacher_focus: teacherForm.focus.trim(),
        source_data: sourceData,
        selected_sources: Object.keys(selectedSources).filter((k) => selectedSources[k]),
      };

      const res = await client.post('/api/autobiography', payload);
      setResponse(extractGeneratedText(res.data));
      setUsedModel(res.data?.ai_model || res.data?.model || '');
    } catch (error) {
      console.error('Failed to generate autobiography compilation', error);
      setErrorMsg('자서전 편찬 생성 중 오류가 발생했습니다. 다시 시도해주세요.');
      setResponse('');
      setUsedModel('');
    } finally {
      setIsGenerating(false);
    }
  };

  const currentOptions = activeTab === 'student' ? STUDENT_LINKAGE_OPTIONS : TEACHER_LINKAGE_OPTIONS;
  const selectedCount = Object.values(selectedSources).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📚 자서전 편찬</h1>
          <div className="mt-1 text-sm text-gray-500">
            입력된 자료를 참고하여 자서전을 편찬합니다.
          </div>
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="text-primary-600 hover:text-primary-900 font-medium shrink-0"
        >
          &larr; 홈으로
        </button>
      </div>

      {/* 탭 토글 */}
      <div className="bg-white shadow rounded-lg p-1.5 grid grid-cols-2 gap-1.5">
        {[
          { id: 'student', icon: '🎙', label: '학생', sub: '라디오 사연 + @', color: 'bg-sky-600' },
          { id: 'teacher', icon: '👩‍🏫', label: '선생님', sub: '돌봄교실 + @', color: 'bg-purple-600' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => { setTab(t.id); setIsSourcePickerOpen(false); }}
            className={`rounded-md px-3 py-2.5 text-sm font-semibold transition-colors text-center ${
              activeTab === t.id ? `${t.color} text-white shadow-sm` : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <div>{t.icon} {t.label} 자서전</div>
            <div className="text-xs opacity-70 mt-0.5">({t.sub})</div>
          </button>
        ))}
      </div>

      {errorMsg ? (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 text-sm">{errorMsg}</div>
      ) : null}

      <form onSubmit={handleGenerate} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-6 space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-medium text-gray-900">입력 설정</h2>
              <p className="mt-1 text-sm text-gray-500">
                {activeTab === 'student'
                  ? '학생 관점의 자서전 초안을 생성합니다.'
                  : '선생님 관찰과 지도 관점을 반영한 자서전 초안을 생성합니다.'}
              </p>
            </div>
            {isGenerating ? (
              <button
                type="button"
                onClick={() => { window.__abortAutobiography?.(); }}
                className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md shadow-sm text-red-600 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-400 whitespace-nowrap"
              >
                생성 중단
              </button>
            ) : (
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 whitespace-nowrap"
              >
                생성하기 (Ctrl+Enter)
              </button>
            )}
          </div>

          {/* 연동 자료 섹션 */}
          <div className={`rounded-xl border-2 p-4 ${activeTab === 'student' ? 'border-sky-100 bg-sky-50/40' : 'border-amber-100 bg-amber-50/40'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-700">🔗 연동 자료</span>
                {selectedCount > 0 && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${activeTab === 'student' ? 'bg-sky-600 text-white' : 'bg-amber-500 text-white'}`}>
                    {selectedCount}개 선택됨
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsSourcePickerOpen((p) => !p)}
                className={`text-xs px-3 py-1 rounded-full border font-medium transition ${
                  activeTab === 'student'
                    ? 'border-sky-300 text-sky-700 hover:bg-sky-100'
                    : 'border-amber-300 text-amber-700 hover:bg-amber-100'
                }`}
              >
                {isSourcePickerOpen ? '접기 ▲' : '항목 선택 ▼'}
              </button>
            </div>

            {selectedCount > 0 && !isSourcePickerOpen && (
              <div className="flex flex-wrap gap-1.5">
                {currentOptions.filter((o) => selectedSources[o.key]).map((o) => (
                  <span
                    key={o.key}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                      activeTab === 'student' ? 'bg-sky-100 text-sky-800' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {o.label}
                    <button type="button" onClick={() => toggleSource(o.key)} className="opacity-60 hover:opacity-100 font-bold">×</button>
                  </span>
                ))}
              </div>
            )}

            {selectedCount === 0 && !isSourcePickerOpen && (
              <p className="text-xs text-gray-400">항목을 선택하면 자서전 생성 시 해당 데이터가 함께 전달됩니다.</p>
            )}

            {isSourcePickerOpen && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {currentOptions.map((option) => (
                  <label
                    key={option.key}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                      selectedSources[option.key]
                        ? activeTab === 'student'
                          ? 'border-sky-400 bg-sky-50 text-sky-800 font-medium'
                          : 'border-amber-400 bg-amber-50 text-amber-800 font-medium'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSources[option.key] || false}
                      onChange={() => toggleSource(option.key)}
                      className="h-4 w-4 rounded"
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
                <label className={`col-span-2 flex cursor-pointer items-center gap-2 rounded-lg border-2 px-3 py-2 text-sm font-semibold transition ${
                  isAllSourcesSelected
                    ? activeTab === 'student' ? 'border-sky-500 bg-sky-100 text-sky-900' : 'border-amber-500 bg-amber-100 text-amber-900'
                    : 'border-dashed border-gray-300 text-gray-500 hover:bg-gray-50'
                }`}>
                  <input
                    type="checkbox"
                    checked={isAllSourcesSelected}
                    onChange={toggleAllSources}
                    className="h-4 w-4 rounded"
                  />
                  <span>전부 연동</span>
                </label>
              </div>
            )}
          </div>

          {activeTab === 'student' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">학생 선택</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm text-sm"
                  disabled={isLoadingStudents || students.length === 0}
                >
                  {students.length === 0 ? <option value="">학생이 없습니다</option> : null}
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.number ? `${student.number}번 ` : ''}{student.name || '(이름 없음)'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">자서전 요청 내용</label>
                <textarea
                  value={studentPrompt}
                  onChange={(e) => setStudentPrompt(e.target.value)}
                  rows={4}
                  className="block w-full border-gray-300 rounded-md p-3 text-sm resize-none shadow-sm"
                  placeholder="예: 1학기 동안 발표 활동과 친구 관계, 좋아하는 과목 경험을 담아 따뜻한 학생 자서전 형식으로 작성해줘."
                  onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); handleGenerate(e); } }}
                />
              </div>
              <QuickDetailToggle genMode={genMode} setGenMode={setGenMode} />
              {genMode === 'quick' ? (
                <QuickModePanel quickAnswers={quickAnswers} setQuickAnswers={setQuickAnswers} quickChoices={quickChoices} setQuickChoices={setQuickChoices} />
              ) : (
                <QuestionsSection questions={STUDENT_QUESTIONS} questionAnswers={questionAnswers} setQuestionAnswers={setQuestionAnswers} followUps={followUps} setFollowUps={setFollowUps} followUpAnswers={followUpAnswers} setFollowUpAnswers={setFollowUpAnswers} expandedQ={expandedQ} setExpandedQ={setExpandedQ} isOpen={isQuestionsOpen} setIsOpen={setIsQuestionsOpen} />
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
                  <select
                    value={nameMode}
                    onChange={(e) => {
                      setNameMode(e.target.value);
                      if (e.target.value === 'registered') {
                        handleTeacherFieldChange('teacherName', registeredName);
                      } else {
                        handleTeacherFieldChange('teacherName', '');
                      }
                    }}
                    className="block w-full rounded-md border-gray-300 shadow-sm text-sm mb-1"
                  >
                    {registeredName && <option value="registered">{registeredName}</option>}
                    <option value="custom">직접 입력</option>
                  </select>
                  {nameMode === 'custom' && (
                    <input
                      type="text"
                      value={teacherForm.teacherName}
                      onChange={(e) => handleTeacherFieldChange('teacherName', e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm text-sm"
                      placeholder="원하는 이름 또는 별명 입력"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">역할</label>
                  <select
                    value={teacherForm.teacherRole}
                    onChange={(e) => {
                      handleTeacherFieldChange('teacherRole', e.target.value);
                      if (e.target.value !== '전담교사') handleTeacherFieldChange('subject', '');
                    }}
                    className="block w-full rounded-md border-gray-300 shadow-sm text-sm"
                  >
                    {TEACHER_ROLE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {teacherForm.teacherRole === '전담교사' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">담당 과목</label>
                  <div className="flex flex-wrap gap-2">
                    {SUBJECT_OPTIONS.map((subj) => (
                      <button
                        key={subj}
                        type="button"
                        onClick={() => handleTeacherFieldChange('subject', subj)}
                        className={`px-3 py-1 rounded-full text-sm border transition ${
                          teacherForm.subject === subj
                            ? 'bg-amber-500 text-white border-amber-500 font-semibold'
                            : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {subj}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {activeTab === 'principal' ? '경영 철학 / 강조점' :
                   activeTab === 'vice-principal' ? '운영 관점 / 강조점' : '강조할 지도 관점'}
                </label>
                <input
                  type="text"
                  value={teacherForm.focus}
                  onChange={(e) => handleTeacherFieldChange('focus', e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm text-sm"
                  placeholder={
                    activeTab === 'principal' ? '예: 학생 중심 학교, 소통과 혁신' :
                    activeTab === 'vice-principal' ? '예: 교사 지원, 교육과정 운영' : '예: 성장 과정, 교실 기여, 진로 태도'
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">자서전 요청 내용</label>
                <textarea
                  value={teacherPrompt}
                  onChange={(e) => setTeacherPrompt(e.target.value)}
                  rows={4}
                  className="block w-full border-gray-300 rounded-md p-3 text-sm resize-none shadow-sm"
                  placeholder={
                    activeTab === 'principal'
                      ? '예: 취임 이후 학교 변화와 주요 결정, 교직원·학생과의 에피소드를 담아 교장 자서전으로 작성해줘.'
                      : activeTab === 'vice-principal'
                      ? '예: 학교 운영 지원 경험과 교사들과의 협력 이야기를 담아 교감 자서전으로 작성해줘.'
                      : '예: 학생의 학교생활 변화와 공동체 기여를 담아 선생님 시점의 자서전으로 정리해줘.'
                  }
                  onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); handleGenerate(e); } }}
                />
              </div>
              <QuickDetailToggle genMode={genMode} setGenMode={setGenMode} />
              {genMode === 'quick' ? (
                <QuickModePanel quickAnswers={quickAnswers} setQuickAnswers={setQuickAnswers} quickChoices={quickChoices} setQuickChoices={setQuickChoices} />
              ) : (
                <QuestionsSection questions={TEACHER_QUESTIONS} questionAnswers={questionAnswers} setQuestionAnswers={setQuestionAnswers} followUps={followUps} setFollowUps={setFollowUps} followUpAnswers={followUpAnswers} setFollowUpAnswers={setFollowUpAnswers} expandedQ={expandedQ} setExpandedQ={setExpandedQ} isOpen={isQuestionsOpen} setIsOpen={setIsQuestionsOpen} />
              )}
            </div>
          )}

        </div>

        {/* 자서전 목차 + 뷰어 버튼 */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">자서전 목차</h2>
            <button type="button" onClick={() => setResponse(response || '__viewer__')}
              className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100">
              📖 자서전 편찬실
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {chapterOrder.map((origIdx, pos) => {
              const ch = FIXED_CHAPTERS[origIdx];
              const hasContent = response && response !== '__viewer__' && parseResponseToChapters(response)[origIdx]?.status === 'filled';
              return (
                <div
                  key={ch.id}
                  draggable
                  onDragStart={() => setDragIdx(pos)}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                  onDrop={() => {
                    if (dragIdx === null || dragIdx === pos) return;
                    setChapterOrder(prev => {
                      const next = [...prev];
                      const [moved] = next.splice(dragIdx, 1);
                      next.splice(pos, 0, moved);
                      return next;
                    });
                    setDragIdx(null);
                  }}
                  onDragEnd={() => setDragIdx(null)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-grab active:cursor-grabbing transition-all ${
                    dragIdx === pos ? 'border-purple-400 bg-purple-50 shadow-lg scale-[1.02] opacity-80' : 'border-gray-100 hover:bg-gray-50 hover:border-gray-200'
                  }`}
                >
                  <span className="text-xs font-bold text-gray-400 w-5">{pos + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{ch.title}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-xs text-gray-400">{ch.period}</span>
                      <ChapterBadges chapterIdx={origIdx} questionAnswers={questionAnswers} selectedSources={selectedSources} activeTab={activeTab} hasContent={hasContent} />
                    </div>
                  </div>
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${hasContent ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                </div>
              );
            })}
          </div>
        </div>

        {/* 전자북 결과 모달 */}
        {response && (
          <EbookModal
            response={response === '__viewer__' ? '' : response}
            activeTab={activeTab}
            chapterOrder={chapterOrder}
            usedModel={usedModel}
            sourceData={lastSourceData}
            onClose={() => { setResponse(''); setUsedModel(''); }}
            questionAnswers={questionAnswers}
            setQuestionAnswers={setQuestionAnswers}
            followUps={followUps}
            setFollowUps={setFollowUps}
            followUpAnswers={followUpAnswers}
            setFollowUpAnswers={setFollowUpAnswers}
          />
        )}
      </form>
    </div>
  );
}

// ─── 유틸리티 ───

function extractGeneratedText(data) {
  if (!data) return '';
  const candidates = [data.generated_text, data.generated_document, data.result, data.output, data.content];
  const firstText = candidates.find((value) => typeof value === 'string' && value.trim());
  if (firstText) return firstText;
  if (Array.isArray(data.items)) {
    return data.items.map((item) => (typeof item === 'string' ? item : JSON.stringify(item, null, 2))).join('\n\n');
  }
  if (typeof data === 'string') return data;
  return JSON.stringify(data, null, 2);
}

function parseResponseToChapters(text) {
  if (!text) return FIXED_CHAPTERS.map(ch => ({ ...ch, content: '', status: 'empty' }));

  const sections = text.split(/^##\s*/m).filter(Boolean);
  const parsed = {};
  for (const sec of sections) {
    const lines = sec.split('\n');
    const title = lines[0].trim();
    const body = lines.slice(1).join('\n').trim();
    if (body) parsed[title] = body;
  }

  return FIXED_CHAPTERS.map((ch, idx) => {
    let matched = '';
    for (const [title, body] of Object.entries(parsed)) {
      if (title.includes(ch.title) || ch.title.includes(title) ||
          title.includes(ch.period) || idx === 0 && title.includes('시작')) {
        matched = body;
        delete parsed[title];
        break;
      }
    }
    if (!matched && Object.keys(parsed).length > 0) {
      const remaining = Object.entries(parsed);
      if (remaining.length > 0 && idx < FIXED_CHAPTERS.length) {
        const [key, val] = remaining[0];
        matched = val;
        delete parsed[key];
      }
    }
    return { ...ch, content: matched, status: matched ? 'filled' : 'empty' };
  });
}

// ─── 빠른/정밀 모드 토글 ───

function QuickDetailToggle({ genMode, setGenMode }) {
  return (
    <div className="flex rounded-lg border border-gray-200 overflow-hidden">
      <button type="button" onClick={() => setGenMode('quick')}
        className={`flex-1 py-2 text-xs font-semibold transition ${genMode === 'quick' ? 'bg-purple-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
        ⚡ 빠른 생성
      </button>
      <button type="button" onClick={() => setGenMode('detailed')}
        className={`flex-1 py-2 text-xs font-semibold transition ${genMode === 'detailed' ? 'bg-purple-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
        📋 정밀 생성
      </button>
    </div>
  );
}

// ─── 빠른 생성 모드 패널 ───

function QuickModePanel({ quickAnswers, setQuickAnswers, quickChoices, setQuickChoices }) {
  const answeredCount = QUICK_QUESTIONS.filter(q => quickAnswers[q.id]?.trim() || quickChoices[q.id]).length;

  return (
    <div className="rounded-xl border-2 border-purple-100 bg-purple-50/30 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">⚡ 핵심 질문 3개</span>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-600 text-white">{answeredCount}/3</span>
      </div>
      <p className="text-[11px] text-gray-400">3개만 답하면 10장 자서전 초안이 바로 생성됩니다</p>

      {QUICK_QUESTIONS.map((q, qi) => {
        const hasChoice = !!quickChoices[q.id];
        const hasAns = !!quickAnswers[q.id]?.trim();
        const isDone = hasChoice || hasAns;
        const sentences = QUICK_SENTENCES[q.id]?.[quickChoices[q.id]] || [];

        return (
          <div key={q.id} className={`rounded-lg border p-3 space-y-2 ${isDone ? 'border-green-200 bg-green-50/30' : 'border-gray-100 bg-white'}`}>
            <div className="flex items-start gap-2">
              <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5 ${isDone ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {isDone ? '✓' : qi + 1}
              </span>
              <p className="text-sm font-medium text-gray-800 leading-snug">{q.text}</p>
            </div>

            {q.choices.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pl-7">
                {q.choices.map(c => (
                  <button key={c.value} type="button"
                    onClick={() => {
                      setQuickChoices(prev => ({ ...prev, [q.id]: prev[q.id] === c.value ? '' : c.value }));
                      if (!quickAnswers[q.id]?.trim() && sentences.length === 0) {
                        const s = QUICK_SENTENCES[q.id]?.[c.value] || [];
                        if (s.length > 0) setQuickAnswers(prev => ({ ...prev, [q.id]: s[Date.now() % s.length] }));
                      }
                    }}
                    className={`text-[11px] px-2.5 py-1 rounded-full border transition font-medium ${
                      quickChoices[q.id] === c.value ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-500 border-gray-200 hover:border-purple-300'
                    }`}>
                    {c.label}
                  </button>
                ))}
              </div>
            )}

            <div className="pl-7">
              <textarea
                value={quickAnswers[q.id] || ''}
                onChange={(e) => setQuickAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                rows={q.choices.length > 0 ? 1 : 2}
                className="w-full text-xs border border-gray-200 rounded p-2 resize-none focus:ring-1 focus:ring-purple-400"
                placeholder={q.choices.length > 0 ? '선택 후 한 줄 보충 (선택 사항)' : '자유롭게 적어주세요...'}
              />
            </div>
          </div>
        );
      })}

      <p className="text-[10px] text-center text-gray-300">답변 후 "생성하기" 버튼을 누르면 10장 자서전 초안이 생성됩니다</p>
    </div>
  );
}

// ─── 질문 섹션 컴포넌트 (정밀 모드) ───

function QuestionsSection({ questions, questionAnswers, setQuestionAnswers, followUps, setFollowUps, followUpAnswers, setFollowUpAnswers, expandedQ, setExpandedQ, isOpen, setIsOpen }) {
  const answeredCount = questions.filter(q => questionAnswers[q.id]?.trim()).length;
  const chapterGroups = useMemo(() => {
    const groups = {};
    questions.forEach(q => {
      if (!groups[q.chapter]) groups[q.chapter] = [];
      groups[q.chapter].push(q);
    });
    return Object.entries(groups).sort(([a], [b]) => Number(a) - Number(b));
  }, [questions]);

  return (
    <div className="rounded-xl border-2 border-purple-100 bg-purple-50/30 p-3">
      <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">📝 자서전 질문</span>
          {answeredCount > 0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-600 text-white">{answeredCount}/{questions.length}</span>}
        </div>
        <span className="text-xs text-gray-400">{isOpen ? '접기 ▲' : '펼치기 ▼'}</span>
      </button>
      {isOpen && (
        <div className="mt-3 space-y-3">
          {chapterGroups.map(([chIdx, qs]) => {
            const ch = FIXED_CHAPTERS[Number(chIdx)];
            if (!ch) return null;
            const groupAnswered = qs.filter(q => questionAnswers[q.id]?.trim()).length;
            const isGroupExpanded = qs.some(q => expandedQ === q.id);
            return (
              <div key={chIdx} className="rounded-lg border border-gray-100 overflow-hidden">
                <button type="button" onClick={() => setExpandedQ(isGroupExpanded ? null : qs[0].id)}
                  className={`w-full text-left px-3 py-2 flex items-center gap-2 text-xs font-semibold ${isGroupExpanded ? 'bg-purple-100 text-purple-800' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>
                  <span className="text-[10px] text-gray-400 w-4">{Number(chIdx) + 1}장</span>
                  <span className="flex-1">{ch.title}</span>
                  {groupAnswered > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-500 text-white">{groupAnswered}/{qs.length}</span>}
                </button>
                {isGroupExpanded && (
                  <div className="p-2 space-y-2 bg-white">
                    {qs.map(q => {
                      const isExp = expandedQ === q.id;
                      const hasAns = !!questionAnswers[q.id]?.trim();
                      const fups = followUps[q.id] || [];
                      return (
                        <div key={q.id} className={`rounded border px-2 py-1.5 ${isExp ? 'border-purple-200 bg-purple-50/30' : hasAns ? 'border-green-100' : 'border-gray-50'}`}>
                          <button type="button" onClick={() => setExpandedQ(isExp ? qs[0].id === q.id ? null : q.id : q.id)} className="w-full text-left flex items-center gap-1.5">
                            <span className={`w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center flex-shrink-0 ${hasAns ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                              {hasAns ? '✓' : '·'}
                            </span>
                            <span className="text-[11px] text-gray-700 flex-1 line-clamp-1">{q.text}</span>
                          </button>
                          {isExp && (
                            <div className="mt-1.5 space-y-1.5">
                              <textarea
                                value={questionAnswers[q.id] || ''}
                                onChange={(e) => setQuestionAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                onBlur={() => {
                                  const ans = questionAnswers[q.id];
                                  if (ans && ans.trim().length >= 5) {
                                    setFollowUps(prev => ({ ...prev, [q.id]: generateFollowUps(ans) }));
                                  }
                                }}
                                rows={2}
                                className="w-full text-xs border border-gray-200 rounded p-1.5 resize-none focus:ring-1 focus:ring-purple-400"
                                placeholder="답변..."
                              />
                              {fups.length > 0 && (
                                <div className="space-y-1 pl-2 border-l-2 border-purple-200">
                                  <div className="text-[9px] font-semibold text-purple-500">심화</div>
                                  {fups.map((fu, i) => (
                                    <div key={i}>
                                      <p className="text-[10px] text-gray-500 mb-0.5">→ {fu}</p>
                                      <textarea
                                        value={followUpAnswers[`${q.id}_${i}`] || ''}
                                        onChange={(e) => setFollowUpAnswers(prev => ({ ...prev, [`${q.id}_${i}`]: e.target.value }))}
                                        rows={1}
                                        className="w-full text-[11px] border border-gray-100 rounded p-1 resize-none focus:ring-1 focus:ring-purple-300"
                                        placeholder="답변..."
                                      />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── 목차 카드 배지 컴포넌트 ───

function ChapterBadges({ chapterIdx, questionAnswers, selectedSources, activeTab, hasContent }) {
  const questions = activeTab === 'student' ? STUDENT_QUESTIONS : TEACHER_QUESTIONS;
  const chapterQs = questions.filter(qq => qq.chapter === chapterIdx);
  const answeredCount = chapterQs.filter(qq => questionAnswers[qq.id]?.trim()).length;

  const linkedSources = Object.entries(selectedSources)
    .filter(([, v]) => v)
    .map(([k]) => k);
  const chapterSources = linkedSources.filter(src => {
    const mapping = SOURCE_TO_CHAPTERS[src] || [];
    const chId = FIXED_CHAPTERS[chapterIdx]?.id;
    return mapping.includes(chId);
  });

  return (
    <span className="flex items-center gap-1 flex-wrap">
      {answeredCount > 0 && <span className="text-[9px] px-1 py-0.5 rounded bg-purple-100 text-purple-600">✏️ {answeredCount}/{chapterQs.length}</span>}
      {chapterSources.length > 0 && <span className="text-[9px] px-1 py-0.5 rounded bg-sky-100 text-sky-600">{chapterSources.length}개 연동</span>}
      {hasContent && <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-100 text-emerald-600">초안</span>}
    </span>
  );
}

// ─── 블록 편집 컴포넌트 ───

function AddBlockButton({ onClick, alwaysVisible }) {
  return (
    <div className={`flex justify-center py-0.5 transition-opacity duration-200 ${alwaysVisible ? 'opacity-100' : 'opacity-0 hover:opacity-100'}`}>
      <button
        type="button"
        onClick={onClick}
        className={`px-3 py-0.5 rounded-full border transition ${
          alwaysVisible
            ? 'text-xs text-amber-600 border-amber-300 bg-amber-50 hover:bg-amber-100 font-medium py-1.5 px-4'
            : 'text-[10px] text-gray-300 hover:text-amber-600 border-transparent hover:border-amber-300 hover:bg-amber-50'
        }`}
      >
        + 문장 추가
      </button>
    </div>
  );
}

function ProofreadSuggestion({ result, onApply, onDismiss }) {
  if (!result || !result.hasChanges || result.applied) return null;
  return (
    <div className="mt-1.5 p-2.5 bg-green-50 border border-green-200 rounded-lg text-xs animate-in fade-in">
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-semibold text-green-700">📝 교정 제안</span>
        <div className="flex gap-1">
          <button type="button" onClick={onApply} className="px-2.5 py-0.5 bg-green-500 text-white rounded text-[10px] font-medium hover:bg-green-600 transition">적용</button>
          <button type="button" onClick={onDismiss} className="px-2.5 py-0.5 bg-gray-200 text-gray-600 rounded text-[10px] font-medium hover:bg-gray-300 transition">무시</button>
        </div>
      </div>
      <div className="line-through text-red-400 mb-1 leading-relaxed">{result.original}</div>
      <div className="text-green-700 leading-relaxed">{result.revised}</div>
    </div>
  );
}

function EditableBlock({ block, onUpdate, onDelete, onRestore, onProofread, proofreadResult, onApplyProofread, onDismissProofread, isProofreading }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(block.currentText);
  const textareaRef = useRef(null);

  const isLinked = block.type === 'linked' || block.type === 'linked-edited';
  const isEdited = block.type === 'linked-edited';
  const isManual = block.type === 'manual';

  useEffect(() => {
    setEditText(block.currentText);
  }, [block.currentText]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    if (editText.trim() !== block.currentText) {
      onUpdate(editText.trim());
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setEditText(block.currentText);
      setIsEditing(false);
    }
  };

  const SOURCE_BADGE_COLORS = {
    'ai-generated': 'bg-violet-100 text-violet-700',
    studentRecords: 'bg-blue-100 text-blue-700',
    lifeRecords: 'bg-emerald-100 text-emerald-700',
    careClassroom: 'bg-amber-100 text-amber-700',
    subjectEvaluation: 'bg-cyan-100 text-cyan-700',
    observationJournal: 'bg-pink-100 text-pink-700',
    schedule: 'bg-indigo-100 text-indigo-700',
    todayMeal: 'bg-orange-100 text-orange-700',
    radioStory: 'bg-rose-100 text-rose-700',
  };

  return (
    <div className={`group relative rounded-lg px-2.5 py-1.5 transition-all ${
      isEditing ? 'bg-amber-50 ring-1 ring-amber-300 shadow-sm' : 'hover:bg-amber-50/50'
    }`}>
      {/* 출처/상태 배지 */}
      {(isLinked || isManual) && (
        <div className="flex items-center gap-1 mb-0.5">
          {block.sourceLabel && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${SOURCE_BADGE_COLORS[block.source] || 'bg-gray-100 text-gray-600'}`}>
              {block.sourceLabel}
            </span>
          )}
          {isManual && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium">
              직접 입력
            </span>
          )}
          {isEdited && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600 font-medium">
              ✏️ 수정됨
            </span>
          )}
        </div>
      )}

      {/* 본문 */}
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={editText}
          onChange={(e) => {
            setEditText(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
          }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-full text-[13px] leading-[2] bg-transparent border-none outline-none resize-none"
          style={{ fontFamily: "'Noto Serif KR', serif", minHeight: 40 }}
        />
      ) : (
        <p
          className="text-[13px] text-gray-800 leading-[2] text-justify indent-4 cursor-text"
          style={{ fontFamily: "'Noto Serif KR', serif" }}
          onClick={() => setIsEditing(true)}
        >
          {block.currentText || <span className="text-gray-300 italic">클릭하여 입력...</span>}
        </p>
      )}

      {/* 호버 액션 버튼 */}
      <div className="absolute right-1 top-1 hidden group-hover:flex items-center gap-0.5 bg-white/90 rounded shadow-sm border border-gray-100 px-1 py-0.5">
        <button
          type="button"
          onClick={() => onProofread(block.id)}
          disabled={isProofreading || !block.currentText?.trim()}
          className="text-[10px] px-1.5 py-0.5 text-green-600 hover:bg-green-50 rounded disabled:opacity-30"
          title="오탈자 점검"
        >
          ✓점검
        </button>
        {isEdited && (
          <button
            type="button"
            onClick={onRestore}
            className="text-[10px] px-1.5 py-0.5 text-blue-600 hover:bg-blue-50 rounded"
            title="원문 복원"
          >
            ↩원문
          </button>
        )}
        {isManual && (
          <button
            type="button"
            onClick={onDelete}
            className="text-[10px] px-1.5 py-0.5 text-red-500 hover:bg-red-50 rounded"
            title="삭제"
          >
            ×
          </button>
        )}
      </div>

      {/* 교정 제안 */}
      <ProofreadSuggestion
        result={proofreadResult}
        onApply={onApplyProofread}
        onDismiss={onDismissProofread}
      />
    </div>
  );
}

function ChapterContent({ ch, idx, blocks, onAddBlock, onUpdateBlock, onDeleteBlock, onRestoreBlock, onProofreadBlock, onProofreadPage, proofreadResults, isProofreading, onApplyProofread, onDismissProofread, highlight, questionAnswers, setQuestionAnswers, activeTab }) {
  const [showQPopup, setShowQPopup] = useState(false);
  const [activeQIdx, setActiveQIdx] = useState(0);

  const questions = (activeTab === 'student' ? STUDENT_QUESTIONS : TEACHER_QUESTIONS).filter(q => q.chapter === idx);
  const answeredCount = questions.filter(q => questionAnswers?.[q.id]?.trim()).length;
  const hasUnanswered = answeredCount < questions.length;
  const hasBlocks = blocks && blocks.length > 0;

  // 미답변 장 첫 진입 시 자동 팝업
  const autoShownRef = useRef(false);
  useEffect(() => {
    if (answeredCount === 0 && questions.length > 0 && !hasBlocks && !autoShownRef.current) {
      autoShownRef.current = true;
      setShowQPopup(true);
    }
  }, []);

  return (
    <div className="h-full overflow-y-auto px-8 py-6 flex flex-col relative" style={{ fontFamily: "'Noto Serif KR', serif" }}>
      {/* 챕터 헤더 */}
      <div className="text-center mb-4">
        <span className="text-[10px] text-amber-500 tracking-[0.2em] uppercase">{ch.period}</span>
        <h2 className="text-lg font-bold text-gray-900 mt-1">제{idx + 1}장</h2>
        <h3 className="text-base text-gray-700 mt-0.5">{ch.title}</h3>
        <div className="w-10 h-px bg-amber-400 mx-auto mt-3" />
      </div>

      {/* ─── 질문 상태 카드 ─── */}
      {questions.length > 0 && (
        <div className={`rounded-xl p-3 mb-3 ${
          answeredCount === 0 ? 'bg-purple-50 border-2 border-purple-200 border-dashed' :
          hasUnanswered ? 'bg-amber-50 border border-amber-200' :
          'bg-green-50 border border-green-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className={`text-lg ${answeredCount === 0 ? '' : hasUnanswered ? '' : ''}`}>
                {answeredCount === 0 ? '📝' : hasUnanswered ? '✍️' : '✅'}
              </span>
              <div>
                <p className={`text-xs font-semibold ${answeredCount === 0 ? 'text-purple-700' : hasUnanswered ? 'text-amber-700' : 'text-green-700'}`}>
                  {answeredCount === 0 ? '질문에 답하면 이 장이 채워집니다' : hasUnanswered ? `${questions.length - answeredCount}개 질문 남음` : '질문 답변 완료'}
                </p>
                <div className="flex gap-1 mt-1">
                  {questions.map((q, i) => (
                    <div key={q.id} className={`w-3 h-3 rounded-full ${questionAnswers?.[q.id]?.trim() ? 'bg-green-500' : 'bg-gray-200'}`} />
                  ))}
                </div>
              </div>
            </div>
            <button type="button" onClick={() => { setShowQPopup(true); setActiveQIdx(answeredCount === questions.length ? 0 : questions.findIndex(q => !questionAnswers?.[q.id]?.trim())); }}
              className={`text-xs px-3 py-1.5 rounded-full font-semibold transition ${
                answeredCount === 0 ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-sm' :
                hasUnanswered ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm' :
                'bg-green-100 text-green-700 hover:bg-green-200'
              }`}>
              {answeredCount === 0 ? '시작하기' : hasUnanswered ? '이어서 쓰기' : '수정하기'}
            </button>
          </div>
        </div>
      )}

      {/* ─── 블록 리스트 ─── */}
      <div className="flex-1">
        {hasBlocks ? (
          <>
            <AddBlockButton onClick={() => onAddBlock(ch.id, 0)} />
            {blocks.map((block, i) => (
              <React.Fragment key={block.id}>
                <EditableBlock
                  block={block}
                  onUpdate={(text) => onUpdateBlock(ch.id, i, text)}
                  onDelete={() => onDeleteBlock(ch.id, i)}
                  onRestore={() => onRestoreBlock(ch.id, i)}
                  onProofread={(blockId) => onProofreadBlock(ch.id, blockId)}
                  proofreadResult={proofreadResults?.[block.id]}
                  onApplyProofread={() => onApplyProofread(ch.id, block.id)}
                  onDismissProofread={() => onDismissProofread(block.id)}
                  isProofreading={isProofreading}
                />
                <AddBlockButton onClick={() => onAddBlock(ch.id, i + 1)} />
              </React.Fragment>
            ))}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
            <div className="text-4xl mb-3">📖</div>
            <p className="text-sm text-gray-500 font-medium mb-1">이 장은 아직 비어 있습니다</p>
            <p className="text-xs text-gray-400 mb-4">
              {answeredCount === 0 ? '위 "시작하기" 버튼을 눌러 질문에 답하면 초안이 생성됩니다' :
               hasUnanswered ? `${questions.length - answeredCount}개 질문을 더 답하면 더 풍부한 초안이 생성됩니다` :
               '질문 답변 완료! "생성하기"로 초안을 만들어보세요'}
            </p>
            <AddBlockButton onClick={() => onAddBlock(ch.id, 0)} alwaysVisible />
          </div>
        )}
      </div>

      {/* 페이지 단위 오탈자 점검 */}
      {hasBlocks && (
        <div className="mt-2 flex justify-center">
          <button type="button" onClick={() => onProofreadPage(ch.id)} disabled={isProofreading}
            className="text-[11px] px-3 py-1 text-green-600 bg-green-50 border border-green-200 rounded-full hover:bg-green-100 disabled:opacity-40 transition font-medium">
            {isProofreading ? '점검 중...' : '📝 이 페이지 오탈자 점검'}
          </button>
        </div>
      )}

      {/* 페이지 번호 */}
      <div className="text-center text-[10px] text-gray-300 mt-2 flex-shrink-0">{idx + 1}</div>

      {/* ─── 장별 질문 오버레이 ─── */}
      {showQPopup && questions.length > 0 && (
        <div className="absolute inset-0 z-30 bg-amber-50/95 backdrop-blur-sm flex flex-col px-10 py-6 overflow-y-auto" style={{ fontFamily: "'Noto Serif KR', serif" }}>
          <div className="text-center mb-4">
            <span className="text-xs text-purple-500 tracking-[0.15em] font-medium">제{idx + 1}장 질문</span>
            <h2 className="text-xl font-bold text-gray-900 mt-1">{ch.title}</h2>
            <p className="text-sm text-gray-400 mt-0.5">{ch.period}</p>
            <div className="flex justify-center gap-2 mt-3">
              {questions.map((q, i) => (
                <button key={q.id} type="button" onClick={() => setActiveQIdx(i)}
                  className={`w-8 h-8 rounded-full text-xs font-bold transition ${
                    i === activeQIdx ? 'bg-purple-600 text-white scale-110 shadow-md' : questionAnswers?.[q.id]?.trim() ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                  {questionAnswers?.[q.id]?.trim() ? '✓' : i + 1}
                </button>
              ))}
            </div>
            <div className="text-[9px] text-gray-300 mt-1">자동 저장됨</div>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            {(() => {
              const q = questions[activeQIdx];
              if (!q) return null;
              const isObj = q.type === 'objective' || q.type === 'mixed';
              const choices = q.choices || [];
              const sentences = CHOICE_SENTENCES[q.id] || {};
              const currentAns = questionAnswers?.[q.id] || '';
              const selectedChoice = choices.find(c => currentAns.startsWith(`[${c.label}]`));

              // 멀티 선택된 키워드 파싱
              const selectedKeys = currentAns.match(/\[(.+?)\]/g)?.map(m => m.slice(1, -1)) || [];
              const toggleKeyword = (choice) => {
                const label = choice.label;
                if (selectedKeys.includes(label)) {
                  // 해제: 해당 키워드 태그 + 소속 문장 제거
                  setQuestionAnswers?.(prev => {
                    const lines = (prev[q.id] || '').split('\n');
                    const filtered = lines.filter(l => !l.startsWith(`[${label}]`) && !(l.trim() && lines[lines.indexOf(l) - 1]?.startsWith?.(`[${label}]`)));
                    // 간단하게: 태그 행 제거
                    const cleaned = (prev[q.id] || '').split('\n').filter(l => l.trim() !== `[${label}]`);
                    return { ...prev, [q.id]: cleaned.join('\n') };
                  });
                } else {
                  // 선택: 태그 추가
                  setQuestionAnswers?.(prev => {
                    const cur = (prev[q.id] || '').trim();
                    return { ...prev, [q.id]: cur ? `${cur}\n[${label}]` : `[${label}]` };
                  });
                }
              };

              const addSentence = (sentence) => {
                setQuestionAnswers?.(prev => {
                  const cur = prev[q.id] || '';
                  if (cur.includes(sentence)) return prev;
                  return { ...prev, [q.id]: cur.trim() ? `${cur.trim()}\n${sentence}` : sentence };
                });
              };

              const removeSentence = (sentence) => {
                setQuestionAnswers?.(prev => {
                  const lines = (prev[q.id] || '').split('\n').filter(l => l.trim() !== sentence.trim());
                  return { ...prev, [q.id]: lines.join('\n') };
                });
              };

              const addedLines = currentAns.split('\n').map(l => l.trim()).filter(l => l && !l.match(/^\[.+?\]$/));

              return (
                <div className="max-w-2xl mx-auto w-full space-y-3 px-4 overflow-y-auto" style={{ maxHeight: 'calc(100% - 120px)' }}>
                  <p className="text-lg font-medium text-gray-800 leading-relaxed text-center">{q.text}</p>

                  {/* 키워드 멀티 선택 태그 */}
                  {isObj && choices.length > 0 && (
                    <div>
                      <div className="flex flex-wrap justify-center gap-2">
                        {choices.map(c => {
                          const isSel = selectedKeys.includes(c.label);
                          return (
                            <button key={c.value} type="button" onClick={() => toggleKeyword(c)}
                              className={`text-sm px-4 py-1.5 rounded-full border-2 transition font-medium ${
                                isSel ? 'bg-purple-600 text-white border-purple-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                              }`}>
                              {c.label}
                            </button>
                          );
                        })}
                      </div>
                      {selectedKeys.length > 0 && (
                        <p className="text-center text-[10px] text-purple-400 mt-1">{selectedKeys.length}개 키워드 선택됨 · 여러 섹션에서 문장을 골라 아래에 담으세요</p>
                      )}
                    </div>
                  )}

                  {/* 키워드별 추천 문장 뱅크 섹션 (선택된 키워드마다 개별 표시) */}
                  {isObj && selectedKeys.length > 0 && (
                    <div className="space-y-2">
                      {selectedKeys.map(label => {
                        const choice = choices.find(c => c.label === label);
                        if (!choice) return null;
                        const sents = sentences[choice.value] || [];
                        if (sents.length === 0) return null;
                        return (
                          <div key={choice.value} className="bg-white border border-purple-100 rounded-lg overflow-hidden">
                            <div className="px-3 py-1.5 bg-purple-50 border-b border-purple-100 flex items-center gap-2">
                              <span className="text-[11px] font-semibold text-purple-700">{label}</span>
                              <span className="text-[10px] text-purple-400">{sents.length}개</span>
                            </div>
                            <div className="max-h-[140px] overflow-y-auto">
                              {sents.map((s, si) => {
                                const isAdded = addedLines.includes(s);
                                return (
                                  <div key={si} className={`px-3 py-1.5 flex items-start gap-2 border-b border-gray-50 last:border-0 ${isAdded ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
                                    <span className={`mt-0.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center flex-shrink-0 ${isAdded ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                      {isAdded ? '✓' : si + 1}
                                    </span>
                                    <p className={`text-[11px] leading-relaxed flex-1 ${isAdded ? 'text-green-800' : 'text-gray-700'}`}>{s}</p>
                                    <button type="button" onClick={() => isAdded ? removeSentence(s) : addSentence(s)}
                                      className={`flex-shrink-0 text-[9px] px-2 py-0.5 rounded-full border font-medium ${
                                        isAdded ? 'text-red-500 border-red-200 hover:bg-red-50' : 'text-purple-600 border-purple-200 hover:bg-purple-50'
                                      }`}>
                                      {isAdded ? '제거' : '+ 추가'}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 누적 편집 영역 */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500 font-medium">
                        {isObj ? `담긴 문장 ${addedLines.length}개 · 직접 수정 가능` : '자유롭게 답변해주세요'}
                      </span>
                      {isObj && (
                        <div className="flex gap-2">
                          <button type="button" onClick={() => {
                            const allSents = selectedKeys.flatMap(label => {
                              const c = choices.find(ch => ch.label === label);
                              return c ? (sentences[c.value] || []) : [];
                            });
                            setQuestionAnswers?.(prev => {
                              const cur = (prev[q.id] || '').trim();
                              const existing = cur.split('\n').map(l => l.trim());
                              const toAdd = allSents.filter(s => !existing.includes(s));
                              if (toAdd.length === 0) return prev;
                              return { ...prev, [q.id]: cur ? `${cur}\n${toAdd.join('\n')}` : toAdd.join('\n') };
                            });
                          }} className="text-[10px] text-purple-500 hover:text-purple-700 font-medium">전체 선택</button>
                          {addedLines.length > 0 && (
                            <button type="button" onClick={() => {
                              const tags = selectedKeys.map(k => `[${k}]`).join('\n');
                              setQuestionAnswers?.(prev => ({ ...prev, [q.id]: tags }));
                            }} className="text-[10px] text-red-400 hover:text-red-600 font-medium">전체 지우기</button>
                          )}
                        </div>
                      )}
                    </div>
                    <textarea
                      data-qa-textarea
                      value={currentAns}
                      onChange={(e) => setQuestionAnswers?.(prev => ({ ...prev, [q.id]: e.target.value }))}
                      rows={q.type === 'subjective' ? 6 : 4}
                      className="w-full text-sm border border-gray-200 rounded-xl p-3 resize-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 bg-white shadow-sm leading-relaxed"
                      placeholder={isObj ? '위에서 문장을 추가하거나 여기에 직접 작성하세요' : '자유롭게 답변해주세요...'}
                    />
                  </div>

                  {/* 이전/다음 */}
                  <div className="flex items-center justify-between pt-3">
                    <button type="button" onClick={() => setActiveQIdx(Math.max(0, activeQIdx - 1))} disabled={activeQIdx === 0}
                      className="text-sm text-gray-400 hover:text-gray-600 disabled:opacity-30 px-4 py-2">← 이전</button>
                    <span className="text-sm text-gray-400">{activeQIdx + 1} / {questions.length}</span>
                    {activeQIdx < questions.length - 1 ? (
                      <button type="button" onClick={() => setActiveQIdx(activeQIdx + 1)}
                        className="text-sm text-purple-600 hover:text-purple-800 font-semibold px-5 py-2">다음 →</button>
                    ) : (
                      <button type="button" onClick={() => setShowQPopup(false)}
                        className="text-sm text-white bg-purple-600 hover:bg-purple-700 font-semibold px-6 py-2 rounded-full">완료</button>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="text-center mt-2">
            <button type="button" onClick={() => setShowQPopup(false)} className="text-[11px] text-gray-400 hover:text-gray-600 underline">닫기</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 전자북 모달 ───

function EbookModal({ response, activeTab, usedModel, onClose, chapterOrder, sourceData, questionAnswers, setQuestionAnswers, followUps, setFollowUps, followUpAnswers, setFollowUpAnswers }) {
  const [spread, setSpread] = useState(0);
  const [showToc, setShowToc] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showQuestions, setShowQuestions] = useState(false);
  const [expandedQ, setExpandedQ] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [pageInput, setPageInput] = useState('');
  const [highlight, setHighlight] = useState('');
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimer = useRef(null);

  // 블록 상태
  const [chapterBlocks, setChapterBlocks] = useState({});
  const [proofreadResults, setProofreadResults] = useState({});
  const [isProofreading, setIsProofreading] = useState(false);

  const allChapters = useMemo(() => parseResponseToChapters(response), [response]);
  const chapters = useMemo(() => {
    if (chapterOrder && chapterOrder.length === allChapters.length) {
      return chapterOrder.map(i => allChapters[i]);
    }
    return allChapters;
  }, [allChapters, chapterOrder]);
  const maxSpread = Math.ceil(chapters.length / 2) - 1;
  const leftIdx = spread * 2;
  const rightIdx = spread * 2 + 1;
  const leftCh = chapters[leftIdx];
  const rightCh = rightIdx < chapters.length ? chapters[rightIdx] : null;

  const goSpread = (s) => setSpread(Math.max(0, Math.min(maxSpread, s)));
  const goPage = (p) => goSpread(Math.floor(p / 2));

  // 블록 초기화: AI 응답 + 연동 자료 → 블록 변환 (질문 블록 보존)
  useEffect(() => {
    const parsed = parseResponseToChapters(response);
    const sourceBlocks = importSourceBlocks(sourceData);

    setChapterBlocks(prev => {
      const blocks = {};
      parsed.forEach((ch) => {
        const aiBlocks = createBlocksFromAIContent(ch.content);
        const linked = sourceBlocks[ch.id] || [];
        const existingQBlocks = (prev[ch.id] || []).filter(b => typeof b.source === 'string' && b.source.startsWith('question-'));
        blocks[ch.id] = [...existingQBlocks, ...aiBlocks, ...linked];
      });
      return blocks;
    });
    setProofreadResults({});
  }, [response, sourceData]);

  // 질문 답변 → 해당 장 블록 자동 삽입
  useEffect(() => {
    if (!questionAnswers) return;
    const questions = activeTab === 'student' ? STUDENT_QUESTIONS : TEACHER_QUESTIONS;
    setChapterBlocks(prev => {
      const next = { ...prev };
      questions.forEach(q => {
        const ans = questionAnswers[q.id]?.trim();
        if (!ans) return;
        const ch = FIXED_CHAPTERS[q.chapter];
        if (!ch) return;
        const arr = next[ch.id] || [];
        const existingQBlock = arr.find(b => b.source === `question-${q.id}`);
        if (existingQBlock) {
          if (existingQBlock.currentText !== ans) {
            next[ch.id] = arr.map(b => b.source === `question-${q.id}` ? { ...b, currentText: ans, originalText: ans } : b);
          }
        } else {
          next[ch.id] = [...arr, createBlock('linked', ans, `question-${q.id}`, '질문 답변')];
        }
      });
      return next;
    });
  }, [questionAnswers, activeTab]);

  // 키보드
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goSpread(spread - 1);
      if (e.key === 'ArrowRight') goSpread(spread + 1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [spread]);

  // 컨트롤 자동 숨김
  useEffect(() => {
    const show = () => { setControlsVisible(true); clearTimeout(hideTimer.current); hideTimer.current = setTimeout(() => setControlsVisible(false), 4000); };
    show();
    window.addEventListener('mousemove', show);
    window.addEventListener('touchstart', show);
    return () => { window.removeEventListener('mousemove', show); window.removeEventListener('touchstart', show); clearTimeout(hideTimer.current); };
  }, []);

  // ── 블록 CRUD ──

  const addBlock = useCallback((chapterId, atIndex) => {
    setChapterBlocks(prev => {
      const arr = [...(prev[chapterId] || [])];
      arr.splice(atIndex, 0, createBlock('manual', ''));
      return { ...prev, [chapterId]: arr };
    });
  }, []);

  const updateBlock = useCallback((chapterId, blockIndex, newText) => {
    setChapterBlocks(prev => {
      const arr = [...(prev[chapterId] || [])];
      const block = { ...arr[blockIndex] };
      block.currentText = newText;
      if (block.type === 'linked' && newText !== block.originalText) {
        block.type = 'linked-edited';
      } else if (block.type === 'linked-edited' && newText === block.originalText) {
        block.type = 'linked';
      }
      arr[blockIndex] = block;
      return { ...prev, [chapterId]: arr };
    });
  }, []);

  const deleteBlock = useCallback((chapterId, blockIndex) => {
    setChapterBlocks(prev => {
      const arr = [...(prev[chapterId] || [])];
      arr.splice(blockIndex, 1);
      return { ...prev, [chapterId]: arr };
    });
  }, []);

  const restoreBlock = useCallback((chapterId, blockIndex) => {
    setChapterBlocks(prev => {
      const arr = [...(prev[chapterId] || [])];
      const block = { ...arr[blockIndex] };
      block.currentText = block.originalText;
      block.type = 'linked';
      arr[blockIndex] = block;
      return { ...prev, [chapterId]: arr };
    });
  }, []);

  // ── 교정 ──

  const callProofreadApi = useCallback(async (texts) => {
    const endpoints = ['/proofread', '/api/proofread'];
    for (const endpoint of endpoints) {
      try {
        const res = await client.post(endpoint, {
          texts,
          contentType: 'autobiography',
        }, { timeout: 15000 });
        return res.data?.results || [];
      } catch (err) {
        if (err.response?.status === 404) continue;
        throw err;
      }
    }
    throw new Error('교정 API를 찾을 수 없습니다.');
  }, []);

  const handleProofreadBlock = useCallback(async (chapterId, blockId) => {
    const blocks = chapterBlocks[chapterId] || [];
    const block = blocks.find(b => b.id === blockId);
    if (!block || !block.currentText?.trim()) return;

    setIsProofreading(true);
    try {
      const apiResults = await callProofreadApi([{ id: block.id, text: block.currentText }]);
      const results = {};
      for (const r of apiResults) {
        results[r.id] = { ...r, applied: false };
      }
      setProofreadResults(prev => ({ ...prev, ...results }));
    } catch (err) {
      console.error('Proofread failed:', err);
      alert('오탈자 점검에 실패했습니다. 백엔드 서버를 확인해주세요.');
    } finally {
      setIsProofreading(false);
    }
  }, [chapterBlocks, callProofreadApi]);

  const handleProofreadPage = useCallback(async (chapterId) => {
    const blocks = chapterBlocks[chapterId] || [];
    const textsToCheck = blocks
      .filter(b => b.currentText?.trim())
      .map(b => ({ id: b.id, text: b.currentText }));

    if (textsToCheck.length === 0) return;

    setIsProofreading(true);
    try {
      const apiResults = await callProofreadApi(textsToCheck);
      const results = {};
      for (const r of apiResults) {
        results[r.id] = { ...r, applied: false };
      }
      setProofreadResults(prev => ({ ...prev, ...results }));
    } catch (err) {
      console.error('Proofread failed:', err);
      alert('오탈자 점검에 실패했습니다. 백엔드 서버를 확인해주세요.');
    } finally {
      setIsProofreading(false);
    }
  }, [chapterBlocks, callProofreadApi]);

  const handleProofreadChapter = useCallback(async (chapterId) => {
    await handleProofreadPage(chapterId);
  }, [handleProofreadPage]);

  const applyProofread = useCallback((chapterId, blockId) => {
    const result = proofreadResults[blockId];
    if (!result) return;

    setChapterBlocks(prev => {
      const arr = [...(prev[chapterId] || [])];
      const idx = arr.findIndex(b => b.id === blockId);
      if (idx < 0) return prev;
      const block = { ...arr[idx] };
      block.currentText = result.revised;
      if (block.type === 'linked' && result.revised !== block.originalText) {
        block.type = 'linked-edited';
      }
      arr[idx] = block;
      return { ...prev, [chapterId]: arr };
    });

    setProofreadResults(prev => ({
      ...prev,
      [blockId]: { ...prev[blockId], applied: true },
    }));
  }, [proofreadResults]);

  const dismissProofread = useCallback((blockId) => {
    setProofreadResults(prev => {
      const next = { ...prev };
      delete next[blockId];
      return next;
    });
  }, []);

  // ── 검색 ──

  const doSearch = () => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const q = searchQuery.trim().toLowerCase();
    const results = [];
    chapters.forEach((ch, i) => {
      const blocks = chapterBlocks[ch.id] || [];
      const blockTexts = blocks.map(b => b.currentText).join(' ');
      const searchable = [`제${i + 1}장`, `${i + 1}`, ch.title, ch.period, ch.content || '', blockTexts, ch.placeholder || ''].join(' ');
      const idx = searchable.toLowerCase().indexOf(q);
      if (idx >= 0) {
        const textSource = blockTexts || ch.content || ch.placeholder || ch.title;
        const srcIdx = textSource.toLowerCase().indexOf(q);
        const start = Math.max(0, srcIdx - 20);
        const snippet = srcIdx >= 0 ? '...' + textSource.slice(start, srcIdx + q.length + 30) + '...' : ch.title;
        results.push({ page: i, title: ch.title, snippet });
      }
    });
    setSearchResults(results);
    setHighlight(searchQuery.trim());
  };

  const goToPage = () => {
    const n = Number(pageInput);
    if (n >= 1 && n <= chapters.length) { goPage(n - 1); setShowSearch(false); setPageInput(''); }
  };

  // 블록 수 요약
  const getBlockSummary = (chId) => {
    const blocks = chapterBlocks[chId] || [];
    const linked = blocks.filter(b => b.type === 'linked' || b.type === 'linked-edited').length;
    const manual = blocks.filter(b => b.type === 'manual').length;
    const edited = blocks.filter(b => b.type === 'linked-edited').length;
    return { total: blocks.length, linked, manual, edited };
  };

  return (
    <div className="fixed inset-0 z-[200] bg-stone-900 flex flex-col select-none">
      {/* 상단 바 */}
      <div className={`flex items-center justify-between px-4 py-2 bg-black/60 transition-opacity duration-500 ${controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="flex items-center gap-2">
          <button onClick={() => { setShowToc(!showToc); setShowSearch(false); setShowQuestions(false); }} className="text-xs text-amber-300 hover:text-white border border-amber-800 rounded px-2 py-1" aria-label="목차">☰ 목차</button>
          <button onClick={() => { setShowSearch(!showSearch); setShowToc(false); setShowQuestions(false); }} className="text-xs text-amber-300 hover:text-white border border-amber-800 rounded px-2 py-1" aria-label="검색">🔍 검색</button>
          <button onClick={() => { setShowQuestions(!showQuestions); setShowToc(false); setShowSearch(false); }} className="text-xs text-purple-300 hover:text-white border border-purple-800 rounded px-2 py-1" aria-label="질문">📝 질문</button>
          <span className="text-xs text-stone-400 ml-2">{leftIdx + 1}~{Math.min(rightIdx + 1, chapters.length)} / {chapters.length}장</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const leftBlocks = chapterBlocks[leftCh?.id] || [];
              const rightBlocks = rightCh ? (chapterBlocks[rightCh.id] || []) : [];
              const allIds = [...leftBlocks, ...rightBlocks].filter(b => b.currentText?.trim()).map(b => b.id);
              if (leftCh) handleProofreadPage(leftCh.id);
              if (rightCh) handleProofreadPage(rightCh.id);
            }}
            disabled={isProofreading}
            className="text-xs text-green-300 hover:text-white border border-green-800 rounded px-2 py-1 disabled:opacity-40"
          >
            {isProofreading ? '점검 중...' : '📝 펼친 면 점검'}
          </button>
          <span className="text-xs text-amber-200">{activeTab === 'student' ? '학생 자서전' : '선생님 자서전'}</span>
          <button onClick={() => {
            const allText = chapters.map((ch, i) => {
              const blocks = chapterBlocks[ch.id] || [];
              const text = blocks.map(b => b.currentText).filter(Boolean).join('\n');
              return `## 제${i+1}장 ${ch.title}\n\n${text || ch.content || ''}`;
            }).join('\n\n');
            navigator.clipboard.writeText(allText);
          }} className="text-xs text-stone-400 hover:text-white border border-stone-700 rounded px-2 py-1" aria-label="전체 복사">복사</button>
          <button onClick={onClose} className="text-xs text-stone-400 hover:text-white border border-stone-700 rounded px-2 py-1" aria-label="닫기">✕</button>
        </div>
      </div>

      {/* 목차 패널 */}
      {showToc && (
        <div className="absolute left-2 top-12 z-20 w-64 bg-white/95 rounded-lg shadow-2xl border border-amber-200 py-1 max-h-[75vh] overflow-y-auto backdrop-blur">
          <div className="px-3 py-1.5 text-xs font-bold text-amber-800 border-b border-amber-100">목차</div>
          {chapters.map((c, i) => {
            const summary = getBlockSummary(c.id);
            return (
              <button key={c.id} onClick={() => { goPage(i); setShowToc(false); }}
                className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 hover:bg-amber-50 ${Math.floor(i / 2) === spread ? 'bg-amber-100 font-semibold text-amber-900' : 'text-gray-700'}`}>
                <span className="text-[10px] text-amber-500 w-4">{i + 1}</span>
                <span className="flex-1 truncate">{c.title}</span>
                <div className="flex items-center gap-1">
                  {summary.total > 0 && (
                    <span className="text-[9px] text-gray-400">{summary.total}블록</span>
                  )}
                  <span className={`w-1.5 h-1.5 rounded-full ${summary.total > 0 || c.status === 'filled' ? 'bg-emerald-400' : 'bg-gray-300'}`} />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* 검색 패널 */}
      {showSearch && (
        <div className="absolute right-2 top-12 z-20 w-72 bg-white/95 rounded-lg shadow-2xl border border-amber-200 p-3 backdrop-blur">
          <div className="text-xs font-bold text-gray-800 mb-2">단어 검색</div>
          <div className="flex gap-1 mb-2">
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()}
              className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-400" placeholder="검색어 입력" autoFocus />
            <button onClick={doSearch} className="text-xs bg-amber-500 text-white rounded px-2 py-1 hover:bg-amber-600">검색</button>
          </div>
          {searchResults.length > 0 && (
            <div className="max-h-40 overflow-y-auto space-y-1">
              {searchResults.map((r, i) => (
                <button key={i} onClick={() => { goPage(r.page); setShowSearch(false); }}
                  className="w-full text-left px-2 py-1.5 text-xs bg-gray-50 hover:bg-amber-50 rounded border border-gray-100">
                  <span className="font-semibold text-amber-700">{r.page + 1}장 {r.title}</span>
                  <p className="text-gray-500 mt-0.5 truncate">{r.snippet}</p>
                </button>
              ))}
            </div>
          )}
          {searchQuery && searchResults.length === 0 && <p className="text-xs text-gray-400">결과 없음</p>}
          <div className="border-t border-gray-200 mt-2 pt-2">
            <div className="text-xs font-bold text-gray-800 mb-1">페이지 이동</div>
            <div className="flex gap-1">
              <input value={pageInput} onChange={e => setPageInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && goToPage()}
                className="w-16 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-400" placeholder="장 번호" type="number" min="1" max={chapters.length} />
              <button onClick={goToPage} className="text-xs bg-gray-200 text-gray-700 rounded px-2 py-1 hover:bg-gray-300">이동</button>
              <span className="text-[10px] text-gray-400 self-center ml-1">1~{chapters.length}</span>
            </div>
          </div>
        </div>
      )}

      {/* 질문 패널 */}
      {showQuestions && (
        <div className="absolute left-2 top-12 z-20 w-80 bg-white/95 rounded-lg shadow-2xl border border-purple-200 max-h-[75vh] overflow-y-auto backdrop-blur p-3">
          <QuestionsSection
            questions={activeTab === 'student' ? STUDENT_QUESTIONS : TEACHER_QUESTIONS}
            questionAnswers={questionAnswers || {}}
            setQuestionAnswers={setQuestionAnswers || (() => {})}
            followUps={followUps || {}}
            setFollowUps={setFollowUps || (() => {})}
            followUpAnswers={followUpAnswers || {}}
            setFollowUpAnswers={setFollowUpAnswers || (() => {})}
            expandedQ={expandedQ}
            setExpandedQ={setExpandedQ}
            isOpen={true}
            setIsOpen={() => setShowQuestions(false)}
          />
        </div>
      )}

      {/* 책 본문 + 좌우 넘김 */}
      <div className="flex-1 flex items-center justify-center relative">
        <button onClick={() => goSpread(spread - 1)} disabled={spread === 0} aria-label="이전 페이지"
          className="absolute left-0 top-0 bottom-0 w-6 flex items-center justify-center z-10 group">
          <span className={`text-2xl transition-opacity ${spread === 0 ? 'opacity-0' : 'opacity-60 group-hover:opacity-100'} text-white`}>‹</span>
        </button>

        <div className="flex shadow-[0_0_40px_rgba(0,0,0,0.4)] rounded-sm overflow-hidden" style={{ width: 'calc(100vw - 40px)', maxWidth: '1800px', height: 'calc(100vh - 100px)' }}>
          {/* 왼쪽 페이지 */}
          <div className="flex-1 bg-amber-50 relative" style={{ boxShadow: 'inset -8px 0 12px -8px rgba(0,0,0,0.08)' }}>
            {leftCh && (
              <ChapterContent
                ch={leftCh}
                idx={leftIdx}
                blocks={chapterBlocks[leftCh.id] || []}
                onAddBlock={addBlock}
                onUpdateBlock={updateBlock}
                onDeleteBlock={deleteBlock}
                onRestoreBlock={restoreBlock}
                onProofreadBlock={handleProofreadBlock}
                onProofreadPage={handleProofreadPage}
                proofreadResults={proofreadResults}
                isProofreading={isProofreading}
                onApplyProofread={applyProofread}
                onDismissProofread={dismissProofread}
                highlight={highlight}
                questionAnswers={questionAnswers}
                setQuestionAnswers={setQuestionAnswers}
                activeTab={activeTab}
              />
            )}
          </div>
          <div className="w-px bg-amber-300/60" />
          {/* 오른쪽 페이지 */}
          <div className="flex-1 bg-amber-50 relative hidden sm:block" style={{ boxShadow: 'inset 8px 0 12px -8px rgba(0,0,0,0.08)' }}>
            {rightCh ? (
              <ChapterContent
                ch={rightCh}
                idx={rightIdx}
                blocks={chapterBlocks[rightCh.id] || []}
                onAddBlock={addBlock}
                onUpdateBlock={updateBlock}
                onDeleteBlock={deleteBlock}
                onRestoreBlock={restoreBlock}
                onProofreadBlock={handleProofreadBlock}
                onProofreadPage={handleProofreadPage}
                proofreadResults={proofreadResults}
                isProofreading={isProofreading}
                onApplyProofread={applyProofread}
                onDismissProofread={dismissProofread}
                highlight={highlight}
                questionAnswers={questionAnswers}
                setQuestionAnswers={setQuestionAnswers}
                activeTab={activeTab}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-300 text-xs italic">— 끝 —</div>
            )}
          </div>
        </div>

        <button onClick={() => goSpread(spread + 1)} disabled={spread === maxSpread} aria-label="다음 페이지"
          className="absolute right-0 top-0 bottom-0 w-6 flex items-center justify-center z-10 group">
          <span className={`text-2xl transition-opacity ${spread === maxSpread ? 'opacity-0' : 'opacity-60 group-hover:opacity-100'} text-white`}>›</span>
        </button>
      </div>

      {/* 하단 인디케이터 */}
      <div className={`flex items-center justify-center gap-1.5 py-2 transition-opacity duration-500 ${controlsVisible ? 'opacity-100' : 'opacity-0'}`}>
        {Array.from({ length: maxSpread + 1 }).map((_, i) => (
          <button key={i} onClick={() => goSpread(i)} aria-label={`${i * 2 + 1}-${i * 2 + 2}장`}
            className={`w-1.5 h-1.5 rounded-full transition ${i === spread ? 'bg-amber-400 scale-150' : 'bg-stone-600 hover:bg-stone-500'}`} />
        ))}
      </div>
    </div>
  );
}

export default AutobiographyCompilation;
