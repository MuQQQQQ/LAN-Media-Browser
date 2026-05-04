import crypto from 'crypto';
import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import sharp from 'sharp';
import { config } from '../config.js';
import { resolveSafePath } from '../pathSafety.js';

export const thumbnailRouter = express.Router();

const MAX_JOBS = 3;
let activeJobs = 0;
const queue = [];
const inFlight = new Map();

function hashPath(relativePath) {
    return crypto.createHash('sha1').update(relativePath).digest('hex');
}

function runLimited(key, job) {
    if (inFlight.has(key)) return inFlight.get(key);
    const promise = new Promise((resolve, reject) => {
        queue.push({ job, resolve, reject });
        drainQueue();
    }).finally(() => inFlight.delete(key));
    inFlight.set(key, promise);
    return promise;
}

function drainQueue() {
    while (activeJobs < MAX_JOBS && queue.length) {
        const item = queue.shift();
        activeJobs += 1;
        item.job()
            .then(item.resolve, item.reject)
            .finally(() => {
                activeJobs -= 1;
                drainQueue();
            });
    }
}

async function exists(filePath) {
    return fs.access(filePath).then(() => true).catch(() => false);
}

async function ensureDirs() {
    await fs.mkdir(path.join(config.thumbnailsRoot, 'images'), { recursive: true });
    await fs.mkdir(path.join(config.thumbnailsRoot, 'videos'), { recursive: true });
}

async function sendThumbnail(res, thumbnailPath) {
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.sendFile(thumbnailPath);
}

thumbnailRouter.get('/image', async (req, res, next) => {
    try {
        await ensureDirs();
        const { absolutePath, relativePath } = await resolveSafePath(String(req.query.path || ''));
        const output = path.join(config.thumbnailsRoot, 'images', `${hashPath(relativePath)}.jpg`);
        if (!(await exists(output))) {
            await runLimited(`image:${relativePath}`, async () => {
                if (await exists(output)) return;
                await sharp(absolutePath).resize({ width: 300, withoutEnlargement: true }).jpeg({ quality: 75 }).toFile(output);
            });
        }
        await sendThumbnail(res, output);
    } catch (error) {
        next(error);
    }
});

thumbnailRouter.get('/video', async (req, res, next) => {
    try {
        await ensureDirs();
        const { absolutePath, relativePath } = await resolveSafePath(String(req.query.path || ''));
        const output = path.join(config.thumbnailsRoot, 'videos', `${hashPath(relativePath)}.jpg`);
        if (!(await exists(output))) {
            await runLimited(`video:${relativePath}`, async () => {
                if (await exists(output)) return;
                await new Promise((resolve, reject) => {
                    ffmpeg(absolutePath)
                        .inputOptions(['-ss 00:00:01'])
                        .outputOptions(['-frames:v 1', '-q:v 2'])
                        .output(output)
                        .on('end', resolve)
                        .on('error', reject)
                        .run();
                });
            });
        }
        await sendThumbnail(res, output);
    } catch (error) {
        next(error);
    }
});