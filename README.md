# LAN Media Browser

A Windows/PowerShell-friendly LAN web app for browsing local image/video folders, tagging files, and searching tagged media.

## Features

- Express backend bound to `0.0.0.0`
- React + Vite frontend
- SQLite database with required tables and indexes
- Physical folder navigation with breadcrumbs
- Folder/file pagination via `page` and `pageSize`
- Lazy image loading
- Lazy image/video thumbnail generation with local cache under `server/thumbnails`
- HTML5 video player with HTTP range request streaming
- Fullscreen file viewer with previous/next navigation, keyboard arrows, ESC close, metadata, and in-viewer tagging
- File-only tagging with 2-level tags: category + sub-tag
- Multi-file selection with checkboxes and mobile long-press
- Search endpoint: `GET /api/search?tags=1,2&tagMode=and&name=dress&page=1&pageSize=50`
- Search opens in an independent `/search` browser tab. The name filter is disabled until explicitly enabled.
- Secure base-folder restriction to prevent traversal outside configured media root

## Project Structure

```text
.
├─ package.json
├─ .env.example
├─ README.md
├─ scripts/
│  ├─ setup.ps1
│  └─ start.ps1
├─ server/
│  ├─ package.json
│  ├─ data/
│  └─ src/
│     ├─ index.js
│     ├─ config.js
│     ├─ db.js
│     ├─ mediaTypes.js
│     ├─ pathSafety.js
│     └─ routes/
│        ├─ browse.js
│        ├─ media.js
│        ├─ search.js
│        └─ tags.js
└─ client/
   ├─ package.json
   ├─ vite.config.js
   ├─ index.html
   └─ src/
```

## Requirements

- Windows 10+
- PowerShell 7 recommended
- Node.js + npm

Check manually:

```powershell
node -v
npm -v
```

If Node.js is missing, install the Windows LTS version from <https://nodejs.org/>.

## Setup

From `c:\web`:

```powershell
.\scripts\setup.ps1 -BaseFolder "D:\Media"
```

If dependency installation needs your proxy:

```powershell
.\scripts\setup.ps1 -BaseFolder "D:\Media" -UseProxy
```

The proxy used is:

```text
http://127.0.0.1:10809
```

## Configuration

Edit `.env`:

```env
PORT=3000
HOST=0.0.0.0
BASE_FOLDER=D:\Media
DATABASE_PATH=./data/media.db
CLIENT_DIST=../client/dist
THUMBNAILS_ROOT=./thumbnails
```

`BASE_FOLDER` is the only filesystem root the app can access. All file/media APIs resolve paths under this folder and block escape attempts.

## Run

Production-style local run, serving the built React frontend from Express:

```powershell
.\scripts\start.ps1
```

Development run with backend + Vite dev server:

```powershell
.\scripts\start.ps1 -Dev
```

## LAN Access

The backend listens on:

```text
0.0.0.0:3000
```

Find your local IP:

```powershell
Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -notlike '127.*'} | Select-Object IPAddress, InterfaceAlias
```

Open from another device on the same LAN:

```text
http://<local-ip>:3000
```

Example:

```text
http://192.168.1.20:3000
```

If Windows Firewall blocks access, allow Node.js or TCP port `3000` on the private network.

## API Summary

### Browse folder

```http
GET /api/browse?path=relative/folder&page=1&pageSize=50
```

Returns folders and image/video files for one physical folder, paginated.

### Media streaming

```http
GET /media?path=relative/file.mp4
```

Supports `Range: bytes=start-end` for video seeking/mobile playback.

### Thumbnails

```http
GET /api/thumbnail/image?path=relative/file.jpg
GET /api/thumbnail/video?path=relative/file.mp4
```

Image thumbnails are generated with `sharp`. Video thumbnails are generated with `ffmpeg` through `fluent-ffmpeg`, cached by hashed relative path, and limited to 3 concurrent jobs. Install ffmpeg and ensure `ffmpeg.exe` is on PATH for video thumbnails.

### Tags

```http
GET /api/tags
POST /api/tags
POST /api/tags/assign
POST /api/tags/remove
```

Level 1 tags use `parentId: null`. Level 2 tags must pass a Level 1 `parentId`.

### Search

```http
GET /api/search?tags=1,2,3&tagMode=and&name=dress&page=1&pageSize=50
```

Logic:

```text
(case-insensitive name substring) AND (AND/OR tag condition)
```

AND tag mode uses `GROUP BY file_id HAVING COUNT(DISTINCT tag_id) = N`.

## Performance Notes

- Directories are read on demand.
- Folder responses are paginated before returning to the browser.
- Media is lazy-loaded by the frontend.
- The app registers media files lazily in SQLite when folders are browsed/tagged. Search operates over registered files, which avoids scanning the whole filesystem into memory.
