import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';

const DEFAULT_KEYWORDS = [
  { keyword_id: 1, keyword: '성실', category: '학습태도' },
  { keyword_id: 2, keyword: '협력', category: '사회성' },
  { keyword_id: 3, keyword: '배려', category: '인성' },
  { keyword_id: 4, keyword: '책임감', category: '인성' },
  { keyword_id: 5, keyword: '창의력', category: '학습역량' },
  { keyword_id: 6, keyword: '발표력', category: '학습역량' },
  { keyword_id: 7, keyword: '탐구심', category: '학습역량' },
  { keyword_id: 8, keyword: '끈기', category: '학습태도' },
  { keyword_id: 9, keyword: '주도성', category: '학습태도' },
  { keyword_id: 10, keyword: '정리정돈', category: '생활습관' },
  { keyword_id: 11, keyword: '공감', category: '사회성' },
  { keyword_id: 12, keyword: '리더십', category: '사회성' },
  { keyword_id: 13, keyword: '경청', category: '사회성' },
  { keyword_id: 14, keyword: '자기표현', category: '학습역량' },
  { keyword_id: 15, keyword: '규칙준수', category: '생활습관' },
  { keyword_id: 16, keyword: '예의바름', category: '인성' },
  { keyword_id: 17, keyword: '자신감', category: '학습태도' },
  { keyword_id: 18, keyword: '집중력', category: '학습태도' },
  { keyword_id: 19, keyword: '문제해결', category: '학습역량' },
  { keyword_id: 20, keyword: '봉사정신', category: '인성' },
  { keyword_id: 21, keyword: '독서', category: '학습역량' },
  { keyword_id: 22, keyword: '글쓰기', category: '학습역량' },
  { keyword_id: 23, keyword: '수학적사고', category: '학습역량' },
  { keyword_id: 24, keyword: '체육활동', category: '건강' },
  { keyword_id: 25, keyword: '음악감수성', category: '예술' },
  { keyword_id: 26, keyword: '미술표현', category: '예술' },
  { keyword_id: 27, keyword: '친구관계', category: '사회성' },
  { keyword_id: 28, keyword: '긍정적태도', category: '인성' },
  { keyword_id: 29, keyword: '시간관리', category: '생활습관' },
  { keyword_id: 30, keyword: '도전정신', category: '학습태도' },
  { keyword_id: 31, keyword: '관찰력', category: '학습역량' },
  { keyword_id: 32, keyword: '의사소통', category: '사회성' },
  { keyword_id: 33, keyword: '정직', category: '인성' },
  { keyword_id: 34, keyword: '감사', category: '인성' },
  { keyword_id: 35, keyword: '인내심', category: '인성' },
  { keyword_id: 36, keyword: '호기심', category: '학습태도' },
  { keyword_id: 37, keyword: '자기관리', category: '생활습관' },
  { keyword_id: 38, keyword: '과학탐구', category: '학습역량' },
  { keyword_id: 39, keyword: '사회참여', category: '사회성' },
  { keyword_id: 40, keyword: '안전의식', category: '생활습관' },
  { keyword_id: 41, keyword: '기초체력', category: '건강' },
  { keyword_id: 42, keyword: '건강습관', category: '건강' },
  { keyword_id: 43, keyword: '운동능력', category: '건강' },
  { keyword_id: 44, keyword: '바른자세', category: '건강' },
  { keyword_id: 45, keyword: '식습관', category: '건강' },
  { keyword_id: 46, keyword: '체력향상', category: '건강' },
  { keyword_id: 47, keyword: '안전행동', category: '건강' },
  { keyword_id: 48, keyword: '창작활동', category: '예술' },
  { keyword_id: 49, keyword: '무용표현', category: '예술' },
  { keyword_id: 50, keyword: '감상능력', category: '예술' },
  { keyword_id: 51, keyword: '악기연주', category: '예술' },
  { keyword_id: 52, keyword: '연극활동', category: '예술' },
  { keyword_id: 53, keyword: '디자인감각', category: '예술' },
  { keyword_id: 54, keyword: '상상력', category: '예술' },
];

