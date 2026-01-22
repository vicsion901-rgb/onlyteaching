import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { StudentEntity } from './entities/student.entity';

export type NormalizedStudent = {
  student_number: string;
  name: string;
  birth_date: string;
  resident_id: string;
  address: string;
};

@Injectable()
export class StudentRepository {
  constructor(private readonly dataSource: DataSource) {}

  async bulkUpsertStudents(rows: NormalizedStudent[]) {
    if (!rows || rows.length === 0) {
      return { insertedOrUpdated: 0 };
    }

    const students = rows.map((r) => ({
      studentNumber: r.student_number || null,
      name: r.name.trim(),
      birthDate: r.birth_date || null,
      residentId: r.resident_id || null,
      address: r.address || null,
    }));

    const withResident = students.filter((s) => !!s.residentId);
    const withoutResident = students.filter((s) => !s.residentId);

    return this.dataSource.transaction(async (manager) => {
      if (withResident.length > 0) {
        await manager.getRepository(StudentEntity).upsert(withResident, ['residentId']);
      }

      if (withoutResident.length > 0) {
        await manager
          .getRepository(StudentEntity)
          .upsert(withoutResident, ['name', 'birthDate', 'studentNumber']);
      }

      return { insertedOrUpdated: students.length };
    });
  }
}