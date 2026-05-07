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
CREATE INDEX IF NOT EXISTS idx_digest_jobs_user ON digest_jobs(user_id, target_date);
`;

let initialized = false;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const _origin = req.headers?.origin || ""; const _allowed = ["https://www.onlyteaching.kr","https://onlyteaching.kr","http://localhost:5173","http://localhost:3000"].includes(_origin) ? _origin : "https://www.onlyteaching.kr"; res.setHeader("Access-Control-Allow-Origin", _allowed); res.setHeader("Access-Control-Allow-Credentials", "true"); res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS"); res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization"); if (req.method === "OPTIONS") return res.status(204).end();

  const db = getPool();
  if (!initialized) { await db.query(INIT_SQL); initialized = true; }
  const action = req.query.action as string;

  try {
    // POST ?action=enqueue — job 등록
    if (req.method === 'POST' && action === 'enqueue') {
      let body: any = req.body;
      if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
      const { userId, sourceType, sourceId, targetDate } = body;
      if (!userId || !sourceType || !targetDate) return res.status(400).json({ message: 'userId, sourceType, targetDate 필요' });

      const { rows } = await db.query(`
        INSERT INTO digest_jobs (user_id, source_type, source_id, target_date)
        VALUES ($1,$2,$3,$4) RETURNING *
      `, [userId, sourceType, sourceId || null, targetDate]);
      return res.status(200).json(rows[0]);
    }

    // GET ?action=pending — 대기 중 job 조회
    if (req.method === 'GET' && action === 'pending') {
      const limit = Number(req.query.limit) || 10;
      const { rows } = await db.query(
        "SELECT * FROM digest_jobs WHERE status IN ('pending','failed') AND attempts < 3 ORDER BY created_at ASC LIMIT $1", [limit],
      );
      return res.status(200).json(rows);
    }

    // POST ?action=run — pending job 하나 실행
    if (req.method === 'POST' && action === 'run') {
      let body: any = req.body;
      if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
      const { jobId } = body;
      if (!jobId) return res.status(400).json({ message: 'jobId 필요' });

      await db.query("UPDATE digest_jobs SET status='running', started_at=NOW(), attempts=attempts+1 WHERE id=$1", [jobId]);

      const { rows: jobs } = await db.query('SELECT * FROM digest_jobs WHERE id=$1', [jobId]);
      if (jobs.length === 0) return res.status(404).json({ message: 'job not found' });
      const job = jobs[0];

      try {
        if (job.source_type === 'care') {
          const { rows: records } = await db.query(
            'SELECT computed_emotion_label, key_scene, emotion_reason_tags FROM care_classroom_records WHERE user_id=$1 AND record_date=$2',
            [job.user_id, job.target_date],
          );
          if (records.length > 0) {
            const r = records[0];
            await db.query(`
              INSERT INTO daily_digests (user_id, digest_date, source_type, summary_lines, tags, emotion_hints, digest_status, source_updated_at, updated_at)
              VALUES ($1,$2,'care',$3,$4,$5,'fresh',NOW(),NOW())
              ON CONFLICT (user_id, digest_date, source_type)
              DO UPDATE SET summary_lines=$3, tags=$4, emotion_hints=$5, digest_status='fresh', source_updated_at=NOW(), updated_at=NOW()
            `, [job.user_id, job.target_date, [r.computed_emotion_label, r.key_scene?.slice(0, 50)].filter(Boolean), r.emotion_reason_tags || [], [r.computed_emotion_label].filter(Boolean)]);
          }
        } else if (job.source_type === 'schedule') {
          const { rows: events } = await db.query(
            'SELECT title FROM schedules WHERE "userId"=$1 AND date=$2', [job.user_id, job.target_date],
          );
          if (events.length > 0) {
            await db.query(`
              INSERT INTO daily_digests (user_id, digest_date, source_type, summary_lines, tags, digest_status, source_updated_at, updated_at)
              VALUES ($1,$2,'schedule',$3,$4,'fresh',NOW(),NOW())
              ON CONFLICT (user_id, digest_date, source_type)
              DO UPDATE SET summary_lines=$3, tags=$4, digest_status='fresh', source_updated_at=NOW(), updated_at=NOW()
            `, [job.user_id, job.target_date, events.map(e => e.title).slice(0, 5), events.length > 2 ? ['바쁜 일정'] : ['일정 있음']]);
          }
        } else if (job.source_type === 'meal') {
          const { rows: meals } = await db.query(
            'SELECT caption FROM meals WHERE "mealDate"=$1 LIMIT 1', [job.target_date],
          );
          if (meals.length > 0) {
            await db.query(`
              INSERT INTO daily_digests (user_id, digest_date, source_type, summary_lines, tags, digest_status, source_updated_at, updated_at)
              VALUES ($1,$2,'meal',$3,$4,'fresh',NOW(),NOW())
              ON CONFLICT (user_id, digest_date, source_type)
              DO UPDATE SET summary_lines=$3, tags=$4, digest_status='fresh', source_updated_at=NOW(), updated_at=NOW()
            `, [job.user_id, job.target_date, [meals[0].caption || '급식'].slice(0, 3), ['생활장면']]);
          }
        }

        await db.query("UPDATE digest_jobs SET status='done', finished_at=NOW() WHERE id=$1", [jobId]);
        return res.status(200).json({ status: 'done' });
      } catch (err: any) {
        await db.query("UPDATE digest_jobs SET status='failed', last_error=$1 WHERE id=$2", [err.message?.slice(0, 200), jobId]);
        return res.status(500).json({ status: 'failed', error: err.message });
      }
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (err: any) {
    console.error('digest-jobs error:', err);
    return res.status(500).json({ message: '처리 중 오류' });
  }
}
