import { Body, Controller, Get, Post } from '@nestjs/common';
import { StudentRecordsService } from './student-records.service';

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
      address?: string;
      sponsor?: string;
      remark?: string;
    }>,
  ) {
    return this.studentRecordsService.saveStudents(payload || []);
  }
}
