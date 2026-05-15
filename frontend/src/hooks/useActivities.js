import { useState, useEffect, useRef } from 'react';
import { getAllActivities, fetchAllActivitiesFromServer } from '../utils/activityUtils';

let sharedCache = null;
let sharedCacheTime = 0;
const CACHE_TTL = 30_000;

export default function useActivities() {
  const [activities, setActivities] = useState(() => {
    if (sharedCache && Date.now() - sharedCacheTime < CACHE_TTL) return sharedCache;
    const local = getAllActivities();
    return local.length > 0 ? local : null;
  });
  const [serverLoaded, setServerLoaded] = useState(() => {
    return !!(sharedCache && Date.now() - sharedCacheTime < CACHE_TTL);
  });
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    if (sharedCache && Date.now() - sharedCacheTime < CACHE_TTL) {
      setActivities(sharedCache);
      setServerLoaded(true);
      return;
    }
    fetchAllActivitiesFromServer()
      .then(data => {
        if (!mounted.current) return;
        sharedCache = data;
        sharedCacheTime = Date.now();
        setActivities(data);
        setServerLoaded(true);
      })
      .catch(() => {
        if (!mounted.current) return;
        const local = getAllActivities();
        setActivities(local);
        setServerLoaded(true);
      });
    return () => { mounted.current = false; };
  }, []);

  const isLoading = activities === null;

  return { activities: activities ?? [], isLoading, serverLoaded };
}
