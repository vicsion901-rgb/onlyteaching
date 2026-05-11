// @ts-ignore
import type { VercelRequest, VercelResponse } from '@vercel/node';
// @ts-ignore
import { Pool } from 'pg';

let pool: Pool | null = null;
function getPool(): Pool {
  if (!pool) { pool = new Pool({ connectionString: process.env.POSTGRES_URL, ssl: { rejectUnauthorized: false }, max: 3, connectionTimeoutMillis: 5000 }); }
  return pool;
}

function cors(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin || '';
  const allowed = ['https://www.onlyteaching.kr', 'http://localhost:5173', 'http://localhost:5174'];
  if (allowed.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const db = getPool();
    const { action } = req.query;

    if (req.method === 'GET' && action === 'list') {
      const userId = req.query.userId as string;
      if (!userId) return res.status(400).json({ error: 'userId required' });
      const { rows } = await db.query(
        'SELECT * FROM creative_collections WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
      );
      return res.json({ data: rows });
    }

    if (req.method === 'GET' && action === 'get') {
      const id = req.query.id as string;
      if (!id) return res.status(400).json({ error: 'id required' });
      const { rows } = await db.query('SELECT * FROM creative_collections WHERE id = $1', [id]);
      if (rows.length === 0) return res.status(404).json({ error: 'not found' });
      return res.json({ data: rows[0] });
    }

    if (req.method === 'POST' && action === 'create') {
      const { userId, title, description, collectionType, itemIds, items } = req.body;
      if (!userId || !title) return res.status(400).json({ error: 'userId, title required' });
      const id = genId();
      const { rows } = await db.query(
        `INSERT INTO creative_collections (id, user_id, title, description, collection_type, item_ids, items)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [id, userId, title, description || '', collectionType || 'general', itemIds || [], JSON.stringify(items || [])]
      );
      return res.json({ data: rows[0] });
    }

    if (req.method === 'PATCH' && action === 'update') {
      const { id, title, description, itemIds, items } = req.body;
      if (!id) return res.status(400).json({ error: 'id required' });
      const sets: string[] = [];
      const vals: any[] = [];
      let idx = 1;
      if (title !== undefined) { sets.push(`title = $${idx++}`); vals.push(title); }
      if (description !== undefined) { sets.push(`description = $${idx++}`); vals.push(description); }
      if (itemIds !== undefined) { sets.push(`item_ids = $${idx++}`); vals.push(itemIds); }
      if (items !== undefined) { sets.push(`items = $${idx++}`); vals.push(JSON.stringify(items)); }
      sets.push(`updated_at = NOW()`);
      vals.push(id);
      const { rows } = await db.query(
        `UPDATE creative_collections SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
        vals
      );
      if (rows.length === 0) return res.status(404).json({ error: 'not found' });
      return res.json({ data: rows[0] });
    }

    if (req.method === 'DELETE' && action === 'delete') {
      const id = (req.query.id || req.body?.id) as string;
      if (!id) return res.status(400).json({ error: 'id required' });
      await db.query('DELETE FROM creative_collections WHERE id = $1', [id]);
      return res.json({ ok: true });
    }

    return res.status(400).json({ error: 'unknown action' });
  } catch (err: any) {
    cors(req, res);
    return res.status(500).json({ error: err.message });
  }
}
