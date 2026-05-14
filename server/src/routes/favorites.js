import express from 'express';
import fs from 'fs';
import path from 'path';
import { config } from '../config.js';
import { db, decorateItems, ensureItem } from '../db.js';
import { getMediaType } from '../mediaTypes.js';
import { normalizeRelativePath } from '../pathSafety.js';

export const favoritesRouter = express.Router();

function toResult(row) {
    return {
        id: row.itemId,
        favoriteId: row.id,
        path: row.path,
        name: path.posix.basename(row.path) || 'Base',
        type: row.itemType === 'folder' ? 'folder' : getMediaType(path.posix.extname(row.path)) || 'file',
        favorite: true,
        favoriteCreatedAt: row.createdAt
    };
}

favoritesRouter.get('/', (req, res, next) => {
    try {
        const sort = String(req.query.sort || 'time');
        const type = String(req.query.type || 'all');
        const where = type === 'file' || type === 'folder' ? 'WHERE fav.item_type = ?' : '';
        const params = where ? [type] : [];
        const orderBy = sort === 'name' ? 'f.name COLLATE NOCASE ASC' : 'fav.created_at DESC';
        const rows = db.prepare(`
            SELECT fav.id, fav.item_id AS itemId, fav.item_type AS itemType, fav.path, fav.created_at AS createdAt
            FROM favorites fav
            JOIN files f ON f.id = fav.item_id
            ${where}
            ORDER BY ${orderBy}
        `).all(...params);
        const items = rows.map(toResult).filter((item) => fs.existsSync(path.resolve(config.baseFolder, item.path)));
        res.json({ items: decorateItems(items), total: items.length });
    } catch (error) {
        next(error);
    }
});

favoritesRouter.post('/', (req, res, next) => {
    try {
        const itemType = req.body.type === 'folder' ? 'folder' : 'file';
        const itemPath = normalizeRelativePath(req.body.path || '');
        const item = ensureItem(itemPath, itemType);
        db.prepare(`
            INSERT OR IGNORE INTO favorites(item_id, item_type, path, created_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        `).run(item.id, itemType, itemPath);
        const favorite = db.prepare('SELECT id, item_id AS itemId, item_type AS itemType, path, created_at AS createdAt FROM favorites WHERE path = ? AND item_type = ?').get(itemPath, itemType);
        res.status(201).json({ favorite });
    } catch (error) {
        next(error);
    }
});

favoritesRouter.delete('/', (req, res, next) => {
    try {
        const itemType = String(req.query.type || req.body?.type || 'file') === 'folder' ? 'folder' : 'file';
        const itemPath = normalizeRelativePath(req.query.path || req.body?.path || '');
        const result = db.prepare('DELETE FROM favorites WHERE path = ? AND item_type = ?').run(itemPath, itemType);
        res.json({ ok: true, removed: result.changes > 0 });
    } catch (error) {
        next(error);
    }
});