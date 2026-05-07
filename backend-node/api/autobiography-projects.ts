import { setCors } from './_cors';
// @ts-ignore
import type { VercelRequest, VercelResponse } from '@vercel/node';
// @ts-ignore
import { Pool } from 'pg';

let pool: Pool | null = null;
function getPool(): Pool {
  if (!pool) { pool = new Pool({ connectionString: process.env.POSTGRES_URL, ssl: { rejectUnauthorized: false }, max: 3, connectionTimeoutMillis: 5000 }); }
  return pool;
}

const INIT_SQL = `
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
CREATE INDEX IF NOT EXISTS idx_autobio_proj_user ON autobiography_projects(user_id, project_type, school_year);

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
CREATE INDEX IF NOT EXISTS idx_autobio_ch_project ON autobiography_chapters(project_id, chapter_order);

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
CREATE INDEX IF NOT EXISTS idx_autobio_entry_source ON autobiography_chapter_entries(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_autobio_entry_project ON autobiography_chapter_entries(project_id, chapter_id);
`;

const DEFAULT_CHAPTERS = [
  { order: 0, title: '시작하는 글', subtitle: '올해를 여는 마음' },
  { order: 1, title: '올해의 환경과 현실', subtitle: '환경과 분위기' },
  { order: 2, title: '학교생활의 초반', subtitle: '시작과 긴장' },
  { order: 3, title: '익숙해지는 과정', subtitle: '적응과 버팀' },
  { order: 4, title: '관계와 사람들', subtitle: '위로와 소모' },
  { order: 5, title: '책임감과 역할', subtitle: '끝까지 맡은 자리' },
  { order: 6, title: '전환의 순간', subtitle: '다시 버티게 한 계기' },
  { order: 7, title: '지금의 나', subtitle: '올해를 지난 모습' },
  { order: 8, title: '앞으로의 마음', subtitle: '내년을 향한 시선' },
  { order: 9, title: '맺는 글', subtitle: '올해를 닫으며' },
];

