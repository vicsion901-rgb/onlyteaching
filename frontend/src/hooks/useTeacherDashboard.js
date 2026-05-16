import { useSyncExternalStore, useEffect } from 'react';
import client from '../api/client';

const CACHE_KEY = (id) => `teacher_dashboard_${id}`;

let store = { teacherId: null, data: null, serverDone: false, listeners: new Set() };
let fetchPromise = null;

function notify() { store.listeners.forEach(fn => fn()); }

function readCache(id) {
  try {
    const raw = localStorage.getItem(CACHE_KEY(id));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function writeCache(id, data) {
  try { localStorage.setItem(CACHE_KEY(id), JSON.stringify(data)); } catch {}
}

function ensureFetched(teacherId) {
  if (!teacherId) return;
  if (store.teacherId !== teacherId) {
    const cached = readCache(teacherId);
    store = { teacherId, data: cached, serverDone: false, listeners: store.listeners };
    fetchPromise = null;
    notify();
  }
  if (fetchPromise) return;
  fetchPromise = Promise.all([
    client.get('/api/student-submissions', { params: { action: 'list', teacherId, limit: '500' } }).then(r => r.data?.data || []).catch(() => []),
    client.get('/api/students', { params: { userId: teacherId } }).then(r => r.data || []).catch(() => []),
    client.get('/api/qr-session', { params: { action: 'my-sessions', teacherId } }).then(r => r.data?.data || []).catch(() => []),
  ]).then(([submissions, students, qrSessions]) => {
    const data = { submissions, students, qrSessions };
    writeCache(teacherId, data);
    store = { teacherId, data, serverDone: true, listeners: store.listeners };
    notify();
  }).catch(() => {
    store = { ...store, serverDone: true };
    notify();
  });
}

if (typeof localStorage !== 'undefined') {
  const id = localStorage.getItem('userId');
  if (id) ensureFetched(id);
}

function subscribe(listener) { store.listeners.add(listener); return () => store.listeners.delete(listener); }
function getSnapshot() { return store; }

export default function useTeacherDashboard(teacherId) {
  const snap = useSyncExternalStore(subscribe, getSnapshot);
  useEffect(() => { if (teacherId) ensureFetched(teacherId); }, [teacherId]);
  return {
    submissions: snap.data?.submissions ?? [],
    students: snap.data?.students ?? [],
    qrSessions: snap.data?.qrSessions ?? [],
    ready: snap.data !== null,
    serverLoaded: snap.serverDone,
  };
}
