import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { config } from './config.js';

fs.mkdirSync(path.dirname(config.databasePath), { recursive: true });

export const db = new Database(config.databasePath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT NOT NULL UNIQUE,
    name TEXT NULL
);

CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    parent_id INTEGER NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_used_at TEXT NULL,
    color TEXT NOT NULL DEFAULT '#64748b',
    FOREIGN KEY(parent_id) REFERENCES tags(id) ON DELETE CASCADE,
    UNIQUE(name, parent_id)
);

CREATE TABLE IF NOT EXISTS folder_previews (
    folder_path TEXT PRIMARY KEY,
    file_path TEXT NOT NULL,
    media_type TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS file_tags (
    file_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY(file_id, tag_id),
    FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE,
    FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_file_path ON files(path);
CREATE INDEX IF NOT EXISTS idx_file_tags_file_id ON file_tags(file_id);
CREATE INDEX IF NOT EXISTS idx_file_tags_tag_id ON file_tags(tag_id);
`);

for (const statement of [
    "ALTER TABLE tags ADD COLUMN created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP",
    "ALTER TABLE tags ADD COLUMN last_used_at TEXT NULL",
    "ALTER TABLE tags ADD COLUMN color TEXT NOT NULL DEFAULT '#64748b'",
    "ALTER TABLE files ADD COLUMN name TEXT NULL"
]) {
    try { db.exec(statement); } catch (error) { if (!String(error.message).includes('duplicate column')) throw error; }
}

function basename(relativePath) {
    return String(relativePath).split('/').filter(Boolean).pop() || String(relativePath);
}

const backfillFileName = db.prepare('UPDATE files SET name = ? WHERE id = ?');
for (const file of db.prepare("SELECT id, path FROM files WHERE name IS NULL OR name = ''").all()) {
    backfillFileName.run(basename(file.path), file.id);
}

const insertFile = db.prepare('INSERT OR IGNORE INTO files(path, name) VALUES (?, ?)');
const getFile = db.prepare('SELECT id, path FROM files WHERE path = ?');

export function ensureFile(relativePath) {
    insertFile.run(relativePath, basename(relativePath));
    db.prepare('UPDATE files SET name = ? WHERE path = ? AND (name IS NULL OR name = \'\')').run(basename(relativePath), relativePath);
    return getFile.get(relativePath);
}

export function deleteFileRecord(relativePath) {
    const file = getFile.get(relativePath);
    if (!file) return false;
    db.prepare('DELETE FROM file_tags WHERE file_id = ?').run(file.id);
    db.prepare('DELETE FROM files WHERE id = ?').run(file.id);
    return true;
}

export function getTagsTree(sort = 'alphabetical') {
    const orderBy = {
        recent: 'COALESCE(last_used_at, created_at) DESC, name COLLATE NOCASE ASC',
        creation: 'created_at DESC, name COLLATE NOCASE ASC',
        alphabetical: 'name COLLATE NOCASE ASC'
    }[sort] || 'name COLLATE NOCASE ASC';
    const rows = db.prepare(`SELECT id, name, parent_id AS parentId, created_at AS createdAt, last_used_at AS lastUsedAt, color FROM tags ORDER BY parent_id IS NOT NULL, ${orderBy}`).all();
    const categories = rows.filter((tag) => tag.parentId === null).map((category) => ({ ...category, children: [] }));
    const byId = new Map(categories.map((category) => [category.id, category]));
    for (const tag of rows.filter((item) => item.parentId !== null)) {
        byId.get(tag.parentId)?.children.push(tag);
    }
    return categories;
}

export function getFolderPreview(folderPath) {
    return db.prepare('SELECT folder_path AS folderPath, file_path AS filePath, media_type AS mediaType FROM folder_previews WHERE folder_path = ?').get(folderPath);
}

export function setFolderPreview(folderPath, filePath, mediaType) {
    db.prepare(`
        INSERT INTO folder_previews(folder_path, file_path, media_type, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(folder_path) DO UPDATE SET file_path = excluded.file_path, media_type = excluded.media_type, updated_at = CURRENT_TIMESTAMP
    `).run(folderPath, filePath, mediaType);
}

export function clearFolderPreview(folderPath) {
    db.prepare('DELETE FROM folder_previews WHERE folder_path = ?').run(folderPath);
}