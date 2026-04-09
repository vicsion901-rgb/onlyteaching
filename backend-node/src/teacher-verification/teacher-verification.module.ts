import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TeacherVerification } from './entities/teacher-verification.entity';
import { TeacherVerificationController } from './teacher-verification.controller';
import { TeacherVerificationService } from './teacher-verification.service';

@Module({
  imports: [TypeOrmModule.forFeature([TeacherVerification])],
  controllers: [TeacherVerificationController],
  providers: [TeacherVerificationService],
  exports: [TeacherVerificationService],
})
export class TeacherVerificationModule {}
