import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { config } from '../config.js';
import { copyItemRecordWithTags, deleteFileRecord, deleteItemRecordsByPathPrefix, ensureItemMetadata, listTrackedItems, updateItemPath } from '../db.js';
import { normalizeRelativePath, resolveSafePath } from '../pathSafety.js';

export const filesRouter = express.Router();

function splitName(relativePath) {
    return { dir: path.posix.dirname(relativePath) === '.' ? '' : path.posix.dirname(relativePath), base: path.posix.basename(relativePath) };
}

async function uniqueTargetPath(targetRelativePath) {
    const { dir, base } = splitName(targetRelativePath);
    const ext = path.posix.extname(base);
    const stem = ext ? base.slice(0, -ext.length) : base;
    let candidate = targetRelativePath;
    let counter = 1;
    while (await fs.access(path.resolve(config.baseFolder, candidate)).then(() => true).catch(() => false)) {
        const nextBase = `${stem} (${counter})${ext}`;
        candidate = dir ? `${dir}/${nextBase}` : nextBase;
        counter += 1;
    }
    return candidate;
}

function itemPayload(item) {
    return { path: normalizeRelativePath(item.path || ''), type: item.type === 'folder' ? 'folder' : 'file' };
}

filesRouter.delete('/', (req, res, next) => {
    Promise.resolve().then(async () => {
        const filePath = normalizeRelativePath(req.query.path || req.body?.path || '');
        const itemType = String(req.query.type || req.body?.type || 'file') === 'folder' ? 'folder' : 'file';
        const result = await safeDeleteItem({ path: filePath, type: itemType });
        res.json({ ok: result.status !== 'failed', ...result });
    }).catch((error) => {
        next(error);
    });
});

filesRouter.post('/delete', async (req, res, next) => {
    try {
        const items = Array.isArray(req.body.items) ? req.body.items : [];
        const results = [];
        for (const item of items) {
            results.push(await safeDeleteItem({ path: normalizeRelativePath(item.path || ''), type: item.type === 'folder' ? 'folder' : 'file' }));
        }
        const deleted = results.filter((item) => item.status === 'deleted' || item.status === 'db-only').length;
        const failed = results.filter((item) => item.status === 'failed').length;
        res.json({ ok: failed === 0, deleted, failed, results });
    } catch (error) {
        next(error);
    }
});

filesRouter.post('/move', async (req, res, next) => {
    try {
        const items = Array.isArray(req.body.items) ? req.body.items.map(itemPayload) : [];
        const targetFolder = normalizeRelativePath(req.body.targetFolder || '');
        const createFolder = String(req.body.createFolder || '').trim();
        const renameTo = String(req.body.renameTo || '').trim();
        const finalFolder = createFolder ? normalizeRelativePath(targetFolder ? `${targetFolder}/${createFolder}` : createFolder) : targetFolder;
        await fs.mkdir(path.resolve(config.baseFolder, finalFolder), { recursive: true });
        const results = [];
        for (const item of items) {
            const targetName = items.length === 1 && renameTo ? renameTo : path.posix.basename(item.path);
            const targetRelative = normalizeRelativePath(finalFolder ? `${finalFolder}/${targetName}` : targetName);
            const sourceAbsolute = path.resolve(config.baseFolder, item.path);
            const targetAbsolute = path.resolve(config.baseFolder, targetRelative);
            await fs.rename(sourceAbsolute, targetAbsolute);
            const stat = await fs.stat(targetAbsolute);
            updateItemPath(item.path, targetRelative);
            ensureItemMetadata(targetRelative, item.type, { createdAt: stat.birthtime.toISOString(), modifiedAt: stat.mtime.toISOString(), size: item.type === 'folder' ? null : stat.size });
            results.push({ from: item.path, to: targetRelative, type: item.type, status: 'moved' });
        }
        res.json({ ok: true, moved: results.length, results });
    } catch (error) {
        next(error);
    }
});

filesRouter.post('/copy', async (req, res, next) => {
    try {
        const items = Array.isArray(req.body.items) ? req.body.items.map(itemPayload) : [];
        const targetFolder = normalizeRelativePath(req.body.targetFolder || '');
        const createFolder = String(req.body.createFolder || '').trim();
        const finalFolder = createFolder ? normalizeRelativePath(targetFolder ? `${targetFolder}/${createFolder}` : createFolder) : targetFolder;
        await fs.mkdir(path.resolve(config.baseFolder, finalFolder), { recursive: true });
        const results = [];
        for (const item of items) {
            const wantedTarget = normalizeRelativePath(finalFolder ? `${finalFolder}/${path.posix.basename(item.path)}` : path.posix.basename(item.path));
            const targetRelative = await uniqueTargetPath(wantedTarget);
            const sourceAbsolute = path.resolve(config.baseFolder, item.path);
            const targetAbsolute = path.resolve(config.baseFolder, targetRelative);
            await fs.cp(sourceAbsolute, targetAbsolute, { recursive: item.type === 'folder', force: false, errorOnExist: true });
            copyItemRecordWithTags(item.path, targetRelative, item.type);
            results.push({ from: item.path, to: targetRelative, type: item.type, status: 'copied' });
        }
        res.json({ ok: true, copied: results.length, results });
    } catch (error) {
        next(error);
    }
});

filesRouter.get('/orphans', async (req, res, next) => {
    try {
        const orphans = await findOrphans();
        res.json({ count: orphans.length, items: orphans.slice(0, 200) });
    } catch (error) {
        next(error);
    }
});

filesRouter.post('/orphans/cleanup', async (req, res, next) => {
    try {
        const orphans = await findOrphans();
        let removed = 0;
        for (const item of orphans) {
            removed += item.itemType === 'folder' ? deleteItemRecordsByPathPrefix(item.path) : Number(deleteFileRecord(item.path));
        }
        res.json({ ok: true, removed, count: orphans.length });
    } catch (error) {
        next(error);
    }
});

async function safeDeleteItem(item) {
    const { absolutePath, relativePath } = await resolveSafePath(item.path);
    const type = item.type === 'folder' ? 'folder' : 'file';
    try {
        await fs.rm(absolutePath, { recursive: type === 'folder', force: false });
        const removedRecords = type === 'folder' ? deleteItemRecordsByPathPrefix(relativePath) : Number(deleteFileRecord(relativePath));
        return { path: relativePath, type, status: 'deleted', removedRecords };
    } catch (error) {
        if (error.code === 'ENOENT') {
            const removedRecords = type === 'folder' ? deleteItemRecordsByPathPrefix(relativePath) : Number(deleteFileRecord(relativePath));
            return { path: relativePath, type, status: 'db-only', warning: 'File not found locally, removed database record only', removedRecords };
        }
        return { path: relativePath, type, status: 'failed', error: error.message };
    }
}

async function findOrphans() {
    const items = listTrackedItems();
    const missing = [];
    for (const item of items) {
        const absolutePath = path.resolve(config.baseFolder, item.path);
        const exists = await fs.access(absolutePath).then(() => true).catch(() => false);
        if (!exists) missing.push(item);
    }
    return missing;
}