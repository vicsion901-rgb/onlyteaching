import { Body, Controller, Post } from '@nestjs/common';

import { ProofreadService } from './proofread.service';
import type { ProofreadContentType } from './proofread.types';

interface ProofreadBlockDto {
  id: string;
  text: string;
}

interface ProofreadBodyDto {
  texts: ProofreadBlockDto[];
  contentType?: ProofreadContentType;
  protectedTokens?: string[];
}

@Controller('proofread')
export class ProofreadController {
  constructor(private readonly proofreadService: ProofreadService) {}

  @Post()
  async proofread(@Body() body: ProofreadBodyDto) {
    const { texts, contentType = 'autobiography', protectedTokens = [] } = body;

    if (!Array.isArray(texts) || texts.length === 0) {
      return { results: [], model: 'none' };
    }

    const capped = texts.slice(0, 30);

    const results = await Promise.all(
      capped.map(async ({ id, text }) => {
        if (!text || text.trim().length < 5) {
          return { id, original: text, revised: text, hasChanges: false };
        }
        const revised = await this.proofreadService.proofreadText({
          text,
          contentType,
          protectedTokens,
        });
        return {
          id,
          original: text.trim(),
          revised,
          hasChanges: revised !== text.trim(),
        };
      }),
    );

    return { results };
  }
}
