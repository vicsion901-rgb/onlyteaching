import { BadRequestException, Injectable, InternalServerErrorException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
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

  async register(dto: CreateUserDto) {
    if (!dto.schoolCode || !dto.teacherCode) {
      throw new BadRequestException('필수 정보 누락');
    }

    const existing = await this.usersRepo.findOne({
      where: { schoolCode: dto.schoolCode, teacherCode: dto.teacherCode },
    });
    if (existing) {
      throw new BadRequestException('이미 등록된 계정입니다');
    }

    const user = this.usersRepo.create({
      ...dto,
      // OCR 기반 검증을 제거했으므로, 기본 상태는 PENDING (관리자 승인)
      status: 'PENDING',
    });

    try {
      await this.usersRepo.save(user);
    } catch (err) {
      throw new InternalServerErrorException('사용자 저장 실패');
    }

    // 기존 프론트 호환: score/decision은 null 반환
    return { status: user.status, score: null, decision: null };
  }
}

