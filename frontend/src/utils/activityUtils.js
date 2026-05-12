import client from '../api/client';

const ALL_TYPE_LABELS = {
  'poem-copy':            { emoji: '📜', label: '필사' },
  'story-continue':       { emoji: '📖', label: '이어쓰기' },
  'yesterday-diary':      { emoji: '📝', label: '일기' },
  'letter':               { emoji: '💌', label: '편지' },
  'dictation':            { emoji: '🎧', label: '받아쓰기' },
  'review':               { emoji: '🎬', label: '감상문' },
  'keyword-sentence':     { emoji: '🔑', label: '키워드 문장' },
  'free-writing':         { emoji: '✨', label: '자유 글쓰기' },
  'manuscript-copy':      { emoji: '📝', label: '필사' },
  'manuscript-spacing':   { emoji: '↔️', label: '띄어쓰기' },
  'manuscript-typo':      { emoji: '🔍', label: '오탈자' },
  'manuscript-continue':  { emoji: '✍️', label: '이어쓰기' },
};

const BOOK_HINTS = {
  'poem-copy':            { canUseInBook: true,  recommendedBookType: 'poem' },
  'story-continue':       { canUseInBook: true,  recommendedBookType: 'story' },
  'yesterday-diary':      { canUseInBook: true,  recommendedBookType: 'essay' },
  'letter':               { canUseInBook: true,  recommendedBookType: 'essay' },
  'dictation':            { canUseInBook: false, recommendedBookType: null },
  'review':               { canUseInBook: true,  recommendedBookType: 'essay' },
  'keyword-sentence':     { canUseInBook: false, recommendedBookType: null },
  'free-writing':         { canUseInBook: true,  recommendedBookType: 'essay' },
  'manuscript-copy':      { canUseInBook: true,  recommendedBookType: 'poem' },
  'manuscript-spacing':   { canUseInBook: false, recommendedBookType: null },
  'manuscript-typo':      { canUseInBook: false, recommendedBookType: null },
  'manuscript-continue':  { canUseInBook: true,  recommendedBookType: 'story' },
};

const BOOK_TYPE_LABELS = {
  poem:   '시집',
  story:  '이야기책',
  essay:  '에세이집',
  growth: '성장 기록집',
};

function getBadges(activity) {
  const hint = BOOK_HINTS[activity.type];
  if (hint?.canUseInBook && hint.recommendedBookType) {
    return [{ label: `${BOOK_TYPE_LABELS[hint.recommendedBookType]} 추천`, color: 'bg-purple-100 text-purple-700' }];
  }
  if (hint?.canUseInBook) {
    return [{ label: '편찬 가능', color: 'bg-purple-100 text-purple-700' }];
  }
  return [{ label: '연습', color: 'bg-gray-100 text-gray-500' }];
}

function getTypeInfo(activity) {
  return ALL_TYPE_LABELS[activity.type] || { emoji: '📝', label: activity.typeLabel || '글' };
}

function makeActivityKey(a) {
  return `${a.sourceType || 'morning'}:${a.createdAt || ''}:${(a.title || '').slice(0, 30)}`;
}

function generateId() {
  const ts = Date.now().toString(36);
  const r1 = Math.random().toString(36).slice(2, 8);
  const r2 = Math.random().toString(36).slice(2, 6);
  return `${ts}${r1}${r2}`;
}

function buildActivityMap(activities) {
  const map = new Map();
  activities.forEach(a => { if (a._id) map.set(a._id, a); });
  return map;
}

function normalizeManuscriptRecord(r) {
  const type = `manuscript-${r.mode}`;
  const hint = BOOK_HINTS[type] || {};
  const info = ALL_TYPE_LABELS[type] || {};
  const record = {
    type,
    typeLabel: info.label || r.mode,
    title: r.title || `${r.mode} - ${r.contentTitle || ''}`,
    content: r.userText || '',
    status: 'submitted',
    createdAt: r.completedAt,
    accuracy: r.accuracy,
    sourceType: 'manuscript',
    contentId: r.contentId,
    author: r.author,
    difficulty: r.difficulty,
    canUseInBook: hint.canUseInBook || false,
    recommendedBookType: hint.recommendedBookType || null,
    favorited: r.favorited || false,
    memo: r.memo || '',
  };
  record._id = r._id || makeActivityKey(record);
  return record;
}

function normalizeMorningRecord(a) {
  const hint = BOOK_HINTS[a.type] || {};
  const record = {
    ...a,
    sourceType: 'morning',
    canUseInBook: hint.canUseInBook || false,
    recommendedBookType: hint.recommendedBookType || null,
    favorited: a.favorited || false,
    memo: a.memo || '',
  };
  record._id = a._id || makeActivityKey(record);
  return record;
}

