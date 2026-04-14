// @ts-ignore
import type { VercelRequest, VercelResponse } from '@vercel/node';
// @ts-ignore
import { Pool } from 'pg';

let pool: Pool | null = null;
function getPool(): Pool {
  if (!pool) { pool = new Pool({ connectionString: process.env.POSTGRES_URL, ssl: { rejectUnauthorized: false }, max: 3, connectionTimeoutMillis: 5000 }); }
  return pool;
}

// 자서전 반영 탭 정의 (질문 템플릿)
const SECTIONS = [
  { id: 'background', title: '성장 배경', chapter: '교사가 되기까지', questions: [
    '어린 시절 어떤 환경에서 자랐나요?',
    '학교와 선생님에 대한 기억은 어떤가요?',
    '교사가 되고 싶다고 처음 느낀 순간은 언제인가요?',
  ]},
  { id: 'entry', title: '교직 입문 계기', chapter: '교사가 되기까지', questions: [
    '처음 교단에 섰을 때 가장 기억나는 장면은 무엇인가요?',
    '첫 해에 가장 힘들었던 일은 무엇이었나요?',
    '그 시기를 지나며 배운 점은 무엇인가요?',
  ]},
  { id: 'philosophy', title: '교육 철학', chapter: '남기고 싶은 교육 철학', questions: [
    '학생에게 꼭 남기고 싶은 태도는 무엇인가요?',
    '성적보다 더 중요하다고 생각하는 가치는 무엇인가요?',
    '본인이 생각하는 좋은 교사의 기준은 무엇인가요?',
  ]},
  { id: 'classroom', title: '학급 운영', chapter: '교실에서의 시간', questions: [
    '수업에서 가장 중요하게 여긴 원칙은 무엇인가요?',
    '학생들과의 관계를 위해 어떤 노력을 했나요?',
    '기억에 남는 학급 문화나 활동이 있나요?',
  ]},
  { id: 'students', title: '기억에 남는 학생/사건', chapter: '학생들과의 이야기', questions: [
    '지금도 잊히지 않는 학생은 누구인가요?',
    '그 학생과의 경험이 자신에게 남긴 변화는 무엇인가요?',
    '교사로서 가장 뿌듯했던 순간은 언제였나요?',
  ]},
  { id: 'achievements', title: '주요 성과', chapter: '나를 바꾼 순간들', questions: [
    '교직 생활에서 가장 자랑스러운 성과는 무엇인가요?',
    '위기를 극복한 경험이 있다면 무엇인가요?',
    '동료 교사들과 함께한 의미 있는 활동은 무엇인가요?',
  ]},
  { id: 'closing', title: '감사의 말 / 마무리', chapter: '감사와 헌사', questions: [
    '후배 교사에게 남기고 싶은 말은 무엇인가요?',
    '학생들에게 꼭 전하고 싶은 마지막 한 문장은 무엇인가요?',
    '자신의 교직 인생을 한 문장으로 정리하면 무엇인가요?',
  ]},
];

