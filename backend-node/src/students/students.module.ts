import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentEntity } from './entities/student.entity';
import { StudentRepository } from './student.repository';

@Module({
  imports: [TypeOrmModule.forFeature([StudentEntity])],
  providers: [StudentRepository],
  exports: [StudentRepository],
})
export class StudentsModule {}
