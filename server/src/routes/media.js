import express from 'express';
import fs from 'fs';
import fsp from 'fs/promises';
import mime from 'mime-types';
import { resolveSafePath } from '../pathSafety.js';

export const mediaRouter = express.Router();

mediaRouter.get('/', async (req, res, next) => {
    try {
        const { absolutePath } = await resolveSafePath(String(req.query.path || ''));
        const stat = await fsp.stat(absolutePath);
        if (!stat.isFile()) return res.status(404).json({ error: 'File not found' });
        const contentType = mime.lookup(absolutePath) || 'application/octet-stream';
        const range = req.headers.range;

        if (range) {
            const match = /bytes=(\d*)-(\d*)/.exec(range);
            if (!match) return res.status(416).end();
            const start = match[1] ? Number(match[1]) : 0;
            const end = match[2] ? Number(match[2]) : stat.size - 1;
            if (start >= stat.size || end >= stat.size || start > end) {
                res.setHeader('Content-Range', `bytes */${stat.size}`);
                return res.status(416).end();
            }
            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${stat.size}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': end - start + 1,
                'Content-Type': contentType
            });
            return fs.createReadStream(absolutePath, { start, end }).pipe(res);
        }

        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Content-Length', stat.size);
        res.setHeader('Content-Type', contentType);
        fs.createReadStream(absolutePath).pipe(res);
    } catch (error) {
        next(error);
    }
});