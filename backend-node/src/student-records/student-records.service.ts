import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { StudentRecordComment } from './student-record-comment.entity';
import { CreateStudentRecordCommentDto } from './dto/create-student-record-comment.dto';
import { UpdateStudentRecordCommentDto } from './dto/update-student-record-comment.dto';
import { StudentRecord } from './student-record.entity';

@Injectable()
export class StudentRecordsService {
  constructor(
    @InjectRepository(StudentRecordComment)
    private readonly repo: Repository<StudentRecordComment>,
    @InjectRepository(StudentRecord)
    private readonly studentRepo: Repository<StudentRecord>,
  ) {}

  async findAll() {
    return this.repo.find({ order: { id: 'DESC' } });
  }

  async findOne(id: number) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('comment not found');
    return item;
  }

  async create(dto: CreateStudentRecordCommentDto) {
    const created = this.repo.create(dto);
    return this.repo.save(created);
  }

  async update(id: number, dto: UpdateStudentRecordCommentDto) {
    const item = await this.findOne(id);
    Object.assign(item, dto);
    return this.repo.save(item);
  }

  async remove(id: number) {
    const item = await this.findOne(id);
    await this.repo.remove(item);
    return { ok: true };
  }

  // Student records for frontend (번호/이름)
  async listStudents(): Promise<StudentRecord[]> {
    return this.studentRepo.find({ order: { number: 'ASC' } });
  }

  async saveStudents(payload: Array<{ number: number; name: string }>) {
    // simple replace-upsert by number
    const normalized = payload
      .filter((p) => p.number && p.name)
      .map((p) => ({
        number: Number(p.number),
        name: p.name.trim(),
      }))
      .filter((p) => p.number > 0 && p.name.length > 0);

    for (const item of normalized) {
      const existing = await this.studentRepo.findOne({ where: { number: item.number } });
      if (existing) {
        existing.name = item.name;
        await this.studentRepo.save(existing);
      } else {
        await this.studentRepo.save(this.studentRepo.create(item));
      }
    }

    // Remove rows not in payload
    const numbers = normalized.map((n) => n.number);
    if (numbers.length > 0) {
      await this.studentRepo
        .createQueryBuilder()
        .delete()
        .from(StudentRecord)
        .where('number NOT IN (:...nums)', { nums: numbers })
        .execute();
    } else {
      await this.studentRepo.clear();
    }

    return this.listStudents();
  }
}