let initialized = false;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (setCors(req, res)) return;

  const db = getPool();
  if (!initialized) { await db.query(INIT_SQL); initialized = true; }
  const action = req.query.action as string;

  try {
    // GET ?action=project&userId=X&projectType=teacher&year=2026
    if (req.method === 'GET' && action === 'project') {
      const userId = req.query.userId as string;
      const projectType = (req.query.projectType as string) || 'teacher';
      const year = Number(req.query.year) || 2026;
      if (!userId) return res.status(400).json({ message: 'userId 필요' });

      const { rows } = await db.query(
        'SELECT * FROM autobiography_projects WHERE user_id=$1 AND project_type=$2 AND school_year=$3',
        [userId, projectType, year],
      );
      return res.status(200).json(rows[0] || null);
    }

    // POST ?action=create-project — 프로젝트 + 기본 10장 생성
    if (req.method === 'POST' && action === 'create-project') {
      let body: any = req.body;
      if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
      const { userId, projectType = 'teacher', schoolYear = 2026, title } = body;
      if (!userId) return res.status(400).json({ message: 'userId 필요' });

      const { rows: existing } = await db.query(
        'SELECT id FROM autobiography_projects WHERE user_id=$1 AND project_type=$2 AND school_year=$3',
        [userId, projectType, schoolYear],
      );

      let projectId: number;
      if (existing.length > 0) {
        projectId = existing[0].id;
      } else {
        const { rows: created } = await db.query(
          'INSERT INTO autobiography_projects (user_id, project_type, school_year, title) VALUES ($1,$2,$3,$4) RETURNING id',
          [userId, projectType, schoolYear, title || `${schoolYear}년 ${projectType === 'teacher' ? '교사' : '학생'} 자서전`],
        );
        projectId = created[0].id;

        for (const ch of DEFAULT_CHAPTERS) {
          await db.query(
            'INSERT INTO autobiography_chapters (project_id, chapter_order, title, subtitle) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING',
            [projectId, ch.order, ch.title, ch.subtitle],
          );
        }
      }

      const { rows: chapters } = await db.query(
        'SELECT * FROM autobiography_chapters WHERE project_id=$1 ORDER BY chapter_order', [projectId],
      );
      const { rows: project } = await db.query('SELECT * FROM autobiography_projects WHERE id=$1', [projectId]);

      return res.status(200).json({ project: project[0], chapters });
    }

    // GET ?action=chapters&projectId=X
    if (req.method === 'GET' && action === 'chapters') {
      const projectId = req.query.projectId as string;
      if (!projectId) return res.status(400).json({ message: 'projectId 필요' });
      const { rows } = await db.query('SELECT * FROM autobiography_chapters WHERE project_id=$1 ORDER BY chapter_order', [projectId]);
      return res.status(200).json(rows);
    }

    // GET ?action=entries&chapterId=X
    if (req.method === 'GET' && action === 'entries') {
      const chapterId = req.query.chapterId as string;
      if (!chapterId) return res.status(400).json({ message: 'chapterId 필요' });
      const { rows } = await db.query(
        'SELECT * FROM autobiography_chapter_entries WHERE chapter_id=$1 ORDER BY display_order', [chapterId],
      );
      return res.status(200).json(rows);
    }

    // POST ?action=add-entry — 장에 재료 추가
    if (req.method === 'POST' && action === 'add-entry') {
      let body: any = req.body;
      if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
      const { projectId, chapterId, sourceType, sourceId, originalText, currentText, displayOrder, metadata } = body;
      if (!chapterId || !sourceType) return res.status(400).json({ message: 'chapterId, sourceType 필요' });

      const { rows } = await db.query(`
        INSERT INTO autobiography_chapter_entries (project_id, chapter_id, source_type, source_id, original_text, current_text, display_order, metadata)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
      `, [projectId || 0, chapterId, sourceType, sourceId || null, originalText || '', currentText || originalText || '', displayOrder || 0, metadata ? JSON.stringify(metadata) : null]);

      return res.status(200).json(rows[0]);
    }

    // POST ?action=update-entry — 재료 수정
    if (req.method === 'POST' && action === 'update-entry') {
      let body: any = req.body;
      if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
      const { entryId, currentText } = body;
      if (!entryId) return res.status(400).json({ message: 'entryId 필요' });

      const { rows } = await db.query(
        'UPDATE autobiography_chapter_entries SET current_text=$1, is_edited=TRUE, updated_at=NOW() WHERE id=$2 RETURNING *',
        [currentText || '', entryId],
      );
      return res.status(200).json(rows[0] || null);
    }

    // POST ?action=bulk-entries — 장에 재료 일괄 저장
    if (req.method === 'POST' && action === 'bulk-entries') {
      let body: any = req.body;
      if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
      const { projectId, chapterId, entries } = body;
      if (!chapterId || !Array.isArray(entries)) return res.status(400).json({ message: 'chapterId, entries[] 필요' });

      await db.query('DELETE FROM autobiography_chapter_entries WHERE chapter_id=$1', [chapterId]);

      const results = [];
      for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        const { rows } = await db.query(`
          INSERT INTO autobiography_chapter_entries (project_id, chapter_id, source_type, source_id, original_text, current_text, is_edited, display_order, metadata)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *
        `, [projectId || 0, chapterId, e.sourceType || 'manual', e.sourceId || null, e.originalText || '', e.currentText || e.originalText || '', e.isEdited || false, i, e.metadata ? JSON.stringify(e.metadata) : null]);
        results.push(rows[0]);
      }

      await db.query('UPDATE autobiography_chapters SET status=$1, updated_at=NOW() WHERE id=$2',
        [results.length > 0 ? 'partial' : 'empty', chapterId]);

      return res.status(200).json({ saved: results.length });
    }

    // POST ?action=patch-entry — 단일 entry 수정
    if (req.method === 'POST' && action === 'patch-entry') {
      let body: any = req.body;
      if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
      const { entryId, currentText, displayOrder } = body;
      if (!entryId) return res.status(400).json({ message: 'entryId 필요' });

      const sets: string[] = ['updated_at=NOW()'];
      const vals: any[] = [];
      let idx = 1;
      if (currentText !== undefined) { sets.push(`current_text=$${idx}, is_edited=TRUE`); vals.push(currentText); idx++; }
      if (displayOrder !== undefined) { sets.push(`display_order=$${idx}`); vals.push(displayOrder); idx++; }
      vals.push(entryId);

      const { rows } = await db.query(`UPDATE autobiography_chapter_entries SET ${sets.join(', ')} WHERE id=$${idx} RETURNING *`, vals);
      return res.status(200).json(rows[0] || null);
    }

    // POST ?action=delete-entry
    if (req.method === 'POST' && action === 'delete-entry') {
      let body: any = req.body;
      if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
      const { entryId } = body;
      if (!entryId) return res.status(400).json({ message: 'entryId 필요' });
      await db.query('DELETE FROM autobiography_chapter_entries WHERE id=$1', [entryId]);
      return res.status(200).json({ deleted: true });
    }

    // POST ?action=reorder — display_order 일괄 업데이트
    if (req.method === 'POST' && action === 'reorder') {
      let body: any = req.body;
      if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
      const { chapterId, entryIds } = body;
      if (!chapterId || !Array.isArray(entryIds)) return res.status(400).json({ message: 'chapterId, entryIds[] 필요' });

      for (let i = 0; i < entryIds.length; i++) {
        await db.query('UPDATE autobiography_chapter_entries SET display_order=$1, updated_at=NOW() WHERE id=$2 AND chapter_id=$3', [i, entryIds[i], chapterId]);
      }
      return res.status(200).json({ reordered: entryIds.length });
    }

    // GET ?action=load-chapter-entries&chapterId=X — 장 entries + metadata 로드
    if (req.method === 'GET' && action === 'load-chapter-entries') {
      const chapterId = req.query.chapterId as string;
      if (!chapterId) return res.status(400).json({ message: 'chapterId 필요' });
      const { rows } = await db.query(
        'SELECT id, source_type, source_id, original_text, current_text, is_edited, display_order, metadata, updated_at FROM autobiography_chapter_entries WHERE chapter_id=$1 ORDER BY display_order',
        [chapterId],
      );
      return res.status(200).json({ chapterId: Number(chapterId), entries: rows });
    }

    return res.status(405).json({ message: 'Method not allowed or invalid action' });
  } catch (err: any) {
    console.error('autobiography-projects error:', err);
    return res.status(500).json({ message: '처리 중 오류' });
  }
}
