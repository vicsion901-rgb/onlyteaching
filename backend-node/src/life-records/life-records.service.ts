import { Injectable } from '@nestjs/common';

type KeywordItem = { keyword_id: number; keyword: string };
type CommentItem = {
  comment_id: number;
  keyword: string;
  content: string;
  usage_count: number;
};

@Injectable()
export class LifeRecordsService {
  private readonly keywords: KeywordItem[] = [
    { keyword_id: 1, keyword: '발표능력' },
    { keyword_id: 2, keyword: '정리정돈' },
    { keyword_id: 3, keyword: '예의바름' },
    { keyword_id: 4, keyword: '협력' },
    { keyword_id: 5, keyword: '책임감' },
  ];

  private readonly comments: CommentItem[] = [
    {
      comment_id: 101,
      keyword: '발표능력',
      content: '수업 시간에 또렷한 발음과 자신감 있는 자세로 발표를 이어감.',
      usage_count: 0,
    },
    {
      comment_id: 102,
      keyword: '정리정돈',
      content: '활동 후 자리와 자료를 스스로 정돈하며 주변을 깨끗하게 유지함.',
      usage_count: 0,
    },
    {
      comment_id: 103,
      keyword: '예의바름',
      content: '교사와 친구들에게 공손하게 인사하고 바른 언어 습관을 보임.',
      usage_count: 0,
    },
    {
      comment_id: 104,
      keyword: '협력',
      content: '모둠 활동에서 역할을 충실히 수행하며 의견을 경청하고 조율함.',
      usage_count: 0,
    },
    {
      comment_id: 105,
      keyword: '책임감',
      content: '맡은 과제를 마감에 맞춰 제출하고 결과를 점검하는 책임감을 보임.',
      usage_count: 0,
    },
  ];

  searchKeywords(query: string): KeywordItem[] {
    if (!query) return this.keywords.slice(0, 10);
    const lower = query.toLowerCase();
    return this.keywords
      .filter((k) => k.keyword.toLowerCase().includes(lower))
      .slice(0, 20);
  }

  commentsByKeyword(keyword: string): CommentItem[] {
    if (!keyword) return [];
    const lower = keyword.toLowerCase();
    return this.comments.filter((c) => c.keyword.toLowerCase().includes(lower));
  }

  useComment(commentId: number): CommentItem {
    const found = this.comments.find((c) => c.comment_id === commentId);
    if (!found) throw new Error('comment not found');
    found.usage_count += 1;
    return found;
  }

  generateLifeRecord(options: {
    selected_keywords?: string[];
    student_name?: string;
    additional_context?: string;
    ai_model?: string;
  }) {
    const {
      selected_keywords = [],
      student_name = '',
      additional_context = '',
      ai_model,
    } = options || {};

    const namePart = student_name ? `${student_name} 학생은 ` : '';
    const keywords = selected_keywords.length > 0 ? selected_keywords : ['성실함'];
    const sentences = keywords.map(
      (kw, idx) =>
        `${idx === 0 ? namePart : ''}${kw}을(를) 기반으로 수업과 활동에 적극적으로 참여하며 꾸준히 성장하고 있습니다.`,
    );
    const contextPart = additional_context ? ` 추가 메모: ${additional_context}` : '';

    return {
      generated_text: sentences.join(' ') + contextPart,
      ai_model: ai_model || 'rule-based',
    };
  }
}








