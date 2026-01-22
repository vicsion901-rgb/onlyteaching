import { Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';
import { ExcelService } from './excel.service';

@Controller('excel')
export class ExcelController {
  constructor(private readonly excelService: ExcelService) {}

  @Post('students/import')
  @UseInterceptors(FileInterceptor('file'))
  async importStudents(@UploadedFile() file: Express.Multer.File) {
    if (!file?.buffer) {
      return {
        mapping: null,
        data: [],
        stats: { totalRows: 0, storedRows: 0, detectedHeaderRowIndex: -1 },
      };
    }

    return this.excelService.importStudentsFromExcel(file.buffer);
  }
}