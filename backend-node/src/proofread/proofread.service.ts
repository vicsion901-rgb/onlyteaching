import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

import type { ProofreadContentType, ProofreadRequest } from './proofread.types';
import { validateProofreadText } from './proofread.validator';

@Injectable()
export class ProofreadService {
  private readonly logger = new Logger(ProofreadService.name);
  private readonly model = process.env.PROOFREAD_MODEL || 'gpt-5.4-nano';
  private readonly enabled = process.env.PROOFREAD_ENABLED !== 'false';
  private readonly timeoutMs = Number(process.env.PROOFREAD_TIMEOUT_MS || 8000);
  private readonly client = process.env.OPENAI_API_KEY
    ? new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        timeout: this.timeoutMs,
      })
    : null;

  async proofreadText(request: ProofreadRequest): Promise<string> {
    const originalText = request.text.trim();

    if (!this.enabled || !this.client || originalText.length < 10) {
      return originalText;
    }

    try {
      const response = await this.client.responses.create({
        model: this.model,
        instructions: this.buildInstructions(request.contentType, request.protectedTokens ?? []),
        input: originalText,
        reasoning: { effort: 'none' },
        text: { verbosity: 'low' },
      });

      const revisedText = response.output_text?.trim() || originalText;
      const validation = validateProofreadText(
        originalText,
        revisedText,
        request.protectedTokens ?? [],
      );

      if (!validation.valid) {
        this.logger.warn(`Proofread fallback: ${validation.reason ?? 'unknown'}`);
        return originalText;
      }

      return revisedText;
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown-error';
      this.logger.warn(`Proofread skipped: ${reason}`);
      return originalText;
    }
  }

  private buildInstructions(contentType: ProofreadContentType, protectedTokens: string[]): string {
    const contentGuide = this.getContentGuide(contentType);
    const protectedGuide = protectedTokens.length > 0
      ? `보호 토큰(반드시 그대로 유지): ${protectedTokens.join(', ')}`
      : '보호 토큰이 없으면 의미·사실·고유명사는 그대로 유지하세요.';

    return [
      '다음 한국어 문장을 의미 변경 없이 교정하세요.',
      '수정 범위는 문장 호응, 맞춤법, 띄어쓰기, 문장부호, 어색한 연결 표현만 허용됩니다.',
      '이름, 숫자, 날짜, 점수, 고유명사, URL, 이메일, 플레이스홀더는 절대 바꾸지 마세요.',
      '문장을 새로 쓰지 말고 최소 수정만 하세요.',
      '이미 자연스러우면 원문 그대로 반환하세요.',
      '설명 없이 교정된 본문만 반환하세요.',
      contentGuide,
      protectedGuide,
    ].join('\n');
  }

  private getContentGuide(contentType: ProofreadContentType): string {
    switch (contentType) {
      case 'life-record':
        return '생활기록부 문체를 유지하고 평가 의미를 바꾸지 마세요.';
      case 'autobiography':
        return '자서전 문체를 유지하되 감상적 재창작 없이 문장 흐름만 다듬으세요.';
      case 'general':
      default:
        return '행정 문서/교사 업무 문체를 유지하세요.';
    }
  }
}
