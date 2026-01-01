import { Injectable } from '@nestjs/common';
import type { Express } from 'express';

@Injectable()
export class PromptsService {
  async handlePrompt(content?: string, ai_model?: string, file?: Express.Multer.File) {
    const usedModel = ai_model || 'onlyteaching-local';
    const text = (content || '').trim();

    const studentName = this.extractStudentName(text);
    const keywords = this.extractKeywords(text, studentName).slice(0, 6);
    const sentences = this.buildSentences(keywords, studentName);

    const parts = [...sentences];
    if (file) {
      parts.push(`첨부 파일: ${file.originalname}`);
    }
    // 한 문단으로, 문장 사이 한 칸
    const generated_document = parts.join(' ').replace(/\s+/g, ' ').trim();

    return {
      generated_document,
      ai_model: usedModel,
      keywords,
    };
  }

  private extractStudentName(text: string): string | null {
    if (!text) return null;
    // e.g. "김경하 학생", "홍길동", "김가영 학생 발표"
    const nameMatch = text.match(/([가-힣]{2,4})\s*학생/);
    if (nameMatch && nameMatch[1]) return nameMatch[1].trim();
    // Fallback: take first 2~4 char token that looks like a name
    const tokens = text.split(/[\s,]+/).map((t) => t.trim()).filter(Boolean);
    for (const t of tokens) {
      if (/^[가-힣]{2,4}$/.test(t)) {
        return t;
      }
    }
    return null;
  }

  private extractKeywords(text: string, studentName?: string | null): string[] {
    const cleaned = text.replace(/[^\w가-힣\s,]/g, ' ');
    const parts = cleaned.split(/[\s,]+/).map((p) => p.trim()).filter(Boolean);
    const stop = new Set([
      '상', '중', '하', '상중하', '상중', '중하', '상/중/하', '최상', '최하',
      'a', 'b', 'c', 'd', 'f', 's', 'p', 'np',
      '우수', '미흡', '보통', '학생', '발표력', '작성', '생기부',
      '1등급', '2등급', '3등급', '4등급', '5등급', '6등급', '7등급', '8등급', '9등급',
    ]);
    const isScoreWord = (w: string) => {
      if (!w) return true;
      if (stop.has(w.toLowerCase())) return true;
      if (studentName && w.includes(studentName)) return true;
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

  private buildSentences(keywords: string[], studentName?: string | null): string[] {
    const nameIntro = studentName ? `${studentName} 학생은 ` : '';
    const nameRefer = studentName ? `${studentName} 학생은 ` : '';

    const has = (word: string) => keywords.some((k) => k.includes(word));

    const sentences: string[] = [];

    sentences.push(`${nameIntro}수업에 성실히 참여하며 긍정적인 변화를 보이고 있습니다.`);

    if (has('발표')) {
      sentences.push(`발표 상황에서도 차분하게 생각을 정리해 자신 있게 의견을 제시합니다.`);
    } else {
      sentences.push(`또한 수업 내용을 스스로 정리하며 자신감 있게 의견을 표현합니다.`);
    }

    sentences.push(`또래와 협력하며 책임감 있게 맡은 과제를 수행합니다.`);

    if (has('정리정돈')) {
      sentences.push(`정리정돈 습관이 뛰어나 학습 자료를 체계적으로 관리합니다.`);
    } else {
      sentences.push(`학습 자료를 정돈해 필요할 때 바로 활용할 수 있도록 준비합니다.`);
    }

    if (has('수업태도')) {
      sentences.push(`수업 태도가 안정적이며 집중력이 꾸준히 유지됩니다.`);
    } else {
      sentences.push(`집중력을 유지하며 차분한 태도로 학습에 임합니다.`);
    }

    sentences.push(`${nameRefer}이러한 태도를 바탕으로 자기주도적 성장을 이어가고 있습니다.`);

    // 6줄만 사용
    return sentences.slice(0, 6);
  }
}
