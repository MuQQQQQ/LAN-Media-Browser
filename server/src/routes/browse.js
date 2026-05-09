import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { config } from '../config.js';
import { clearFolderPreview, ensureFile, getFolderPreview, setFolderPreview } from '../db.js';
import { getMediaType } from '../mediaTypes.js';
import { resolveSafePath, toRelativeDbPath } from '../pathSafety.js';

export const browseRouter = express.Router();

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
                const preview = await getCachedFolderPreview(childRelative, absoluteEntryPath).catch(() => null);
                folders.push({ name: entry.name, path: childRelative, type: 'folder', preview });
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