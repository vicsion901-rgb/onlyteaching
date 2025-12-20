import { Injectable } from '@nestjs/common';
import type { Express } from 'express';

@Injectable()
export class PromptsService {
  async handlePrompt(content?: string, ai_model?: string, file?: Express.Multer.File) {
    const usedModel = ai_model || 'onlyteaching-local';
    const text = (content || '').trim();

    const keywords = this.extractKeywords(text).slice(0, 4);
    const sentences = this.buildSentences(keywords);

    const parts = [...sentences];
    if (file) {
      parts.push(`첨부 파일: ${file.originalname}`);
    }
    // 한 문단으로, 문장 사이 한 칸
    const generated_document = parts.join(' ').trim();

    return {
      generated_document,
      ai_model: usedModel,
      keywords,
    };
  }

  private extractKeywords(text: string): string[] {
    const cleaned = text.replace(/[^\w가-힣\s,]/g, ' ');
    const parts = cleaned.split(/[\s,]+/).map((p) => p.trim()).filter(Boolean);
    const stop = new Set([
      '상', '중', '하', '상중하', '상중', '중하', '상/중/하', '최상', '최하',
      'a', 'b', 'c', 'd', 'f', 's', 'p', 'np',
      '우수', '미흡', '보통',
      '1등급', '2등급', '3등급', '4등급', '5등급', '6등급', '7등급', '8등급', '9등급',
    ]);
    const isScoreWord = (w: string) => {
      if (!w) return true;
      if (stop.has(w.toLowerCase())) return true;
      if (/^\d+점$/.test(w)) return true;
      if (/^\d+등급$/.test(w)) return true;
      if (w.length === 1) return true; // 한 글자 키워드는 점수/등급 가능성이 높으므로 제외
      return false;
    };
    const seen = new Set<string>();
    const uniq: string[] = [];
    for (const p of parts) {
      if (isScoreWord(p)) continue;
      if (!seen.has(p)) {
        seen.add(p);
        uniq.push(p);
      }
    }
    return uniq;
  }

  private buildSentences(keywords: string[]): string[] {
    const [k1, k2, k3, k4] = [...keywords, '', '', '', ''];
    const josa = (word: string, type: '을를' | '이가') => {
      if (!word) return type === '을를' ? '을' : '이';
      const last = word[word.length - 1];
      const code = last.charCodeAt(0);
      const isKorean = code >= 0xac00 && code <= 0xd7a3;
      const jong = isKorean ? (code - 0xac00) % 28 : 0;
      const hasFinal = isKorean ? jong !== 0 : false;
      if (type === '을를') return hasFinal ? '을' : '를';
      return hasFinal ? '이' : '가';
    };

    const sentences: string[] = [];

    if (k1) sentences.push(`${k1}${josa(k1, '을를')} 바탕으로 수업에 성실히 참여하며 긍정적인 변화를 보였습니다.`);
    if (k2) sentences.push(`${k2} 태도가 돋보이며 또래와 협력적으로 활동합니다.`);
    if (k3) sentences.push(`${k3} 역량${josa('역량', '을를')} 키우기 위해 꾸준히 노력하며 책임감 있게 과제를 수행합니다.`);
    if (k4) sentences.push(`${k4}${josa(k4, '을를')} 통해 자기주도적 성장을 이어가고 있습니다.`);

    if (sentences.length === 0) {
      sentences.push('수업에 성실히 참여하며 긍정적인 변화를 보였습니다.');
    }

    return sentences;
  }
}
