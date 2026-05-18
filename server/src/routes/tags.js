import express from 'express';
import { db, ensureItem, getItemTags, getTagsTree } from '../db.js';
import { normalizeRelativePath } from '../pathSafety.js';

export const tagsRouter = express.Router();

tagsRouter.get('/', (req, res) => {
    res.json({ tags: getTagsTree(req.query.sort) });
});

function normalizeColor(value) {
    const color = String(value || '').trim();
    return /^#[0-9a-fA-F]{6}$/.test(color) ? color.toLowerCase() : null;
}

function defaultTagColor(name, parentId) {
    const input = `${parentId || 'root'}:${name}`;

    let hash = 2166136261; // 32位初始偏移量
    for (let i = 0; i < input.length; i++) {
        hash ^= input.charCodeAt(i);
        hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }

    const uHash = hash >>> 0;
    const hue = uHash % 360;
    const saturation = 50 + (uHash % 40);
    const lightness = 60 + ((uHash >> 4) % 30);

    return hslToHex(hue, saturation, lightness);
}

function hslToHex(h, s, l) {
    s /= 100;
    l /= 100;
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return `#${[f(0), f(8), f(4)].map((x) => Math.round(255 * x).toString(16).padStart(2, '0')).join('')}`;
}

tagsRouter.post('/', (req, res) => {
    const name = String(req.body.name || '').trim();
    const parentId = req.body.parentId === undefined || req.body.parentId === null || req.body.parentId === '' ? null : Number(req.body.parentId);
    if (!name) return res.status(400).json({ error: 'Tag name is required' });
    if (parentId !== null) {
        const parent = db.prepare('SELECT id FROM tags WHERE id = ? AND parent_id IS NULL').get(parentId);
        if (!parent) return res.status(400).json({ error: 'Level 2 tags must belong to an existing Level 1 tag' });
    }
    const color = normalizeColor(req.body.color) || defaultTagColor(name, parentId);
    const result = db.prepare('INSERT OR IGNORE INTO tags(name, parent_id, created_at, color) VALUES (?, ?, CURRENT_TIMESTAMP, ?)').run(name, parentId, color);
    const tag = db.prepare('SELECT id, name, parent_id AS parentId, created_at AS createdAt, last_used_at AS lastUsedAt, color FROM tags WHERE name = ? AND parent_id IS ?').get(name, parentId);
    res.status(result.changes ? 201 : 200).json({ tag });
});

tagsRouter.put('/:id', (req, res) => {
    const id = Number(req.params.id);
    const name = String(req.body.name || '').trim();
    const parentId = req.body.parentId === undefined || req.body.parentId === null || req.body.parentId === '' ? null : Number(req.body.parentId);
    if (!id || !name) return res.status(400).json({ error: 'Tag id and name are required' });
    if (parentId !== null) {
        const parent = db.prepare('SELECT id FROM tags WHERE id = ? AND parent_id IS NULL').get(parentId);
        if (!parent || parent.id === id) return res.status(400).json({ error: 'Invalid parent category' });
    }
    const current = db.prepare('SELECT color FROM tags WHERE id = ?').get(id);
    const color = normalizeColor(req.body.color) || current?.color || defaultTagColor(name, parentId);
    db.prepare('UPDATE tags SET name = ?, parent_id = ?, color = ? WHERE id = ?').run(name, parentId, color, id);
    const tag = db.prepare('SELECT id, name, parent_id AS parentId, created_at AS createdAt, last_used_at AS lastUsedAt, color FROM tags WHERE id = ?').get(id);
    res.json({ tag });
});

tagsRouter.delete('/:id', (req, res) => {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Tag id is required' });
    db.prepare('DELETE FROM tags WHERE id = ?').run(id);
    res.json({ ok: true });
});

tagsRouter.get('/file', (req, res) => {
    const itemType = String(req.query.type || 'file') === 'folder' ? 'folder' : 'file';
    const file = ensureItem(normalizeRelativePath(req.query.path || ''), itemType);
    const tags = getItemTags(file.id);
    res.json({ file, tags });
});

tagsRouter.post('/analysis', (req, res) => {
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    const normalized = items.map((item) => ensureItem(normalizeRelativePath(item.path || ''), item.type === 'folder' ? 'folder' : 'file'));
    if (!normalized.length) return res.json({ common: [], partial: [] });
    const placeholders = normalized.map(() => '?').join(',');
    const rows = db.prepare(`
        SELECT t.id, t.name, t.parent_id AS parentId, t.created_at AS createdAt, t.last_used_at AS lastUsedAt, t.color, COUNT(DISTINCT ft.file_id) AS count
        FROM tags t
        JOIN file_tags ft ON ft.tag_id = t.id
        WHERE ft.file_id IN (${placeholders})
        GROUP BY t.id
        ORDER BY t.name COLLATE NOCASE
    `).all(...normalized.map((item) => item.id));
    res.json({
        common: rows.filter((tag) => tag.count === normalized.length),
        partial: rows.filter((tag) => tag.count > 0 && tag.count < normalized.length)
    });
});

tagsRouter.post('/assign', (req, res) => {
    const paths = Array.isArray(req.body.paths) ? req.body.paths : [];
    const tagIds = Array.isArray(req.body.tagIds) ? req.body.tagIds.map(Number).filter(Boolean) : [];
    const insert = db.prepare('INSERT OR IGNORE INTO file_tags(file_id, tag_id) VALUES (?, ?)');
    const touch = db.prepare('UPDATE tags SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?');
    const tx = db.transaction(() => {
        for (const filePath of paths) {
            const file = ensureItem(normalizeRelativePath(typeof filePath === 'string' ? filePath : filePath.path), filePath?.type === 'folder' ? 'folder' : 'file');
            for (const tagId of tagIds) {
                insert.run(file.id, tagId);
                touch.run(tagId);
            }
        }
    });
    tx();
    res.json({ ok: true });
});

tagsRouter.post('/remove', (req, res) => {
    const paths = Array.isArray(req.body.paths) ? req.body.paths : [];
    const tagIds = Array.isArray(req.body.tagIds) ? req.body.tagIds.map(Number).filter(Boolean) : [];
    const remove = db.prepare('DELETE FROM file_tags WHERE file_id = ? AND tag_id = ?');
    const tx = db.transaction(() => {
        for (const filePath of paths) {
            const file = ensureItem(normalizeRelativePath(typeof filePath === 'string' ? filePath : filePath.path), filePath?.type === 'folder' ? 'folder' : 'file');
            for (const tagId of tagIds) remove.run(file.id, tagId);
        }
    });
    tx();
    res.json({ ok: true });
});