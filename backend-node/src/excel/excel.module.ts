// src/excel/excel.module.ts
import { Module } from '@nestjs/common';
import { ExcelController } from './excel.controller';
import { ExcelService } from './excel.service';
import { StudentRepository } from '../students/student.repository';

@Module({
  controllers: [ExcelController],
  providers: [ExcelService, StudentRepository],
  exports: [ExcelService],
})
export class ExcelModule {}