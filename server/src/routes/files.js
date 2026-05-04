import express from 'express';
import { deleteFileRecord } from '../db.js';
import { normalizeRelativePath } from '../pathSafety.js';

export const filesRouter = express.Router();

filesRouter.delete('/', (req, res, next) => {
    try {
        const filePath = normalizeRelativePath(req.query.path || req.body?.path || '');
        const removed = deleteFileRecord(filePath);
        res.json({ ok: true, removed });
    } catch (error) {
        next(error);
    }
});