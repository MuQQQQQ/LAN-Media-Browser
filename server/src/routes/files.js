import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { config } from '../config.js';
import { deleteFileRecord, deleteItemRecordsByPathPrefix, listTrackedItems } from '../db.js';
import { normalizeRelativePath, resolveSafePath } from '../pathSafety.js';

export const filesRouter = express.Router();

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