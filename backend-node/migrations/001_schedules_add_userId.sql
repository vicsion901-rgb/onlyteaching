-- Migration: schedules 테이블에 userId 컬럼 + 인덱스 추가
-- 실행 환경: PostgreSQL (Supabase/Vercel Postgres)
-- 실행 시점: 배포 전 1회 실행

-- 1. userId 컬럼 추가 (이미 있으면 무시)
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS "userId" VARCHAR;

-- 2. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_schedules_user_date ON schedules("userId", date);
CREATE INDEX IF NOT EXISTS idx_schedules_date ON schedules(date);

-- 3. 기존 데이터 백필 (userId가 null인 레코드 — 필요 시)
-- UPDATE schedules SET "userId" = (SELECT id FROM users LIMIT 1) WHERE "userId" IS NULL;
-- ↑ 단일 사용자 환경이면 위 줄 주석 해제 후 실행

-- 확인
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'schedules' AND column_name = 'userId';
