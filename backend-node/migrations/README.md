# Migration 실행 가이드

## 배포 전 반드시 실행

프로덕션 DB에 아래 SQL을 순서대로 실행하세요.

### 방법 1: Supabase SQL Editor
1. Supabase 대시보드 → SQL Editor
2. `002_all_tables_indexes.sql` 내용 전체 붙여넣기
3. Run 실행
4. 에러 없으면 완료

### 방법 2: psql CLI
```bash
psql $POSTGRES_URL -f backend-node/migrations/002_all_tables_indexes.sql
```

### 방법 3: Vercel Postgres Console
1. Vercel 대시보드 → Storage → Postgres → Query
2. SQL 붙여넣기 실행

## 실행 후 확인

배포 후 아래 API로 스키마 상태 점검:
```
GET /api/schema-check
```

정상이면:
```json
{ "ok": true, "issues": [] }
```

문제 있으면:
```json
{ "ok": false, "issues": ["컬럼 없음: schedules.userId"] }
```

## 실행 순서
1. `001_schedules_add_userId.sql` (이미 002에 포함)
2. `002_all_tables_indexes.sql` (전체 통합 — 이것만 실행해도 됨)

## 주의
- `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS` 사용
- 이미 있는 테이블/인덱스는 건너뜀
- 여러 번 실행해도 안전