const CATEGORY_COLORS = {
  학습태도: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200',
  학습역량: 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200',
  인성: 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200',
  사회성: 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200',
  생활습관: 'bg-pink-100 text-pink-700 border-pink-200 hover:bg-pink-200',
  건강: 'bg-cyan-100 text-cyan-700 border-cyan-200 hover:bg-cyan-200',
  예술: 'bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-200',
};

const CATEGORY_SELECTED = {
  학습태도: 'bg-blue-500 text-white border-blue-500',
  학습역량: 'bg-emerald-500 text-white border-emerald-500',
  인성: 'bg-amber-500 text-white border-amber-500',
  사회성: 'bg-purple-500 text-white border-purple-500',
  생활습관: 'bg-pink-500 text-white border-pink-500',
  건강: 'bg-cyan-500 text-white border-cyan-500',
  예술: 'bg-rose-500 text-white border-rose-500',
};

function LifeRecords() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [keywordResults, setKeywordResults] = useState({});
  const [keywordLevels, setKeywordLevels] = useState({});
  const [fullText, setFullText] = useState('');
  const [usedModel, setUsedModel] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [allKeywords, setAllKeywords] = useState(DEFAULT_KEYWORDS);
  const [selectedKeywords, setSelectedKeywords] = useState([]);
  const [studentName, setStudentName] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);

  const [students, setStudents] = useState([]);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await client.get('/api/students');
        setStudents(res.data || []);
      } catch (error) {
        console.error('Failed to fetch students', error);
      }
    };
    fetchStudents();
  }, []);

  useEffect(() => {
    const fetchKeywords = async () => {
      const endpoints = ['/api/liferecords?action=keywords&query=', '/life-records/keywords'];
      for (const ep of endpoints) {
        try {
          const res = await client.get(ep, { timeout: 8000, __retryCount: 99 });
          const data = Array.isArray(res.data) ? res.data : [];
          if (data.length > 0) {
            setAllKeywords(data.map((k, i) => ({
              keyword_id: k.keyword_id || i + 1,
              keyword: k.keyword || k.category || k,
              category: k.category || k.subcategory || '',
            })));
            return;
          }
        } catch {
          // 다음 endpoint 시도
        }
      }
      console.warn('All keyword endpoints failed');
    };
    fetchKeywords();
  }, []);

  const categories = useMemo(() => {
    const cats = {};
    allKeywords.forEach(k => {
      if (k.category) cats[k.category] = (cats[k.category] || 0) + 1;
    });
    return Object.keys(cats).sort();
  }, [allKeywords]);

  const filteredKeywords = useMemo(() => {
    let kws = allKeywords;
    if (activeCategory) {
      kws = kws.filter(k => k.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      kws = kws.filter(k => k.keyword.toLowerCase().includes(q));
    }
    return kws;
  }, [allKeywords, activeCategory, searchQuery]);

  const isSelected = (kw) => selectedKeywords.some(s => s.keyword_id === kw.keyword_id);

  const toggleKeyword = (kw) => {
    if (isSelected(kw)) {
      setSelectedKeywords(prev => prev.filter(s => s.keyword_id !== kw.keyword_id));
    } else {
      setSelectedKeywords(prev => [...prev, kw]);
    }
  };

  const removeKeyword = (kwId) => {
    setSelectedKeywords(prev => prev.filter(s => s.keyword_id !== kwId));
  };

  const LEVEL_TEMPLATES = {
    성실: { 상: '수업에 빠짐없이 참여하며 맡은 과제를 꾸준히 수행함.', 중: '수업 활동에 참여하며 과제를 수행할 수 있음.', 하: '수업에 꾸준히 참여하기 위해 노력하고 있음.' },
    협력: { 상: '모둠 활동에서 친구의 의견을 경청하고 함께 결과를 만들어감.', 중: '모둠 활동에 참여하며 역할을 수행할 수 있음.', 하: '모둠 활동에서 친구들과 함께하려는 노력이 보임.' },
    배려: { 상: '주변 친구를 살피고 어려움이 있을 때 먼저 도움을 건넴.', 중: '친구를 도울 수 있으며 배려하는 마음이 있음.', 하: '친구를 배려하는 태도를 기르기 위해 노력하고 있음.' },
    책임감: { 상: '맡은 역할을 끝까지 수행하며 결과에 대해 책임지는 모습을 보임.', 중: '맡은 역할을 수행할 수 있음.', 하: '맡은 역할을 책임감 있게 완수하기 위해 노력하고 있음.' },
    창의력: { 상: '문제 상황에서 다양한 방법을 시도하며 새로운 아이디어를 제안함.', 중: '활동에서 자기 생각을 표현할 수 있음.', 하: '다양한 아이디어를 떠올리기 위해 노력하고 있음.' },
    발표력: { 상: '수업 시간에 자신의 생각을 또렷하게 전달하며 발표함.', 중: '발표 활동에 참여할 수 있음.', 하: '발표에 자신감을 갖기 위해 노력하고 있음.' },
    탐구심: { 상: '궁금한 것이 있으면 스스로 찾아보고 탐색하는 자세를 보임.', 중: '학습 주제에 관심을 갖고 참여할 수 있음.', 하: '학습 주제에 대한 관심을 넓혀가고 있음.' },
    끈기: { 상: '어려운 과제도 포기하지 않고 끝까지 도전하는 모습을 보임.', 중: '주어진 과제를 마무리할 수 있음.', 하: '어려운 과제를 끝까지 해내기 위해 노력하고 있음.' },
    주도성: { 상: '스스로 학습 계획을 세우고 실천하는 모습이 돋보임.', 중: '학습 활동에 참여할 수 있음.', 하: '스스로 활동을 계획하고 실천하려는 노력이 나아지고 있음.' },
    정리정돈: { 상: '활동 후 자리를 스스로 정돈하며 깨끗한 환경을 유지함.', 중: '자리를 정리할 수 있음.', 하: '정리정돈 습관을 기르기 위해 노력하고 있음.' },
    공감: { 상: '친구의 이야기에 귀 기울이며 감정을 이해하려는 태도를 보임.', 중: '친구의 이야기를 들을 수 있음.', 하: '친구의 마음을 이해하려는 노력이 나아지고 있음.' },
    리더십: { 상: '모둠 활동에서 방향을 제시하고 친구들을 이끄는 모습을 보임.', 중: '모둠 활동에서 역할을 수행할 수 있음.', 하: '친구들과 함께 활동을 이끌어가기 위해 노력하고 있음.' },
    경청: { 상: '친구와 교사의 말에 집중하며 경청하는 태도를 보임.', 중: '다른 사람의 말을 들을 수 있음.', 하: '다른 사람의 말에 집중하려는 노력이 보임.' },
    자기표현: { 상: '자신의 생각과 감정을 적절한 방법으로 표현함.', 중: '자기 생각을 표현할 수 있음.', 하: '자기 생각을 표현하는 능력을 키우기 위해 노력하고 있음.' },
    규칙준수: { 상: '학급 규칙과 약속을 잘 지키며 질서 있는 생활을 함.', 중: '학급 규칙을 지킬 수 있음.', 하: '학급 규칙을 지키기 위해 노력하고 있음.' },
    예의바름: { 상: '교사와 친구들에게 공손하게 인사하고 바른 언어 습관을 보임.', 중: '인사를 하고 바른 말을 사용할 수 있음.', 하: '예의 바른 태도를 기르기 위해 노력하고 있음.' },
    자신감: { 상: '새로운 활동에 자신감 있게 참여하는 모습을 보임.', 중: '활동에 참여할 수 있음.', 하: '자신감을 갖고 활동에 참여하기 위해 노력하고 있음.' },
    집중력: { 상: '수업 시간에 집중하여 교사의 설명을 잘 따라감.', 중: '수업에 참여할 수 있음.', 하: '수업에 집중하는 습관을 기르기 위해 노력하고 있음.' },
    문제해결: { 상: '문제 상황에서 스스로 해결 방법을 찾아 적용함.', 중: '문제를 해결하려는 시도를 할 수 있음.', 하: '문제 상황에서 해결 방법을 찾기 위해 노력하고 있음.' },
    봉사정신: { 상: '학급과 학교를 위해 자발적으로 봉사하는 모습을 보임.', 중: '학급 활동에 참여할 수 있음.', 하: '학급을 위해 봉사하는 마음을 기르기 위해 노력하고 있음.' },
    독서: { 상: '다양한 분야의 책을 즐겨 읽으며 독서 습관이 잘 형성되어 있음.', 중: '책을 읽고 내용을 이해할 수 있음.', 하: '독서 습관을 기르기 위해 노력하고 있음.' },
    글쓰기: { 상: '자기 생각을 글로 정리하는 능력이 우수함.', 중: '자기 생각을 글로 쓸 수 있음.', 하: '글쓰기 능력을 향상시키기 위해 노력하고 있음.' },
    수학적사고: { 상: '수학적 원리를 이해하고 문제에 적용하는 능력을 보임.', 중: '수학 문제를 풀 수 있음.', 하: '수학적 사고력을 키우기 위해 노력하고 있음.' },
    체육활동: { 상: '체육 활동에 적극적으로 참여하며 운동 기능이 향상됨.', 중: '체육 활동에 참여할 수 있음.', 하: '체육 활동에 즐겁게 참여하기 위해 노력하고 있음.' },
    음악감수성: { 상: '음악을 듣고 느낌을 자연스럽게 표현함.', 중: '음악 활동에 참여할 수 있음.', 하: '음악에 대한 관심을 넓혀가고 있음.' },
    미술표현: { 상: '다양한 재료를 활용하여 창의적으로 표현함.', 중: '미술 활동에 참여할 수 있음.', 하: '미술 표현력을 키우기 위해 노력하고 있음.' },
    친구관계: { 상: '친구들과 원만한 관계를 유지하며 즐겁게 학교생활을 함.', 중: '친구들과 지낼 수 있음.', 하: '친구들과 원만하게 지내기 위해 노력하고 있음.' },
    긍정적태도: { 상: '어려운 상황에서도 긍정적인 태도로 임함.', 중: '활동에 참여하는 태도를 보임.', 하: '긍정적인 태도를 기르기 위해 노력하고 있음.' },
    시간관리: { 상: '정해진 시간 안에 과제를 완수하는 습관이 잘 형성됨.', 중: '시간 안에 과제를 마칠 수 있음.', 하: '시간을 잘 관리하기 위해 노력하고 있음.' },
    도전정신: { 상: '새로운 활동이나 어려운 과제에 적극적으로 도전함.', 중: '새로운 활동에 참여할 수 있음.', 하: '새로운 활동에 도전하는 자세를 기르기 위해 노력하고 있음.' },
    관찰력: { 상: '주변 환경과 현상을 세심하게 관찰하는 능력을 보임.', 중: '주변을 관찰할 수 있음.', 하: '관찰하는 습관을 기르기 위해 노력하고 있음.' },
    의사소통: { 상: '자기 의견을 명확하게 전달하고 상대의 말을 잘 이해함.', 중: '자기 의견을 전달할 수 있음.', 하: '의사소통 능력을 키우기 위해 노력하고 있음.' },
    정직: { 상: '거짓 없이 솔직하게 행동하며 신뢰를 얻음.', 중: '솔직하게 행동할 수 있음.', 하: '정직한 태도를 기르기 위해 노력하고 있음.' },
    감사: { 상: '도움을 받았을 때 감사의 마음을 표현할 줄 앎.', 중: '감사의 마음을 표현할 수 있음.', 하: '감사하는 마음을 표현하기 위해 노력하고 있음.' },
    인내심: { 상: '어려운 상황에서도 참고 기다리며 끈기 있게 노력함.', 중: '참고 기다릴 수 있음.', 하: '인내심을 기르기 위해 노력하고 있음.' },
    호기심: { 상: '새로운 것에 대한 궁금증이 많고 탐색하려는 자세를 보임.', 중: '새로운 것에 관심을 가질 수 있음.', 하: '다양한 분야에 호기심을 갖기 위해 노력하고 있음.' },
    자기관리: { 상: '자신의 물건과 학습 환경을 스스로 관리함.', 중: '자기 물건을 관리할 수 있음.', 하: '자기 관리 습관을 기르기 위해 노력하고 있음.' },
    과학탐구: { 상: '과학적 현상에 관심을 갖고 탐구하는 자세를 보임.', 중: '과학 활동에 참여할 수 있음.', 하: '과학적 탐구심을 키우기 위해 노력하고 있음.' },
    사회참여: { 상: '학급과 학교 행사에 적극적으로 참여함.', 중: '학급 행사에 참여할 수 있음.', 하: '학급 활동에 적극적으로 참여하기 위해 노력하고 있음.' },
    안전의식: { 상: '안전 수칙을 잘 지키며 위험한 행동을 삼감.', 중: '안전 수칙을 지킬 수 있음.', 하: '안전한 행동을 실천하기 위해 노력하고 있음.' },
    기초체력: { 상: '기초 체력이 꾸준히 향상되고 있음.', 중: '기초 체력 활동에 참여할 수 있음.', 하: '기초 체력을 키우기 위해 노력하고 있음.' },
    건강습관: { 상: '손씻기, 위생 관리 등 건강한 생활 습관을 실천함.', 중: '건강 습관을 지킬 수 있음.', 하: '건강한 생활 습관을 기르기 위해 노력하고 있음.' },
    운동능력: { 상: '다양한 운동 기능을 익히며 꾸준히 성장하고 있음.', 중: '운동 활동에 참여할 수 있음.', 하: '운동 능력을 향상시키기 위해 노력하고 있음.' },
    바른자세: { 상: '앉는 자세와 서는 자세가 바르며 좋은 습관을 유지함.', 중: '바른 자세를 유지할 수 있음.', 하: '바른 자세를 유지하기 위해 노력하고 있음.' },
    식습관: { 상: '골고루 먹으며 건강한 식습관을 형성하고 있음.', 중: '급식을 먹을 수 있음.', 하: '편식을 줄이기 위해 노력하고 있음.' },
    체력향상: { 상: '체력 검사에서 꾸준한 성장을 보이고 있음.', 중: '체력 활동에 참여할 수 있음.', 하: '체력을 향상시키기 위해 꾸준히 노력하고 있음.' },
    안전행동: { 상: '교실과 운동장에서 안전한 행동을 실천함.', 중: '안전하게 행동할 수 있음.', 하: '안전한 행동을 실천하기 위해 노력하고 있음.' },
    창작활동: { 상: '자유롭게 만들고 꾸미는 활동에 즐겁게 참여함.', 중: '창작 활동에 참여할 수 있음.', 하: '창작 활동에 흥미를 갖기 위해 노력하고 있음.' },
    무용표현: { 상: '몸으로 감정과 이야기를 자연스럽게 표현함.', 중: '무용 활동에 참여할 수 있음.', 하: '몸으로 표현하는 능력을 키우기 위해 노력하고 있음.' },
    감상능력: { 상: '작품을 감상하고 느낌을 자기 말로 표현할 줄 앎.', 중: '작품을 감상할 수 있음.', 하: '작품 감상 능력을 기르기 위해 노력하고 있음.' },
    악기연주: { 상: '악기 연주에 꾸준히 참여하며 실력이 향상됨.', 중: '악기 연주에 참여할 수 있음.', 하: '악기 연주 실력을 키우기 위해 노력하고 있음.' },
    연극활동: { 상: '역할극에서 인물의 감정을 잘 표현함.', 중: '연극 활동에 참여할 수 있음.', 하: '연극에서 표현력을 키우기 위해 노력하고 있음.' },
    디자인감각: { 상: '색감과 구성에 대한 감각이 돋보임.', 중: '디자인 활동에 참여할 수 있음.', 하: '디자인 감각을 키우기 위해 노력하고 있음.' },
    상상력: { 상: '풍부한 상상력으로 독창적인 이야기를 만들어냄.', 중: '상상력을 활용한 활동에 참여할 수 있음.', 하: '상상력을 발휘하기 위해 노력하고 있음.' },
  };

  const localFallbackGenerate = (keywords, name, levels) => {
    const getEnding = (s) => s.replace(/\.$/, '').slice(-2);
    let prevEnding = '';
    const results = {};
    keywords.forEach(kw => {
      const level = (levels && levels[kw]) || '상';
      const t = LEVEL_TEMPLATES[kw];
      if (!t) {
        const fb = level === '상' ? `${name || '해당 학생'}은(는) ${kw}과(와) 관련된 활동에서 꾸준한 성장을 보이고 있음.`
          : level === '중' ? `${kw} 관련 활동에 참여할 수 있음.`
          : `${kw} 관련 활동에서 성장하기 위해 노력하고 있음.`;
        prevEnding = getEnding(fb);
        results[kw] = fb;
        return;
      }
      let pick = t[level];
      if (getEnding(pick) === prevEnding) {
        const alt = level === '상' ? t['중'] : level === '중' ? t['상'] : t['중'];
        if (getEnding(alt) !== prevEnding) pick = alt;
      }
      prevEnding = getEnding(pick);
      results[kw] = pick;
    });
    return results;
  };

  const handleGenerate = async (e) => {
    e?.preventDefault();
    const keywordTexts = selectedKeywords.map(k => k.keyword);
    const typed = searchQuery.trim();

    if (keywordTexts.length === 0 && typed) {
      keywordTexts.push(typed);
    }

    if (keywordTexts.length === 0) {
      alert('키워드를 1개 이상 선택해주세요.');
      return;
    }

    setIsLoading(true);
    setKeywordResults({});
    setFullText('');

    // 즉시 로컬 fallback 표시
    const localResults = localFallbackGenerate(keywordTexts, studentName.trim(), keywordLevels);
    setKeywordResults(localResults);
    setFullText(Object.values(localResults).join(' '));
    setUsedModel('local');
    setIsLoading(false);

    // 백그라운드에서 AI 생성 시도 → 성공하면 덮어쓰기
    const endpoints = ['/api/liferecords?action=generate', '/life-records/generate'];
    for (const ep of endpoints) {
      try {
        const res = await client.post(ep, {
          selected_keywords: keywordTexts,
          student_name: studentName.trim(),
          additional_context: additionalContext.trim(),
        }, { timeout: 12000, __retryCount: 99 });
        const result = res.data;
        if (result?.keyword_results && Object.keys(result.keyword_results).length > 0) {
          setKeywordResults(result.keyword_results);
          setFullText(result.generated_text || Object.values(result.keyword_results).join(' '));
          setUsedModel(result.ai_model || 'server');
        }
        break;
      } catch {
        // 다음 endpoint 시도
      }
    }
  };

  const changeLevel = (kw, level) => {
    const newLevels = { ...keywordLevels, [kw]: level };
    setKeywordLevels(newLevels);
    const t = LEVEL_TEMPLATES[kw];
    if (t && t[level]) {
      setKeywordResults(prev => ({ ...prev, [kw]: t[level] }));
    }
  };

  const copyResult = () => {
    const hasKeywordResults = Object.keys(keywordResults).length > 0;
    if (hasKeywordResults) {
      const text = Object.entries(keywordResults).map(([kw, sentence]) => sentence).join(' ');
      navigator.clipboard.writeText(text);
    } else if (fullText) {
      navigator.clipboard.writeText(fullText);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📝 생활기록부</h1>
          <p className="mt-1 text-sm text-gray-500">키워드를 선택하면 학생별 맞춤 생활기록부 문장을 생성합니다</p>
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="text-primary-600 hover:text-primary-900 font-medium"
        >
          &larr; 홈으로
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 왼쪽: 입력 */}
        <div className="space-y-3">
          {/* 학생 이름 */}
          <div className="bg-white shadow rounded-lg p-3">
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-1">학생 이름</label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => { setStudentName(e.target.value); setShowStudentDropdown(true); }}
                onFocus={() => setShowStudentDropdown(true)}
                onBlur={() => setTimeout(() => setShowStudentDropdown(false), 200)}
                className="focus:ring-primary-500 focus:border-primary-500 block w-full text-sm border-gray-300 rounded-md p-2.5"
                placeholder="학생 이름을 검색하거나 선택하세요"
              />
              {showStudentDropdown && (
                <div className="absolute z-50 mt-1 w-full bg-white shadow-xl max-h-48 rounded-md py-1 text-sm ring-1 ring-black ring-opacity-5 overflow-auto border border-gray-200">
                  {students
                    .filter(s => s.name && s.name.includes(studentName))
                    .map((student) => (
                      <div
                        key={student.student_id || student.id}
                        onMouseDown={() => { setStudentName(student.name); setShowStudentDropdown(false); }}
                        className="cursor-pointer py-2 pl-3 pr-9 hover:bg-blue-50 transition"
                      >
                        <span className="font-medium text-gray-900">{student.number}번 {student.name}</span>
                      </div>
                    ))}
                  {students.filter(s => s.name && s.name.includes(studentName)).length === 0 && (
                    <div className="py-2 pl-3 text-gray-400 text-sm">검색 결과가 없습니다</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 키워드 선택 영역 */}
          <div className="bg-white shadow rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-700">키워드 선택</label>
              {selectedKeywords.length > 0 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white">
                  {selectedKeywords.length}개 선택
                </span>
              )}
            </div>

            {/* 검색 */}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="focus:ring-primary-500 focus:border-primary-500 block w-full text-sm border-gray-300 rounded-md p-2 mb-2"
              placeholder="키워드 검색 (예: 성실, 협력, 배려...)"
            />

            {/* 카테고리 필터 */}
            <div className="flex flex-wrap gap-1 mb-2">
              <button
                type="button"
                onClick={() => setActiveCategory(null)}
                className={`text-xs px-2.5 py-1 rounded-full border transition font-medium ${
                  !activeCategory ? 'bg-gray-800 text-white border-gray-800' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                }`}
              >
                전체
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition font-medium ${
                    activeCategory === cat ? 'bg-gray-800 text-white border-gray-800' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* 키워드 워드클라우드 */}
            <div className="flex flex-wrap gap-1.5 max-h-[90px] overflow-y-auto p-1">
              {filteredKeywords.length === 0 && (
                <span className="text-sm text-gray-400">검색 결과가 없습니다</span>
              )}
              {filteredKeywords.map(kw => {
                const selected = isSelected(kw);
                const cat = kw.category || '';
                const colorClass = selected
                  ? (CATEGORY_SELECTED[cat] || 'bg-gray-700 text-white border-gray-700')
                  : (CATEGORY_COLORS[cat] || 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200');
                return (
                  <button
                    key={kw.keyword_id}
                    type="button"
                    onClick={() => toggleKeyword(kw)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-150 ${colorClass} ${selected ? 'shadow-sm scale-105' : ''}`}
                  >
                    {kw.keyword}
                  </button>
                );
              })}
            </div>

            {/* 선택된 키워드 태그 */}
            {selectedKeywords.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="text-xs font-medium text-gray-500 mb-2">선택된 키워드</div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedKeywords.map(kw => (
                    <span
                      key={kw.keyword_id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-600 text-white"
                    >
                      {kw.keyword}
                      <button type="button" onClick={() => removeKeyword(kw.keyword_id)} className="hover:bg-blue-700 rounded-full w-4 h-4 flex items-center justify-center text-[10px]">×</button>
                    </span>
                  ))}
                  <button
                    type="button"
                    onClick={() => setSelectedKeywords([])}
                    className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 transition"
                  >
                    전체 해제
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 직접 입력 */}
          <div className="bg-white shadow rounded-lg p-3">
            <label className="block text-sm font-semibold text-gray-700 mb-1">직접 입력</label>
            <textarea
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              rows={1}
              className="focus:ring-primary-500 focus:border-primary-500 block w-full text-sm border-gray-300 rounded-md p-2 resize-none"
              placeholder="종합 의견 끝에 덧붙일 문장을 입력하세요."
              onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); handleGenerate(e); } }}
            />
          </div>

          {/* 생성 버튼 */}
          <button
            onClick={handleGenerate}
            disabled={isLoading || selectedKeywords.length === 0}
            className={`w-full py-3 px-4 rounded-lg text-sm font-semibold transition shadow-sm ${
              isLoading || selectedKeywords.length === 0
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                생성 중...
              </span>
            ) : (
              `생활기록부 생성하기 (${selectedKeywords.length}개 키워드)`
            )}
          </button>
        </div>

        {/* 오른쪽: 결과 */}
        <div className="bg-white shadow rounded-lg p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">생성 결과</h2>
            <div className="flex items-center gap-2">
              {usedModel && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  usedModel === 'gpt-4o-mini' ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {usedModel === 'gpt-4o-mini' ? 'AI 생성' : 'DB 기반'}
                </span>
              )}
              {(Object.keys(keywordResults).length > 0 || fullText) && (
                <button onClick={copyResult} className="text-xs text-gray-500 hover:text-blue-600 px-2 py-1 border border-gray-200 rounded hover:border-blue-300 transition">
                  📋 복사
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 bg-gray-50 rounded-lg border border-gray-200 p-4 min-h-[400px] overflow-y-auto">
            {Object.keys(keywordResults).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(keywordResults).map(([keyword, sentence]) => {
                  const currentLevel = keywordLevels[keyword] || '상';
                  return (
                    <div key={keyword} className="bg-white rounded-lg border border-gray-100 p-3 hover:shadow-sm transition">
                      <div className="flex items-start gap-2">
                        <span className="flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 mt-0.5">
                          {keyword}
                        </span>
                        <p className="text-sm text-gray-800 leading-relaxed flex-1">{sentence}</p>
                        <div className="flex-shrink-0 flex gap-0.5">
                          {['상', '중', '하'].map(lv => (
                            <button
                              key={lv}
                              type="button"
                              onClick={() => changeLevel(keyword, lv)}
                              className={`text-[11px] w-7 h-7 rounded-md font-semibold transition ${
                                currentLevel === lv
                                  ? lv === '상' ? 'bg-blue-500 text-white' : lv === '중' ? 'bg-amber-500 text-white' : 'bg-rose-400 text-white'
                                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                              }`}
                            >
                              {lv}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* 통합 문단 */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-600">종합 의견</span>
                    <button
                      onClick={() => {
                        const combined = Object.values(keywordResults).join(' ') + (additionalContext.trim() ? ' ' + additionalContext.trim() : '');
                        navigator.clipboard.writeText(combined);
                      }}
                      className="text-[10px] text-gray-400 hover:text-blue-600 px-1.5 py-0.5 border border-gray-200 rounded hover:border-blue-300 transition"
                    >
                      복사
                    </button>
                  </div>
                  <p className="text-sm text-gray-800 leading-relaxed bg-white border border-gray-100 rounded-lg p-3">
                    {Object.values(keywordResults).join(' ')}{additionalContext.trim() ? ' ' + additionalContext.trim() : ''}
                  </p>
                </div>
              </div>
            ) : fullText ? (
              <div className="space-y-3">
                {fullText.split('\n').filter(l => l.trim()).map((line, i) => (
                  <p key={i} className="text-sm text-gray-800 leading-relaxed">{line}</p>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <svg className="h-12 w-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
                <p className="text-sm">키워드를 선택하고 생성 버튼을 눌러주세요</p>
                <p className="text-xs mt-1 text-gray-300">키워드별 1문장씩 생활기록부 문장이 생성됩니다</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LifeRecords;
