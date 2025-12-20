import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async onModuleInit() {
    // Seed default account if not present
    const email = 'master0109@naver.com';
    const password = 'password123';
    const existing = await this.usersRepo.findOne({ where: { email } });
    if (!existing) {
      const passwordHash = await this.hashPassword(password);
      await this.usersRepo.save({
        email,
        name: 'Master0109',
        passwordHash,
        role: 'teacher',
      });
    }
  }

  async findByEmail(email: string) {
    return this.usersRepo.findOne({ where: { email } });
  }

  async createUser(email: string, name: string, password: string, role = 'teacher') {
    const passwordHash = await this.hashPassword(password);
    const user = this.usersRepo.create({ email, name, passwordHash, role });
    return this.usersRepo.save(user);
  }

  async setPassword(userId: number, password: string) {
    const passwordHash = await this.hashPassword(password);
    await this.usersRepo.update(userId, { passwordHash });
    return this.usersRepo.findOne({ where: { id: userId } });
  }

  async hashPassword(plain: string) {
    return bcrypt.hash(plain, 10);
  }

  async verifyPassword(plain: string, hashed: string) {
    return bcrypt.compare(plain, hashed);
  }
}

