import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';

// ─── 연간 자서전 질문 ───
const BASIC_QUESTIONS = [
  { id: 'q1', chapter: 'opening', label: '올해를 여는 글', text: '올해 학교에서 가장 많은 에너지를 쏟은 일은 무엇이었나요?' },
  { id: 'q2', chapter: 'work', label: '올해의 업무와 현실', text: '올해 가장 버겁고 지쳤던 순간은 언제였나요?' },
  { id: 'q3', chapter: 'strength', label: '올해 버티게 한 힘', text: '그럼에도 올해를 버틸 수 있게 해준 힘은 무엇이었나요?' },
  { id: 'q4', chapter: 'loneliness', label: '올해의 외로움', text: '올해 가장 외롭거나 혼자라고 느낀 순간은 언제였나요?' },
  { id: 'q5', chapter: 'people', label: '올해의 관계와 사람들', text: '올해 가장 위로가 되었던 사람, 말, 장면은 무엇이었나요?' },
  { id: 'q6', chapter: 'shaken', label: '올해의 흔들림', text: '올해 교사로서 가장 많이 흔들렸던 지점은 무엇이었나요?' },
  { id: 'q7', chapter: 'change', label: '올해의 변화', text: '올해를 지나며 내가 달라졌다고 느낀 부분은 무엇인가요?' },
  { id: 'q8', chapter: 'scene', label: '올해를 대표하는 장면', text: '올해를 대표하는 장면 하나를 꼽는다면 무엇인가요?' },
  { id: 'q9', chapter: 'regret', label: '올해의 후회와 아쉬움', text: '작년과 비교했을 때 올해의 나는 무엇이 달라졌나요?' },
  { id: 'q10', chapter: 'closing', label: '올해를 닫는 글', text: '올해의 나에게, 그리고 내년의 나에게 남기고 싶은 말은 무엇인가요?' },
];

const CHAPTERS = [
  { id: 'opening', title: '올해를 여는 글', period: '시작' },
  { id: 'work', title: '올해의 업무와 현실', period: '일상' },
  { id: 'strength', title: '올해 버티게 한 힘', period: '버팀' },
  { id: 'loneliness', title: '올해의 외로움', period: '감정' },
  { id: 'people', title: '올해의 관계와 사람들', period: '관계' },
  { id: 'shaken', title: '올해의 흔들림', period: '갈등' },
  { id: 'change', title: '올해의 변화', period: '성장' },
  { id: 'scene', title: '올해를 대표하는 장면', period: '기억' },
  { id: 'regret', title: '올해의 후회와 아쉬움', period: '회고' },
  { id: 'closing', title: '올해를 닫는 글', period: '마무리' },
];

// ─── 심화 질문 생성 (키워드 기반) ───
const FOLLOW_UP_RULES = [
  { keywords: ['힘들', '지쳤', '버거', '고됐', '벅찼'], questions: ['어떤 점이 가장 버거웠나요?', '업무량 때문이었나요, 감정 소모 때문이었나요?', '그 시기를 버티게 한 작은 힘이 있었나요?'] },
  { keywords: ['학생', '아이들', '반 아이', '우리 반'], questions: ['어떤 학생이 가장 기억에 남나요?', '그 학생과의 관계에서 배운 점이 있나요?'] },
  { keywords: ['생활기록부', '생기부', '기록'], questions: ['기록 과정에서 가장 어려운 부분은 무엇이었나요?', '기록하면서 학생을 다시 보게 된 순간이 있었나요?'] },
  { keywords: ['동료', '선생님', '교사', '교감', '교장'], questions: ['그 관계에서 가장 인상 깊었던 장면은 무엇인가요?', '동료와의 관계가 올해 나에게 어떤 영향을 주었나요?'] },
  { keywords: ['수업', '교과', '교육과정'], questions: ['올해 수업에서 가장 보람찼던 순간은 언제였나요?', '수업 준비 과정에서 느낀 감정은 어떤 것이었나요?'] },
  { keywords: ['후회', '아쉬', '미안', '죄책'], questions: ['그때 다시 돌아간다면 어떻게 하고 싶나요?', '그 경험이 지금의 나에게 남긴 것은 무엇인가요?'] },
  { keywords: ['변화', '달라', '성장', '배웠'], questions: ['그 변화를 알아차린 순간이 있었나요?', '그 변화가 교실에서 어떻게 드러났나요?'] },
  { keywords: ['가족', '집', '개인', '삶'], questions: ['학교 밖의 삶이 교사로서의 나에게 어떤 영향을 주었나요?'] },
  { keywords: ['행사', '체험', '현장학습', '운동회'], questions: ['그 행사에서 가장 기억에 남는 장면은 무엇인가요?', '행사를 통해 학생들에게서 발견한 것이 있나요?'] },
  { keywords: ['상담', '학부모', '부모'], questions: ['그 상담에서 가장 어려웠던 부분은 무엇이었나요?', '상담 후 달라진 것이 있나요?'] },
];