const CHAPTERS = [
  '나는 어떤 교사였는가',
  '교사가 되기까지',
  '교실에서의 시간',
  '학생들과의 이야기',
  '나를 바꾼 순간들',
  '남기고 싶은 교육 철학',
  '기록으로 보는 발자취',
  '감사와 헌사',
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const db = getPool();
  const action = req.query.action as string | undefined;

  try {
    // GET /api/autobiography?action=sections - 반영 탭 템플릿 반환
    if (req.method === 'GET' && action === 'sections') {
      return res.status(200).json({ sections: SECTIONS, chapters: CHAPTERS });
    }

    // GET /api/autobiography?action=entries&userId=xxx - 저장된 입력 조회
    if (req.method === 'GET' && action === 'entries') {
      const userId = req.query.userId as string;
      if (!userId) return res.status(400).json({ message: 'userId 필요' });

      // autobiography_entries 테이블이 없으면 생성
      await db.query(`
        CREATE TABLE IF NOT EXISTS autobiography_entries (
          id SERIAL PRIMARY KEY,
          "userId" VARCHAR NOT NULL,
          section_id VARCHAR NOT NULL,
          question_index INT NOT NULL,
          answer TEXT DEFAULT '',
          "updatedAt" TIMESTAMP DEFAULT NOW(),
          UNIQUE("userId", section_id, question_index)
        )
      `);

      const { rows } = await db.query(
        'SELECT section_id, question_index, answer FROM autobiography_entries WHERE "userId" = $1 ORDER BY section_id, question_index',
        [userId],
      );
      return res.status(200).json(rows);
    }

    // POST /api/autobiography?action=save - 입력 저장
    if (req.method === 'POST' && action === 'save') {
      let body: any = req.body;
      if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
      const { userId, sectionId, questionIndex, answer } = body;
      if (!userId || !sectionId || questionIndex === undefined) {
        return res.status(400).json({ message: '필수 필드 누락' });
      }

      await db.query(`
        CREATE TABLE IF NOT EXISTS autobiography_entries (
          id SERIAL PRIMARY KEY,
          "userId" VARCHAR NOT NULL,
          section_id VARCHAR NOT NULL,
          question_index INT NOT NULL,
          answer TEXT DEFAULT '',
          "updatedAt" TIMESTAMP DEFAULT NOW(),
          UNIQUE("userId", section_id, question_index)
        )
      `);

      await db.query(
        `INSERT INTO autobiography_entries ("userId", section_id, question_index, answer, "updatedAt")
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT ("userId", section_id, question_index)
         DO UPDATE SET answer = $4, "updatedAt" = NOW()`,
        [userId, sectionId, questionIndex, answer || ''],
      );
      return res.status(200).json({ success: true });
    }

    // POST /api/autobiography?action=generate - AI 초안 생성
    if (req.method === 'POST' && action === 'generate') {
      let body: any = req.body;
      if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
      const { userId, teacherName, schoolName, years } = body;

      // 저장된 입력 조회
      const { rows: entries } = await db.query(
        'SELECT section_id, question_index, answer FROM autobiography_entries WHERE "userId" = $1 AND answer != \'\' ORDER BY section_id, question_index',
        [userId],
      );

      if (entries.length === 0) {
        return res.status(400).json({ message: '작성된 내용이 없습니다. 반영 탭에서 먼저 입력해주세요.' });
      }

      // 입력 내용을 섹션별로 정리
      const sectionData: Record<string, { title: string; chapter: string; qa: { q: string; a: string }[] }> = {};
      for (const entry of entries) {
        const section = SECTIONS.find(s => s.id === entry.section_id);
        if (!section) continue;
        if (!sectionData[entry.section_id]) {
          sectionData[entry.section_id] = { title: section.title, chapter: section.chapter, qa: [] };
        }
        sectionData[entry.section_id].qa.push({
          q: section.questions[entry.question_index] || '',
          a: entry.answer,
        });
      }

      // AI 프롬프트 조합
      let contentPrompt = '';
      for (const [, data] of Object.entries(sectionData)) {
        contentPrompt += `\n## ${data.title} (→ 최종 장: ${data.chapter})\n`;
        for (const qa of data.qa) {
          contentPrompt += `질문: ${qa.q}\n답변: ${qa.a}\n\n`;
        }
      }

      const systemPrompt = `당신은 초등학교 교사의 자서전을 작성하는 전문 작가입니다.
아래 교사의 질문-답변 내용을 바탕으로 따뜻하고 진솔한 자서전을 작성해주세요.

자서전 구조:
${CHAPTERS.map((c, i) => `${i + 1}. ${c}`).join('\n')}

작성 원칙:
- 각 장(chapter)을 "## 장 제목" 형식으로 구분해주세요
- 교사의 답변 내용을 자연스러운 서사로 재구성해주세요
- 답변이 없는 장은 간략하게 다루거나 생략해주세요
- 따뜻하고 감동적인 톤으로 작성해주세요
- 존댓말로 작성해주세요
- 각 장은 300~500자 내외로 작성해주세요`;

      const userPrompt = `교사 이름: ${teacherName || '교사'}
학교: ${schoolName || ''}
재직 기간: ${years || ''}

=== 교사가 입력한 내용 ===
${contentPrompt}

위 내용을 바탕으로 자서전을 작성해주세요.`;

      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 4000,
        temperature: 0.7,
      });

      const draft = completion.choices[0]?.message?.content || '';

      // 초안 저장
      await db.query(`
        CREATE TABLE IF NOT EXISTS autobiography_drafts (
          id SERIAL PRIMARY KEY,
          "userId" VARCHAR NOT NULL,
          content TEXT NOT NULL,
          version INT DEFAULT 1,
          "createdAt" TIMESTAMP DEFAULT NOW()
        )
      `);

      const versionResult = await db.query(
        'SELECT COALESCE(MAX(version), 0) + 1 AS next FROM autobiography_drafts WHERE "userId" = $1',
        [userId],
      );
      const nextVersion = versionResult.rows[0].next;

      await db.query(
        'INSERT INTO autobiography_drafts ("userId", content, version, "createdAt") VALUES ($1, $2, $3, NOW())',
        [userId, draft, nextVersion],
      );

      return res.status(200).json({ draft, version: nextVersion });
    }

    // GET /api/autobiography?action=drafts&userId=xxx - 초안 목록
    if (req.method === 'GET' && action === 'drafts') {
      const userId = req.query.userId as string;
      await db.query(`CREATE TABLE IF NOT EXISTS autobiography_drafts (id SERIAL PRIMARY KEY, "userId" VARCHAR NOT NULL, content TEXT NOT NULL, version INT DEFAULT 1, "createdAt" TIMESTAMP DEFAULT NOW())`);
      const { rows } = await db.query(
        'SELECT id, version, "createdAt", LENGTH(content) AS length FROM autobiography_drafts WHERE "userId" = $1 ORDER BY version DESC',
        [userId],
      );
      return res.status(200).json(rows);
    }

    // GET /api/autobiography?action=draft&userId=xxx&version=1 - 특정 초안
    if (req.method === 'GET' && action === 'draft') {
      const userId = req.query.userId as string;
      const version = req.query.version as string;
      const { rows } = await db.query(
        'SELECT * FROM autobiography_drafts WHERE "userId" = $1 AND version = $2',
        [userId, version],
      );
      if (rows.length === 0) return res.status(404).json({ message: '초안 없음' });
      return res.status(200).json(rows[0]);
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (err: any) {
    console.error('autobiography error:', err);
    return res.status(500).json({ message: '처리 중 오류가 발생했습니다.' });
  }
}
