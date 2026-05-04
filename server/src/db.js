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

const insertFile = db.prepare('INSERT OR IGNORE INTO files(path) VALUES (?)');
const getFile = db.prepare('SELECT id, path FROM files WHERE path = ?');

export function ensureFile(relativePath) {
    insertFile.run(relativePath);
    return getFile.get(relativePath);
}

export function getTagsTree() {
    const rows = db.prepare('SELECT id, name, parent_id AS parentId FROM tags ORDER BY parent_id IS NOT NULL, name COLLATE NOCASE').all();
    const categories = rows.filter((tag) => tag.parentId === null).map((category) => ({ ...category, children: [] }));
    const byId = new Map(categories.map((category) => [category.id, category]));
    for (const tag of rows.filter((item) => item.parentId !== null)) {
        byId.get(tag.parentId)?.children.push(tag);
    }
    return categories;
}