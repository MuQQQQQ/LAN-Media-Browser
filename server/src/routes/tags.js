import express from 'express';
import { db, ensureFile, getTagsTree } from '../db.js';
import { normalizeRelativePath } from '../pathSafety.js';

export const tagsRouter = express.Router();

tagsRouter.get('/', (req, res) => {
    res.json({ tags: getTagsTree() });
});

tagsRouter.post('/', (req, res) => {
    const name = String(req.body.name || '').trim();
    const parentId = req.body.parentId === undefined || req.body.parentId === null || req.body.parentId === '' ? null : Number(req.body.parentId);
    if (!name) return res.status(400).json({ error: 'Tag name is required' });
    if (parentId !== null) {
        const parent = db.prepare('SELECT id FROM tags WHERE id = ? AND parent_id IS NULL').get(parentId);
        if (!parent) return res.status(400).json({ error: 'Level 2 tags must belong to an existing Level 1 tag' });
    }
    const result = db.prepare('INSERT OR IGNORE INTO tags(name, parent_id) VALUES (?, ?)').run(name, parentId);
    const tag = db.prepare('SELECT id, name, parent_id AS parentId FROM tags WHERE name = ? AND parent_id IS ?').get(name, parentId);
    res.status(result.changes ? 201 : 200).json({ tag });
});

tagsRouter.get('/file', (req, res) => {
    const file = ensureFile(normalizeRelativePath(req.query.path || ''));
    const tags = db.prepare(`
        SELECT t.id, t.name, t.parent_id AS parentId
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
    const tx = db.transaction(() => {
        for (const filePath of paths) {
            const file = ensureFile(normalizeRelativePath(filePath));
            for (const tagId of tagIds) insert.run(file.id, tagId);
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