import { Body, Controller, Get, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Express } from 'express';
import { StudentRecordsService } from './student-records.service';
import { parseStudentExcel } from './excel-upload.util';

@Controller('student-records')
export class StudentRecordsController {
  constructor(private readonly studentRecordsService: StudentRecordsService) {}

  @Get('list')
  list() {
    return this.studentRecordsService.listStudents();
  }

  @Post('bulk')
  bulkSave(
    @Body()
    payload: Array<{
      number: number;
      name: string;
      residentNumber?: string;
      birthDate?: string;
      address?: string;
      sponsor?: string;
      remark?: string;
    }>,
  ) {
    return this.studentRecordsService.saveStudents(payload || [], { mode: 'replace' });
  }

  @Post('upload-excel')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  async uploadExcel(@UploadedFile() file: Express.Multer.File) {
    const buf = file?.buffer;
    if (!buf || !Buffer.isBuffer(buf)) {
      return { mapping: {}, students: [], saved: [], count: 0 };
    }

    const { mapping, students } = parseStudentExcel(buf);

    // Convert to DB payload. Ignore fields that don't exist in DB.
    const payload = students.map((s) => ({
      number: Number(String(s.student_number || '').replace(/\D/g, '')) || 0,
      name: (s.name || '').trim(),
      residentNumber: (s.resident_id || '').trim(),
      birthDate: (s.birth_date || '').trim(),
      address: (s.address || '').trim(),
    }));

    const saved = await this.studentRecordsService.saveStudents(payload, { mode: 'upsert' });
    return { mapping, students, saved, count: students.length };
  }
}
