import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { LifeRecordsService } from './life-records.service';

@Controller('life-records')
export class LifeRecordsController {
  constructor(private readonly lifeRecordsService: LifeRecordsService) {}

  @Get('keywords')
  searchKeywords(@Query('query') query?: string) {
    return this.lifeRecordsService.searchKeywords(query || '');
  }

  @Get('comments/by-keyword')
  commentsByKeyword(@Query('keyword') keyword?: string) {
    return this.lifeRecordsService.commentsByKeyword(keyword || '');
  }

  @Post('comments/:id/use')
  useComment(@Param('id') id: string) {
    return this.lifeRecordsService.useComment(Number(id));
  }

  @Post('generate')
  generate(@Body() body: any) {
    return this.lifeRecordsService.generateLifeRecord({
      selected_keywords: body?.selected_keywords,
      student_name: body?.student_name,
      additional_context: body?.additional_context,
      ai_model: body?.ai_model,
    });
  }
}