function generateFollowUps(answer) {
  if (!answer || answer.trim().length < 5) return [];
  const lower = answer.toLowerCase();
  const matched = [];
  for (const rule of FOLLOW_UP_RULES) {
    if (rule.keywords.some(kw => lower.includes(kw))) {
      matched.push(...rule.questions);
    }
  }
  if (matched.length === 0) {
    matched.push('그 상황을 조금 더 구체적으로 이야기해줄 수 있나요?', '그때의 감정을 한마디로 표현한다면 무엇인가요?');
  }
  return matched.slice(0, 3);
}

// ─── 자료 연동 추천 ───
const SOURCE_TYPES = [
  { key: 'studentRecords', label: '학생명부', icon: '👥' },
  { key: 'lifeRecords', label: '생활기록부', icon: '📋' },
  { key: 'careClassroom', label: '돌봄교실', icon: '🏫' },
  { key: 'schedule', label: '학사일정', icon: '📅' },
  { key: 'observationJournal', label: '관찰일지', icon: '🔍' },
  { key: 'subjectEvaluation', label: '교과평가', icon: '📊' },
  { key: 'todayMeal', label: '오늘의 급식', icon: '🍽️' },
];

const ANSWER_TO_SOURCES = [
  { keywords: ['학생', '아이', '반'], sources: ['studentRecords', 'lifeRecords', 'observationJournal'] },
  { keywords: ['생활기록', '생기부', '기록'], sources: ['lifeRecords', 'subjectEvaluation'] },
  { keywords: ['일정', '행사', '체험', '운동회', '수학여행'], sources: ['schedule'] },
  { keywords: ['수업', '교과', '평가', '시험'], sources: ['subjectEvaluation'] },
  { keywords: ['돌봄', '방과후'], sources: ['careClassroom'] },
  { keywords: ['급식', '점심'], sources: ['todayMeal'] },
  { keywords: ['관찰', '상담'], sources: ['observationJournal'] },
];

function recommendSources(answers) {
  const allText = Object.values(answers).join(' ').toLowerCase();
  const recommended = new Set();
  for (const rule of ANSWER_TO_SOURCES) {
    if (rule.keywords.some(kw => allText.includes(kw))) {
      rule.sources.forEach(s => recommended.add(s));
    }
  }
  return Array.from(recommended);
}

// ─── 블록 관련 ───
let _bid = 0;
const bid = () => `b_${Date.now()}_${++_bid}`;
const mkBlock = (type, text, source = null, sourceLabel = null) => ({
  id: bid(), type, source, sourceLabel, originalText: text, currentText: text,
});

