// src/excel/excel.types.ts
export type StudentNormalized = {
    student_number: string;
    name: string;
    birth_date: string;
    resident_id: string;
    address: string;
  };
  
  export type FieldKey = keyof StudentNormalized;
  
  export type MappingColumnResult = {
    excelColumn: string;
    normalized: string;
    mappedField: FieldKey | null;
    score: number;
    candidates: string[];
    confidence: 'high' | 'medium' | 'low';
  };
  
  export type MappingResult = {
    headerRowIndex: number;
    columns: MappingColumnResult[];
    unmappedColumns: string[];
    canAutoApply: boolean;
  };
  
  export type ImportResult = {
    mapping: MappingResult;
    data: StudentNormalized[];
    stats: {
      totalRows: number;
      storedRows: number;
      detectedHeaderRowIndex: number;
    };
  };