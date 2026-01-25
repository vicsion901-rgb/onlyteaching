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
    // ✅ 표식(버전) — 이게 응답에 나오면 “수정한 서버”가 맞음
    const __version = 'EXCEL_IMPORT_V7_HEADER_FIX';

    if (!file?.buffer) {
      return {
        __version,
        mapping: null,
        data: [],
        stats: { totalRows: 0, storedRows: 0, detectedHeaderRowIndex: -1 },
      };
    }

    const result = await this.excelService.importStudentsFromExcel(file.buffer);
    return { __version, ...result };
  }
}