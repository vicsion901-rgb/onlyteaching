import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Express } from 'express';

import { MealsService } from './meals.service';

@Controller('meals')
export class MealsController {
  constructor(private readonly mealsService: MealsService) {}

  @Post('upload-image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    return this.mealsService.uploadImage(file?.buffer);
  }

  @Post()
  create(@Body() body: Record<string, unknown>) {
    return this.mealsService.saveMeal({
      schoolCode: typeof body.schoolCode === 'string' ? body.schoolCode : '',
      mealDate: typeof body.mealDate === 'string' ? body.mealDate : '',
      imageUrl: typeof body.imageUrl === 'string' ? body.imageUrl : '',
      caption: typeof body.caption === 'string' ? body.caption : '',
      createdByUserId: typeof body.createdByUserId === 'string' ? body.createdByUserId : '',
    });
  }

  @Get()
  list(
    @Query('schoolCode') schoolCode?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.mealsService.listMeals(schoolCode, startDate, endDate);
  }

  @Post(':id/like')
  like(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Record<string, unknown>,
  ) {
    return this.mealsService.likeMeal(
      id,
      typeof body.schoolCode === 'string' ? body.schoolCode : '',
      typeof body.userId === 'string' ? body.userId : '',
    );
  }

  @Get('leaderboard/weekly')
  leaderboard(
    @Query('weekStart') weekStart?: string,
    @Query('weekEnd') weekEnd?: string,
  ) {
    return this.mealsService.getWeeklyLeaderboard(weekStart, weekEnd);
  }
}
