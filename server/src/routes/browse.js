import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { ensureFile } from '../db.js';
import { getMediaType } from '../mediaTypes.js';
import { resolveSafePath, toRelativeDbPath } from '../pathSafety.js';

export const browseRouter = express.Router();

browseRouter.get('/', async (req, res, next) => {
    try {
        const page = Math.max(1, Number(req.query.page || 1));
        const pageSize = Math.min(200, Math.max(1, Number(req.query.pageSize || 50)));
        const requestedPath = String(req.query.path || '');
        const { absolutePath, relativePath } = await resolveSafePath(requestedPath);
        const stat = await fs.stat(absolutePath);
        if (!stat.isDirectory()) return res.status(400).json({ error: 'Path is not a folder' });

        const entries = await fs.readdir(absolutePath, { withFileTypes: true });
        const folders = [];
        const files = [];
        for (const entry of entries) {
            const absoluteEntryPath = path.join(absolutePath, entry.name);
            const childRelative = toRelativeDbPath(absoluteEntryPath);
            if (entry.isDirectory()) {
                folders.push({ name: entry.name, path: childRelative, type: 'folder' });
            } else if (entry.isFile()) {
                const mediaType = getMediaType(path.extname(entry.name));
                if (mediaType) {
                    const file = ensureFile(childRelative);
                    files.push({ id: file.id, name: entry.name, path: childRelative, type: mediaType });
                }
            }
        }

        folders.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
        files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
        const combined = [...folders, ...files];
        const total = combined.length;
        const offset = (page - 1) * pageSize;
        res.json({ path: relativePath, page, pageSize, total, items: combined.slice(offset, offset + pageSize) });
    } catch (error) {
        next(error);
    }
});