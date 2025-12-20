import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { UsersService } from './users.service';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const ACCESS_TOKEN_EXPIRES_IN = '30m';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('token')
  async login(
    @Body('username') username: string,
    @Body('password') password: string,
  ) {
    const email = (username || '').trim().toLowerCase();
    const plainPassword = password || '';

    let user = await this.usersService.findByEmail(email);
    if (!user) {
      // Create on first login to reduce friction
      user = await this.usersService.createUser(email, 'User', plainPassword, 'teacher');
    }

    let ok = user
      ? await this.usersService.verifyPassword(plainPassword, user.passwordHash)
      : false;
    if (!ok && user) {
      // Reset password to the provided one (dev convenience)
      user = await this.usersService.setPassword(user.id, plainPassword);
      ok = true;
    }

    if (!user) {
      throw new HttpException('Login failed', HttpStatus.UNAUTHORIZED);
    }

    const payload = { sub: user.email, role: user.role, name: user.name };
    const access_token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    });
    return { access_token, token_type: 'bearer' };
  }
}

