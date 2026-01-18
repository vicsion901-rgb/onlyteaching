-- SQLite schema for Elementary School "Creative Activities" (창의적 체험활동)
-- Areas: 자율(autonomous), 동아리(club), 봉사(volunteer), 진로(career)
-- Design: common table + area-specific detail tables (1:1), with foreign keys.
--
-- Notes for real service / sentence generation (생활기록부 문장 생성):
-- - Store normalized facts (dates/hours/roles/place/keywords) + raw memo
-- - Store generation status + last generated sentence + template version
-- - Keep evidence/attachments as JSON/text so you can regenerate later

PRAGMA foreign_keys = ON;

BEGIN TRANSACTION;

-- -------------------------
-- Common (Header) table
-- -------------------------
CREATE TABLE IF NOT EXISTS creative_activities (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,

  -- FK: student_records (current project uses only student roster table)
  student_record_id   INTEGER NOT NULL,

  -- FK: users (teacher)
  created_by_user_id  TEXT NULL,
  updated_by_user_id  TEXT NULL,

  -- Academic grouping
  academic_year       INTEGER NOT NULL,              -- e.g., 2026
  grade               INTEGER NOT NULL CHECK (grade BETWEEN 1 AND 6),
  semester            INTEGER NULL CHECK (semester IN (1,2)),

  -- Area (4 domains)
  area                TEXT NOT NULL CHECK (area IN ('autonomous','club','volunteer','career')),

  -- Core activity facts (usable for sentence generation)
  title               TEXT NULL,                     -- activity name/title
  summary             TEXT NULL,                     -- short summary
  content             TEXT NULL,                     -- teacher memo / raw description
  start_date          TEXT NULL,                     -- ISO8601 date: YYYY-MM-DD
  end_date            TEXT NULL,                     -- ISO8601 date: YYYY-MM-DD
  hours               REAL NULL CHECK (hours >= 0),  -- can be 0.5 etc
  location            TEXT NULL,
  organizer           TEXT NULL,                     -- 주관/기관/담당
  role                TEXT NULL,                     -- 학생 역할

  -- Sentence generation fields
  sentence_status     TEXT NOT NULL DEFAULT 'DRAFT' CHECK (sentence_status IN ('DRAFT','READY','GENERATED','LOCKED','ERROR')),
  generated_sentence  TEXT NULL,
  template_version    INTEGER NOT NULL DEFAULT 1,
  generation_meta_json TEXT NULL,                    -- JSON string: prompts, model, scoring, etc.
  last_generated_at   TEXT NULL,                     -- ISO8601 datetime

  -- Tagging / search
  keywords_json       TEXT NULL,                     -- JSON array string (e.g., ["협력","성실"])
  evidence_json       TEXT NULL,                     -- JSON string: links, proofs, files, etc.

  -- Soft delete & auditing
  created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  deleted_at          TEXT NULL,

  FOREIGN KEY (student_record_id) REFERENCES student_records(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Helpful indexes for list / filters (year/grade/semester/area/student)
CREATE INDEX IF NOT EXISTS idx_creative_activities_student
  ON creative_activities(student_record_id, academic_year, grade, semester, area);

CREATE INDEX IF NOT EXISTS idx_creative_activities_area_date
  ON creative_activities(area, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_creative_activities_not_deleted
  ON creative_activities(deleted_at);

-- Auto-maintain updated_at
CREATE TRIGGER IF NOT EXISTS trg_creative_activities_updated_at
AFTER UPDATE ON creative_activities
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE creative_activities
  SET updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  WHERE id = NEW.id;
END;


-- -------------------------
-- Area-specific detail tables (1:1 with common row)
-- -------------------------

-- 1) 자율활동 (Autonomous)
CREATE TABLE IF NOT EXISTS creative_activity_autonomous (
  activity_id          INTEGER PRIMARY KEY,

  -- More structured fields for sentence composition
  activity_type        TEXT NULL CHECK (activity_type IN ('school','class','individual','other')),
  theme                TEXT NULL,        -- 주제
  participation_role   TEXT NULL,        -- 참여 형태/역할
  outcomes             TEXT NULL,        -- 결과/성과
  competencies_json    TEXT NULL,        -- JSON array string (핵심역량)

  FOREIGN KEY (activity_id) REFERENCES creative_activities(id) ON DELETE CASCADE
);


-- 2) 동아리활동 (Club)
CREATE TABLE IF NOT EXISTS creative_activity_club (
  activity_id          INTEGER PRIMARY KEY,

  club_name            TEXT NULL,        -- 동아리명
  club_category        TEXT NULL,        -- 예: 과학/예술/체육/자율 등
  position             TEXT NULL,        -- 직책(회장/부회장/부원 등)
  meeting_count        INTEGER NULL CHECK (meeting_count >= 0),
  main_tasks           TEXT NULL,        -- 주요 역할/활동
  achievements         TEXT NULL,        -- 성과
  teamwork_notes       TEXT NULL,        -- 협업/리더십 메모

  FOREIGN KEY (activity_id) REFERENCES creative_activities(id) ON DELETE CASCADE
);


-- 3) 봉사활동 (Volunteer)
CREATE TABLE IF NOT EXISTS creative_activity_volunteer (
  activity_id          INTEGER PRIMARY KEY,

  service_type         TEXT NULL,        -- 봉사 종류
  target               TEXT NULL,        -- 대상(학교/지역사회/환경 등)
  institution_name     TEXT NULL,        -- 기관명
  institution_contact  TEXT NULL,        -- 연락처(선택)
  certificate_no       TEXT NULL,        -- 확인서 번호(선택)
  hours_confirmed      REAL NULL CHECK (hours_confirmed >= 0),
  reflection           TEXT NULL,        -- 소감/성찰(생활기록부 문장에 자주 사용)

  FOREIGN KEY (activity_id) REFERENCES creative_activities(id) ON DELETE CASCADE
);


-- 4) 진로활동 (Career)
CREATE TABLE IF NOT EXISTS creative_activity_career (
  activity_id          INTEGER PRIMARY KEY,

  program_type         TEXT NULL CHECK (program_type IN ('exploration','experience','counseling','lecture','visit','other')),
  career_field         TEXT NULL,        -- 관심 분야
  institution          TEXT NULL,        -- 기관/장소
  mentor               TEXT NULL,        -- 멘토/강사
  learning_points      TEXT NULL,        -- 배운 점/느낀 점
  next_plan            TEXT NULL,        -- 후속 계획

  FOREIGN KEY (activity_id) REFERENCES creative_activities(id) ON DELETE CASCADE
);


-- -------------------------
-- Optional: attachments / evidence (useful for regeneration / audits)
-- -------------------------
CREATE TABLE IF NOT EXISTS creative_activity_attachments (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_id          INTEGER NOT NULL,
  kind                TEXT NOT NULL DEFAULT 'file' CHECK (kind IN ('file','image','link','note')),
  title               TEXT NULL,
  uri                 TEXT NULL,          -- path/url
  meta_json           TEXT NULL,          -- JSON string (mime, size, etc.)
  created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  deleted_at          TEXT NULL,

  FOREIGN KEY (activity_id) REFERENCES creative_activities(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_creative_activity_attachments_activity
  ON creative_activity_attachments(activity_id, deleted_at);

COMMIT;



