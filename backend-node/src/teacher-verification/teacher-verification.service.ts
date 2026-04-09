import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { TeacherVerification } from './entities/teacher-verification.entity';
import { parseSalaryPdf } from './salary-pdf.parser';
import { User } from '../users/entities/user.entity';

@Injectable()
export class TeacherVerificationService {
  private readonly logger = new Logger(TeacherVerificationService.name);

  constructor(
    @InjectRepository(TeacherVerification)
    private readonly repo: Repository<TeacherVerification>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /**
   * 최신 인증 기록 조회 (한 유저당 최신 1건만 보여주면 됨).
   * 인덱스 (userId, createdDate DESC) 로 최적화.
   */
  async getLatest(userId: string): Promise<TeacherVerification | null> {
    return this.repo.findOne({
      where: { userId },
      order: { createdDate: 'DESC' },
    });
  }

  /**
   * NEIS 급여명세서 PDF 업로드 → 자동 인증 처리.
   * PDF 바이너리는 메모리에서만 사용하고 저장하지 않음.
   */
  async verifyWithSalaryPdf(
    userId: string,
    pdfBuffer: Buffer,
    expectedName?: string,
    expectedSchool?: string,
  ) {
    if (!userId) {
      throw new BadRequestException('userId가 필요합니다.');
    }
    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new BadRequestException('PDF 파일이 비어 있습니다.');
    }
    if (pdfBuffer.length > 10 * 1024 * 1024) {
      throw new BadRequestException('파일 용량이 너무 큽니다 (최대 10MB).');
    }

    const parsed = await parseSalaryPdf(pdfBuffer);

    if (!parsed.ok) {
      // 실패 로그만 남기고 민감 데이터는 저장하지 않음
      const record = this.repo.create({
        userId,
        method: 'SALARY_PDF',
        verifyStatus: 'REJECTED',
        rejectReason: parsed.reason,
      });
      await this.repo.save(record);
      this.logger.warn(`verify reject user=${userId} reason=${parsed.reason}`);
      throw new BadRequestException(parsed.reason);
    }

    // 가입 시 입력한 이름·학교가 있으면 교차 검증
    if (expectedName && expectedName.trim() && expectedName !== parsed.name) {
      throw new BadRequestException(
        `회원가입 시 이름(${expectedName})과 급여명세서 이름(${parsed.name})이 일치하지 않습니다.`,
      );
    }
    if (expectedSchool && expectedSchool.trim() && expectedSchool !== parsed.school) {
      throw new BadRequestException(
        `회원가입 시 학교(${expectedSchool})와 급여명세서 학교(${parsed.school})가 일치하지 않습니다.`,
      );
    }

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 1년 유효

    const record = this.repo.create({
      userId,
      method: 'SALARY_PDF',
      verifyStatus: 'VERIFIED',
      verifiedName: parsed.name,
      verifiedSchool: parsed.school,
      verifiedCategory: parsed.category,
      verifiedPosition: parsed.position,
      payPeriod: parsed.payPeriod,
      issuedAt: parsed.issuedAt,
      verifiedAt: now,
      expiresAt,
    });
    const saved = await this.repo.save(record);

    // users.status → ACTIVE 자동 승격 + schoolName 평문 저장
    try {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (user) {
        user.status = 'ACTIVE';
        if (!user.schoolName) user.schoolName = parsed.school;
        await this.userRepo.save(user);
      }
    } catch (err) {
      this.logger.warn(`user activate failed: ${(err as Error).message}`);
    }

    this.logger.log(
      `verify ok user=${userId} name=${parsed.name} school=${parsed.school}`,
    );

    return {
      id: saved.id,
      verifyStatus: saved.verifyStatus,
      verifiedName: saved.verifiedName,
      verifiedSchool: saved.verifiedSchool,
      verifiedCategory: saved.verifiedCategory,
      verifiedPosition: saved.verifiedPosition,
      payPeriod: saved.payPeriod,
      verifiedAt: saved.verifiedAt,
      expiresAt: saved.expiresAt,
    };
  }

  async requireVerified(userId: string) {
    const latest = await this.getLatest(userId);
    if (!latest || latest.verifyStatus !== 'VERIFIED') {
      throw new NotFoundException('교사 인증이 필요합니다.');
    }
    if (latest.expiresAt && latest.expiresAt.getTime() < Date.now()) {
      throw new NotFoundException('교사 인증이 만료되었습니다.');
    }
    return latest;
  }
}
