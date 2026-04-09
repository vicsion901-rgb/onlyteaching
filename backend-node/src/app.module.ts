import { Module, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule, InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { StudentRecordsModule } from './student-records/student-records.module';
import { PromptsModule } from './prompts/prompts.module';
import { SchedulesModule } from './schedules/schedules.module';
import { HealthModule } from './health/health.module';
import { LifeRecordsModule } from './life-records/life-records.module';
import { UsersModule } from './users/users.module';
import { AchievementStandardsModule } from './achievement-standards/achievement-standards.module';
import { ExcelModule } from './excel/excel.module';
import { CreativeActivitiesModule } from './creative-activities/creative-activities.module';
import { AutobiographyCompilationModule } from './autobiography-compilation/autobiography-compilation.module';
import { MealsModule } from './meals/meals.module';
import { ProofreadModule } from './proofread/proofread.module';
import { ProofreadResponseInterceptor } from './proofread/proofread-response.interceptor';
import { TeacherVerificationModule } from './teacher-verification/teacher-verification.module';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        const isProduction = process.env.NODE_ENV === 'production';
        
        if (isProduction && process.env.POSTGRES_URL) {
          // Vercel Postgres 설정
          return {
            type: 'postgres',
            url: process.env.POSTGRES_URL,
            autoLoadEntities: true,
            synchronize: true, // 주의: 프로덕션에서는 false로 하고 마이그레이션 사용하는게 좋음 (베타니까 true 허용)
            ssl: {
              rejectUnauthorized: false,
            },
          };
        }

        // 로컬 SQLite 설정
        return {
          type: 'sqlite',
          database: 'db.sqlite',
          autoLoadEntities: true,
          synchronize: true,
        };
      },
    }),
    StudentRecordsModule,
    PromptsModule,
    SchedulesModule,
    HealthModule,
    UsersModule,
    LifeRecordsModule,
    AchievementStandardsModule,
    ExcelModule, // ✅ 엑셀 업로드/자동매핑 모듈 추가
    CreativeActivitiesModule,
    AutobiographyCompilationModule,
    MealsModule,
    ProofreadModule,
    TeacherVerificationModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ProofreadResponseInterceptor,
    },
  ],
})
export class AppModule implements OnApplicationBootstrap {
  private readonly logger = new Logger(AppModule.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  // 부팅 시 DB 커넥션 풀 prewarm — 첫 로그인 요청 지연 제거
  async onApplicationBootstrap() {
    try {
      await this.dataSource.query('SELECT 1');
      this.logger.log('DB prewarm done');
    } catch (err) {
      this.logger.warn(`DB prewarm failed: ${(err as Error).message}`);
    }
  }
}
