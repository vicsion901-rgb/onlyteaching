-- Migration 003: 학생 활동 전체 구조
-- 교사 → 학급 → 학생 → 세션 → 제출물 계층 구조
-- 실행: PostgreSQL, 배포 전 1회

-- ═══════════════════════════════════════
-- 0. qr_sessions (QR 배포 세션)
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS qr_sessions (
  id SERIAL PRIMARY KEY,
  join_code VARCHAR(8) UNIQUE NOT NULL,
  teacher_id VARCHAR NOT NULL,
  class_name VARCHAR(50),
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  activity_type VARCHAR(30),
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMPTZ NOT NULL,
  joined_count INTEGER DEFAULT 0,
  submitted_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_qr_join_code ON qr_sessions(join_code);
CREATE INDEX IF NOT EXISTS idx_qr_teacher ON qr_sessions(teacher_id);

-- ═══════════════════════════════════════
-- 0b. activity_metadata (즐겨찾기/메모)
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS activity_metadata (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  activity_key VARCHAR NOT NULL,
  source_type VARCHAR(20) NOT NULL,
  is_favorited BOOLEAN DEFAULT FALSE,
  memo TEXT DEFAULT '',
  student_id INTEGER,
  submission_id VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, activity_key)
);
CREATE INDEX IF NOT EXISTS idx_actmeta_user ON activity_metadata(user_id);

-- ═══════════════════════════════════════
-- 0c. creative_collections (편찬 묶음)
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS creative_collections (
  id VARCHAR(20) PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT DEFAULT '',
  collection_type VARCHAR(30) DEFAULT 'general',
  item_ids TEXT[] DEFAULT '{}',
  items JSONB DEFAULT '[]',
  class_id VARCHAR(20),
  student_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cc_user ON creative_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_cc_student ON creative_collections(student_id);

-- ═══════════════════════════════════════
-- A. classes (학급/그룹)
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS classes (
  id VARCHAR(20) PRIMARY KEY,
  teacher_id VARCHAR NOT NULL,
  school_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
  grade_level SMALLINT,
  class_name VARCHAR(50) NOT NULL,
  student_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_classes_teacher ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_classes_teacher_year ON classes(teacher_id, school_year);

-- ═══════════════════════════════════════
-- B. student_records 보강
-- ═══════════════════════════════════════
ALTER TABLE student_records ADD COLUMN IF NOT EXISTS class_id VARCHAR(20);
ALTER TABLE student_records ADD COLUMN IF NOT EXISTS school_year INTEGER;
ALTER TABLE student_records ADD COLUMN IF NOT EXISTS student_number VARCHAR(10);
ALTER TABLE student_records ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE student_records ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_student_class ON student_records(class_id);
CREATE INDEX IF NOT EXISTS idx_student_teacher_class ON student_records("userId", class_id);

-- ═══════════════════════════════════════
-- C. activity_sessions (활동 세션)
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS activity_sessions (
  id VARCHAR(20) PRIMARY KEY,
  teacher_id VARCHAR NOT NULL,
  class_id VARCHAR(20),
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  activity_type VARCHAR(30),
  title VARCHAR(200),
  qr_join_code VARCHAR(8),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  joined_count INTEGER DEFAULT 0,
  submitted_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_asession_teacher ON activity_sessions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_asession_teacher_class_date ON activity_sessions(teacher_id, class_id, session_date);
CREATE INDEX IF NOT EXISTS idx_asession_qr ON activity_sessions(qr_join_code);
CREATE INDEX IF NOT EXISTS idx_asession_date ON activity_sessions(session_date);

-- ═══════════════════════════════════════
-- D. student_activity_submissions (학생 제출물)
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS student_activity_submissions (
  id VARCHAR(20) PRIMARY KEY,
  session_id VARCHAR(20),
  teacher_id VARCHAR NOT NULL,
  class_id VARCHAR(20),
  student_id INTEGER,
  student_name VARCHAR(50),
  activity_type VARCHAR(30) NOT NULL,
  source_type VARCHAR(20) NOT NULL DEFAULT 'morning',
  title VARCHAR(200),
  content TEXT,
  original_text TEXT,
  feeling TEXT,
  accuracy SMALLINT,
  metadata JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'submitted',
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sub_session ON student_activity_submissions(session_id);
CREATE INDEX IF NOT EXISTS idx_sub_teacher_class ON student_activity_submissions(teacher_id, class_id);
CREATE INDEX IF NOT EXISTS idx_sub_student ON student_activity_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_sub_student_date ON student_activity_submissions(student_id, submitted_at);
CREATE INDEX IF NOT EXISTS idx_sub_teacher_date ON student_activity_submissions(teacher_id, submitted_at);
CREATE INDEX IF NOT EXISTS idx_sub_type ON student_activity_submissions(activity_type);
CREATE INDEX IF NOT EXISTS idx_sub_source ON student_activity_submissions(source_type);

-- ═══════════════════════════════════════
-- E. creative_collections 보강
-- ═══════════════════════════════════════
ALTER TABLE creative_collections ADD COLUMN IF NOT EXISTS class_id VARCHAR(20);
ALTER TABLE creative_collections ADD COLUMN IF NOT EXISTS student_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_cc_student ON creative_collections(student_id);

-- ═══════════════════════════════════════
-- F. book_projects (책 만들기 프로젝트)
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS book_projects (
  id VARCHAR(20) PRIMARY KEY,
  teacher_id VARCHAR NOT NULL,
  class_id VARCHAR(20),
  student_id INTEGER,
  student_name VARCHAR(50),
  book_type VARCHAR(20) NOT NULL,
  title VARCHAR(200),
  subtitle VARCHAR(200),
  author_name VARCHAR(50),
  collection_id VARCHAR(20),
  selected_item_ids TEXT[] DEFAULT '{}',
  growth_stats JSONB,
  status VARCHAR(20) DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_book_teacher ON book_projects(teacher_id);
CREATE INDEX IF NOT EXISTS idx_book_student ON book_projects(student_id);
CREATE INDEX IF NOT EXISTS idx_book_teacher_class ON book_projects(teacher_id, class_id);

-- ═══════════════════════════════════════
-- G. activity_metadata 보강
-- ═══════════════════════════════════════
ALTER TABLE activity_metadata ADD COLUMN IF NOT EXISTS student_id INTEGER;
ALTER TABLE activity_metadata ADD COLUMN IF NOT EXISTS submission_id VARCHAR(20);

-- ═══════════════════════════════════════
-- H. 요약 테이블 (성장 보기 / 교사 현황용)
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS student_activity_summaries (
  id SERIAL PRIMARY KEY,
  teacher_id VARCHAR NOT NULL,
  class_id VARCHAR(20),
  student_id INTEGER,
  summary_date DATE NOT NULL,
  total_count INTEGER DEFAULT 0,
  submitted_count INTEGER DEFAULT 0,
  morning_count INTEGER DEFAULT 0,
  manuscript_count INTEGER DEFAULT 0,
  avg_accuracy SMALLINT,
  type_distribution JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, student_id, summary_date)
);
CREATE INDEX IF NOT EXISTS idx_summary_teacher_date ON student_activity_summaries(teacher_id, summary_date);
CREATE INDEX IF NOT EXISTS idx_summary_student_date ON student_activity_summaries(student_id, summary_date);
CREATE INDEX IF NOT EXISTS idx_summary_class_date ON student_activity_summaries(class_id, summary_date);
