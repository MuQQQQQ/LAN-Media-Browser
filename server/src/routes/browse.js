import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { config } from '../config.js';
import { clearFolderPreview, decorateItems, ensureFile, ensureItemMetadata, getFolderPreview, setFolderPreview } from '../db.js';
import { getMediaType } from '../mediaTypes.js';
import { resolveSafePath, toRelativeDbPath } from '../pathSafety.js';

export const browseRouter = express.Router();

const sortFields = new Set(['name', 'createdAt', 'modifiedAt', 'size']);

function toIso(value) {
    return value instanceof Date ? value.toISOString() : null;
}

function toMetadata(stat, isFolder) {
    return {
        createdAt: toIso(stat.birthtime),
        modifiedAt: toIso(stat.mtime),
        size: isFolder ? null : stat.size
    };
}

function sortItems(items, sortBy, sortDir) {
    const direction = sortDir === 'desc' ? -1 : 1;
    return [...items].sort((a, b) => {
        if (a.type === 'folder' && b.type !== 'folder') return -1;
        if (a.type !== 'folder' && b.type === 'folder') return 1;

        let result = 0;
        if (sortBy === 'createdAt' || sortBy === 'modifiedAt') {
            result = new Date(a[sortBy] || 0).getTime() - new Date(b[sortBy] || 0).getTime();
        } else if (sortBy === 'size') {
            result = (a.size ?? -1) - (b.size ?? -1);
        } else {
            result = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        }

        if (result === 0) result = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        return result * direction;
    });
}

async function exists(filePath) {
    return fs.access(filePath).then(() => true).catch(() => false);
}

async function findFirstChildMedia(folderAbsolutePath) {
    const entries = await fs.readdir(folderAbsolutePath, { withFileTypes: true });
    const files = entries
        .filter((entry) => entry.isFile() && getMediaType(path.extname(entry.name)))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
    const first = files[0];
    if (!first) return null;
    const absolutePath = path.join(folderAbsolutePath, first.name);
    const relativePath = toRelativeDbPath(absolutePath);
    const mediaType = getMediaType(path.extname(first.name));
    ensureFile(relativePath);
    return { filePath: relativePath, mediaType };
}

async function getCachedFolderPreview(folderRelativePath, folderAbsolutePath) {
    const cached = getFolderPreview(folderRelativePath);
    if (cached) {
        const cachedAbsolutePath = path.resolve(config.baseFolder, cached.filePath);
        if (await exists(cachedAbsolutePath).catch(() => false)) return { path: cached.filePath, type: cached.mediaType };
        clearFolderPreview(folderRelativePath);
    }
    const preview = await findFirstChildMedia(folderAbsolutePath);
    if (!preview) return null;
    setFolderPreview(folderRelativePath, preview.filePath, preview.mediaType);
    return { path: preview.filePath, type: preview.mediaType };
}

browseRouter.get('/', async (req, res, next) => {
    try {
        const page = Math.max(1, Number(req.query.page || 1));
        const pageSize = Math.min(200, Math.max(1, Number(req.query.pageSize || 50)));
        const sortBy = sortFields.has(String(req.query.sortBy)) ? String(req.query.sortBy) : 'name';
        const sortDir = String(req.query.sortDir || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc';
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
            const entryStat = await fs.stat(absoluteEntryPath);
            if (entry.isDirectory()) {
                const folder = ensureItemMetadata(childRelative, 'folder', toMetadata(entryStat, true));
                const preview = await getCachedFolderPreview(childRelative, absoluteEntryPath).catch(() => null);
                folders.push({ id: folder.id, name: entry.name, path: childRelative, type: 'folder', preview, createdAt: folder.createdAt, modifiedAt: folder.modifiedAt, size: null });
            } else if (entry.isFile()) {
                const mediaType = getMediaType(path.extname(entry.name));
                if (mediaType) {
                    const file = ensureItemMetadata(childRelative, 'file', toMetadata(entryStat, false));
                    files.push({ id: file.id, name: entry.name, path: childRelative, type: mediaType, createdAt: file.createdAt, modifiedAt: file.modifiedAt, size: file.size });
                }
            }
        }

        const combined = decorateItems(sortItems([...folders, ...files], sortBy, sortDir));
        const total = combined.length;
        const offset = (page - 1) * pageSize;
        res.json({ path: relativePath, page, pageSize, total, sortBy, sortDir, items: combined.slice(offset, offset + pageSize) });
    } catch (error) {
        next(error);
    }
});