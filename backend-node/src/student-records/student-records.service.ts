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

  async saveStudents(
    payload: Array<{
      number: number;
      name: string;
      residentNumber?: string;
      birthDate?: string;
      address?: string;
      sponsor?: string;
      remark?: string;
    }>,
    opts?: { mode?: 'replace' | 'upsert' },
  ) {
    const mode = opts?.mode || 'replace';

    // normalize + filter invalid
    const normalized = payload
      .filter(
        (p) =>
          p.number &&
          (p.name || p.residentNumber || p.address || p.sponsor || p.remark),
      )
      .map((p) => ({
        number: Number(p.number),
        name: (p.name || '').trim(),
        // Use null (not undefined) so clearing a field persists in DB (typeorm may ignore undefined updates).
        residentNumber: p.residentNumber?.trim() ? p.residentNumber.trim() : null,
        birthDate: p.birthDate?.trim() ? p.birthDate.trim() : null,
        address: p.address?.trim() ? p.address.trim() : null,
        sponsor: p.sponsor?.trim() ? p.sponsor.trim() : null,
        remark: p.remark?.trim() ? p.remark.trim() : null,
      }))
      .filter((p) => p.number > 0);

    return this.studentRepo.manager.transaction(async (trx) => {
      const repo = trx.getRepository(StudentRecord);

      if (normalized.length > 0) {
        // Upsert by unique key (number). SQLite supports ON CONFLICT.
        await repo.upsert(normalized, ['number']);
      }

      if (mode === 'replace') {
        // 기존 동작 유지: payload에 없는 번호는 제거
        const numbers = normalized.map((n) => n.number);
        if (numbers.length > 0) {
          await repo
            .createQueryBuilder()
            .delete()
            .from(StudentRecord)
            .where('number NOT IN (:...nums)', { nums: numbers })
            .execute();
        } else {
          await repo.clear();
        }
      }

      return repo.find({ order: { number: 'ASC' } });
    });
  }
}