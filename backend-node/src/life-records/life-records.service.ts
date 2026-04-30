import { Injectable, Logger } from '@nestjs/common';

type KeywordItem = { keyword_id: number; keyword: string; category?: string };
type CommentItem = {
  comment_id: number;
  keyword: string;
  content: string;
  usage_count: number;
};

const RECOMMENDED_KEYWORDS: KeywordItem[] = [
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

const SAMPLE_COMMENTS: CommentItem[] = [
  { comment_id: 101, keyword: '발표력', content: '수업 시간에 또렷한 발음과 자신감 있는 자세로 발표를 이어감.', usage_count: 0 },
  { comment_id: 102, keyword: '정리정돈', content: '활동 후 자리와 자료를 스스로 정돈하며 주변을 깨끗하게 유지함.', usage_count: 0 },
  { comment_id: 103, keyword: '예의바름', content: '교사와 친구들에게 공손하게 인사하고 바른 언어 습관을 보임.', usage_count: 0 },
  { comment_id: 104, keyword: '협력', content: '모둠 활동에서 역할을 충실히 수행하며 의견을 경청하고 조율함.', usage_count: 0 },
  { comment_id: 105, keyword: '책임감', content: '맡은 과제를 마감에 맞춰 제출하고 결과를 점검하는 책임감을 보임.', usage_count: 0 },
];

@Injectable()
export class LifeRecordsService {
  private readonly logger = new Logger(LifeRecordsService.name);

  searchKeywords(query: string): KeywordItem[] {
    if (!query) return RECOMMENDED_KEYWORDS;
    const lower = query.toLowerCase();
    return RECOMMENDED_KEYWORDS.filter(
      (k) => k.keyword.toLowerCase().includes(lower) || (k.category && k.category.toLowerCase().includes(lower)),
    ).slice(0, 40);
  }

  commentsByKeyword(keyword: string): CommentItem[] {
    if (!keyword) return [];
    const lower = keyword.toLowerCase();
    return SAMPLE_COMMENTS.filter((c) => c.keyword.toLowerCase().includes(lower));
  }

  useComment(commentId: number): CommentItem {
    const found = SAMPLE_COMMENTS.find((c) => c.comment_id === commentId);
    if (!found) throw new Error('comment not found');
    found.usage_count += 1;
    return found;
  }

  async generateLifeRecord(options: {
    selected_keywords?: string[];
    student_name?: string;
    additional_context?: string;
    ai_model?: string;
  }) {
    const {
      selected_keywords = [],
      student_name = '',
      additional_context = '',
    } = options || {};

    const keywords = selected_keywords.length > 0 ? selected_keywords : ['성실'];

    if (!process.env.OPENAI_API_KEY) {
      return this.generateFallback(keywords, student_name, additional_context);
    }

    try {
      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 15000 });

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
      const parsed = this.parseKeywordResults(raw, keywords);

      return {
        generated_text: raw,
        keyword_results: parsed,
        ai_model: 'gpt-4o-mini',
      };
    } catch (err) {
      this.logger.warn(`AI generation failed, using fallback: ${err instanceof Error ? err.message : 'unknown'}`);
      return this.generateFallback(keywords, student_name, additional_context);
    }
  }

  private parseKeywordResults(raw: string, keywords: string[]): Record<string, string> {
    const results: Record<string, string> = {};
    const lines = raw.split('\n').filter((l) => l.trim());

    for (const line of lines) {
      const match = line.match(/^\[(.+?)\]\s*(.+)/);
      if (match) {
        results[match[1]] = match[2].trim();
      }
    }

    for (const kw of keywords) {
      if (!results[kw]) {
        const found = lines.find((l) => l.includes(kw));
        if (found) {
          results[kw] = found.replace(/^\[.+?\]\s*/, '').trim();
        }
      }
    }

    return results;
  }

  private generateFallback(keywords: string[], studentName: string, additionalContext: string) {
    const name = studentName || '해당 학생';
    const templates: Record<string, string[]> = {
      성실: [`${name}은(는) 수업에 빠짐없이 참여하며 맡은 과제를 꾸준히 수행함.`, `주어진 활동에 정성을 다하며 학습에 임하는 자세가 바름.`],
      협력: [`모둠 활동에서 친구의 의견을 경청하고 함께 결과를 만들어감.`, `${name}은(는) 협동 학습 시 자신의 역할을 충실히 수행함.`],
      배려: [`주변 친구를 살피고 어려움이 있을 때 먼저 도움을 건넴.`, `${name}은(는) 타인의 감정을 이해하고 배려하는 태도를 보임.`],
      책임감: [`맡은 역할을 끝까지 수행하며 결과에 대해 책임지는 모습을 보임.`, `${name}은(는) 학급 내 자신의 역할을 성실히 완수함.`],
      창의력: [`문제 상황에서 다양한 방법을 시도하며 새로운 아이디어를 제안함.`, `${name}은(는) 활동에서 독창적인 생각을 표현함.`],
      발표력: [`수업 시간에 자신의 생각을 또렷하게 전달하며 발표함.`, `${name}은(는) 발표 시 자신감 있는 태도를 보임.`],
      탐구심: [`궁금한 것이 있으면 스스로 찾아보고 탐색하는 자세를 보임.`, `${name}은(는) 학습 주제에 대해 깊이 있게 탐구함.`],
      끈기: [`어려운 과제도 포기하지 않고 끝까지 도전하는 모습을 보임.`, `${name}은(는) 실패에도 다시 시도하며 문제를 해결해냄.`],
      주도성: [`스스로 학습 계획을 세우고 실천하는 모습이 돋보임.`, `${name}은(는) 활동에서 앞장서서 이끄는 모습을 보임.`],
      정리정돈: [`활동 후 자리를 스스로 정돈하며 깨끗한 환경을 유지함.`, `${name}은(는) 학습 자료를 정리하는 습관이 잘 형성되어 있음.`],
      공감: [`친구의 이야기에 귀 기울이며 감정을 이해하려는 태도를 보임.`, `${name}은(는) 타인의 입장을 헤아리는 공감 능력이 뛰어남.`],
      리더십: [`모둠 활동에서 방향을 제시하고 친구들을 이끄는 모습을 보임.`, `${name}은(는) 학급 활동에서 자연스럽게 리더 역할을 수행함.`],
    };

    const seed = (studentName || '').length + Date.now() % 100;
    const results: Record<string, string> = {};
    const sentences: string[] = [];

    for (const kw of keywords) {
      const options = templates[kw];
      if (options) {
        const picked = options[seed % options.length];
        results[kw] = picked;
        sentences.push(picked);
      } else {
        const fallback = `${name}은(는) ${kw}과(와) 관련된 활동에서 꾸준한 성장을 보이고 있음.`;
        results[kw] = fallback;
        sentences.push(fallback);
      }
    }

    const contextPart = additionalContext ? ` ${additionalContext}` : '';

    return {
      generated_text: sentences.join(' ') + contextPart,
      keyword_results: results,
      ai_model: 'rule-based',
    };
  }
}
