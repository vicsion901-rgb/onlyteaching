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

    // 1️⃣ 1차 헤더 탐지
    let headerIdx = detectHeaderRowIndex(
      matrix,
      getAllCandidateTokens(),
    );

    // 2️⃣ 🔥 안전장치:
    // 헤더 행이 "단일 셀"이거나 제목성 문구면 다음 행으로 강제 이동
    const rawHeaders = (matrix[headerIdx] ?? []).filter(
      (c) => (c ?? '').toString().trim() !== '',
    );

    if (
      rawHeaders.length <= 1 &&
      rawHeaders[0]?.includes('학생')
    ) {
      headerIdx = headerIdx + 1;
    }

    // 3️⃣ 헤더 기준 객체화
    const { headers, objects } =
      this.matrixToObjects(matrix, headerIdx);

    // 🔎 로그 (이제 이게 정상으로 찍혀야 함)
    console.log('[EXCEL] FINAL headerIdx:', headerIdx);
    console.log('[EXCEL] FINAL headers:', headers);
    console.log('[EXCEL] FINAL firstRow:', objects[0]);

    // 4️⃣ 컬럼 자동 매핑
    const mapping = buildMapping(headers);
    mapping.headerRowIndex = headerIdx;

    // 5️⃣ 통일된 학생 데이터
    const students = mapRowsToStudents(objects, mapping);

    // 6️⃣ DB 저장
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