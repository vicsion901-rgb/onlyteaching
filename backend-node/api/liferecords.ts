// @ts-ignore
import type { VercelRequest, VercelResponse } from '@vercel/node';
// @ts-ignore
import { Pool } from 'pg';

let pool: Pool | null = null;
function getPool(): Pool {
  if (!pool) { pool = new Pool({ connectionString: process.env.POSTGRES_URL, ssl: { rejectUnauthorized: false }, max: 3, connectionTimeoutMillis: 5000 }); }
  return pool;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const db = getPool();
  const action = req.query.action as string | undefined;

  try {
    // GET /api/liferecords?action=keywords&query=...
    if (req.method === 'GET' && action === 'keywords') {
      const query = (req.query.query as string || '').trim();
      let sql = 'SELECT DISTINCT category AS keyword, subcategory, attribute FROM student_record_comments';
      const vals: any[] = [];
      if (query) { sql += ' WHERE category ILIKE $1 OR subcategory ILIKE $1 OR attribute ILIKE $1'; vals.push(`%${query}%`); }
      sql += ' ORDER BY category, subcategory LIMIT 50';
      const { rows } = await db.query(sql, vals);
      return res.status(200).json(rows);
    }

    // GET /api/liferecords?action=comments&keyword=...
    if (req.method === 'GET' && action === 'comments') {
      const keyword = req.query.keyword as string || '';
      const { rows } = await db.query(
        'SELECT id AS comment_id, category, subcategory, attribute, content FROM student_record_comments WHERE category = $1 OR subcategory = $1 OR attribute = $1 ORDER BY id LIMIT 20',
        [keyword],
      );
      return res.status(200).json(rows);
    }

    // POST /api/liferecords?action=use&commentId=...
    if (req.method === 'POST' && action === 'use') {
      const commentId = req.query.commentId as string;
      const { rows } = await db.query('SELECT * FROM student_record_comments WHERE id = $1', [commentId]);
      return res.status(200).json(rows[0] || {});
    }

    // POST /api/liferecords?action=generate (AI 생성)
    if (req.method === 'POST' && action === 'generate') {
      let body: any = req.body;
      if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
      const { selected_keywords = [], student_name = '', additional_context = '' } = body || {};
      const keywords = selected_keywords.length > 0 ? selected_keywords : ['성실'];

      if (!process.env.OPENAI_API_KEY) {
        return res.status(200).json(generateFallback(keywords, student_name, additional_context));
      }

      try {
        const { default: OpenAI } = await import('openai');
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const systemPrompt = `당신은 초등학교 생활기록부 작성 전문가입니다.

작성 규칙:
- 교사 서술형 기록 스타일 (3인칭 관찰자 시점)
- 긍정적이고 관찰 중심으로 서술
- 과장하지 않고, 구체적 행동이나 태도를 묘사
- 각 키워드당 1~2문장 (50~80자)
- 같은 키워드라도 학생마다 서술 포인트, 문장 구조, 표현을 다르게
- 기계적 반복 패턴이 드러나지 않게

다양화 전략:
- 같은 "협력"이라도: 친구와의 대화, 모둠 역할 분담, 의견 조율, 공동체 기여 등 다른 측면에서 서술
- 같은 "책임감"이라도: 과제 수행, 역할 완수, 자기 점검, 약속 이행 등 다른 행동으로 표현
- 문장 시작을 다양하게: 학생 이름, 행동 묘사, 상황 설명 등으로 시작점 변형

출력 형식:
각 키워드에 대해 아래 형식으로 출력:
[키워드] 생활기록부 문장

주의: 설명이나 부연 없이 위 형식만 출력하세요.`;

        const nameContext = student_name ? `학생 이름: ${student_name}` : '학생 이름: (미지정)';
        const extraContext = additional_context ? `\n교사 관찰/추가 요청: ${additional_context}` : '';
        const randomSeed = `변형 시드: ${Date.now() % 1000}`;

        const userPrompt = `${nameContext}
선택 키워드: ${keywords.join(', ')}${extraContext}
${randomSeed}

위 키워드 각각에 대해 생활기록부 문장을 1개씩 작성해주세요.`;

        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 2000,
          temperature: 0.9,
        });

        const raw = completion.choices[0]?.message?.content || '';
        const keyword_results = parseKeywordResults(raw, keywords);

        return res.status(200).json({
          generated_text: raw,
          keyword_results,
          ai_model: 'gpt-4o-mini',
        });
      } catch (err: any) {
        console.error('AI generation failed:', err.message);
        return res.status(200).json(generateFallback(keywords, student_name, additional_context));
      }
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (err: any) {
    console.error('liferecords error:', err);
    return res.status(500).json({ message: '처리 중 오류' });
  }
}

function parseKeywordResults(raw: string, keywords: string[]): Record<string, string> {
  const results: Record<string, string> = {};
  const lines = raw.split('\n').filter(l => l.trim());
  for (const line of lines) {
    const match = line.match(/^\[(.+?)\]\s*(.+)/);
    if (match) results[match[1]] = match[2].trim();
  }
  for (const kw of keywords) {
    if (!results[kw]) {
      const found = lines.find(l => l.includes(kw));
      if (found) results[kw] = found.replace(/^\[.+?\]\s*/, '').trim();
    }
  }
  return results;
}

function generateFallback(keywords: string[], studentName: string, additionalContext: string) {
  const name = studentName || '해당 학생';
  const templates: Record<string, string[]> = {
    성실: [`${name}은(는) 수업에 빠짐없이 참여하며 맡은 과제를 꾸준히 수행함.`, `주어진 활동에 정성을 다하며 학습에 임하는 자세가 바름.`],
    협력: [`모둠 활동에서 친구의 의견을 경청하고 함께 결과를 만들어감.`, `${name}은(는) 협동 학습 시 자신의 역할을 충실히 수행함.`],
    배려: [`주변 친구를 살피고 어려움이 있을 때 먼저 도움을 건넴.`, `${name}은(는) 타인의 감정을 이해하고 배려하는 태도를 보임.`],
    책임감: [`맡은 역할을 끝까지 수행하며 결과에 대해 책임지는 모습을 보임.`, `${name}은(는) 학급 내 자신의 역할을 성실히 완수함.`],
    창의력: [`문제 상황에서 다양한 방법을 시도하며 새로운 아이디어를 제안함.`, `${name}은(는) 활동에서 독창적인 생각을 표현함.`],
    발표력: [`수업 시간에 자신의 생각을 또렷하게 전달하며 발표함.`, `${name}은(는) 발표 시 자신감 있는 태도를 보임.`],
  };

  const seed = (studentName || '').length + Date.now() % 100;
  const keyword_results: Record<string, string> = {};
  const sentences: string[] = [];

  for (const kw of keywords) {
    const options = templates[kw];
    if (options) {
      const picked = options[seed % options.length];
      keyword_results[kw] = picked;
      sentences.push(picked);
    } else {
      const fb = `${name}은(는) ${kw}과(와) 관련된 활동에서 꾸준한 성장을 보이고 있음.`;
      keyword_results[kw] = fb;
      sentences.push(fb);
    }
  }

  return {
    generated_text: sentences.join(' ') + (additionalContext ? ` ${additionalContext}` : ''),
    keyword_results,
    ai_model: 'rule-based',
  };
}
