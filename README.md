<!-- Language / 语言 -->
<div align="right">
  <a href="#english">English</a> | <a href="#中文">中文</a>
</div>

---

<a name="english"></a>

# LAN Media Browser

Local network immersive media browser — browse local images & videos with tags, search, and a TikTok-style fullscreen player.

**Design philosophy: content-first browsing, not a file manager.**

## Features

### Browse
- Unified grid: folders & media mixed, portrait card layout (3:4 / 4:5)
- Folder preview thumbnails (first image/video inside)
- Shift range-select, Ctrl toggle-select, right-click context menu
- Floating selection toolbar (glass, fixed bottom, doesn't push content)
- Pagination + sort: name / modified / created / size / path

### Search
- Spotlight-style centered search bar with glow animation on focus
- Search by name, tag, path
- Advanced filters: match type / scope / date range / case sensitive
- Search history + saved searches (Modal-based naming)

### Tags
- Two-level hierarchy: categories → sub-tags, each with color
- Batch assign/remove tags on selected files
- Tag grouping: pick a category → files grouped by sub-tag
- Applied tags: left-click to search, right-click context menu to remove
- Tag management page: create / edit / delete / sort / color

### Fullscreen Viewer
- Immersive dark UI with auto-hiding top/bottom controls
- Floating Action Rail (right-side glass buttons): info / favorite / reset view
- Metadata Drawer: slides in from right (desktop) or bottom (mobile)
  - File details (type / path / size)
  - Applied tags with context menu
  - Resizable tag editor panel
  - Video playback controls (auto-play / speed)
  - Danger Zone at bottom
- Keyboard: ← → prev/next, Esc close, I toggle drawer
- Image zoom: double-click + pan

### Video Player (TikTok-style)
- Tap anywhere → play/pause with center icon feedback (spring animation)
- Double-tap left → -3s, double-tap right → +3s with `<< 3s` / `3s >>` hints
- Horizontal swipe → scrub timeline with center time HUD
- Gesture direction locking (horizontal scrub locks out vertical scroll)
- Custom progress bar: hover enlarge, drag thumb, tap to seek
- Sprite sheet seek preview on drag (adaptive density, 9:16 portrait)
- Volume control: speaker icon → vertical popup slider, persisted in localStorage
- Playback speed: 0.5x / 1x / 1.5x / 2x / 3x
- Resets playback state when switching files

### File Operations
- **Move Picker**: folder tree selector instead of browser prompt
- **Copy / Cut / Paste**: 10-minute clipboard expiration
- **Rename / Delete**: single + batch, missing items detection & cleanup
- **Favorites**: star toggle, separate favorites page

### Global
- **Font scale**: S / M / L / XL toggle in navbar, persisted
- **Responsive**: bottom sheet drawer on mobile, touch-optimized
- **Dark theme**: 8-level surface palette, brand indigo, glass utility classes
- **`prefers-reduced-motion`** support

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 6, Tailwind CSS v4, Framer Motion, lucide-react |
| Backend | Node.js, Express, better-sqlite3 |
| Images | sharp (thumbnail generation + sprite sheet compositing) |
| Video | fluent-ffmpeg (thumbnail capture + sprite frame extraction) |

## Quick Start

### Prerequisites
- Node.js ≥ 18
- ffmpeg (must be in PATH, for video thumbnails)

### Install

```bash
npm run install:all
```

### Configure

Copy `.env.example` to `.env` and set your media folder:

```env
PORT=3000
HOST=0.0.0.0
BASE_ROOT_FOLDER=D:\\Media          # ← change to your media directory
```

### Run

```powershell
# Production (build + start server)
.\scripts\start.ps1

# Development (hot-reload both frontend & backend)
.\scripts\start.ps1 -Dev
```

- Dev frontend: `http://localhost:5173`
- Production: `http://localhost:3000`
- LAN access: `http://<your-ip>:3000`

## Sprite Sheet Density

Edit `DENSITY` at the top of `server/src/routes/thumbnail.js`:

```js
const DENSITY = 2;  // 0 = light, 1 = normal, 2 = dense
```

| Density | ≤1min | 1-10min | 10-30min | >30min |
|---------|-------|---------|----------|--------|
| light | 5×4 (20f) | 5×4 (25f) | 6×6 (36f) | 8×8 (64f) |
| normal | 6×5 (30f) | 6×6 (36f) | 8×8 (64f) | 10×10 (100f) |
| dense | 7×6 (42f) | 8×8 (64f) | 10×10 (100f) | 12×12 (144f) |

## Project Structure

```
├── server/src/
│   ├── index.js              # Express entry
│   ├── config.js             # Configuration
│   ├── db.js                 # SQLite operations
│   └── routes/               # API: browse/search/tags/files/favorites/media/thumbnail
├── client/src/
│   ├── App.jsx               # Main app (routing + global state)
│   ├── api.js                # API client
│   ├── index.css             # Tailwind + theme + utilities
│   └── components/
│       ├── FullscreenViewer.jsx
│       ├── FavoritesPage.jsx
│       ├── TagsPage.jsx
│       └── ui/               # Reusable UI components
├── scripts/                  # setup.ps1 / start.ps1
├── .env.example
└── README.md
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + A` | Select all |
| `Ctrl/Cmd + Z` | Tag selected |
| `Ctrl/Cmd + D` | Deselect all |
| `Ctrl/Cmd + C` | Copy |
| `Ctrl/Cmd + X` | Cut |
| `Ctrl/Cmd + V` | Paste |
| `Delete` | Delete selected |
| `Ctrl/Cmd + Click` | Toggle selection |
| `Shift + Click` | Range select |
| Fullscreen `← →` | Previous / Next file |
| Fullscreen `Esc` | Close viewer |
| Fullscreen `I` | Toggle info panel |

---

<a name="中文"></a>

# LAN Media Browser 局域网媒体浏览器

局域网沉浸式媒体浏览器 — 浏览本地图片和视频，支持标签系统、搜索、以及 TikTok 风格全屏播放器。

**设计理念：内容优先的浏览体验，而非传统的文件管理器。**

## 功能

### 浏览
- 文件夹与媒体混合网格展示，竖屏卡片布局（3:4 / 4:5）
- 文件夹预览缩略图（显示内部首个图片/视频）
- Shift 范围多选、Ctrl 切换选择、右键上下文菜单
- 悬浮选择工具栏（毛玻璃、底部固定、不推挤内容）
- 分页 + 排序：名称 / 修改时间 / 创建时间 / 大小 / 路径

### 搜索
- Spotlight 风格居中搜索栏，focus 带辉光动画
- 支持按名称、标签、路径搜索
- 高级筛选：匹配类型 / 作用域 / 日期范围 / 大小写
- 搜索历史 + 保存搜索（Modal 命名保存）

### 标签
- 二级标签：分类 → 子标签，每个标签有独立颜色
- 批量打标签：选中文件后批量添加/移除
- Tag 分组：选择一个一级分类 → 按二级子标签分组展示
- 已应用标签：左键搜索，右键菜单移除
- 标签管理页：创建 / 编辑 / 删除 / 排序 / 颜色

### 全屏预览
- 沉浸式暗色界面，顶部/底部控件自动隐藏
- Floating Action Rail（右侧毛玻璃圆形按钮）：信息 / 收藏 / 重置视图
- Metadata Drawer：桌面端右侧滑入，手机端底部弹出
  - 文件详情（类型 / 路径 / 大小）
  - 已应用标签右键菜单
  - 可拖拽调整高度的标签编辑区
  - 视频播放控制（自动播放 / 倍速）
  - 底部 Danger Zone
- 键盘快捷键：← → 切换文件，Esc 关闭，I 切换面板
- 图片缩放：双击放大 + 拖动平移

### 视频播放器（TikTok 风格）
- 单击任意位置 → 播放/暂停，中心短暂显示圆形图标
- 双击左侧 → 快退 3 秒，双击右侧 → 快进 3 秒，带动画提示
- 水平滑动 → 拖动进度，中央 HUD 显示时间
- 手势方向锁定（水平滑动锁定后不会触发页面滚动）
- 自定义进度条：hover 放大、拖动滑块、tap 跳转
- 拖动时雪碧图帧预览（自适应密度，9:16 竖屏卡片）
- 音量控制：右下角喇叭图标 → 弹出垂直滑块，localStorage 持久化
- 播放速率：0.5x / 1x / 1.5x / 2x / 3x
- 切换文件时播放状态正确重置

### 文件操作
- **Move Picker**：文件夹树选择器替代浏览器 prompt
- **复制/剪切/粘贴**：10 分钟剪贴板有效期
- **重命名/删除**：单文件 + 批量，支持孤儿文件检测与清理
- **收藏**：星标收藏，独立收藏页面

### 全局
- **字体缩放**：导航栏 S/M/L/XL 四档切换，localStorage 持久化
- **响应式**：手机端底部 Sheet 替代侧边栏，触摸优化
- **暗色主题**：8 级 surface 色阶 + 品牌紫色 + 毛玻璃
- **`prefers-reduced-motion`** 支持

## 技术栈

| 层 | 技术 |
|---|------|
| 前端 | React 18, Vite 6, Tailwind CSS v4, Framer Motion, lucide-react |
| 后端 | Node.js, Express, better-sqlite3 |
| 图像 | sharp（缩略图生成 + 雪碧图合成） |
| 视频 | fluent-ffmpeg（缩略图截图 + 雪碧图帧提取） |

## 快速开始

### 环境要求
- Node.js ≥ 18
- ffmpeg（需在 PATH 中，用于视频缩略图）

### 安装

```bash
npm run install:all
```

### 配置

复制 `.env.example` 为 `.env`，修改媒体目录：

```env
PORT=3000
HOST=0.0.0.0
BASE_ROOT_FOLDER=D:\\Media          # ← 改成你的媒体目录
```

### 启动

```powershell
# 生产模式（构建 + 启动）
.\scripts\start.ps1

# 开发模式（前后端热重载）
.\scripts\start.ps1 -Dev
```

- 前端开发：`http://localhost:5173`
- 生产模式：`http://localhost:3000`
- 局域网访问：`http://<你的IP>:3000`

## 雪碧图密度

修改 `server/src/routes/thumbnail.js` 顶部的 `DENSITY`：

```js
const DENSITY = 2;  // 0 = 轻量, 1 = 标准, 2 = 密集
```

| 密度 | ≤1分钟 | 1-10分钟 | 10-30分钟 | >30分钟 |
|------|--------|----------|-----------|---------|
| 轻量 | 5×4 (20帧) | 5×4 (25帧) | 6×6 (36帧) | 8×8 (64帧) |
| 标准 | 6×5 (30帧) | 6×6 (36帧) | 8×8 (64帧) | 10×10 (100帧) |
| 密集 | 7×6 (42帧) | 8×8 (64帧) | 10×10 (100帧) | 12×12 (144帧) |

## 项目结构

```
├── server/src/
│   ├── index.js              # Express 入口
│   ├── config.js             # 配置
│   ├── db.js                 # SQLite 数据库
│   └── routes/               # API: browse/search/tags/files/favorites/media/thumbnail
├── client/src/
│   ├── App.jsx               # 主应用（路由 + 全局状态）
│   ├── api.js                # API 客户端
│   ├── index.css             # Tailwind + 主题 + 工具类
│   └── components/
│       ├── FullscreenViewer.jsx
│       ├── FavoritesPage.jsx
│       ├── TagsPage.jsx
│       └── ui/               # 可复用 UI 组件
├── scripts/                  # setup.ps1 / start.ps1
├── .env.example
└── README.md
```

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl/Cmd + A` | 全选 |
| `Ctrl/Cmd + Z` | 批量打标签 |
| `Ctrl/Cmd + D` | 取消全选 |
| `Ctrl/Cmd + C` | 复制 |
| `Ctrl/Cmd + X` | 剪切 |
| `Ctrl/Cmd + V` | 粘贴 |
| `Delete` | 删除选中 |
| `Ctrl/Cmd + Click` | 切换选择 |
| `Shift + Click` | 范围选择 |
| 全屏 `← →` | 上一个/下一个 |
| 全屏 `Esc` | 关闭预览 |
| 全屏 `I` | 切换信息面板 |

---

<p align="center"><sub>MIT License</sub></p>
