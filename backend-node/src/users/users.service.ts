import { BadRequestException, Injectable, InternalServerErrorException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import { User } from './entities/user.entity';
import { OcrService } from './ocr.service';
import { VerificationService } from './verification.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly ocrService: OcrService,
    private readonly verifyService: VerificationService,
  ) {}

  async onModuleInit() {
    // Seed a default active account for convenience/login testing
    const defaultSchoolCode = 'master0109@naver.com';
    const defaultTeacherCode = 'password123';
    const existing = await this.usersRepo.findOne({
      where: { schoolCode: defaultSchoolCode, teacherCode: defaultTeacherCode },
    });
    if (!existing) {
      await this.usersRepo.save({
        schoolCode: defaultSchoolCode,
        teacherCode: defaultTeacherCode,
        status: 'ACTIVE',
      });
    }
  }

  async register(dto: CreateUserDto, imagePath: string, schoolName: string) {
    if (!dto.schoolCode || !dto.teacherCode) {
      throw new BadRequestException('필수 정보 누락');
    }
    if (!imagePath) {
      throw new BadRequestException('이미지가 필요합니다');
    }

    const existing = await this.usersRepo.findOne({
      where: { schoolCode: dto.schoolCode, teacherCode: dto.teacherCode },
    });
    if (existing) {
      throw new BadRequestException('이미 등록된 계정입니다');
    }

    const ocr = await this.ocrService.extractText(imagePath);
    const score = this.verifyService.calculateScore(ocr, schoolName);
    const decision = this.verifyService.decide(score);

    const user = this.usersRepo.create({
      ...dto,
      status:
        decision === 'AUTO'
          ? 'ACTIVE'
          : decision === 'MANUAL'
            ? 'PENDING'
            : 'REJECTED',
    });

    try {
      await this.usersRepo.save(user);
    } catch (err) {
      throw new InternalServerErrorException('사용자 저장 실패');
    } finally {
      try {
        fs.unlinkSync(imagePath);
      } catch {
        // ignore cleanup error
      }
    }

    return { status: user.status, score, decision };
  }
}

