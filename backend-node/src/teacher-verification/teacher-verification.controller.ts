import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Express } from 'express';

import { TeacherVerificationService } from './teacher-verification.service';

/**
 * 교사 인증 API.
 * multer memoryStorage 로 디스크에 파일이 절대 떨어지지 않도록 강제.
 */
@Controller('teacher-verification')
export class TeacherVerificationController {
  constructor(private readonly service: TeacherVerificationService) {}

  @Get('status')
  async status(@Query('userId') userId: string) {
    if (!userId) return { verifyStatus: 'NONE' };
    const latest = await this.service.getLatest(userId);
    if (!latest) return { verifyStatus: 'NONE' };

    return {
      verifyStatus: latest.verifyStatus,
      verifiedName: latest.verifiedName,
      verifiedSchool: latest.verifiedSchool,
      verifiedCategory: latest.verifiedCategory,
      verifiedPosition: latest.verifiedPosition,
      payPeriod: latest.payPeriod,
      verifiedAt: latest.verifiedAt,
      expiresAt: latest.expiresAt,
      rejectReason: latest.rejectReason,
    };
  }

  @Post('salary-pdf')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  async verifySalaryPdf(
    @UploadedFile() file: Express.Multer.File,
    @Body('userId') userId: string,
    @Body('expectedName') expectedName?: string,
    @Body('expectedSchool') expectedSchool?: string,
  ) {
    return this.service.verifyWithSalaryPdf(
      userId,
      file?.buffer as Buffer,
      expectedName,
      expectedSchool,
    );
  }
}
