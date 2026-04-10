import { Module, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule, InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

// ── 공통 (Cross-Cutting) ──
import { ProofreadModule } from './proofread/proofread.module';
import { ProofreadResponseInterceptor } from './proofread/proofread-response.interceptor';
import { HealthModule } from './health/health.module';

// ── 인증 도메인 (Auth) ──
import { UsersModule } from './users/users.module';
import { TeacherVerificationModule } from './teacher-verification/teacher-verification.module';

// ── 학생관리 도메인 (Student Management) ──
import { StudentsModule } from './students/students.module';
import { StudentRecordsModule } from './student-records/student-records.module';
import { ExcelModule } from './excel/excel.module';

// ── 창의적체험활동 도메인 (Creative Activities) ──
import { CreativeActivitiesModule } from './creative-activities/creative-activities.module';

// ── 생활기록부 도메인 (Life Records) ──
import { LifeRecordsModule } from './life-records/life-records.module';
import { AutobiographyCompilationModule } from './autobiography-compilation/autobiography-compilation.module';

// ── 교육과정 도메인 (Curriculum) ──
import { AchievementStandardsModule } from './achievement-standards/achievement-standards.module';
import { PromptsModule } from './prompts/prompts.module';

// ── 학교생활 도메인 (School Life) ──
import { SchedulesModule } from './schedules/schedules.module';
import { MealsModule } from './meals/meals.module';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        const isProduction = process.env.NODE_ENV === 'production';
        
        if (isProduction && process.env.POSTGRES_URL) {
          return {
            type: 'postgres',
            url: process.env.POSTGRES_URL,
            autoLoadEntities: true,
            synchronize: true, // 베타 — 안정화 후 false + migration 전환
            ssl: { rejectUnauthorized: false },
            // 서버리스 콜드스타트 최적화
            extra: {
              max: 3,
              idleTimeoutMillis: 30000,
              connectionTimeoutMillis: 5000,
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
    // ── 공통 ──
    HealthModule,
    ProofreadModule,

    // ── 인증 ──
    UsersModule,
    TeacherVerificationModule,

    // ── 학생관리 ──
    StudentsModule,
    StudentRecordsModule,
    ExcelModule,

    // ── 창체 ──
    CreativeActivitiesModule,

    // ── 생기부 ──
    LifeRecordsModule,
    AutobiographyCompilationModule,

    // ── 교육과정 ──
    AchievementStandardsModule,
    PromptsModule,

    // ── 학교생활 ──
    SchedulesModule,
    MealsModule,
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
