export const mediaUrl = (path) => `/media?path=${encodeURIComponent(path)}`;

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
    tags: () => request('/api/tags'),
    createTag: (payload) => request('/api/tags', { method: 'POST', body: JSON.stringify(payload) }),
    fileTags: (path) => request(`/api/tags/file?path=${encodeURIComponent(path)}`),
    assignTags: (payload) => request('/api/tags/assign', { method: 'POST', body: JSON.stringify(payload) }),
    removeTags: (payload) => request('/api/tags/remove', { method: 'POST', body: JSON.stringify(payload) }),
    search: ({ tags = [], tagMode = 'and', name = '', page = 1, pageSize = 50 }) => {
        const params = new URLSearchParams({ tagMode, name, page, pageSize });
        if (tags.length) params.set('tags', tags.join(','));
        return request(`/api/search?${params}`);
    }
};