import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { OcrService } from './ocr.service';
import { VerificationService } from './verification.service';
import { AuthService } from './auth.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService, OcrService, VerificationService, AuthService],
  exports: [UsersService, AuthService],
})
export class UsersModule {}


