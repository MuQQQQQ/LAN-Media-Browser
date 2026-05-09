import express from 'express';
import fs from 'fs';
import path from 'path';
import { config } from '../config.js';
import { db, deleteFileRecord } from '../db.js';
import { getMediaType } from '../mediaTypes.js';

export const searchRouter = express.Router();

searchRouter.get('/', (req, res, next) => {
    try {
        const page = Math.max(1, Number(req.query.page || 1));
        const pageSize = Math.min(200, Math.max(1, Number(req.query.pageSize || 50)));
        const offset = (page - 1) * pageSize;
        const name = String(req.query.name || '').trim().toLowerCase();
        const tagMode = String(req.query.tagMode || 'and').toLowerCase() === 'or' ? 'or' : 'and';
        const tagIds = String(req.query.tags || '').split(',').map((x) => Number(x)).filter(Boolean);

        const where = [];
        const params = [];
        if (name) {
            where.push('LOWER(COALESCE(f.name, f.path)) LIKE ?');
            params.push(`%${name}%`);
        }

        let sql;
        let countSql;
        if (tagIds.length && tagMode === 'and') {
            const placeholders = tagIds.map(() => '?').join(',');
            const baseWhere = where.length ? `WHERE ${where.join(' AND ')}` : '';
            sql = `
                SELECT f.id, f.path
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
                SELECT DISTINCT f.id, f.path
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
            sql = `SELECT f.id, f.path FROM files f ${baseWhere} ORDER BY f.path COLLATE NOCASE LIMIT ? OFFSET ?`;
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
            files.push({
                id: file.id,
                path: file.path,
                name: path.posix.basename(file.path),
                type: getMediaType(path.posix.extname(file.path)) || 'file'
            });
        }
        res.json({ page, pageSize, total, files, filters: { name, tagMode, tags: tagIds } });
    } catch (error) {
        next(error);
    }
});