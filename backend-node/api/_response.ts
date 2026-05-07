// 표준 응답 헬퍼 — 전체 탭 공통
export type ErrorReason = 'duplicate' | 'invalid_payload' | 'invalid_date' | 'missing_user' | 'missing_student' | 'db_error' | 'timeout' | 'stale_conflict' | 'unauthorized' | 'not_found';

export interface ApiError {
  reason: ErrorReason;
  target?: string;
  detail?: string;
}

export function successResponse(data: any, meta?: { saved?: number }) {
  return { success: true, ...meta, data };
}

export function bulkResponse(inserted: number, skipped: number, total: number, results: any[], errors: ApiError[] = [], fallback = false) {
  return { success: inserted > 0, inserted, skipped, total, results, errors, fallback };
}

export function errorResponse(message: string, errors: ApiError[] = []) {
  return { success: false, message, errors };
}

export function classifyDbError(err: any): ErrorReason {
  if (err?.code === '23505') return 'duplicate';
  if (err?.code === '23502') return 'invalid_payload';
  if (err?.code === '23503') return 'missing_student';
  return 'db_error';
}
