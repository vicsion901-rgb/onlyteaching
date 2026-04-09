import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
// @ts-ignore - bcrypt types optional
import * as bcrypt from 'bcrypt';

import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { encrypt, searchHash } from '../common/crypto.util';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async onModuleInit() {
    // 기본 테스트 계정 (bcrypt 적용)
    const loginId = 'master0109@naver.com';
    const password = 'password123';
    const existing = await this.usersRepo.findOne({
      where: { schoolCode: loginId },
    });
    if (!existing) {
      await this.usersRepo.save({
        schoolCode: loginId,
        teacherCode: password, // legacy 호환
        passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
        status: 'ACTIVE',
      });
    } else if (!existing.passwordHash) {
      // 기존 계정 마이그레이션: 평문을 해시로 승격
      existing.passwordHash = await bcrypt.hash(
        existing.teacherCode,
        BCRYPT_ROUNDS,
      );
      await this.usersRepo.save(existing);
    }
  }

  async register(dto: CreateUserDto & {
    name?: string;
    email?: string;
    phone?: string;
    schoolName?: string;
  }) {
    if (!dto.schoolCode || !dto.teacherCode) {
      throw new BadRequestException('필수 정보 누락');
    }

    const duplicate = await this.usersRepo.findOne({
      where: { schoolCode: dto.schoolCode },
    });
    if (duplicate) {
      throw new BadRequestException('이미 등록된 아이디입니다');
    }

    // 이메일 중복 체크 (해시 기반)
    const emailHash = searchHash(dto.email);
    if (emailHash) {
      const dupEmail = await this.usersRepo.findOne({ where: { emailHash } });
      if (dupEmail) {
        throw new BadRequestException('이미 등록된 이메일입니다');
      }
    }

    const passwordHash = await bcrypt.hash(dto.teacherCode, BCRYPT_ROUNDS);

    const user = this.usersRepo.create({
      schoolCode: dto.schoolCode,
      teacherCode: '__hashed__', // legacy 필드 의미없게 만들기
      passwordHash,
      nameEnc: encrypt(dto.name),
      emailEnc: encrypt(dto.email),
      emailHash,
      phoneEnc: encrypt(dto.phone),
      schoolName: dto.schoolName || null,
      status: 'PENDING', // 교사 인증 후 ACTIVE 로 승격됨
    });

    try {
      await this.usersRepo.save(user);
    } catch (err) {
      throw new InternalServerErrorException('사용자 저장 실패');
    }

    return {
      status: user.status,
      userId: user.id,
      message: '가입 완료. 교사 인증을 진행해주세요.',
    };
  }
}
