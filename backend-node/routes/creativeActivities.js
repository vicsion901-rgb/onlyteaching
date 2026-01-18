const express = require('express');
const db = require('../db/sqlite.js');

const router = express.Router();
router.use(express.json({ limit: '10mb' }));
router.use(express.urlencoded({ extended: true }));

// Korean labels -> internal area enum (schema uses: autonomous/club/volunteer/career)
const AREA_BY_KO = {
  자율: 'autonomous',
  동아리: 'club',
  봉사: 'volunteer',
  진로: 'career',
};

router.post('/', async (req, res) => {
  try {
    const {
      student_id,
      school_year,
      grade,
      semester,
      activity_type,
      title,
      activity_date,
      hours,
      teacher_observation,
      detail,
    } = req.body || {};

    const studentRecordId = Number(student_id);
    const academicYear = Number(school_year);
    const gradeNum = Number(grade);
    const semesterNum = semester === undefined || semester === null || semester === '' ? null : Number(semester);

    const area = AREA_BY_KO[String(activity_type || '').trim()];
    if (!area) {
      return res.status(400).json({ success: false, error: 'activity_type must be one of: 자율, 동아리, 봉사, 진로' });
    }

    if (!Number.isFinite(studentRecordId) || studentRecordId <= 0) {
      return res.status(400).json({ success: false, error: 'student_id is required (number)' });
    }
    if (!Number.isFinite(academicYear) || academicYear < 2000 || academicYear > 2100) {
      return res.status(400).json({ success: false, error: 'school_year is required (e.g., 2026)' });
    }
    if (!Number.isFinite(gradeNum) || gradeNum < 1 || gradeNum > 6) {
      return res.status(400).json({ success: false, error: 'grade is required (1~6)' });
    }
    if (semesterNum !== null && (!Number.isFinite(semesterNum) || (semesterNum !== 1 && semesterNum !== 2))) {
      return res.status(400).json({ success: false, error: 'semester must be 1 or 2 (or omit)' });
    }

    await db.exec('BEGIN;');

    const result = await db.run(
      `
        INSERT INTO creative_activities
          (student_record_id, academic_year, grade, semester, area, title, start_date, hours, content)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        studentRecordId,
        academicYear,
        gradeNum,
        semesterNum,
        area,
        title ?? null,
        activity_date ?? null,
        hours ?? null,
        teacher_observation ?? null,
      ],
    );

    const creativeId = result.lastID;
    const d = detail || {};

    if (activity_type === '자율') {
      await db.run(
        `
          INSERT INTO creative_activity_autonomous
            (activity_id, theme, participation_role)
          VALUES (?, ?, ?)
        `,
        [creativeId, d.activity_theme ?? null, d.participation_role ?? null],
      );
    }

    if (activity_type === '동아리') {
      await db.run(
        `
          INSERT INTO creative_activity_club
            (activity_id, club_name, club_category, position)
          VALUES (?, ?, ?, ?)
        `,
        [creativeId, d.club_name ?? null, d.activity_field ?? null, d.role ?? null],
      );
    }

    if (activity_type === '봉사') {
      await db.run(
        `
          INSERT INTO creative_activity_volunteer
            (activity_id, institution_name, reflection, hours_confirmed)
          VALUES (?, ?, ?, ?)
        `,
        [creativeId, d.service_place ?? null, d.service_content ?? null, d.recognized_hours ?? null],
      );
    }

    if (activity_type === '진로') {
      await db.run(
        `
          INSERT INTO creative_activity_career
            (activity_id, career_field, mentor, learning_points)
          VALUES (?, ?, ?, ?)
        `,
        [creativeId, d.career_theme ?? null, d.related_job ?? null, d.learning_content ?? null],
      );
    }

    await db.exec('COMMIT;');
    return res.json({ success: true, id: creativeId });
  } catch (err) {
    try {
      await db.exec('ROLLBACK;');
    } catch (_) {}
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: '창체 저장 실패' });
  }
});

router.get('/student/:studentId', async (req, res) => {
  const studentId = Number(req.params.studentId);
  if (!Number.isFinite(studentId) || studentId <= 0) {
    return res.status(400).json({ success: false, error: 'studentId must be a number' });
  }

  try {
    const rows = await db.all(
      `
        SELECT
          ca.*,
          aa.activity_type AS autonomous_activity_type,
          aa.theme AS autonomous_theme,
          aa.participation_role AS autonomous_participation_role,
          aa.outcomes AS autonomous_outcomes,
          aa.competencies_json AS autonomous_competencies_json,

          cl.club_name AS club_club_name,
          cl.club_category AS club_club_category,
          cl.position AS club_position,
          cl.meeting_count AS club_meeting_count,
          cl.main_tasks AS club_main_tasks,
          cl.achievements AS club_achievements,
          cl.teamwork_notes AS club_teamwork_notes,

          vo.service_type AS volunteer_service_type,
          vo.target AS volunteer_target,
          vo.institution_name AS volunteer_institution_name,
          vo.institution_contact AS volunteer_institution_contact,
          vo.certificate_no AS volunteer_certificate_no,
          vo.hours_confirmed AS volunteer_hours_confirmed,
          vo.reflection AS volunteer_reflection,

          cr.program_type AS career_program_type,
          cr.career_field AS career_career_field,
          cr.institution AS career_institution,
          cr.mentor AS career_mentor,
          cr.learning_points AS career_learning_points,
          cr.next_plan AS career_next_plan
        FROM creative_activities ca
        LEFT JOIN creative_activity_autonomous aa ON aa.activity_id = ca.id
        LEFT JOIN creative_activity_club cl ON cl.activity_id = ca.id
        LEFT JOIN creative_activity_volunteer vo ON vo.activity_id = ca.id
        LEFT JOIN creative_activity_career cr ON cr.activity_id = ca.id
        WHERE ca.student_record_id = ?
          AND ca.deleted_at IS NULL
        ORDER BY ca.academic_year DESC, ca.start_date DESC, ca.id DESC
      `,
      [studentId],
    );

    const activities = rows.map((r) => {
      let detail = null;
      if (r.area === 'autonomous') {
        detail = {
          activity_type: r.autonomous_activity_type,
          theme: r.autonomous_theme,
          participation_role: r.autonomous_participation_role,
          outcomes: r.autonomous_outcomes,
          competencies_json: r.autonomous_competencies_json,
        };
      } else if (r.area === 'club') {
        detail = {
          club_name: r.club_club_name,
          club_category: r.club_club_category,
          position: r.club_position,
          meeting_count: r.club_meeting_count,
          main_tasks: r.club_main_tasks,
          achievements: r.club_achievements,
          teamwork_notes: r.club_teamwork_notes,
        };
      } else if (r.area === 'volunteer') {
        detail = {
          service_type: r.volunteer_service_type,
          target: r.volunteer_target,
          institution_name: r.volunteer_institution_name,
          institution_contact: r.volunteer_institution_contact,
          certificate_no: r.volunteer_certificate_no,
          hours_confirmed: r.volunteer_hours_confirmed,
          reflection: r.volunteer_reflection,
        };
      } else if (r.area === 'career') {
        detail = {
          program_type: r.career_program_type,
          career_field: r.career_career_field,
          institution: r.career_institution,
          mentor: r.career_mentor,
          learning_points: r.career_learning_points,
          next_plan: r.career_next_plan,
        };
      }

      return { ...r, detail };
    });

    return res.json({ success: true, activities });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ success: false, error: '창체 조회 실패' });
  }
});

// 소프트 삭제: deleted_at만 채우고 목록 조회에서는 제외
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ success: false, error: 'id must be a number' });
  }

  try {
    const result = await db.run(
      `
        UPDATE creative_activities
        SET deleted_at = (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        WHERE id = ?
          AND deleted_at IS NULL
      `,
      [id],
    );

    if (!result || result.changes === 0) {
      return res.status(404).json({ success: false, error: '삭제할 항목을 찾지 못했습니다.' });
    }

    return res.json({ success: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ success: false, error: '창체 삭제 실패' });
  }
});

module.exports = router;


