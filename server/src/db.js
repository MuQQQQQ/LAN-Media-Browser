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
    path TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    parent_id INTEGER NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_used_at TEXT NULL,
    FOREIGN KEY(parent_id) REFERENCES tags(id) ON DELETE CASCADE,
    UNIQUE(name, parent_id)
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
    "ALTER TABLE tags ADD COLUMN last_used_at TEXT NULL"
]) {
    try { db.exec(statement); } catch (error) { if (!String(error.message).includes('duplicate column')) throw error; }
}

const insertFile = db.prepare('INSERT OR IGNORE INTO files(path) VALUES (?)');
const getFile = db.prepare('SELECT id, path FROM files WHERE path = ?');

export function ensureFile(relativePath) {
    insertFile.run(relativePath);
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
    const rows = db.prepare(`SELECT id, name, parent_id AS parentId, created_at AS createdAt, last_used_at AS lastUsedAt FROM tags ORDER BY parent_id IS NOT NULL, ${orderBy}`).all();
    const categories = rows.filter((tag) => tag.parentId === null).map((category) => ({ ...category, children: [] }));
    const byId = new Map(categories.map((category) => [category.id, category]));
    for (const tag of rows.filter((item) => item.parentId !== null)) {
        byId.get(tag.parentId)?.children.push(tag);
    }
    return categories;
}