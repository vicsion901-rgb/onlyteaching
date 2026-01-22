import { Injectable } from '@nestjs/common';
import { StudentRepository } from '../students/student.repository';
import { ImportResult } from './excel.types';
import { parseExcelToMatrix } from './utils/parseExcel';
import { detectHeaderRowIndex } from './utils/detectHeaderRow';
import {
  buildMapping,
  getAllCandidateTokens,
  mapRowsToStudents,
} from './excel.mapper';

@Injectable()
export class ExcelService {
  constructor(
    private readonly studentRepo: StudentRepository,
  ) {}

  private matrixToObjects(
    matrix: string[][],
    headerIdx: number,
  ): { headers: string[]; objects: Record<string, string>[] } {
    const headers = (matrix[headerIdx] ?? []).map((h) =>
      (h ?? '').toString().trim(),
    );

    const dataRows = matrix.slice(headerIdx + 1);

    const objects = dataRows.map((row) => {
      const obj: Record<string, string> = {};
      for (let c = 0; c < headers.length; c++) {
        const key = headers[c] || `__COL_${c}`;
        obj[key] = (row[c] ?? '').toString().trim();
      }
      return obj;
    });

    const cleaned = objects.filter((o) =>
      Object.values(o).some(
        (v) => (v ?? '').toString().trim() !== '',
      ),
    );

    return { headers, objects: cleaned };
  }

  async importStudentsFromExcel(
    buffer: Buffer,
  ): Promise<ImportResult> {
    const { matrix } = parseExcelToMatrix(buffer);

    // 1️⃣ 헤더 행 자동 탐지
    const headerIdx = detectHeaderRowIndex(
      matrix,
      getAllCandidateTokens(),
    );

    // 2️⃣ 헤더 기준 객체 변환
    const { headers, objects } =
      this.matrixToObjects(matrix, headerIdx);

    // 🔎 디버그 로그
    console.log('[EXCEL] headerIdx:', headerIdx);
    console.log('[EXCEL] headers:', headers);
    console.log('[EXCEL] firstRow:', objects[0]);

    // 3️⃣ 컬럼 자동 매핑
    const mapping = buildMapping(headers);
    mapping.headerRowIndex = headerIdx;

    // 4️⃣ 통일된 학생 JSON 생성
    const students = mapRowsToStudents(objects, mapping);

    // 5️⃣ DB bulk upsert
    const stored =
      await this.studentRepo.bulkUpsertStudents(students);

    return {
      mapping,
      data: students,
      stats: {
        totalRows: objects.length,
        storedRows: stored.insertedOrUpdated,
        detectedHeaderRowIndex: headerIdx,
      },
    };
  }
}