// ─── 소스 데이터 수집 ───
async function collectSourceData(selectedSources) {
  const data = {};
  if (selectedSources.includes('studentRecords')) {
    try { const r = await client.get('/api/students'); data.studentRecords = Array.isArray(r.data) ? r.data.map(s => ({ number: s.number, name: s.name })) : []; } catch { data.studentRecords = []; }
  }
  if (selectedSources.includes('lifeRecords')) {
    try { const r = await client.get('/api/liferecords?action=keywords&query='); data.lifeRecords = Array.isArray(r.data) ? r.data.slice(0, 20) : []; } catch { data.lifeRecords = []; }
  }
  if (selectedSources.includes('schedule')) {
    try { const r = await client.get('/api/schedules'); data.schedule = Array.isArray(r.data) ? r.data.slice(0, 30) : []; } catch { data.schedule = []; }
  }
  if (selectedSources.includes('subjectEvaluation')) {
    try { const r = await client.get('/api/achievements'); data.subjectEvaluation = Array.isArray(r.data) ? r.data.slice(0, 20) : []; } catch { data.subjectEvaluation = []; }
  }
  if (selectedSources.includes('careClassroom')) {
    try {
      const raw = localStorage.getItem('careClassroomRecords');
      const records = raw ? JSON.parse(raw) : {};
      data.careClassroom = Object.entries(records).sort(([a],[b]) => a.localeCompare(b)).map(([date, rec]) => {
        const mood = rec.customMood?.trim() || rec.mood || '';
        const events = rec.importantEvents?.trim() || '';
        return { date, mood, events };
      }).filter(e => e.mood || e.events).slice(0, 20);
    } catch { data.careClassroom = []; }
  }
  if (selectedSources.includes('todayMeal')) {
    try { const r = await client.get('/api/meals'); data.todayMeal = Array.isArray(r.data?.items) ? r.data.items.slice(0, 10) : []; } catch { data.todayMeal = []; }
  }
  if (selectedSources.includes('observationJournal')) { data.observationJournal = []; }
  return data;
}

