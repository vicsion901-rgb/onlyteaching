// @ts-ignore
import type { VercelRequest, VercelResponse } from '@vercel/node';
// @ts-ignore
import OpenAI from 'openai';

const INTENT_SYSTEM_PROMPT = `당신은 한국 초등 교사용 서비스의 의도 해석기입니다.
사용자의 한국어 요청을 읽고 아래 JSON만 출력하세요 (다른 설명/문장 금지):

{
  "intent": "<intent>",
  "mode": "<mode>",
  "confidence": <0~1>,
  "studentNumber": <정수 또는 null>,
  "studentName": "<문자열 또는 null>",
  "subject": "<문자열 또는 null>",
  "area": "<문자열 또는 null>",
  "lineCount": <정수 또는 null>,
  "ambiguous": <boolean>
}

intent 값(반드시 다음 중 하나):
- "student-record"     : 생활기록부 문장 작성/생기부
- "counseling-record"  : 관찰일지/상담 기록
- "subject-evaluation" : 교과평가/평가문장/성취기준 기반 문장
- "meal-feed"          : 오늘의 급식/사진/응원/급식상
- "qr-distribute"      : QR/링크 배포
- "autobiography"      : 자서전 편찬/챕터/회고
- "student-roster"     : 학생명부 조회/특정 학생 정보
- "creative-activity"  : 창의적 체험활동/창체
- "helper-tool"        : 발표자 정하기/자리 정하기/1인 1역/랜덤 추첨
- "schedule-admin"     : 학사일정/공지/가정통신문/행정
- "unknown"            : 모름

mode 값(반드시 다음 중 하나):
- "generate"  : 문장/초안을 직접 생성해야 함 (예: "써줘", "작성해", "초안")
- "execute"   : 기능 실행 (예: "발표자 뽑아줘", "추첨")
- "lookup"    : 조회/미리보기 (예: "보여줘", "보고싶어")
- "help"      : 안내/방법 질문 (예: "뭐 쓸 수 있지?", "키워드 알려줘")
- "navigate"  : 탭 이동만 필요

studentNumber: "5번", "12번" 같은 학생 번호 (있으면 정수, 없으면 null)
studentName: "김민수 학생" 같은 학생 이름 (있으면 문자열, 없으면 null)
subject: 교과명 — "국어"/"수학"/"사회"/"과학"/"영어"/"도덕"/"체육"/"음악"/"미술"/"실과"/"통합교과" 중 하나 또는 null
area: 영역명 (예: "듣기·말하기", "수와 연산") 또는 null
lineCount: "2줄"/"3줄"/"4줄" 표현에서 추출한 정수 또는 null
ambiguous: 의도가 명확하지 않으면 true

규칙:
- "생활기록부 키워드 알려줘" → intent: "student-record", mode: "help"
- "교과평가 12번 국어 2줄 작성해" → intent: "subject-evaluation", mode: "generate", studentNumber: 12, subject: "국어", lineCount: 2
- "발표자 뽑아줘" → intent: "helper-tool", mode: "execute"
- "오늘 급식 사진 보여줘" → intent: "meal-feed", mode: "lookup"
- "창체 뭐 쓸 수 있지?" → intent: "creative-activity", mode: "help"
- 모르겠으면 intent: "unknown", mode: "navigate"

JSON 객체만 출력하세요.`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const _origin = req.headers?.origin || ""; const _allowed = ["https://www.onlyteaching.kr","https://onlyteaching.kr","http://localhost:5173","http://localhost:3000"].includes(_origin) ? _origin : "https://www.onlyteaching.kr"; res.setHeader("Access-Control-Allow-Origin", _allowed); res.setHeader("Access-Control-Allow-Credentials", "true"); res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS"); res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization"); if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  try {
    let body: any = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const { title, content, mode } = body || {};
    const prompt = content || title || '';
    if (!prompt) return res.status(400).json({ message: '프롬프트를 입력해주세요.' });

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // intent 모드 — LLM 의도 해석 JSON
    if (mode === 'intent') {
      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: INTENT_SYSTEM_PROMPT },
            { role: 'user', content: prompt },
          ],
          response_format: { type: 'json_object' },
          max_tokens: 400,
          temperature: 0.1,
        });
        const result = completion.choices[0]?.message?.content || '{}';
        return res.status(200).json({ result, model: completion.model, mode: 'intent' });
      } catch (err: any) {
        console.error('intent parse error:', err);
        return res.status(500).json({ message: 'intent parse 실패', error: String(err?.message || err).slice(0, 200) });
      }
    }

    // 기본 — 자연어 생성
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: '당신은 초등학교 교사를 도와주는 AI 어시스턴트입니다. 한국어로 답변하세요.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 2000,
      temperature: 0.7,
    });

    const result = completion.choices[0]?.message?.content || '';
    return res.status(200).json({
      result,
      model: completion.model,
      usage: completion.usage,
    });
  } catch (err: any) {
    console.error('prompts error:', err);
    return res.status(500).json({ message: 'AI 생성 실패' });
  }
}
