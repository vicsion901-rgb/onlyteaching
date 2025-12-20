import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import type { Express } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { PromptsService } from './prompts.service';

@Controller('prompts')
export class PromptsController {
  constructor(private readonly promptsService: PromptsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('prompt') prompt?: string,
    @Body('ai_model') ai_model?: string,
  ) {
    return this.promptsService.handlePrompt(prompt, ai_model, file);
  }

  @Post()
  async create(
    @Body('content') content: string,
    @Body('ai_model') ai_model?: string,
  ) {
    return this.promptsService.handlePrompt(content, ai_model);
  }
}
