import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  async login(schoolCode: string, teacherCode: string) {
    const user = await this.repo.findOne({ where: { schoolCode, teacherCode } });
    if (!user) throw new UnauthorizedException('계정 없음');
    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException('승인되지 않은 계정');
    }
    return { message: '로그인 성공', userId: user.id };
  }
}

