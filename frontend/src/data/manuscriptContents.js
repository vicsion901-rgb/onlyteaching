const MANUSCRIPT_CONTENTS = [
  // ═══ 퍼블릭도메인: 윤동주 ═══
  {
    id: 'pd-yoon-001',
    category: 'public-domain',
    author: '윤동주',
    title: '서시',
    text: '죽는 날까지 하늘을 우러러\n한 점 부끄럼이 없기를,\n잎새에 이는 바람에도\n나는 괴로워했다.',
    grade: [5, 6],
    spacingDifficulty: 'medium',
    tags: ['시', '필사'],
    theme: '마음',
    copyrightStatus: 'public_domain',
    sourceNote: '사후 70년 경과',
  },
  {
    id: 'pd-yoon-002',
    category: 'public-domain',
    author: '윤동주',
    title: '별 헤는 밤 (발췌)',
    text: '계절이 지나가는 하늘에는\n가을로 가득 차 있습니다.\n나는 아무 걱정도 없이\n가을 속의 별들을\n다 헬 듯합니다.',
    grade: [5, 6],
    spacingDifficulty: 'medium',
    tags: ['시', '필사'],
    theme: '계절',
    copyrightStatus: 'public_domain',
    sourceNote: '사후 70년 경과, 발췌',
  },
  {
    id: 'pd-yoon-003',
    category: 'public-domain',
    author: '윤동주',
    title: '새로운 길',
    text: '내를 건너서 숲으로\n고개를 넘어서 마을로\n어제도 가고 오늘도 갈\n나의 길 새로운 길',
    grade: [3, 4, 5, 6],
    spacingDifficulty: 'easy',
    tags: ['시', '필사'],
    theme: '마음',
    copyrightStatus: 'public_domain',
    sourceNote: '사후 70년 경과',
  },

  // ═══ 퍼블릭도메인: 김소월 ═══
  {
    id: 'pd-kim-001',
    category: 'public-domain',
    author: '김소월',
    title: '진달래꽃 (발췌)',
    text: '나 보기가 역겨워\n가실 때에는\n말없이 고이 보내 드리우리다.\n영변에 약산\n진달래꽃\n아름 따다 가실 길에 뿌리우리다.',
    grade: [5, 6],
    spacingDifficulty: 'medium',
    tags: ['시', '필사'],
    theme: '계절',
    copyrightStatus: 'public_domain',
    sourceNote: '사후 70년 경과, 발췌',
  },
  {
    id: 'pd-kim-002',
    category: 'public-domain',
    author: '김소월',
    title: '엄마야 누나야',
    text: '엄마야 누나야 강변 살자\n뜰에는 반짝이는 금모래빛\n뒷문 밖에는 갈잎의 노래\n엄마야 누나야 강변 살자',
    grade: [3, 4, 5, 6],
    spacingDifficulty: 'easy',
    tags: ['시', '필사'],
    theme: '가족',
    copyrightStatus: 'public_domain',
    sourceNote: '사후 70년 경과',
  },

  // ═══ 퍼블릭도메인: 한용운 ═══
  {
    id: 'pd-han-001',
    category: 'public-domain',
    author: '한용운',
    title: '님의 침묵 (발췌)',
    text: '님은 갔습니다.\n아아, 사랑하는 나의 님은 갔습니다.\n푸른 산빛을 깨치고\n단풍나무 숲을 향하여\n난 작은 길을 걸어서\n차마 떨치고 갔습니다.',
    grade: [5, 6],
    spacingDifficulty: 'hard',
    tags: ['시', '필사'],
    theme: '마음',
    copyrightStatus: 'public_domain',
    sourceNote: '사후 70년 경과, 발췌',
  },

  // ═══ 퍼블릭도메인: 이육사 ═══
  {
    id: 'pd-lee-001',
    category: 'public-domain',
    author: '이육사',
    title: '청포도',
    text: '내 고장 칠월은\n청포도가 익어 가는 시절.\n이 마을 전설이 주저리주저리 열리고\n먼 데 하늘이 꿈꾸며 알알이 들어와 박혀',
    grade: [5, 6],
    spacingDifficulty: 'hard',
    tags: ['시', '필사'],
    theme: '계절',
    copyrightStatus: 'public_domain',
    sourceNote: '사후 70년 경과, 발췌',
  },

  // ═══ 퍼블릭도메인: 방정환 ═══
  {
    id: 'pd-bang-001',
    category: 'public-domain',
    author: '방정환',
    title: '어린이 노래',
    text: '날아라 새들아 푸른 하늘을\n달려라 냇물아 푸른 벌판을\n오월은 푸르구나 우리들은 자란다\n오늘은 어린이날 우리들 세상',
    grade: [3, 4],
    spacingDifficulty: 'easy',
    tags: ['동시', '필사'],
    theme: '학교',
    copyrightStatus: 'public_domain',
    sourceNote: '사후 70년 경과',
  },

  // ═══ 교육용 자체 제작 시 ═══
  {
    id: 'edu-poem-001',
    category: 'educational',
    author: '교육용',
    title: '아침 교실',
    text: '햇살이 창문을 두드린다\n책상 위에 빛이 내려앉는다\n오늘도 우리 교실은\n작은 이야기로 가득하다',
    grade: [3, 4, 5, 6],
    spacingDifficulty: 'easy',
    tags: ['시', '필사'],
    theme: '학교',
    copyrightStatus: 'original',
    sourceNote: '교육용 자체 제작',
  },
  {
    id: 'edu-poem-002',
    category: 'educational',
    author: '교육용',
    title: '봄비 오는 날',
    text: '보슬보슬 봄비가 내린다\n우산 위로 작은 노래가 떨어진다\n웅덩이 속에 하늘이 비치고\n내 발자국이 동그라미를 그린다',
    grade: [3, 4],
    spacingDifficulty: 'easy',
    tags: ['시', '필사'],
    theme: '계절',
    copyrightStatus: 'original',
    sourceNote: '교육용 자체 제작',
  },

  // ═══ 퍼블릭도메인: 속담/고전 ═══
  {
    id: 'pd-proverb-001',
    category: 'public-domain',
    author: '속담',
    title: '지혜로운 속담 모음 1',
    text: '가는 말이 고와야 오는 말이 곱다.\n낮말은 새가 듣고 밤말은 쥐가 듣는다.\n세 살 버릇 여든까지 간다.\n백지장도 맞들면 낫다.',
    grade: [3, 4, 5, 6],
    spacingDifficulty: 'easy',
    tags: ['속담', '필사', '띄어쓰기'],
  },
  {
    id: 'pd-proverb-002',
    category: 'public-domain',
    author: '속담',
    title: '지혜로운 속담 모음 2',
    text: '고래 싸움에 새우 등 터진다.\n우물 안 개구리.\n소 잃고 외양간 고친다.\n등잔 밑이 어둡다.\n원숭이도 나무에서 떨어진다.',
    grade: [3, 4, 5, 6],
    spacingDifficulty: 'easy',
    tags: ['속담', '필사', '띄어쓰기'],
  },
  {
    id: 'pd-proverb-003',
    category: 'public-domain',
    author: '속담',
    title: '지혜로운 속담 모음 3',
    text: '티끌 모아 태산.\n하늘이 무너져도 솟아날 구멍이 있다.\n콩 심은 데 콩 나고 팥 심은 데 팥 난다.\n아는 길도 물어 가라.',
    grade: [3, 4, 5, 6],
    spacingDifficulty: 'medium',
    tags: ['속담', '필사', '띄어쓰기'],
  },

  // ═══ 교육용: 짧은 문장 (띄어쓰기 연습용) ═══
  {
    id: 'edu-spacing-001',
    category: 'educational',
    author: '교육용',
    title: '띄어쓰기 연습 - 쉬운 문장',
    text: '나는 오늘 학교에서 친구와 놀았다.\n엄마가 맛있는 저녁을 만들어 주셨다.\n강아지가 꼬리를 흔들며 뛰어왔다.\n하늘에 하얀 구름이 떠 있었다.',
    grade: [3, 4],
    spacingDifficulty: 'easy',
    tags: ['띄어쓰기', '문장'],
  },
  {
    id: 'edu-spacing-002',
    category: 'educational',
    author: '교육용',
    title: '띄어쓰기 연습 - 보통 문장',
    text: '도서관에서 빌린 책을 다 읽었다.\n방학 동안 할머니 댁에 다녀왔다.\n친구에게 생일 선물을 만들어 주었다.\n우리 반 아이들이 운동장에서 축구를 했다.',
    grade: [3, 4, 5],
    spacingDifficulty: 'medium',
    tags: ['띄어쓰기', '문장'],
  },
  {
    id: 'edu-spacing-003',
    category: 'educational',
    author: '교육용',
    title: '띄어쓰기 연습 - 어려운 문장',
    text: '그때까지만 해도 아무 일도 없을 줄 알았다.\n할 수 있는 만큼 최선을 다해 보자.\n이것저것 따져 볼 것도 없이 바로 출발했다.\n어쩔 수 없이 혼자서 해 내야만 했다.',
    grade: [5, 6],
    spacingDifficulty: 'hard',
    tags: ['띄어쓰기', '문장'],
  },

  // ═══ 교육용: 오탈자 연습용 원문 ═══
  {
    id: 'edu-typo-001',
    category: 'educational',
    author: '교육용',
    title: '헷갈리는 맞춤법 1',
    text: '왠지 오늘은 기분이 좋다.\n어이없는 일이 벌어졌다.\n며칠 동안 비가 내렸다.\n설거지를 깨끗이 했다.',
    grade: [3, 4, 5, 6],
    spacingDifficulty: 'medium',
    tags: ['오탈자', '맞춤법'],
  },
  {
    id: 'edu-typo-002',
    category: 'educational',
    author: '교육용',
    title: '헷갈리는 맞춤법 2',
    text: '안 되는 일은 안 된다.\n웬만하면 참으려고 했다.\n다르게 생각해 보았다.\n일찍이 일어나서 준비했다.',
    grade: [4, 5, 6],
    spacingDifficulty: 'medium',
    tags: ['오탈자', '맞춤법'],
  },
  {
    id: 'edu-typo-003',
    category: 'educational',
    author: '교육용',
    title: '헷갈리는 맞춤법 3',
    text: '금세 날이 어두워졌다.\n오랫동안 기다렸다.\n깨끗이 청소를 마쳤다.\n곰곰이 생각해 보았다.',
    grade: [4, 5, 6],
    spacingDifficulty: 'medium',
    tags: ['오탈자', '맞춤법'],
  },

  // ═══ 퍼블릭도메인: 이어쓰기용 ═══
  {
    id: 'pd-continue-001',
    category: 'public-domain',
    author: '윤동주',
    title: '서시 이어쓰기',
    text: '죽는 날까지 하늘을 우러러\n한 점 부끄럼이 없기를,',
    continuePrompt: '이 시의 다음을 내 말로 이어서 써 보세요.',
    grade: [5, 6],
    spacingDifficulty: 'medium',
    tags: ['이어쓰기', '시'],
  },
  {
    id: 'pd-continue-002',
    category: 'public-domain',
    author: '김소월',
    title: '엄마야 누나야 이어쓰기',
    text: '엄마야 누나야 강변 살자\n뜰에는 반짝이는 금모래빛',
    continuePrompt: '강변에서 어떤 일이 일어날지 이어서 써 보세요.',
    grade: [3, 4, 5, 6],
    spacingDifficulty: 'easy',
    tags: ['이어쓰기', '시'],
  },
  {
    id: 'edu-continue-001',
    category: 'educational',
    author: '교육용',
    title: '이야기 시작 - 숲속 모험',
    text: '어느 맑은 날, 작은 다람쥐 한 마리가\n커다란 떡갈나무 아래에서 눈을 떴다.',
    continuePrompt: '다람쥐에게 어떤 일이 벌어질까요? 이어서 써 보세요.',
    grade: [3, 4],
    spacingDifficulty: 'easy',
    tags: ['이어쓰기', '이야기'],
  },
  {
    id: 'edu-continue-002',
    category: 'educational',
    author: '교육용',
    title: '이야기 시작 - 비 오는 날',
    text: '빗소리가 창문을 두드렸다.\n책상 위에 놓인 편지 한 통이 눈에 들어왔다.',
    continuePrompt: '편지에는 어떤 내용이 적혀 있었을까요?',
    grade: [4, 5, 6],
    spacingDifficulty: 'medium',
    tags: ['이어쓰기', '이야기'],
  },
];

