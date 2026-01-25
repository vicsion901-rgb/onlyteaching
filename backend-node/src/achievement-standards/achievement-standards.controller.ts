import { Controller, Get, Query } from '@nestjs/common';

import { AchievementStandardsService } from './achievement-standards.service';

@Controller('achievement-standards')
export class AchievementStandardsController {
  constructor(private readonly achievementStandardsService: AchievementStandardsService) {}

  @Get()
  findAll(
    @Query('subject') subject?: string,
    @Query('grade_group') grade_group?: string,
    @Query('area') area?: string,
  ) {
    return this.achievementStandardsService.findAll({
      subject,
      grade_group,
      area,
    });
  }
}












