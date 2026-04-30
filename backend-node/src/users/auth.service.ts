import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
// @ts-ignore - bcrypt types optional
import * as bcrypt from 'bcrypt';

import { User } from './entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  async login(schoolCode: string, teacherCode: string) {
    if (!schoolCode || !teacherCode) {
      throw new UnauthorizedException('아이디/비밀번호를 입력해주세요.');
    }

    const user = await this.repo.findOne({ where: { schoolCode } });
    if (!user) throw new UnauthorizedException('계정 없음');

    let passwordOk = false;

    if (user.passwordHash && typeof user.passwordHash === 'string') {
      try {
        passwordOk = await bcrypt.compare(teacherCode, user.passwordHash);
      } catch {
        passwordOk = false;
      }
    }

    // 레거시: 평문 teacherCode 일치 시 즉시 해시로 승격
    if (!passwordOk && user.teacherCode && user.teacherCode === teacherCode) {
      passwordOk = true;
      user.passwordHash = await bcrypt.hash(teacherCode, 8);
      await this.repo.save(user);
    }

    if (!passwordOk) throw new UnauthorizedException('비밀번호 불일치');

    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException('승인되지 않은 계정');
    }
    return { message: '로그인 성공', userId: user.id };
  }
}
