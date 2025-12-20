import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { StudentRecordsController } from './student-records.controller';
import { StudentRecordsService } from './student-records.service';
import { StudentRecordComment } from './student-record-comment.entity';
import { StudentRecord } from './student-record.entity';

@Module({
  imports: [TypeOrmModule.forFeature([StudentRecordComment, StudentRecord])],
  controllers: [StudentRecordsController],
  providers: [StudentRecordsService],
})
export class StudentRecordsModule {}