// 오탈자 생성용 변조 맵 (음운 유사)
const TYPO_MUTATIONS = {
  '왠': '웬', '웬': '왠',
  '되': '돼', '돼': '되',
  '며칠': '몇일',
  '깨끗이': '깨끗히',
  '일찍이': '일찍히',
  '곰곰이': '곰곰히',
  '안': '않', '않': '안',
  '금세': '금새',
  '오랫동안': '오랬동안',
  '어이': '어의',
  '설거지': '설겆이',
  '다르': '틀리',
  // 받침 혼동
  '있': '잇', '없': '업',
  '갔': '갓', '했': '핬',
  '왔': '왓', '났': '낫',
  // 모음 혼동
  '우': '울', '으': '을',
  '해': '헤', '개': '게',
};

function generateTypoVersion(text, difficulty = 'medium') {
  const count = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3;
  const words = text.split('');
  const mutations = [];
  const keys = Object.keys(TYPO_MUTATIONS);

  let applied = 0;
  for (let attempt = 0; attempt < 50 && applied < count; attempt++) {
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    const idx = text.indexOf(randomKey, applied > 0 ? mutations[applied - 1].index + 2 : 0);
    if (idx === -1) continue;

    const alreadyUsed = mutations.some(m => Math.abs(m.index - idx) < 3);
    if (alreadyUsed) continue;

    mutations.push({
      index: idx,
      original: randomKey,
      mutated: TYPO_MUTATIONS[randomKey],
    });
    applied++;
  }

  let result = text;
  for (let i = mutations.length - 1; i >= 0; i--) {
    const m = mutations[i];
    result = result.slice(0, m.index) + m.mutated + result.slice(m.index + m.original.length);
  }

  return { mutatedText: result, mutations };
}

export { MANUSCRIPT_CONTENTS, TYPO_MUTATIONS, generateTypoVersion };
