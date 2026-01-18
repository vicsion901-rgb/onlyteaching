import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { AchievementStandard } from './achievement-standard.entity';

type Filters = {
  subject?: string;
  grade_group?: string;
  area?: string;
};

@Injectable()
export class AchievementStandardsService implements OnModuleInit {
  private readonly logger = new Logger(AchievementStandardsService.name);

  constructor(
    @InjectRepository(AchievementStandard)
    private readonly repo: Repository<AchievementStandard>,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    await this.seedIfEmpty();
  }

  async findAll(filters: Filters) {
    const qb = this.repo
      .createQueryBuilder('a')
      .orderBy('a.subject', 'ASC')
      .addOrderBy('a.grade_group', 'ASC')
      .addOrderBy('a.code', 'ASC');

    if (filters.subject) {
      qb.andWhere('a.subject = :subject', { subject: filters.subject });
    }
    if (filters.grade_group) {
      qb.andWhere('a.grade_group = :grade_group', {
        grade_group: filters.grade_group,
      });
    }
    if (filters.area) {
      qb.andWhere('a.area = :area', { area: filters.area });
    }

    const rows = await qb.getMany();

    // Distinct meta for dropdowns
    // IMPORTANT: meta는 "현재 선택된 다른 필터"를 반영해야 한다.
    // 예) 과학을 선택했다면 areas는 과학의 영역만 내려줘야 함.
    const applyFilters = (
      qb2: ReturnType<Repository<AchievementStandard>['createQueryBuilder']>,
      { subject, grade_group, area }: Filters,
      omit: keyof Filters,
    ) => {
      if (omit !== 'subject' && subject) qb2.andWhere('a.subject = :subject', { subject });
      if (omit !== 'grade_group' && grade_group) qb2.andWhere('a.grade_group = :grade_group', { grade_group });
      if (omit !== 'area' && area) qb2.andWhere('a.area = :area', { area });
      return qb2;
    };

    const [subjectRows, gradeRows, areaRows] = await Promise.all([
      applyFilters(this.repo.createQueryBuilder('a'), filters, 'subject')
        .select('DISTINCT a.subject', 'subject')
        .orderBy('a.subject', 'ASC')
        .getRawMany(),
      applyFilters(this.repo.createQueryBuilder('a'), filters, 'grade_group')
        .select('DISTINCT a.grade_group', 'grade_group')
        .orderBy('a.grade_group', 'ASC')
        .getRawMany(),
      applyFilters(this.repo.createQueryBuilder('a'), filters, 'area')
        .select('DISTINCT a.area', 'area')
        .orderBy('a.area', 'ASC')
        .getRawMany(),
    ]);

    return {
      items: rows.map((r) => ({
        ...r,
        examples: this.buildExamples(r.standard),
      })),
      meta: {
        subjects: subjectRows.map((s) => s.subject),
        grade_groups: gradeRows.map((g) => g.grade_group),
        areas: areaRows.map((a) => a.area),
      },
    };
  }

  private buildExamples(standard: string) {
    const levels: Array<'우수' | '보통' | '기초'> = ['우수', '보통', '기초'];
    return levels.map((level) => ({
      level,
      text: `${level} | ${this.mapPerformance(level)} → ${standard}`,
    }));
  }

  private mapPerformance(level: string) {
    switch (level) {
      case '우수':
        return '성취기준을 충실히 이해하고 자신의 생각을 확장하여 적용함';
      case '보통':
        return '성취기준을 이해하고 과제를 성실히 수행함';
      case '기초':
        return '성취기준 이해에 도움이 필요함';
      default:
        return '';
    }
  }

  private async seedIfEmpty() {
    const count = await this.repo.count();
    if (count > 0) return;

    const sqlPath = path.resolve(process.cwd(), 'sql1', '01_insert_achievement_standards.sql');
    if (!fs.existsSync(sqlPath)) {
      this.logger.warn(`Seed file not found: ${sqlPath}`);
      return;
    }

    const sql = fs.readFileSync(sqlPath, 'utf8');
    if (!sql.trim()) {
      this.logger.warn('Seed file is empty');
      return;
    }

    await this.dataSource.query(sql);
    this.logger.log('Seeded achievement_standards from SQL file');
  }
}






