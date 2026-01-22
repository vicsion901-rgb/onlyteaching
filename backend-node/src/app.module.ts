import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { StudentRecordsModule } from './student-records/student-records.module';
import { PromptsModule } from './prompts/prompts.module';
import { SchedulesModule } from './schedules/schedules.module';
import { HealthModule } from './health/health.module';
import { LifeRecordsModule } from './life-records/life-records.module';
import { UsersModule } from './users/users.module';
import { AchievementStandardsModule } from './achievement-standards/achievement-standards.module';
import { ExcelModule } from './excel/excel.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'db.sqlite',
      autoLoadEntities: true,
      synchronize: true,
    }),
    StudentRecordsModule,
    PromptsModule,
    SchedulesModule,
    HealthModule,
    UsersModule,
    LifeRecordsModule,
    AchievementStandardsModule,
    ExcelModule, // ✅ 엑셀 업로드/자동매핑 모듈 추가
  ],
})
export class AppModule {}