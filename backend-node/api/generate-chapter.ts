// @ts-ignore
import type { VercelRequest, VercelResponse } from '@vercel/node';
// @ts-ignore
import { Pool } from 'pg';

let pool: Pool | null = null;
function getPool(): Pool {
  if (!pool) { pool = new Pool({ connectionString: process.env.POSTGRES_URL, ssl: { rejectUnauthorized: false }, max: 3, connectionTimeoutMillis: 5000 }); }
  return pool;
}

// ─── 장 생성 공식 ───
const CHAPTER_CONFIG: Record<number, { title: string; tone: string; style: string; sceneGuide: string; emphasis: string; primarySources: string[]; secondarySources: string[] }> = {
  0: { title: '시작하는 글', tone: '조심스러운 시작, 기대, 첫 마음', style: '짧고 맑은 문장. 지나치게 무겁지 않게.', sceneGuide: '연초의 교실 분위기, 첫 출근길, 새 학년 첫날의 공기', emphasis: '첫 마음의 질감', primarySources: ['question', 'schedule'], secondarySources: ['care'] },
  1: { title: '올해의 환경과 현실', tone: '설명적, 구조적, 현실 인식', style: '맥락 설명 포함. 감정만 쏟지 말고 환경/업무 구조를 보여줄 것.', sceneGuide: '업무 더미, 회의실 분위기, 반복되는 서류 앞의 시간', emphasis: '구조적 압박의 풍경', primarySources: ['schedule', 'care'], secondarySources: ['question'] },
  2: { title: '학교생활의 초반', tone: '시작의 긴장, 낯섦, 적응 초입', style: '첫 경험의 신선함과 부담을 동시에. 시행착오의 질감.', sceneGuide: '첫 수업, 첫 상담, 학생 이름을 외우던 시간, 교실 정리', emphasis: '처음 마주한 현실의 구체성', primarySources: ['schedule', 'care'], secondarySources: ['observation', 'meal'] },
  3: { title: '익숙해지는 과정', tone: '반복 속 적응, 버팀, 서서히 안정', style: '서서히 변하는 리듬을 보여줄 것. 급변이 아닌 점진적 흐름.', sceneGuide: '같은 시간에 반복되는 루틴, 몸에 밴 동선, 눈치 없이 흘러간 하루', emphasis: '버티다 보니 익숙해진 감각', primarySources: ['care', 'schedule'], secondarySources: ['observation'] },
  4: { title: '관계와 사람들', tone: '사람, 대화, 위로, 소모', style: '인물과 말과 분위기 중심. 관계의 온도가 느껴지게.', sceneGuide: '동료와의 짧은 대화, 학부모 전화 후의 고요, 학생의 예상 못한 한마디', emphasis: '사람 사이의 온도', primarySources: ['observation', 'care'], secondarySources: ['question', 'meal'] },
  5: { title: '책임감과 역할', tone: '무게감, 감당, 끝까지 해냄', style: '업무와 역할의 부담이 드러나되 자랑이 아닌 기록으로.', sceneGuide: '마감 직전의 긴장, 혼자 남은 교무실, 끝냈을 때의 허탈감', emphasis: '감당의 무게와 완수의 감각', primarySources: ['care', 'schedule'], secondarySources: ['observation', 'question'] },
  6: { title: '전환의 순간', tone: '흔들림, 깨달음, 다시 일어섬', style: '감정선이 가장 강해야 하는 장. 급격한 변화의 순간을 잡아낼 것.', sceneGuide: '무너질 뻔한 순간, 누군가의 말, 갑자기 달라진 시선, 멈춰 선 복도', emphasis: '전환이 일어난 정확한 순간', primarySources: ['care', 'question'], secondarySources: ['observation', 'schedule'] },
  7: { title: '지금의 나', tone: '현재의 정리, 자기 인식', style: '차분하고 압축적. 지금의 모습이 또렷해야 함.', sceneGuide: '최근의 하루, 퇴근길 감각, 교실에서 자기를 바라보는 순간', emphasis: '올해를 지난 후의 선명한 자기 인식', primarySources: ['question', 'care'], secondarySources: ['schedule'] },
  8: { title: '앞으로의 마음', tone: '다짐, 희망, 조심스러운 미래', style: '막연하지 않고 현재에서 이어지는 방향성. 가볍지만 진심 있게.', sceneGuide: '내년을 상상하는 장면, 달라지고 싶은 구체적 모습', emphasis: '현실에서 출발하는 다짐', primarySources: ['question'], secondarySources: ['care', 'schedule'] },
  9: { title: '맺는 글', tone: '닫음, 정리, 남기는 말', style: '감정 과잉보다 잔향이 남는 마무리. 여운을 남길 것.', sceneGuide: '연말의 교실, 마지막 인사, 혼자 앉은 시간', emphasis: '올해를 닫는 마지막 장면과 한마디', primarySources: ['question', 'care'], secondarySources: ['meal'] },
};

