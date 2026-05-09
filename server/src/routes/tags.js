import express from 'express';
import { db, ensureFile, getTagsTree } from '../db.js';
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
    let hash = 0;
    for (let i = 0; i < input.length; i += 1) hash = input.charCodeAt(i) + ((hash << 5) - hash);
    const hue = Math.abs(hash) % 360;
    return hslToHex(hue, 62, 48);
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
    const file = ensureFile(normalizeRelativePath(req.query.path || ''));
    const tags = db.prepare(`
        SELECT t.id, t.name, t.parent_id AS parentId, t.created_at AS createdAt, t.last_used_at AS lastUsedAt, t.color
        FROM tags t JOIN file_tags ft ON ft.tag_id = t.id
        WHERE ft.file_id = ?
        ORDER BY t.name COLLATE NOCASE
    `).all(file.id);
    res.json({ file, tags });
});

tagsRouter.post('/assign', (req, res) => {
    const paths = Array.isArray(req.body.paths) ? req.body.paths : [];
    const tagIds = Array.isArray(req.body.tagIds) ? req.body.tagIds.map(Number).filter(Boolean) : [];
    const insert = db.prepare('INSERT OR IGNORE INTO file_tags(file_id, tag_id) VALUES (?, ?)');
    const touch = db.prepare('UPDATE tags SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?');
    const tx = db.transaction(() => {
        for (const filePath of paths) {
            const file = ensureFile(normalizeRelativePath(filePath));
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
            const file = ensureFile(normalizeRelativePath(filePath));
            for (const tagId of tagIds) remove.run(file.id, tagId);
        }
    });
    tx();
    res.json({ ok: true });
});