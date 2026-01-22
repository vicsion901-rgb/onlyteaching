import {
  Body,
  Controller,
  Post,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { AuthService } from './auth.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  @Post('register')
  register(
    @Body() dto: CreateUserDto,
  ) {
    return this.usersService.register(dto);
  }

  @Post('login')
  login(@Body() body: CreateUserDto) {
    return this.authService.login(body.schoolCode, body.teacherCode);
  }
}