// source_type별 역할
const SOURCE_ROLES: Record<string, { paragraphRole: string; priority: number }> = {
  schedule: { paragraphRole: 'background', priority: 1 },
  care: { paragraphRole: 'scene', priority: 2 },
  observation: { paragraphRole: 'scene', priority: 3 },
  meal: { paragraphRole: 'atmosphere', priority: 5 },
  question: { paragraphRole: 'interpretation', priority: 4 },
  manual: { paragraphRole: 'interpretation', priority: 0 },
  'ai-generated': { paragraphRole: 'bridge', priority: 6 },
};

function buildSystemPrompt(chapterIndex: number, emotionContext: string) {
  const config = CHAPTER_CONFIG[chapterIndex] || CHAPTER_CONFIG[0];
  return `당신은 초등학교 교사의 연간 자서전을 편찬하는 전문 작가입니다.

━━━ 현재 장 정보 ━━━
장: 제${chapterIndex + 1}장 "${config.title}"
톤: ${config.tone}
문체: ${config.style}
이 장이 보여줘야 할 핵심: ${config.emphasis}
${emotionContext ? `감정 맥락: ${emotionContext}` : ''}

━━━ 장 생성 공식 ━━━
1문단 [배경]: 그 시기의 일정/업무/환경/분위기. 독자가 맥락을 이해하게.
2문단 [장면]: 실제 기억에 남는 한 순간을 구체적으로 묘사. 이 장의 핵심.
3문단 [해석]: 그 장면이 교사에게 어떤 의미였는지. 자기 인식.
4문단 [감정] (선택): 감정의 온도. 긍정/부정 감정의 질감.
5문단 [마무리] (선택): 이 시기를 지나며 남은 것. 다음으로의 연결.

━━━ 장면성 규칙 (가장 중요) ━━━
장면 문단에는 반드시 아래 중 2개 이상 포함:
- 시간감 (늦은 오후, 학기 초, 마감 전날)
- 상황/행동 (몇 줄의 기록을 붙잡고 있었다)
- 공간/분위기 (교무실이 가라앉아 있었다)
- 관계/대화 (동료의 짧은 말 한마디)
- 몸의 감각 (마음이 먼저 지쳐갔다)

장면 힌트: ${config.sceneGuide}

금지:
× "힘들었다" "버거웠다" "지쳤다" 같은 추상 요약으로 장면 문단 시작
× 같은 감정 단어 한 장 안에서 2회 이상 반복
× 이전 문단과 같은 어미로 끝나는 연속 문장

━━━ 중복 억제 규칙 ━━━
- 같은 감정/키워드를 한 장 안에서 반복하지 마세요
- 비슷한 의미의 문장이 2개 이상이면 가장 장면성이 높은 것만 사용하세요
- "힘들었다/버거웠다/지쳤다"를 동시에 쓰지 마세요. 하나만 쓰고 나머지는 구체 장면으로 대체하세요

━━━ 문체 규칙 ━━━
- 교사 시점의 차분한 회고 톤
- 보고서도 아니고 감상문도 아닌, 교사의 한 해를 정리한 자서전 톤
- 각 문단 60~150자
- 줄바꿈으로 구분
- 설명/제목 없이 본문만
- 최소 3문단, 최대 5문단`;
}

function buildUserPrompt(materials: { background: string[]; scene: string[]; interpretation: string[]; atmosphere: string[]; emotion: string }) {
  const parts: string[] = [];

  if (materials.background.length > 0) {
    parts.push(`[배경 재료]\n${materials.background.join('\n')}`);
  }
  if (materials.scene.length > 0) {
    parts.push(`[장면 재료]\n${materials.scene.join('\n')}`);
  }
  if (materials.interpretation.length > 0) {
    parts.push(`[해석/의미 재료]\n${materials.interpretation.join('\n')}`);
  }
  if (materials.atmosphere.length > 0) {
    parts.push(`[분위기 재료]\n${materials.atmosphere.join('\n')}`);
  }
  if (materials.emotion) {
    parts.push(`[감정 상태]\n${materials.emotion}`);
  }

  parts.push('\n위 재료를 바탕으로 이 장의 자서전 문단을 작성해주세요.');
  return parts.join('\n\n');
}

