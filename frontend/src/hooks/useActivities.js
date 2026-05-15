import { useSyncExternalStore } from 'react';
import { getAllActivities, fetchAllActivitiesFromServer } from '../utils/activityUtils';

let store = {
  data: null,
  serverDone: false,
  listeners: new Set(),
};

function initFromLocal() {
  const local = getAllActivities();
  if (local.length > 0) {
    store.data = local;
  }
}

initFromLocal();

let fetchPromise = null;

function notify() {
  store.listeners.forEach(fn => fn());
}

function ensureFetched() {
  if (fetchPromise) return;
  fetchPromise = fetchAllActivitiesFromServer()
    .then(data => {
      store = { data: data.length > 0 ? data : (store.data ?? []), serverDone: true, listeners: store.listeners };
      notify();
    })
    .catch(() => {
      store = { data: store.data ?? [], serverDone: true, listeners: store.listeners };
      notify();
    });
}

ensureFetched();

function subscribe(listener) {
  store.listeners.add(listener);
  return () => store.listeners.delete(listener);
}

function getSnapshot() {
  return store;
}

export default function useActivities() {
  const snap = useSyncExternalStore(subscribe, getSnapshot);

  const hasLocalData = snap.data !== null && snap.data.length > 0;
  const isLoading = !hasLocalData && !snap.serverDone;

  return { activities: snap.data ?? [], isLoading, serverLoaded: snap.serverDone };
}
