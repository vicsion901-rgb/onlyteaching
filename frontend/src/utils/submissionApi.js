import client from '../api/client';

function getUserContext() {
  return {
    teacherId: localStorage.getItem('userId') || localStorage.getItem('user_id') || '',
    classId: localStorage.getItem('qr_class_id') || '',
    studentId: localStorage.getItem('qr_student_id') || null,
    studentName: localStorage.getItem('qr_student_name') || '',
    sessionId: localStorage.getItem('qr_session_code') || '',
  };
}

async function submitActivity({ activityType, sourceType, title, content, metadata, status }) {
  const ctx = getUserContext();
  const payload = {
    teacherId: ctx.teacherId,
    classId: ctx.classId || undefined,
    sessionId: ctx.sessionId || undefined,
    studentId: ctx.studentId || undefined,
    studentName: ctx.studentName || undefined,
    activityType,
    sourceType: sourceType || 'morning',
    title: title || '',
    content: content || '',
    originalText: metadata?.originalText || undefined,
    feeling: metadata?.feeling || undefined,
    accuracy: metadata?.accuracy ?? undefined,
    metadata: metadata || {},
    status: status || 'submitted',
  };

  try {
    const res = await client.post('/api/student-submissions', payload, { params: { action: 'submit' } });
    return { ok: true, data: res.data?.data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function fetchSubmissions({ teacherId, classId, studentId, sourceType, limit }) {
  const params = { action: 'list' };
  if (teacherId) params.teacherId = teacherId;
  if (classId) params.classId = classId;
  if (studentId) params.studentId = studentId;
  if (sourceType) params.sourceType = sourceType;
  if (limit) params.limit = String(limit);

  try {
    const res = await client.get('/api/student-submissions', { params });
    return res.data?.data || [];
  } catch {
    return [];
  }
}

async function fetchSubmissionSummary({ teacherId, classId, studentId }) {
  try {
    const res = await client.get('/api/student-submissions', {
      params: { action: 'summary', teacherId, classId, studentId }
    });
    return res.data?.data || {};
  } catch {
    return {};
  }
}

function saveToLocalCache(activity, storageKey) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
    saved.unshift(activity);
    localStorage.setItem(storageKey, JSON.stringify(saved));
  } catch {}
}

export { submitActivity, fetchSubmissions, fetchSubmissionSummary, saveToLocalCache, getUserContext };
