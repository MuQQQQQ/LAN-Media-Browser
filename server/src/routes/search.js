import express from 'express';
import fs from 'fs';
import path from 'path';
import { config } from '../config.js';
import { db, decorateItems, deleteFileRecord } from '../db.js';
import { getMediaType } from '../mediaTypes.js';

export const searchRouter = express.Router();

searchRouter.get('/', (req, res, next) => {
    try {
        const page = Math.max(1, Number(req.query.page || 1));
        const pageSize = Math.min(200, Math.max(1, Number(req.query.pageSize || 50)));
        const offset = (page - 1) * pageSize;
        const query = String(req.query.q || req.query.name || '').trim();
        const caseSensitive = String(req.query.caseSensitive || 'false') === 'true';
        const needle = caseSensitive ? query : query.toLowerCase();
        const matchType = ['exact', 'starts', 'ends', 'contains'].includes(String(req.query.matchType)) ? String(req.query.matchType) : 'contains';
        const scope = ['name', 'tags', 'both'].includes(String(req.query.scope)) ? String(req.query.scope) : 'both';
        const itemType = ['file', 'folder', 'image', 'video'].includes(String(req.query.itemType)) ? String(req.query.itemType) : 'all';
        const tagMode = String(req.query.tagMode || 'and').toLowerCase() === 'or' ? 'or' : 'and';
        const tagIds = String(req.query.tags || '').split(',').map((x) => Number(x)).filter(Boolean);

        const where = [];
        const params = [];
        const comparableName = caseSensitive ? 'COALESCE(f.name, f.path)' : 'LOWER(COALESCE(f.name, f.path))';
        const comparableTag = caseSensitive ? 't.name' : 'LOWER(t.name)';
        const pattern = matchType === 'exact' ? needle : matchType === 'starts' ? `${needle}%` : matchType === 'ends' ? `%${needle}` : `%${needle}%`;
        const op = matchType === 'exact' ? '=' : 'LIKE';
        if (query) {
            const queryClauses = [];
            if (scope === 'name' || scope === 'both') {
                queryClauses.push(`${comparableName} ${op} ?`);
                params.push(pattern);
            }
            if (scope === 'tags' || scope === 'both') {
                queryClauses.push(`EXISTS (SELECT 1 FROM file_tags qft JOIN tags t ON t.id = qft.tag_id WHERE qft.file_id = f.id AND ${comparableTag} ${op} ?)`);
                params.push(pattern);
            }
            where.push(`(${queryClauses.join(' OR ')})`);
        }
        if (itemType === 'folder') {
            where.push("f.item_type = 'folder'");
        } else if (itemType === 'file') {
            where.push("f.item_type = 'file'");
        } else if (itemType === 'image' || itemType === 'video') {
            where.push("f.item_type = 'file'");
        }

        let sql;
        let countSql;
        if (tagIds.length && tagMode === 'and') {
            const placeholders = tagIds.map(() => '?').join(',');
            const baseWhere = where.length ? `WHERE ${where.join(' AND ')}` : '';
            sql = `
                SELECT f.id, f.path, f.item_type AS itemType
                FROM files f
                JOIN file_tags ft ON ft.file_id = f.id
                JOIN tags t ON t.id = ft.tag_id
                ${baseWhere ? baseWhere + ' AND' : 'WHERE'} ft.tag_id IN (${placeholders})
                GROUP BY f.id
                HAVING COUNT(DISTINCT ft.tag_id) = ?
                ORDER BY f.path COLLATE NOCASE
                LIMIT ? OFFSET ?
            `;
            countSql = `SELECT COUNT(*) AS total FROM (${sql.replace(/LIMIT \? OFFSET \?/i, '')}) q`;
            params.push(...tagIds, tagIds.length);
        } else if (tagIds.length) {
            const placeholders = tagIds.map(() => '?').join(',');
            where.push(`ft.tag_id IN (${placeholders})`);
            params.push(...tagIds);
            const baseWhere = `WHERE ${where.join(' AND ')}`;
            sql = `
                SELECT DISTINCT f.id, f.path, f.item_type AS itemType
                FROM files f
                JOIN file_tags ft ON ft.file_id = f.id
                JOIN tags t ON t.id = ft.tag_id
                ${baseWhere}
                ORDER BY f.path COLLATE NOCASE
                LIMIT ? OFFSET ?
            `;
            countSql = `
                SELECT COUNT(DISTINCT f.id) AS total
                FROM files f
                JOIN file_tags ft ON ft.file_id = f.id
                JOIN tags t ON t.id = ft.tag_id
                ${baseWhere}
            `;
        } else {
            const baseWhere = where.length ? `WHERE ${where.join(' AND ')}` : '';
            sql = `SELECT f.id, f.path, f.item_type AS itemType FROM files f ${baseWhere} ORDER BY f.path COLLATE NOCASE LIMIT ? OFFSET ?`;
            countSql = `SELECT COUNT(*) AS total FROM files f ${baseWhere}`;
        }

        const total = db.prepare(countSql).get(...params).total;
        const rows = db.prepare(sql).all(...params, pageSize, offset);
        const files = [];
        for (const file of rows) {
            const absolutePath = path.resolve(config.baseFolder, file.path);
            if (!fs.existsSync(absolutePath)) {
                deleteFileRecord(file.path);
                continue;
            }
            const mediaType = getMediaType(path.posix.extname(file.path)) || 'file';
            if ((itemType === 'image' || itemType === 'video') && mediaType !== itemType) continue;
            files.push({
                id: file.id,
                path: file.path,
                name: path.posix.basename(file.path),
                type: file.itemType === 'folder' ? 'folder' : mediaType
            });
        }
        res.json({ page, pageSize, total, files: decorateItems(files), filters: { q: query, name: query, matchType, scope, tagMode, tags: tagIds, caseSensitive, itemType } });
    } catch (error) {
        next(error);
    }
});