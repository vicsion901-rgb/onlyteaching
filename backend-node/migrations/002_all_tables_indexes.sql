-- Migration: 전체 테이블 인덱스 + 컬럼 정합성 정리
-- 실행 환경: PostgreSQL
-- 실행 시점: 배포 전 1회

-- schedules
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS "userId" VARCHAR;
CREATE INDEX IF NOT EXISTS idx_schedules_user_date ON schedules("userId", date);

-- student_records
ALTER TABLE student_records ADD COLUMN IF NOT EXISTS "userId" VARCHAR;
CREATE INDEX IF NOT EXISTS idx_student_records_user ON student_records("userId");
CREATE INDEX IF NOT EXISTS idx_student_records_user_name ON student_records("userId", name);

-- care_classroom_records (이미 API에서 생성하지만 보장용)
CREATE TABLE IF NOT EXISTS care_classroom_records (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  record_date DATE NOT NULL,
  mood VARCHAR(30),
  custom_mood TEXT,
  positive_emotion_score SMALLINT,
  negative_emotion_score SMALLINT,
  emotion_reason_tags TEXT[] DEFAULT '{}',
  emotion_reason_note TEXT,
  todo_items JSONB DEFAULT '[]',
  key_scene TEXT,
  support_source VARCHAR(30),
  support_memo TEXT,
  free_memo TEXT,
  linked_student_ids INTEGER[] DEFAULT '{}',
  linked_context_summary JSONB,
  computed_emotion_label VARCHAR(50),
  computed_emotion_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, record_date)
);
CREATE INDEX IF NOT EXISTS idx_care_user_date ON care_classroom_records(user_id, record_date);

-- observation_logs
CREATE TABLE IF NOT EXISTS observation_logs (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  student_id INTEGER,
  observed_date DATE NOT NULL,
  category VARCHAR(30),
  tags TEXT[] DEFAULT '{}',
  summary TEXT,
  content TEXT,
  emotion_hints TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_obs_user_date ON observation_logs(user_id, observed_date);
CREATE INDEX IF NOT EXISTS idx_obs_student_date ON observation_logs(student_id, observed_date);

-- question_answers
CREATE TABLE IF NOT EXISTS question_answers (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  project_type VARCHAR(10) DEFAULT 'teacher',
  academic_year INTEGER DEFAULT 2026,
  question_id VARCHAR(20) NOT NULL,
  chapter_index SMALLINT NOT NULL,
  question_text TEXT,
  answer_text TEXT,
  selected_choices TEXT[] DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'unanswered',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, project_type, academic_year, question_id)
);
CREATE INDEX IF NOT EXISTS idx_qa_user_project ON question_answers(user_id, project_type, academic_year);

-- daily_digests
CREATE TABLE IF NOT EXISTS daily_digests (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  digest_date DATE NOT NULL,
  source_type VARCHAR(30) NOT NULL,
  summary_lines TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  emotion_hints TEXT[] DEFAULT '{}',
  related_chapter_hints SMALLINT[] DEFAULT '{}',
  metadata JSONB,
  digest_status VARCHAR(15) DEFAULT 'fresh',
  source_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, digest_date, source_type)
);
CREATE INDEX IF NOT EXISTS idx_digest_user_date_source ON daily_digests(user_id, digest_date, source_type);

-- digest_jobs
CREATE TABLE IF NOT EXISTS digest_jobs (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  source_type VARCHAR(30) NOT NULL,
  source_id VARCHAR(100),
  target_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  attempts SMALLINT DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_digest_jobs_status ON digest_jobs(status, created_at);

-- autobiography_projects
CREATE TABLE IF NOT EXISTS autobiography_projects (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  project_type VARCHAR(20) NOT NULL DEFAULT 'teacher',
  title VARCHAR(200),
  subtitle VARCHAR(200),
  school_year INTEGER NOT NULL DEFAULT 2026,
  target_student_id INTEGER,
  status VARCHAR(20) DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, project_type, school_year)
);

-- autobiography_chapters
CREATE TABLE IF NOT EXISTS autobiography_chapters (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES autobiography_projects(id) ON DELETE CASCADE,
  chapter_order SMALLINT NOT NULL DEFAULT 0,
  title VARCHAR(200) NOT NULL,
  subtitle VARCHAR(200),
  status VARCHAR(20) DEFAULT 'empty',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, chapter_order)
);

-- autobiography_chapter_entries
CREATE TABLE IF NOT EXISTS autobiography_chapter_entries (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL,
  chapter_id INTEGER NOT NULL REFERENCES autobiography_chapters(id) ON DELETE CASCADE,
  source_type VARCHAR(30) NOT NULL,
  source_id VARCHAR(100),
  original_text TEXT NOT NULL DEFAULT '',
  current_text TEXT NOT NULL DEFAULT '',
  is_edited BOOLEAN DEFAULT FALSE,
  display_order SMALLINT DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_autobio_entry_chapter ON autobiography_chapter_entries(chapter_id, display_order);

-- schedule_reflections
CREATE TABLE IF NOT EXISTS schedule_reflections (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  schedule_id INTEGER NOT NULL,
  event_title VARCHAR(200),
  event_date DATE,
  emotion_tag VARCHAR(30),
  memo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, schedule_id)
);