function classifyMaterials(entries: any[], digests: any[]) {
  const background: string[] = [];
  const scene: string[] = [];
  const interpretation: string[] = [];
  const atmosphere: string[] = [];
  const seen = new Set<string>();

  const addUnique = (arr: string[], text: string) => {
    const key = text.slice(0, 30);
    if (seen.has(key)) return;
    seen.add(key);
    arr.push(text);
  };

  // entries 분류
  for (const e of entries) {
    const text = (e.current_text || e.currentText || '').trim();
    if (!text || text.length < 3) continue;
    const type = e.source_type || e.sourceType || 'manual';
    const role = SOURCE_ROLES[type]?.paragraphRole || 'interpretation';
    if (role === 'background') addUnique(background, text);
    else if (role === 'scene') addUnique(scene, text);
    else if (role === 'atmosphere') addUnique(atmosphere, text);
    else addUnique(interpretation, text);
  }

  // digests 보강
  for (const d of digests) {
    const lines = d.summary_lines || d.summaryLines || [];
    const type = d.source_type || d.sourceType || '';
    for (const line of lines) {
      if (!line || seen.has(line.slice(0, 30))) continue;
      if (type === 'schedule') addUnique(background, line);
      else if (type === 'care') addUnique(scene, line);
      else if (type === 'meal') addUnique(atmosphere, line);
      else addUnique(interpretation, line);
    }
  }

  return { background, scene, interpretation, atmosphere, emotion: '' };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'POST only' });

  let body: any = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }

  const { userId, chapterIndex, entries = [], digests = [], emotionSummary = '', additionalPrompt = '' } = body;
  if (chapterIndex === undefined) return res.status(400).json({ message: 'chapterIndex 필요' });

  const materials = classifyMaterials(entries, digests);
  materials.emotion = emotionSummary;

  // 추가 프롬프트
  if (additionalPrompt) {
    materials.interpretation.push(additionalPrompt);
  }

  // 재료가 없으면 fallback
  const totalMaterials = materials.background.length + materials.scene.length + materials.interpretation.length + materials.atmosphere.length;
  if (totalMaterials === 0) {
    const config = CHAPTER_CONFIG[chapterIndex] || CHAPTER_CONFIG[0];
    return res.status(200).json({
      paragraphs: [`이 장은 아직 재료가 부족합니다. 질문에 답하거나 돌봄교실 기록을 추가하면 "${config.title}" 초안이 더 풍부해집니다.`],
      model: 'fallback',
      materialCount: 0,
    });
  }

  // GPT 호출
  if (!process.env.OPENAI_API_KEY) {
    // rule-based fallback
    const paragraphs: string[] = [];
    if (materials.background.length > 0) paragraphs.push(materials.background[0]);
    if (materials.scene.length > 0) paragraphs.push(materials.scene[0]);
    if (materials.interpretation.length > 0) paragraphs.push(materials.interpretation[0]);
    if (paragraphs.length === 0) paragraphs.push('이 장의 재료가 수집되었지만 아직 문단으로 편찬되지 않았습니다.');
    return res.status(200).json({ paragraphs, model: 'rule-based', materialCount: totalMaterials });
  }

  try {
    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: buildSystemPrompt(chapterIndex, emotionSummary) },
        { role: 'user', content: buildUserPrompt(materials) },
      ],
      max_tokens: 2000,
      temperature: 0.8,
    });

    const raw = completion.choices[0]?.message?.content || '';
    const paragraphs = raw.split('\n').map(l => l.trim()).filter(l => l.length > 5);

    return res.status(200).json({ paragraphs, model: 'gpt-4o-mini', materialCount: totalMaterials });
  } catch (err: any) {
    console.error('generate-chapter error:', err);
    const paragraphs: string[] = [];
    if (materials.background.length > 0) paragraphs.push(materials.background[0]);
    if (materials.scene.length > 0) paragraphs.push(materials.scene[0]);
    if (materials.interpretation.length > 0) paragraphs.push(materials.interpretation[0]);
    return res.status(200).json({ paragraphs, model: 'fallback', materialCount: totalMaterials });
  }
}
