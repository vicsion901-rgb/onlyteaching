import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AchievementStandard } from './achievement-standard.entity';
import { AchievementStandardsController } from './achievement-standards.controller';
import { AchievementStandardsService } from './achievement-standards.service';

@Module({
  imports: [TypeOrmModule.forFeature([AchievementStandard])],
  controllers: [AchievementStandardsController],
  providers: [AchievementStandardsService],
})
export class AchievementStandardsModule {}

