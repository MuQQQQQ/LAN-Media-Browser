export const mediaUrl = (path) => `/media?path=${encodeURIComponent(path)}`;
export const thumbnailUrl = (file) => `/api/thumbnail/${file.type}?path=${encodeURIComponent(file.path)}`;
export const browseUrl = (path, pageSize) => `/?${new URLSearchParams({ path, page: 1, ...(pageSize ? { pageSize } : {}) })}`;

async function request(path, options) {
    const response = await fetch(path, {
        headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
        ...options
    });
    if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || response.statusText);
    }
    return response.json();
}

export const api = {
    browse: ({ path = '', page = 1, pageSize = 50, sortBy = 'name', sortDir = 'asc' }) => request(`/api/browse?path=${encodeURIComponent(path)}&page=${page}&pageSize=${pageSize}&sortBy=${encodeURIComponent(sortBy)}&sortDir=${encodeURIComponent(sortDir)}`),
    tags: (sort = 'alphabetical') => request(`/api/tags?sort=${encodeURIComponent(sort)}`),
    createTag: (payload) => request('/api/tags', { method: 'POST', body: JSON.stringify(payload) }),
    updateTag: (id, payload) => request(`/api/tags/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    deleteTag: (id) => request(`/api/tags/${id}`, { method: 'DELETE' }),
    removeFile: (path, type = 'file') => request(`/api/files?path=${encodeURIComponent(path)}&type=${encodeURIComponent(type)}`, { method: 'DELETE' }),
    deleteItems: (items) => request('/api/files/delete', { method: 'POST', body: JSON.stringify({ items }) }),
    moveItems: (payload) => request('/api/files/move', { method: 'POST', body: JSON.stringify(payload) }),
    copyItems: (payload) => request('/api/files/copy', { method: 'POST', body: JSON.stringify(payload) }),
    orphanRecords: () => request('/api/files/orphans'),
    cleanupOrphans: () => request('/api/files/orphans/cleanup', { method: 'POST', body: JSON.stringify({}) }),
    fileTags: (path, type = 'file') => request(`/api/tags/file?path=${encodeURIComponent(path)}&type=${encodeURIComponent(type)}`),
    assignTags: (payload) => request('/api/tags/assign', { method: 'POST', body: JSON.stringify(payload) }),
    removeTags: (payload) => request('/api/tags/remove', { method: 'POST', body: JSON.stringify(payload) }),
    tagAnalysis: (items) => request('/api/tags/analysis', { method: 'POST', body: JSON.stringify({ items }) }),
    favorites: ({ sort = 'time', type = 'all' } = {}) => request(`/api/favorites?sort=${encodeURIComponent(sort)}&type=${encodeURIComponent(type)}`),
    addFavorite: (item) => request('/api/favorites', { method: 'POST', body: JSON.stringify(item) }),
    removeFavorite: (item) => request(`/api/favorites?path=${encodeURIComponent(item.path)}&type=${encodeURIComponent(item.type === 'folder' ? 'folder' : 'file')}`, { method: 'DELETE' }),
    search: ({ tags = [], tagMode = 'and', q = '', name = '', matchType = 'contains', scope = 'both', caseSensitive = false, itemType = 'all', pathFilter = '', dateFrom = '', dateTo = '', page = 1, pageSize = 50, sortBy = 'name', sortDir = 'asc' }) => {
        const params = new URLSearchParams({ tagMode, q: q || name, matchType, scope, caseSensitive, itemType, pathFilter, dateFrom, dateTo, page, pageSize, sortBy, sortDir });
        if (tags.length) params.set('tags', tags.join(','));
        return request(`/api/search?${params}`);
    }
};