// ─── 메인 컴포넌트 ───
function AutobiographyCompilation() {
  const navigate = useNavigate();
  const [answers, setAnswers] = useState({});
  const [followUps, setFollowUps] = useState({});
  const [followUpAnswers, setFollowUpAnswers] = useState({});
  const [selectedSources, setSelectedSources] = useState([]);
  const [recommendedSources, setRecommendedSources] = useState([]);
  const [chapterBlocks, setChapterBlocks] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedChapters, setGeneratedChapters] = useState(new Set());
  const [activeChapter, setActiveChapter] = useState('opening');
  const [proofreadResults, setProofreadResults] = useState({});
  const [isProofreading, setIsProofreading] = useState(false);
  const [expandedQ, setExpandedQ] = useState('q1');

  // 답변 변경 시 심화 질문 + 자료 추천 갱신
  const handleAnswer = useCallback((qId, value) => {
    setAnswers(prev => {
      const next = { ...prev, [qId]: value };
      setRecommendedSources(recommendSources(next));
      return next;
    });
  }, []);

  const handleAnswerBlur = useCallback((qId) => {
    const answer = answers[qId];
    if (answer && answer.trim().length >= 5) {
      const fups = generateFollowUps(answer);
      setFollowUps(prev => ({ ...prev, [qId]: fups }));
    }
  }, [answers]);

  const handleFollowUpAnswer = useCallback((qId, fuIdx, value) => {
    setFollowUpAnswers(prev => ({
      ...prev,
      [`${qId}_${fuIdx}`]: value,
    }));
  }, []);

  const toggleSource = useCallback((key) => {
    setSelectedSources(prev =>
      prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key]
    );
  }, []);

  // 장 초안 생성
  const generateChapter = useCallback(async (chapterId) => {
    const ch = CHAPTERS.find(c => c.id === chapterId);
    const q = BASIC_QUESTIONS.find(bq => bq.chapter === chapterId);
    if (!ch || !q) return;

    const answer = answers[q.id] || '';
    const fups = followUps[q.id] || [];
    const fuAnswers = fups.map((_, i) => followUpAnswers[`${q.id}_${i}`] || '').filter(Boolean);

    if (!answer.trim() && fuAnswers.length === 0) return;

    setIsGenerating(true);

    // 로컬 즉시 생성
    const blocks = [];
    if (answer.trim()) {
      blocks.push(mkBlock('linked', answer.trim(), 'answer', '질문 답변'));
    }
    fuAnswers.forEach(fa => {
      blocks.push(mkBlock('linked', fa, 'followup', '심화 답변'));
    });

    setChapterBlocks(prev => ({ ...prev, [chapterId]: blocks }));
    setGeneratedChapters(prev => new Set([...prev, chapterId]));
    setActiveChapter(chapterId);

    // 백그라운드 AI 생성 시도
    try {
      const sourceData = selectedSources.length > 0 ? await collectSourceData(selectedSources) : {};
      const prompt = `장 제목: ${ch.title}\n\n기본 질문: ${q.text}\n답변: ${answer}\n\n${fuAnswers.length > 0 ? '심화 답변:\n' + fuAnswers.join('\n') + '\n\n' : ''}${Object.keys(sourceData).length > 0 ? '연동 자료: ' + JSON.stringify(sourceData).slice(0, 500) : ''}`;

      const endpoints = ['/api/autobiography', '/autobiography-compilation'];
      for (const ep of endpoints) {
        try {
          const res = await client.post(ep, {
            tab: 'teacher', version: 'teacher', prompt,
            teacher_name: '', teacher_role: '', teacher_focus: '',
            source_data: sourceData,
            selected_sources: selectedSources,
          }, { timeout: 15000, __retryCount: 99 });

          const text = res.data?.generated_text || res.data?.result || res.data?.output || res.data?.content || '';
          if (text && text.length > 10) {
            const aiBlocks = text.split('\n').filter(l => l.trim()).map(line =>
              mkBlock('linked', line.trim(), 'ai-generated', 'AI 생성')
            );
            setChapterBlocks(prev => ({ ...prev, [chapterId]: aiBlocks }));
          }
          break;
        } catch { /* next */ }
      }
    } catch { /* local blocks remain */ }

    setIsGenerating(false);
  }, [answers, followUps, followUpAnswers, selectedSources]);

  // 전체 초안 생성
  const generateAll = useCallback(async () => {
    for (const ch of CHAPTERS) {
      const q = BASIC_QUESTIONS.find(bq => bq.chapter === ch.id);
      if (q && answers[q.id]?.trim()) {
        await generateChapter(ch.id);
      }
    }
  }, [answers, generateChapter]);

  // 블록 CRUD
  const addBlock = useCallback((chId, atIdx) => {
    setChapterBlocks(prev => {
      const arr = [...(prev[chId] || [])];
      arr.splice(atIdx, 0, mkBlock('manual', ''));
      return { ...prev, [chId]: arr };
    });
  }, []);

  const updateBlock = useCallback((chId, blockIdx, newText) => {
    setChapterBlocks(prev => {
      const arr = [...(prev[chId] || [])];
      const b = { ...arr[blockIdx] };
      b.currentText = newText;
      if (b.type === 'linked' && newText !== b.originalText) b.type = 'linked-edited';
      else if (b.type === 'linked-edited' && newText === b.originalText) b.type = 'linked';
      arr[blockIdx] = b;
      return { ...prev, [chId]: arr };
    });
  }, []);

  const deleteBlock = useCallback((chId, blockIdx) => {
    setChapterBlocks(prev => {
      const arr = [...(prev[chId] || [])];
      arr.splice(blockIdx, 1);
      return { ...prev, [chId]: arr };
    });
  }, []);

  const restoreBlock = useCallback((chId, blockIdx) => {
    setChapterBlocks(prev => {
      const arr = [...(prev[chId] || [])];
      const b = { ...arr[blockIdx] };
      b.currentText = b.originalText;
      b.type = 'linked';
      arr[blockIdx] = b;
      return { ...prev, [chId]: arr };
    });
  }, []);

  // 교정
  const handleProofread = useCallback(async (chId) => {
    const blocks = chapterBlocks[chId] || [];
    const texts = blocks.filter(b => b.currentText?.trim()).map(b => ({ id: b.id, text: b.currentText }));
    if (texts.length === 0) return;

    setIsProofreading(true);
    const endpoints = ['/api/proofread', '/proofread'];
    for (const ep of endpoints) {
      try {
        const res = await client.post(ep, { texts, contentType: 'autobiography' }, { timeout: 12000, __retryCount: 99 });
        const results = {};
        for (const r of (res.data?.results || [])) results[r.id] = { ...r, applied: false };
        setProofreadResults(prev => ({ ...prev, ...results }));
        break;
      } catch { /* next */ }
    }
    setIsProofreading(false);
  }, [chapterBlocks]);

  const applyProofread = useCallback((chId, blockId) => {
    const result = proofreadResults[blockId];
    if (!result) return;
    setChapterBlocks(prev => {
      const arr = [...(prev[chId] || [])];
      const idx = arr.findIndex(b => b.id === blockId);
      if (idx < 0) return prev;
      const b = { ...arr[idx] };
      b.currentText = result.revised;
      if (b.type === 'linked' && result.revised !== b.originalText) b.type = 'linked-edited';
      arr[idx] = b;
      return { ...prev, [chId]: arr };
    });
    setProofreadResults(prev => ({ ...prev, [blockId]: { ...prev[blockId], applied: true } }));
  }, [proofreadResults]);

  const dismissProofread = useCallback((blockId) => {
    setProofreadResults(prev => { const n = { ...prev }; delete n[blockId]; return n; });
  }, []);

  const answeredCount = Object.values(answers).filter(a => a?.trim()).length;
  const [showStudio, setShowStudio] = useState(false);

  // 질문 패널 (재사용)
  const renderQuestions = () => (
    <div className="bg-white shadow rounded-lg p-3 h-full overflow-y-auto">
      <h2 className="text-sm font-bold text-gray-800 mb-2">📝 기본 질문 <span className="text-[10px] text-gray-400 font-normal ml-1">{answeredCount}/10</span></h2>
      <div className="space-y-1">
        {BASIC_QUESTIONS.map((q) => {
          const isExpanded = expandedQ === q.id;
          const hasAnswer = !!answers[q.id]?.trim();
          const fups = followUps[q.id] || [];
          return (
            <div key={q.id} className={`rounded-lg border transition-all ${isExpanded ? 'border-purple-300 bg-purple-50/30' : hasAnswer ? 'border-green-200 bg-green-50/30' : 'border-gray-100'}`}>
              <button type="button" onClick={() => setExpandedQ(isExpanded ? null : q.id)} className="w-full text-left px-3 py-2 flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0 ${hasAnswer ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {hasAnswer ? '✓' : q.id.replace('q', '')}
                </span>
                <span className="text-xs text-gray-700 flex-1 line-clamp-1">{q.text}</span>
                <span className="text-[10px] text-gray-300">{isExpanded ? '▲' : '▼'}</span>
              </button>
              {isExpanded && (
                <div className="px-3 pb-3 space-y-2">
                  <div className="text-[10px] text-purple-600 font-medium">{q.label}</div>
                  <textarea value={answers[q.id] || ''} onChange={(e) => handleAnswer(q.id, e.target.value)} onBlur={() => handleAnswerBlur(q.id)} rows={3}
                    className="w-full text-xs border border-gray-200 rounded-md p-2 resize-none focus:ring-1 focus:ring-purple-400 focus:border-purple-400" placeholder="자유롭게 답변해주세요..." />
                  {fups.length > 0 && (
                    <div className="space-y-1.5 pl-2 border-l-2 border-purple-200">
                      <div className="text-[10px] font-semibold text-purple-500">심화 질문</div>
                      {fups.map((fu, i) => (
                        <div key={i}>
                          <p className="text-[11px] text-gray-600 mb-1">→ {fu}</p>
                          <textarea value={followUpAnswers[`${q.id}_${i}`] || ''} onChange={(e) => handleFollowUpAnswer(q.id, i, e.target.value)} rows={2}
                            className="w-full text-xs border border-gray-100 rounded p-1.5 resize-none focus:ring-1 focus:ring-purple-300" placeholder="답변..." />
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
    </div>
  );

  // 자료연동 + 목차 패널 (재사용)
  const renderDataAndToc = () => (
    <div className="space-y-3 h-full overflow-y-auto">
      <div className="bg-white shadow rounded-lg p-3">
        <h2 className="text-sm font-bold text-gray-800 mb-2">🔗 자료 연동</h2>
        <p className="text-[10px] text-gray-400 mb-2">답변 내용에 따라 관련 자료가 추천됩니다</p>
        <div className="space-y-1.5">
          {SOURCE_TYPES.map(src => {
            const isRecommended = recommendedSources.includes(src.key);
            const isSelected = selectedSources.includes(src.key);
            return (
              <button key={src.key} type="button" onClick={() => toggleSource(src.key)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-xs transition ${isSelected ? 'border-purple-400 bg-purple-50 text-purple-800 font-medium' : isRecommended ? 'border-amber-300 bg-amber-50/50 text-amber-800' : 'border-gray-100 text-gray-500 hover:bg-gray-50'}`}>
                <span>{src.icon}</span>
                <span className="flex-1">{src.label}</span>
                {isRecommended && !isSelected && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600">추천</span>}
                {isSelected && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-200 text-purple-700">연동</span>}
              </button>
            );
          })}
        </div>
        {selectedSources.length > 0 && (
          <div className="mt-3 pt-2 border-t border-gray-100">
            <div className="text-[10px] text-gray-500 mb-1">{selectedSources.length}개 자료 연동됨</div>
            <div className="flex flex-wrap gap-1">
              {selectedSources.map(s => { const src = SOURCE_TYPES.find(st => st.key === s); return <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">{src?.icon} {src?.label}</span>; })}
            </div>
          </div>
        )}
      </div>
      <div className="bg-white shadow rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-gray-800">📖 장 목차</h2>
          {answeredCount > 0 && (
            <button type="button" onClick={generateAll} disabled={isGenerating} className="text-[10px] px-2 py-1 bg-purple-600 text-white rounded font-medium hover:bg-purple-700 disabled:opacity-40">
              {isGenerating ? '생성 중...' : '전체 초안 생성'}
            </button>
          )}
        </div>
        <div className="space-y-1">
          {CHAPTERS.map(ch => {
            const hasBlocks = (chapterBlocks[ch.id] || []).length > 0;
            const isActive = activeChapter === ch.id;
            const q = BASIC_QUESTIONS.find(bq => bq.chapter === ch.id);
            const hasAnswer = q && answers[q.id]?.trim();
            return (
              <button key={ch.id} type="button" onClick={() => { setActiveChapter(ch.id); if (hasAnswer && !hasBlocks) generateChapter(ch.id); }}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs transition ${isActive ? 'bg-purple-100 text-purple-800 font-medium' : 'hover:bg-gray-50 text-gray-600'}`}>
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${hasBlocks ? 'bg-green-400' : hasAnswer ? 'bg-amber-300' : 'bg-gray-200'}`} />
                <span className="flex-1 truncate">{ch.title}</span>
                <span className="text-[9px] text-gray-300">{ch.period}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  // 편집 패널 (재사용)
  const renderEditor = () => (
    <ChapterEditor
      chapter={CHAPTERS.find(c => c.id === activeChapter)}
      blocks={chapterBlocks[activeChapter] || []}
      onAddBlock={(atIdx) => addBlock(activeChapter, atIdx)}
      onUpdateBlock={(blockIdx, text) => updateBlock(activeChapter, blockIdx, text)}
      onDeleteBlock={(blockIdx) => deleteBlock(activeChapter, blockIdx)}
      onRestoreBlock={(blockIdx) => restoreBlock(activeChapter, blockIdx)}
      onProofread={() => handleProofread(activeChapter)}
      proofreadResults={proofreadResults}
      isProofreading={isProofreading}
      onApplyProofread={(blockId) => applyProofread(activeChapter, blockId)}
      onDismissProofread={dismissProofread}
      isGenerating={isGenerating}
      onGenerate={() => { const q = BASIC_QUESTIONS.find(bq => bq.chapter === activeChapter); if (q && answers[q.id]?.trim()) generateChapter(activeChapter); }}
      hasAnswer={(() => { const q = BASIC_QUESTIONS.find(bq => bq.chapter === activeChapter); return q && !!answers[q.id]?.trim(); })()}
    />
  );

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📚 연간 자서전</h1>
          <p className="text-sm text-gray-500">올해의 이야기를 질문-자료-초안-편집 순서로 한 권의 자서전으로 만듭니다</p>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setShowStudio(true)}
            className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100">
            📖 자서전 편찬실
          </button>
          <button onClick={() => navigate('/dashboard')} className="text-primary-600 hover:text-primary-900 font-medium text-sm">← 홈으로</button>
        </div>
      </div>

      {/* 메인 3컬럼 레이아웃 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4" style={{ minHeight: 'calc(100vh - 140px)' }}>
        <div className="lg:col-span-3" style={{ maxHeight: 'calc(100vh - 160px)' }}>{renderQuestions()}</div>
        <div className="lg:col-span-3" style={{ maxHeight: 'calc(100vh - 160px)' }}>{renderDataAndToc()}</div>
        <div className="lg:col-span-6" style={{ maxHeight: 'calc(100vh - 160px)', overflow: 'auto' }}>{renderEditor()}</div>
      </div>

      {/* 자서전 편찬실 모달 */}
      {showStudio && (
        <div className="fixed inset-0 z-[200] bg-stone-900 flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 bg-black/60">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-amber-200">📖 자서전 편찬실</span>
              <span className="text-xs text-stone-400">{answeredCount}/10 답변</span>
            </div>
            <button onClick={() => setShowStudio(false)} className="text-xs text-stone-400 hover:text-white border border-stone-700 rounded px-2 py-1">✕ 닫기</button>
          </div>
          <div className="flex-1 grid grid-cols-12 gap-2 p-2 overflow-hidden">
            <div className="col-span-3 overflow-y-auto">{renderQuestions()}</div>
            <div className="col-span-3 overflow-y-auto">{renderDataAndToc()}</div>
            <div className="col-span-6 overflow-y-auto">{renderEditor()}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 장 편집기 ───
function ChapterEditor({ chapter, blocks, onAddBlock, onUpdateBlock, onDeleteBlock, onRestoreBlock, onProofread, proofreadResults, isProofreading, onApplyProofread, onDismissProofread, isGenerating, onGenerate, hasAnswer }) {
  if (!chapter) return null;

  const hasBlocks = blocks.length > 0;

  return (
    <div className="bg-white shadow rounded-lg p-4 h-full flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
        <div>
          <span className="text-[10px] text-purple-500 font-medium">{chapter.period}</span>
          <h2 className="text-base font-bold text-gray-900">{chapter.title}</h2>
        </div>
        <div className="flex items-center gap-2">
          {hasBlocks && (
            <button
              type="button"
              onClick={onProofread}
              disabled={isProofreading}
              className="text-[11px] px-2.5 py-1 text-green-600 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 disabled:opacity-40 font-medium"
            >
              {isProofreading ? '점검 중...' : '📝 오탈자 점검'}
            </button>
          )}
          {hasAnswer && (
            <button
              type="button"
              onClick={onGenerate}
              disabled={isGenerating}
              className="text-[11px] px-2.5 py-1 text-purple-600 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100 disabled:opacity-40 font-medium"
            >
              {isGenerating ? '생성 중...' : '초안 생성'}
            </button>
          )}
          {hasBlocks && (
            <button
              type="button"
              onClick={() => {
                const text = blocks.map(b => b.currentText).filter(Boolean).join('\n');
                navigator.clipboard.writeText(text);
              }}
              className="text-[11px] px-2.5 py-1 text-gray-500 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 font-medium"
            >
              📋 복사
            </button>
          )}
        </div>
      </div>

      {/* 블록 편집 영역 */}
      <div className="flex-1 overflow-y-auto">
        {hasBlocks ? (
          <div>
            <AddBlockBtn onClick={() => onAddBlock(0)} />
            {blocks.map((block, i) => (
              <React.Fragment key={block.id}>
                <BlockItem
                  block={block}
                  onUpdate={(text) => onUpdateBlock(i, text)}
                  onDelete={() => onDeleteBlock(i)}
                  onRestore={() => onRestoreBlock(i)}
                  proofreadResult={proofreadResults[block.id]}
                  onApplyProofread={() => onApplyProofread(block.id)}
                  onDismissProofread={() => onDismissProofread(block.id)}
                />
                <AddBlockBtn onClick={() => onAddBlock(i + 1)} />
              </React.Fragment>
            ))}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-300 text-sm py-12">
            {hasAnswer ? (
              <>
                <p>이 장의 초안을 생성할 수 있습니다</p>
                <button
                  type="button"
                  onClick={onGenerate}
                  disabled={isGenerating}
                  className="mt-3 px-4 py-2 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 disabled:opacity-40"
                >
                  {isGenerating ? '생성 중...' : '초안 생성하기'}
                </button>
              </>
            ) : (
              <>
                <p>왼쪽에서 이 장에 해당하는 질문에 답변해주세요</p>
                <p className="text-xs mt-1 text-gray-200">답변 후 초안이 생성됩니다</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 블록 아이템 ───
const SOURCE_BADGE = {
  'answer': 'bg-blue-100 text-blue-700',
  'followup': 'bg-purple-100 text-purple-700',
  'ai-generated': 'bg-violet-100 text-violet-700',
};

function BlockItem({ block, onUpdate, onDelete, onRestore, proofreadResult, onApplyProofread, onDismissProofread }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(block.currentText);
  const ref = useRef(null);

  useEffect(() => { setText(block.currentText); }, [block.currentText]);
  useEffect(() => {
    if (editing && ref.current) { ref.current.focus(); ref.current.style.height = 'auto'; ref.current.style.height = ref.current.scrollHeight + 'px'; }
  }, [editing]);

  const isEdited = block.type === 'linked-edited';
  const isManual = block.type === 'manual';

  return (
    <div className={`group relative rounded-lg px-3 py-2 transition-all ${editing ? 'bg-amber-50 ring-1 ring-amber-300' : 'hover:bg-gray-50'}`}>
      {block.sourceLabel && (
        <div className="flex items-center gap-1 mb-0.5">
          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${SOURCE_BADGE[block.source] || 'bg-gray-100 text-gray-600'}`}>
            {block.sourceLabel}
          </span>
          {isEdited && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600 font-medium">✏️ 수정됨</span>}
          {isManual && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium">직접 입력</span>}
        </div>
      )}

      {editing ? (
        <textarea
          ref={ref}
          value={text}
          onChange={(e) => { setText(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
          onBlur={() => { setEditing(false); if (text.trim() !== block.currentText) onUpdate(text.trim()); }}
          onKeyDown={(e) => { if (e.key === 'Escape') { setText(block.currentText); setEditing(false); } }}
          className="w-full text-sm leading-relaxed bg-transparent border-none outline-none resize-none"
          style={{ minHeight: 40 }}
        />
      ) : (
        <p className="text-sm text-gray-800 leading-relaxed cursor-text" onClick={() => setEditing(true)}>
          {block.currentText || <span className="text-gray-300 italic">클릭하여 입력...</span>}
        </p>
      )}

      <div className="absolute right-1 top-1 hidden group-hover:flex items-center gap-0.5 bg-white/90 rounded shadow-sm border border-gray-100 px-1 py-0.5">
        {isEdited && <button type="button" onClick={onRestore} className="text-[10px] px-1.5 py-0.5 text-blue-600 hover:bg-blue-50 rounded">↩원문</button>}
        {isManual && <button type="button" onClick={onDelete} className="text-[10px] px-1.5 py-0.5 text-red-500 hover:bg-red-50 rounded">×</button>}
      </div>

      {proofreadResult && proofreadResult.hasChanges && !proofreadResult.applied && (
        <div className="mt-1.5 p-2 bg-green-50 border border-green-200 rounded text-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-green-700">교정 제안</span>
            <div className="flex gap-1">
              <button type="button" onClick={onApplyProofread} className="px-2 py-0.5 bg-green-500 text-white rounded text-[10px] font-medium">적용</button>
              <button type="button" onClick={onDismissProofread} className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded text-[10px] font-medium">무시</button>
            </div>
          </div>
          <div className="line-through text-red-400 mb-0.5">{proofreadResult.original}</div>
          <div className="text-green-700">{proofreadResult.revised}</div>
        </div>
      )}
    </div>
  );
}

function AddBlockBtn({ onClick }) {
  return (
    <div className="flex justify-center py-0.5 opacity-0 hover:opacity-100 transition-opacity">
      <button type="button" onClick={onClick} className="text-[10px] text-gray-300 hover:text-purple-600 px-3 py-0.5 rounded-full border border-transparent hover:border-purple-300 hover:bg-purple-50 transition">
        + 문장 추가
      </button>
    </div>
  );
}

export default AutobiographyCompilation;
