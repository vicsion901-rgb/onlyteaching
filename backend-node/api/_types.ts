// 공통 DB 행 타입 — Vercel Function API 전용

export interface DbRow {
  [key: string]: unknown;
}

export interface ScheduleRow extends DbRow {
  id: number;
  title: string;
  date: string;
  memo: string | null;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChapterEntryRow extends DbRow {
  id: number;
  project_id: number;
  chapter_id: number;
  source_type: string;
  source_id: string | null;
  original_text: string;
  current_text: string;
  is_edited: boolean;
  display_order: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface QuestionAnswerRow extends DbRow {
  id: number;
  user_id: string;
  project_type: string;
  academic_year: number;
  question_id: string;
  chapter_index: number;
  question_text: string;
  answer_text: string;
  selected_choices: string[];
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ApiError {
  reason: string;
  target?: string;
  detail?: string;
}

// DB query parameter 배열 — unknown[]이 이상적이지만 pg 라이브러리가 any[] 기대
export type QueryParams = (string | number | boolean | null | string[] | number[] | object)[];
