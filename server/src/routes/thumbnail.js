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
    await fs.mkdir(path.join(config.thumbnailsRoot, 'sprites'), { recursive: true });
}

function probeDuration(absolutePath) {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(absolutePath, (err, metadata) => {
            if (err) return reject(err);
            resolve(metadata.format.duration || 0);
        });
    });
}

// ── sprite density presets ──
// 0 = light, 1 = normal, 2 = dense, 3 = ultra, 4 = extreme
const DENSITY = 2; // 默认 dense

const PRESETS = [
    { cols: [5, 5, 6, 8], rows: [4, 4, 6, 8], maxFrames: [20, 25, 36, 64], name: 'light' },
    { cols: [6, 6, 8, 10], rows: [5, 6, 8, 10], maxFrames: [30, 36, 64, 100], name: 'normal' },
    { cols: [7, 8, 10, 12], rows: [6, 8, 10, 12], maxFrames: [42, 64, 100, 144], name: 'dense' },
    { cols: [9, 10, 12, 14], rows: [8, 10, 12, 14], maxFrames: [72, 100, 144, 196], name: 'ultra' },    // 更密集
    { cols: [12, 14, 16, 18], rows: [10, 12, 14, 16], maxFrames: [120, 168, 224, 288], name: 'extreme' } // 极密集
];

function spriteParams(duration) {
    const p = PRESETS[DENSITY] || PRESETS[1];
    const tier = duration <= 60 ? 0 : duration <= 600 ? 1 : duration <= 1800 ? 2 : 3;
    const totalFrames = p.maxFrames[tier];
    const minInterval = tier === 3 ? 10 : (tier === 2 ? 5 : 0);
    return { cols: p.cols[tier], rows: p.rows[tier], totalFrames, minInterval, density: p.name };
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
                // pick a random frame within video duration
                let seekSec = 3;
                try {
                    const dur = await probeDuration(absolutePath);
                    if (dur > 0.5) seekSec = Math.max(0.5, Math.random() * Math.min(dur, 60));
                } catch (_) { }
                await new Promise((resolve, reject) => {
                    ffmpeg(absolutePath)
                        .inputOptions([`-ss ${seekSec.toFixed(1)}`])
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

// sprite sheet for video seek preview
thumbnailRouter.get('/video-sprite', async (req, res, next) => {
    try {
        await ensureDirs();
        const { absolutePath, relativePath } = await resolveSafePath(String(req.query.path || ''));
        // probe duration first
        let duration = 0;
        try { duration = await probeDuration(absolutePath); } catch (_) { }
        if (duration <= 0) { res.status(400).json({ error: 'Cannot determine video duration' }); return; }

        const { cols, rows, totalFrames, minInterval, density } = spriteParams(duration);
        const interval = Math.max(minInterval || 0.3, duration / totalFrames);
        const actualFrames = Math.min(totalFrames, Math.floor(duration / interval));
        if (actualFrames < 2) { res.status(400).json({ error: 'Video too short for sprite' }); return; }

        const key = `${relativePath}:${cols}x${rows}:${interval.toFixed(1)}`;
        const spritePath = path.join(config.thumbnailsRoot, 'sprites', `${hashPath(key)}.jpg`);

        if (!(await exists(spritePath))) {
            await runLimited(`sprite:${key}`, async () => {
                if (await exists(spritePath)) return;
                // single ffmpeg pass: fps filter → scale+crop → tile grid
                const fps = (1 / interval).toFixed(4);
                const vf = [
                  `fps=${fps}`,
                  `scale=90:160:force_original_aspect_ratio=increase`,
                  `crop=90:160`,
                  `tile=${cols}x${Math.ceil(actualFrames / cols)}`,
                ].join(',');
                await new Promise((resolve, reject) => {
                  ffmpeg(absolutePath)
                    .inputOptions(['-an', '-sn'])
                    .outputOptions(['-frames:v', String(actualFrames), '-q:v', '8', '-vf', vf])
                    .output(spritePath)
                    .on('end', resolve)
                    .on('error', reject)
                    .run();
                });
            });
        }

        res.json({
            spriteUrl: `/api/thumbnail/sprite-file?key=${encodeURIComponent(hashPath(key))}`,
            cols, rows,
            actualFrames,
            interval,
            duration,
            thumbW: 90,
            thumbH: 160,
            density,
        });
    } catch (error) {
        next(error);
    }
});

// serve cached sprite file
thumbnailRouter.get('/sprite-file', async (req, res, next) => {
    try {
        const key = String(req.query.key || '');
        if (!key || !/^[a-f0-9]{40}$/.test(key)) { res.status(400).json({ error: 'Invalid key' }); return; }
        const spritePath = path.join(config.thumbnailsRoot, 'sprites', `${key}.jpg`);
        await sendThumbnail(res, spritePath);
    } catch (error) {
        next(error);
    }
});