function getAllActivities() {
  const morning = JSON.parse(localStorage.getItem('morning_activities') || '[]').map(normalizeMorningRecord);
  const manuscript = JSON.parse(localStorage.getItem('manuscript_activities') || '[]').map(normalizeManuscriptRecord);
  const merged = [...morning, ...manuscript];
  merged.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return merged;
}

async function fetchAllActivitiesFromServer() {
  const userId = localStorage.getItem('userId') || localStorage.getItem('user_id');
  if (!userId) return getAllActivities();

  const params = { action: 'list', teacherId: userId, limit: '200' };
  const studentName = localStorage.getItem('qr_student_name');
  const studentId = localStorage.getItem('qr_student_id');
  if (studentId) params.studentId = studentId;

  try {
    const res = await client.get('/api/student-submissions', { params });
    let serverRows = (res.data?.data || []).map(r => {
      const hint = BOOK_HINTS[r.activity_type] || {};
      return {
        _id: r.id,
        type: r.activity_type,
        typeLabel: (ALL_TYPE_LABELS[r.activity_type] || {}).label || r.activity_type,
        title: r.title || '',
        content: r.content || '',
        status: r.status || 'submitted',
        createdAt: r.submitted_at || r.created_at,
        accuracy: r.accuracy,
        sourceType: r.source_type || 'morning',
        feeling: r.feeling || '',
        sessionId: r.session_id || null,
        originalText: r.original_text || '',
        studentName: r.student_name || '',
        canUseInBook: hint.canUseInBook || false,
        recommendedBookType: hint.recommendedBookType || null,
        favorited: false,
        memo: '',
      };
    });
    if (studentName && !studentId) {
      serverRows = serverRows.filter(r => !r.studentName || r.studentName === studentName);
    }
    if (serverRows.length > 0) return serverRows;
    return getAllActivities();
  } catch {
    return getAllActivities();
  }
}

function getBookableActivities(bookTypeId) {
  return getAllActivities().filter(a => {
    if (a.status !== 'submitted' && a.sourceType !== 'manuscript') return false;
    if (!a.canUseInBook) return false;
    if (bookTypeId && bookTypeId !== 'growth' && a.recommendedBookType !== bookTypeId) return false;
    return true;
  });
}

let metadataCache = null;
let metadataCacheTime = 0;

async function fetchMetadata() {
  const userId = localStorage.getItem('userId') || localStorage.getItem('user_id');
  if (!userId) return {};
  const cacheAge = Date.now() - metadataCacheTime;
  if (metadataCache && cacheAge < 30000) return metadataCache;

  try {
    const res = await client.get('/api/activity-metadata', { params: { action: 'list', userId } });
    const map = {};
    (res.data?.data || []).forEach(row => {
      map[row.activity_key] = { favorited: row.is_favorited, memo: row.memo || '' };
    });
    metadataCache = map;
    metadataCacheTime = Date.now();
    return map;
  } catch {
    return {};
  }
}

function invalidateMetadataCache() {
  metadataCache = null;
  metadataCacheTime = 0;
}

async function getAllActivitiesWithMeta() {
  const activities = getAllActivities();
  const meta = await fetchMetadata();
  return activities.map(a => {
    const key = makeActivityKey(a);
    const m = meta[key];
    if (m) {
      return { ...a, favorited: m.favorited, memo: m.memo, _activityKey: key };
    }
    return { ...a, _activityKey: key };
  });
}

async function saveMetadataToServer(activity, updates) {
  const userId = localStorage.getItem('userId') || localStorage.getItem('user_id');
  if (!userId) return;
  const key = activity._activityKey || makeActivityKey(activity);
  try {
    await client.post('/api/activity-metadata', {
      action: 'upsert',
      userId,
      activityKey: key,
      sourceType: activity.sourceType,
      isFavorited: updates.favorited,
      memo: updates.memo,
    }, { params: { action: 'upsert' } });
    invalidateMetadataCache();
  } catch {}
}

async function toggleFavoriteOnServer(activity) {
  const userId = localStorage.getItem('userId') || localStorage.getItem('user_id');
  if (!userId) return;
  const key = activity._activityKey || makeActivityKey(activity);
  try {
    await client.post('/api/activity-metadata', {
      userId,
      activityKey: key,
      sourceType: activity.sourceType,
    }, { params: { action: 'toggle-favorite' } });
    invalidateMetadataCache();
  } catch {}
}

export {
  ALL_TYPE_LABELS,
  BOOK_HINTS,
  BOOK_TYPE_LABELS,
  getBadges,
  getTypeInfo,
  makeActivityKey,
  getAllActivities,
  fetchAllActivitiesFromServer,
  getBookableActivities,
  generateId,
  buildActivityMap,
  normalizeManuscriptRecord,
  fetchMetadata,
  invalidateMetadataCache,
  getAllActivitiesWithMeta,
  saveMetadataToServer,
  toggleFavoriteOnServer,
};
