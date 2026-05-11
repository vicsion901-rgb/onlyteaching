import client from '../api/client';

function getUserId() {
  return localStorage.getItem('userId') || localStorage.getItem('user_id') || '';
}

async function fetchCollections() {
  const userId = getUserId();
  if (!userId) return getLocalCollections();
  try {
    const res = await client.get('/api/creative-collections', { params: { action: 'list', userId } });
    const serverData = res.data?.data || [];
    const normalized = serverData.map(c => ({
      id: c.id,
      title: c.title,
      description: c.description || '',
      collectionType: c.collection_type || 'general',
      itemIds: c.item_ids || [],
      items: typeof c.items === 'string' ? JSON.parse(c.items) : (c.items || []),
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    }));
    localStorage.setItem('creative_collections', JSON.stringify(normalized));
    return normalized;
  } catch {
    return getLocalCollections();
  }
}

async function fetchCollectionById(id) {
  try {
    const res = await client.get('/api/creative-collections', { params: { action: 'get', id } });
    const c = res.data?.data;
    if (!c) return null;
    return {
      id: c.id,
      title: c.title,
      items: typeof c.items === 'string' ? JSON.parse(c.items) : (c.items || []),
      itemIds: c.item_ids || [],
      createdAt: c.created_at,
    };
  } catch {
    const local = getLocalCollections();
    return local.find(c => c.id === id) || null;
  }
}

async function createCollection({ title, description, items }) {
  const userId = getUserId();
  const itemIds = items.map(a => a._id).filter(Boolean);

  if (userId) {
    try {
      const res = await client.post('/api/creative-collections', {
        userId,
        title,
        description: description || '',
        itemIds,
        items,
      }, { params: { action: 'create' } });
      const c = res.data?.data;
      const result = {
        id: c.id,
        title: c.title,
        items: typeof c.items === 'string' ? JSON.parse(c.items) : (c.items || []),
        itemIds: c.item_ids || [],
        createdAt: c.created_at,
      };
      syncToLocal(result);
      return result;
    } catch {}
  }

  const localCollection = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    title,
    items,
    itemIds,
    createdAt: new Date().toISOString(),
  };
  syncToLocal(localCollection);
  return localCollection;
}

async function deleteCollection(id) {
  try {
    await client.delete('/api/creative-collections', { params: { action: 'delete', id } });
  } catch {}
  const local = getLocalCollections().filter(c => c.id !== id);
  localStorage.setItem('creative_collections', JSON.stringify(local));
}

function getLocalCollections() {
  try {
    return JSON.parse(localStorage.getItem('creative_collections') || '[]');
  } catch {
    return [];
  }
}

function syncToLocal(collection) {
  const local = getLocalCollections();
  const idx = local.findIndex(c => c.id === collection.id);
  if (idx !== -1) local[idx] = collection;
  else local.unshift(collection);
  localStorage.setItem('creative_collections', JSON.stringify(local));
}

export { fetchCollections, fetchCollectionById, createCollection, deleteCollection, getLocalCollections };
