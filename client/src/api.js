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
    browse: ({ path = '', page = 1, pageSize = 50 }) => request(`/api/browse?path=${encodeURIComponent(path)}&page=${page}&pageSize=${pageSize}`),
    tags: (sort = 'alphabetical') => request(`/api/tags?sort=${encodeURIComponent(sort)}`),
    createTag: (payload) => request('/api/tags', { method: 'POST', body: JSON.stringify(payload) }),
    updateTag: (id, payload) => request(`/api/tags/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    deleteTag: (id) => request(`/api/tags/${id}`, { method: 'DELETE' }),
    removeFile: (path) => request(`/api/files?path=${encodeURIComponent(path)}`, { method: 'DELETE' }),
    fileTags: (path) => request(`/api/tags/file?path=${encodeURIComponent(path)}`),
    assignTags: (payload) => request('/api/tags/assign', { method: 'POST', body: JSON.stringify(payload) }),
    removeTags: (payload) => request('/api/tags/remove', { method: 'POST', body: JSON.stringify(payload) }),
    search: ({ tags = [], tagMode = 'and', name = '', page = 1, pageSize = 50 }) => {
        const params = new URLSearchParams({ tagMode, name, page, pageSize });
        if (tags.length) params.set('tags', tags.join(','));
        return request(`/api/search?${params}`);
    }
};