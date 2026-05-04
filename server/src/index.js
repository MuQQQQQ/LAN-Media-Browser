import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { config } from './config.js';
import './db.js';
import { browseRouter } from './routes/browse.js';
import { mediaRouter } from './routes/media.js';
import { tagsRouter } from './routes/tags.js';
import { searchRouter } from './routes/search.js';
import { thumbnailRouter } from './routes/thumbnail.js';
import { filesRouter } from './routes/files.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true, baseFolder: config.baseFolder }));
app.use('/api/browse', browseRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/search', searchRouter);
app.use('/api/thumbnail', thumbnailRouter);
app.use('/api/files', filesRouter);
app.use('/media', mediaRouter);

if (fs.existsSync(config.clientDist)) {
    app.use(express.static(config.clientDist));
    app.get('*', (req, res) => res.sendFile(path.join(config.clientDist, 'index.html')));
}

app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

app.listen(config.port, config.host, () => {
    console.log(`LAN Media Browser running at http://${config.host}:${config.port}`);
    console.log(`Base folder: ${config.baseFolder}`);
});