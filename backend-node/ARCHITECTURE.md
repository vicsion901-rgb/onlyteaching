# OnlyTeaching 백엔드 아키텍처

## 3층 데이터 구조

```
A. 원본 테이블 ─── 사용자 입력의 정확한 원본
       ↓ (저장 후 background job)
B. 요약/Digest ──── 날짜/월별 빠른 조회용 요약
       ↓ (편찬 시 재료 수집)
C. 편찬 재료 ───── 자서전 장별 블록/문장 단위
```

## A. 원본 테이블

| 테이블 | 역할 | 주요 인덱스 |
|--------|------|------------|
| `users` | 교사 계정 | PK uuid |
| `student_records` | 학생명부 (canonical) | (userId), (userId, name) |
| `schedules` | 학사일정 | (userId, date) |
| `schedule_reflections` | 일정별 회고 | (user_id, event_date) |
| `care_classroom_records` | 돌봄교실 | (user_id, record_date) UNIQUE |
| `observation_logs` | 관찰일지 | (user_id, observed_date), (student_id, observed_date) |
| `question_answers` | 자서전 질문 답변 | (user_id, project_type, academic_year, question_id) UNIQUE |
| `meals` | 급식 | (schoolCode, mealDate) UNIQUE |
| `student_record_comments` | 생활기록부 문장 뱅크 | PK |
| `achievement_standards` | 교과평가 기준 | (code) UNIQUE |
| `creative_activities` | 창의적 체험활동 | (studentRecordId) |

## B. 요약/Digest 계층

| 테이블 | 역할 | 주요 인덱스 |
|--------|------|------------|
| `daily_digests` | 날짜+소스별 요약 | (user_id, digest_date, source_type) UNIQUE |
| `digest_jobs` | 비동기 digest 작업 큐 | (status, created_at) |

### source_type 값
- `care` — 돌봄교실 감정/장면 요약
- `schedule` — 학사일정 요약
- `observation` — 관찰일지 하이라이트
- `meal` — 급식 생활감

### digest 갱신 흐름
```
원본 저장 → 응답 반환 → digest_jobs enqueue
worker → daily_digests upsert → digest_status = fresh
```

## C. 편찬 재료 계층

| 테이블 | 역할 | 주요 인덱스 |
|--------|------|------------|
| `autobiography_projects` | 자서전 프로젝트 | (user_id, project_type, school_year) UNIQUE |
| `autobiography_chapters` | 장 구조 (기본 10장) | (project_id, chapter_order) UNIQUE |
| `autobiography_chapter_entries` | 장별 편찬 재료 | (chapter_id, display_order) |

### source_type별 역할
| source_type | 역할 | 문단 위치 |
|-------------|------|----------|
| schedule | 시간축/배경 | 배경 문단 |
| care | 감정/장면 | 장면 문단 |
| observation | 행동/사건 | 장면 문단 |
| meal | 생활감 | 분위기 문단 |
| question | 해석/회고 | 해석 문단 |
| manual | 사용자 강조 | 해석 문단 (우선) |
| ai-generated | 연결/확장 | 보강 |

## API 패턴

### 저장
```
POST /api/{resource}
→ { success, saved, data, errors }
```

### Bulk 저장
```
POST /api/{resource} (body.events 배열)
→ { success, inserted, skipped, total, errors }
```

### Summary 조회
```
GET /api/{resource}?userId=X&month=YYYY-MM
→ { success, data: [...] }
```

### Detail 조회
```
GET /api/{resource}/:id
→ { success, data: {} }
```

### 에러 reason 표준
`duplicate | invalid_payload | invalid_date | missing_user | db_error | timeout | stale_conflict | schema_not_migrated | not_found | unauthorized`

## 성능 원칙

1. 달력/카드/list = digest만
2. detail/편집 = 원본
3. 편찬실 = chapter_entries
4. bulk insert 기본
5. background worker로 digest 갱신
6. optimistic UI + 서버 원본
7. 원본 full scan 금지

## 운영 원칙

1. runtime DDL 금지 → migration only
2. `/api/schema-check` — 스키마 점검
3. localStorage = 캐시만
4. 서버 = source of truth
5. conflict → 서버 우선 + 로컬 draft 복구 옵션

## Migration

`backend-node/migrations/` 디렉토리의 SQL을 배포 전 실행.
```bash
psql $POSTGRES_URL -f backend-node/migrations/002_all_tables_indexes.sql
```
실행 후 `/api/schema-check`로 확인.
