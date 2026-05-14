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
    name TEXT NULL,
    item_type TEXT NOT NULL DEFAULT 'file'
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

CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL,
    item_type TEXT NOT NULL CHECK(item_type IN ('file', 'folder')),
    path TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(item_id) REFERENCES files(id) ON DELETE CASCADE,
    UNIQUE(path, item_type)
);

CREATE INDEX IF NOT EXISTS idx_file_path ON files(path);
CREATE INDEX IF NOT EXISTS idx_file_tags_file_id ON file_tags(file_id);
CREATE INDEX IF NOT EXISTS idx_file_tags_tag_id ON file_tags(tag_id);
`);

for (const statement of [
    "ALTER TABLE tags ADD COLUMN created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP",
    "ALTER TABLE tags ADD COLUMN last_used_at TEXT NULL",
    "ALTER TABLE tags ADD COLUMN color TEXT NOT NULL DEFAULT '#64748b'",
    "ALTER TABLE files ADD COLUMN name TEXT NULL",
    "ALTER TABLE files ADD COLUMN item_type TEXT NOT NULL DEFAULT 'file'"
]) {
    try { db.exec(statement); } catch (error) { if (!String(error.message).includes('duplicate column')) throw error; }
}

for (const statement of [
    'CREATE INDEX IF NOT EXISTS idx_files_item_type ON files(item_type)',
    'CREATE INDEX IF NOT EXISTS idx_files_name ON files(name)',
    'CREATE INDEX IF NOT EXISTS idx_favorites_item_id ON favorites(item_id)'
]) {
    db.exec(statement);
}

function basename(relativePath) {
    return String(relativePath).split('/').filter(Boolean).pop() || String(relativePath);
}

const backfillFileName = db.prepare('UPDATE files SET name = ? WHERE id = ?');
for (const file of db.prepare("SELECT id, path FROM files WHERE name IS NULL OR name = ''").all()) {
    backfillFileName.run(basename(file.path), file.id);
}

const insertFile = db.prepare('INSERT OR IGNORE INTO files(path, name, item_type) VALUES (?, ?, ?)');
const getFile = db.prepare('SELECT id, path, item_type AS itemType FROM files WHERE path = ?');

export function ensureItem(relativePath, itemType = 'file') {
    const normalizedType = itemType === 'folder' ? 'folder' : 'file';
    insertFile.run(relativePath, basename(relativePath), normalizedType);
    db.prepare("UPDATE files SET name = ?, item_type = CASE WHEN item_type = 'folder' OR ? = 'folder' THEN 'folder' ELSE 'file' END WHERE path = ? AND (name IS NULL OR name = '' OR item_type != ?)").run(basename(relativePath), normalizedType, relativePath, normalizedType);
    return getFile.get(relativePath);
}

export function ensureFile(relativePath) {
    return ensureItem(relativePath, 'file');
}

export function ensureFolder(relativePath) {
    return ensureItem(relativePath, 'folder');
}

export function deleteFileRecord(relativePath) {
    const file = getFile.get(relativePath);
    if (!file) return false;
    db.prepare('DELETE FROM file_tags WHERE file_id = ?').run(file.id);
    db.prepare('DELETE FROM favorites WHERE item_id = ?').run(file.id);
    db.prepare('DELETE FROM files WHERE id = ?').run(file.id);
    return true;
}

export function deleteItemRecordsByPathPrefix(relativePath) {
    const prefix = relativePath ? `${relativePath}/%` : '%';
    const rows = relativePath
        ? db.prepare('SELECT id FROM files WHERE path = ? OR path LIKE ?').all(relativePath, prefix)
        : db.prepare('SELECT id FROM files').all();
    if (!rows.length) return 0;
    const ids = rows.map((row) => row.id);
    const placeholders = ids.map(() => '?').join(',');
    const tx = db.transaction(() => {
        db.prepare(`DELETE FROM file_tags WHERE file_id IN (${placeholders})`).run(...ids);
        db.prepare(`DELETE FROM favorites WHERE item_id IN (${placeholders})`).run(...ids);
        db.prepare(`DELETE FROM files WHERE id IN (${placeholders})`).run(...ids);
        if (relativePath) db.prepare('DELETE FROM folder_previews WHERE folder_path = ? OR folder_path LIKE ? OR file_path = ? OR file_path LIKE ?').run(relativePath, prefix, relativePath, prefix);
    });
    tx();
    return rows.length;
}

export function listTrackedItems() {
    return db.prepare('SELECT id, path, item_type AS itemType FROM files ORDER BY path COLLATE NOCASE').all();
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

export function getItemTags(itemId) {
    return db.prepare(`
        SELECT t.id, t.name, t.parent_id AS parentId, t.created_at AS createdAt, t.last_used_at AS lastUsedAt, t.color
        FROM tags t JOIN file_tags ft ON ft.tag_id = t.id
        WHERE ft.file_id = ?
        ORDER BY t.name COLLATE NOCASE
    `).all(itemId);
}

export function decorateItems(items) {
    if (!items.length) return items;
    const byPath = new Map(items.map((item) => [item.path, item]));
    const paths = [...byPath.keys()];
    const placeholders = paths.map(() => '?').join(',');
    const tagRows = db.prepare(`
        SELECT f.path, t.id, t.name, t.parent_id AS parentId, t.created_at AS createdAt, t.last_used_at AS lastUsedAt, t.color
        FROM files f
        JOIN file_tags ft ON ft.file_id = f.id
        JOIN tags t ON t.id = ft.tag_id
        WHERE f.path IN (${placeholders})
        ORDER BY t.name COLLATE NOCASE
    `).all(...paths);
    const favoriteRows = db.prepare(`SELECT path, item_type AS itemType, id AS favoriteId FROM favorites WHERE path IN (${placeholders})`).all(...paths);
    for (const item of items) {
        item.tags = [];
        item.favorite = false;
        item.favoriteId = null;
    }
    for (const row of tagRows) byPath.get(row.path)?.tags.push({ id: row.id, name: row.name, parentId: row.parentId, createdAt: row.createdAt, lastUsedAt: row.lastUsedAt, color: row.color });
    for (const row of favoriteRows) {
        const item = byPath.get(row.path);
        if (item && item.type === row.itemType) {
            item.favorite = true;
            item.favoriteId = row.favoriteId;
        }
    }
    return items;
}