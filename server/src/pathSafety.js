import fs from 'fs/promises';
import path from 'path';
import { config } from './config.js';

const baseRealPromise = fs.realpath(config.baseFolder).catch(() => config.baseFolder);

export function normalizeRelativePath(input = '') {
    const decoded = String(input || '').replaceAll('\\\\', '/').replaceAll('\\', '/');
    const normalized = path.posix.normalize(decoded).replace(/^\/+/, '');
    if (normalized === '.' || normalized === '/') return '';
    if (normalized.startsWith('..') || path.isAbsolute(normalized)) {
        const error = new Error('Path escapes base folder');
        error.status = 403;
        throw error;
    }
    return normalized;
}

export function toRelativeDbPath(absPath) {
    return path.relative(config.baseFolder, absPath).replaceAll(path.sep, '/');
}

export async function resolveSafePath(relativePath = '') {
    const safeRelative = normalizeRelativePath(relativePath);
    const candidate = path.resolve(config.baseFolder, safeRelative);
    const baseReal = await baseRealPromise;
    const parentReal = await fs.realpath(path.dirname(candidate)).catch(() => path.dirname(candidate));
    const finalPath = path.join(parentReal, path.basename(candidate));
    const relativeToBase = path.relative(baseReal, finalPath);
    if (relativeToBase.startsWith('..') || path.isAbsolute(relativeToBase)) {
        const error = new Error('Access outside base folder is blocked');
        error.status = 403;
        throw error;
    }
    return { absolutePath: finalPath, relativePath: safeRelative };
}