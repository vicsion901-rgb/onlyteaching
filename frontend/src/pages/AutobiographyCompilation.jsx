import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';

const STEPS = ['반영 탭 입력', '미리보기', '초안 생성', '편집/발행'];

function AutobiographyCompilation() {
  const navigate = useNavigate();
  const userId = localStorage.getItem('userId') || '';
  const [step, setStep] = useState(0);
  const [sections, setSections] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [entries, setEntries] = useState({});
  const [activeSection, setActiveSection] = useState(0);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [draft, setDraft] = useState('');
  const [draftVersion, setDraftVersion] = useState(0);
  const [teacherName, setTeacherName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [years, setYears] = useState('');
  const [message, setMessage] = useState('');

  // 반영 탭 템플릿 로드
  useEffect(() => {
    client.get('/api/autobiography?action=sections')
      .then(res => { setSections(res.data.sections); setChapters(res.data.chapters); })
      .catch(() => {});
  }, []);

  // 저장된 입력 로드
  useEffect(() => {
    if (!userId) return;
    client.get('/api/autobiography', { params: { action: 'entries', userId } })
      .then(res => {
        const map = {};
        res.data.forEach(e => { map[`${e.section_id}_${e.question_index}`] = e.answer; });
        setEntries(map);
      })
      .catch(() => {});
  }, [userId]);

  const getAnswer = (sectionId, qIdx) => entries[`${sectionId}_${qIdx}`] || '';
  const setAnswer = (sectionId, qIdx, value) => {
    setEntries(prev => ({ ...prev, [`${sectionId}_${qIdx}`]: value }));
  };

  // 개별 질문 저장
  const saveAnswer = useCallback(async (sectionId, qIdx) => {
    setSaving(true);
    try {
      await client.post('/api/autobiography?action=save', {
        userId, sectionId, questionIndex: qIdx,
        answer: getAnswer(sectionId, qIdx),
      });
    } catch { /* ignore */ }
    setSaving(false);
  }, [userId, entries]);

  // 전체 저장
  const saveAll = async () => {
    setSaving(true);
    const promises = [];
    sections.forEach(sec => {
      sec.questions.forEach((_, qIdx) => {
        const answer = getAnswer(sec.id, qIdx);
        if (answer) {
          promises.push(client.post('/api/autobiography?action=save', {
            userId, sectionId: sec.id, questionIndex: qIdx, answer,
          }));
        }
      });
    });
    await Promise.all(promises);
    setSaving(false);
    setMessage('저장 완료');
    setTimeout(() => setMessage(''), 2000);
  };

  // 초안 생성
  const generateDraft = async () => {
    setGenerating(true);
    setMessage('');
    try {
      await saveAll();
      const res = await client.post('/api/autobiography?action=generate', {
        userId, teacherName, schoolName, years,
      });
      setDraft(res.data.draft);
      setDraftVersion(res.data.version);
      setStep(3);
    } catch (err) {
      setMessage(err.response?.data?.message || 'AI 생성 실패');
    }
    setGenerating(false);
  };

  // 진행률 계산
  const totalQ = sections.reduce((s, sec) => s + sec.questions.length, 0);
  const answeredQ = Object.values(entries).filter(v => v && String(v).trim()).length;
  const progress = totalQ > 0 ? Math.round((answeredQ / totalQ) * 100) : 0;

  // 초안을 챕터별로 분리
  const parsedChapters = draft.split(/^## /m).filter(Boolean).map(ch => {
    const lines = ch.split('\n');
    const title = lines[0].trim();
    const body = lines.slice(1).join('\n').trim();
    return { title, body };
  });

  return (
    <div className="max-w-4xl mx-auto py-6 px-3 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">자서전 편찬</h1>
        <button onClick={() => navigate('/dashboard')} className="text-sm text-gray-500 hover:text-gray-800">← 대시보드</button>
      </div>

      {/* 단계 표시 */}
      <div className="flex gap-1">
        {STEPS.map((s, i) => (
          <button key={i} onClick={() => setStep(i)}
            className={`flex-1 py-2 text-xs sm:text-sm rounded-lg border-t-4 text-center transition ${
              step === i ? 'border-purple-600 bg-purple-50 text-purple-900 font-semibold' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
            }`}>
            {i + 1}. {s}
          </button>
        ))}
      </div>

      {/* 진행률 */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>작성 진행률</span>
          <span>{answeredQ}/{totalQ} 응답 ({progress}%)</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-purple-600 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {message && <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-3 text-sm">{message}</div>}

      {/* Step 0: 반영 탭 입력 */}
      {step === 0 && sections.length > 0 && (
        <div className="flex gap-4">
          {/* 탭 목록 */}
          <div className="w-48 flex-shrink-0 space-y-1">
            {sections.map((sec, i) => {
              const answered = sec.questions.filter((_, qi) => getAnswer(sec.id, qi).trim()).length;
              return (
                <button key={sec.id} onClick={() => setActiveSection(i)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                    activeSection === i ? 'bg-purple-100 text-purple-900 font-semibold' : 'text-gray-600 hover:bg-gray-100'
                  }`}>
                  {sec.title}
                  <span className="text-xs text-gray-400 ml-1">({answered}/{sec.questions.length})</span>
                </button>
              );
            })}
            <button onClick={saveAll} disabled={saving}
              className="w-full mt-3 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm">
              {saving ? '저장 중...' : '전체 저장'}
            </button>
          </div>

          {/* 질문 폼 */}
          <div className="flex-1 bg-white rounded-xl shadow border border-gray-200 p-6 space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{sections[activeSection].title}</h2>
              <p className="text-xs text-gray-400 mt-1">→ 최종 장: {sections[activeSection].chapter}</p>
            </div>
            {sections[activeSection].questions.map((q, qi) => (
              <div key={qi} className="space-y-1">
                <label className="text-sm font-medium text-gray-700">{q}</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[80px] resize-y"
                  placeholder="여기에 답변을 작성해주세요..."
                  value={getAnswer(sections[activeSection].id, qi)}
                  onChange={e => setAnswer(sections[activeSection].id, qi, e.target.value)}
                  onBlur={() => saveAnswer(sections[activeSection].id, qi)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 1: 미리보기 */}
      {step === 1 && (
        <div className="bg-white rounded-xl shadow border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">입력 내용 미리보기</h2>
          <p className="text-sm text-gray-500">작성한 내용이 최종 자서전의 어떤 장으로 연결되는지 확인합니다.</p>
          {sections.map(sec => {
            const answers = sec.questions.map((q, qi) => ({ q, a: getAnswer(sec.id, qi) })).filter(x => x.a.trim());
            if (answers.length === 0) return null;
            return (
              <div key={sec.id} className="border border-gray-100 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium text-gray-900">{sec.title}</h3>
                  <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">→ {sec.chapter}</span>
                </div>
                {answers.map((a, i) => (
                  <div key={i} className="mb-2">
                    <p className="text-xs text-gray-500">{a.q}</p>
                    <p className="text-sm text-gray-800 mt-0.5">{a.a}</p>
                  </div>
                ))}
              </div>
            );
          })}
          <div className="flex justify-end">
            <button onClick={() => setStep(2)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm">
              다음: 초안 생성 →
            </button>
          </div>
        </div>
      )}

      {/* Step 2: 초안 생성 */}
      {step === 2 && (
        <div className="bg-white rounded-xl shadow border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">자서전 초안 생성</h2>
          <p className="text-sm text-gray-500">기본 정보를 입력하고 AI로 초안을 생성합니다.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">교사 이름</label>
              <input type="text" value={teacherName} onChange={e => setTeacherName(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="홍길동" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">학교명</label>
              <input type="text" value={schoolName} onChange={e => setSchoolName(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="온리초등학교" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">재직 기간</label>
              <input type="text" value={years} onChange={e => setYears(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="2000~2026" />
            </div>
          </div>
          <button onClick={generateDraft} disabled={generating}
            className="w-full py-3 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm disabled:opacity-50">
            {generating ? 'AI가 자서전을 작성하고 있습니다...' : '자서전 초안 생성하기'}
          </button>
          {generating && (
            <p className="text-xs text-gray-400 text-center">약 30초~1분 소요됩니다. 잠시만 기다려주세요.</p>
          )}
        </div>
      )}

      {/* Step 3: 편집/발행 */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">자서전 초안 (v{draftVersion})</h2>
              <div className="flex gap-2">
                <button onClick={() => navigator.clipboard.writeText(draft)}
                  className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                  전체 복사
                </button>
                <button onClick={() => setStep(2)}
                  className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                  다시 생성
                </button>
              </div>
            </div>

            {parsedChapters.length > 0 ? (
              parsedChapters.map((ch, i) => (
                <div key={i} className="mb-6 border-b border-gray-100 pb-4 last:border-0">
                  <h3 className="text-base font-bold text-purple-800 mb-2">{ch.title}</h3>
                  <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{ch.body}</div>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{draft}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AutobiographyCompilation;
