import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { StudentRecordsModule } from './student-records/student-records.module';
import { PromptsModule } from './prompts/prompts.module';
import { SchedulesModule } from './schedules/schedules.module';
import { HealthModule } from './health/health.module';
import { LifeRecordsModule } from './life-records/life-records.module';
import { UsersModule } from './users/users.module';

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
  ],
})
export class AppModule {}