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
const CHAPTER_CONFIG: Record<number, { title: string; tone: string; primarySources: string[]; secondarySources: string[] }> = {
  0: { title: '시작하는 글', tone: '시작, 기대, 조심스러운 긴장', primarySources: ['question', 'schedule'], secondarySources: ['care'] },
  1: { title: '올해의 환경과 현실', tone: '현실, 압박, 구조적 배경', primarySources: ['schedule', 'care'], secondarySources: ['question'] },
  2: { title: '학교생활의 초반', tone: '시작, 낯섦, 긴장, 첫 경험', primarySources: ['schedule', 'care'], secondarySources: ['observation', 'meal'] },
  3: { title: '익숙해지는 과정', tone: '적응, 루틴, 버팀의 리듬', primarySources: ['care', 'schedule'], secondarySources: ['observation'] },
  4: { title: '관계와 사람들', tone: '사람, 위로와 소모, 관계의 온도', primarySources: ['observation', 'care'], secondarySources: ['question', 'meal'] },
  5: { title: '책임감과 역할', tone: '책임, 감당, 역할의 무게', primarySources: ['care', 'schedule'], secondarySources: ['observation', 'question'] },
  6: { title: '전환의 순간', tone: '흔들림, 회복, 결정적 계기', primarySources: ['care', 'question'], secondarySources: ['observation', 'schedule'] },
  7: { title: '지금의 나', tone: '현재, 정리, 자기 인식', primarySources: ['question', 'care'], secondarySources: ['schedule'] },
  8: { title: '앞으로의 마음', tone: '다짐, 시선, 미래 준비', primarySources: ['question'], secondarySources: ['care', 'schedule'] },
  9: { title: '맺는 글', tone: '정리, 회고, 마무리', primarySources: ['question', 'care'], secondarySources: ['meal'] },
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

function buildSystemPrompt(chapterIndex: number) {
  const config = CHAPTER_CONFIG[chapterIndex] || CHAPTER_CONFIG[0];
  return `당신은 초등학교 교사의 연간 자서전을 편찬하는 전문 작가입니다.

현재 작성 중인 장: "${config.title}"
이 장의 톤: ${config.tone}

장 생성 공식 (반드시 따를 것):
1. 배경 문단: 그 시기의 일정, 업무, 환경, 분위기를 설명
2. 장면 문단: 실제 기억에 남는 순간, 하루, 대화, 표정을 구체적으로 묘사
3. 해석 문단: 그 장면이 교사에게 어떤 의미였는지, 왜 기억에 남는지 정리
4. (선택) 감정 문단: 긍정/부정 감정의 온도를 장에 녹여서 표현
5. (선택) 마무리 문단: 이 시기를 지나며 무엇이 남았는지, 다음으로 어떻게 이어지는지

문체 규칙:
- 교사 시점의 차분한 회고 톤
- 설명보다 장면을 먼저
- "힘들었다"보다 "어떤 날 어떻게 힘들었는지"를 보여줄 것
- 과장하지 않고, 시적이지 않게
- 생활기록부 톤이 아닌 자서전 톤
- 같은 감정/표현 반복 금지
- 각 문단은 50~120자

출력 형식:
각 문단을 줄바꿈으로 구분해서 출력하세요.
설명이나 제목 없이 본문만 출력하세요.
최소 3문단, 최대 5문단.`;
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

  return { background, scene, interpretation, atmosphere };
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
        { role: 'system', content: buildSystemPrompt(chapterIndex) },
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
