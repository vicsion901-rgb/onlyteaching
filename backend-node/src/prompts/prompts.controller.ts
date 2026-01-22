import {
  Body,
  Controller,
  Post,
} from '@nestjs/common';
import { PromptsService } from './prompts.service';

@Controller('prompts')
export class PromptsController {
  constructor(private readonly promptsService: PromptsService) {}

  @Post()
  async create(
    @Body('content') content: string,
    @Body('ai_model') ai_model?: string,
  ) {
    return this.promptsService.handlePrompt(content, ai_model);
  }
}
