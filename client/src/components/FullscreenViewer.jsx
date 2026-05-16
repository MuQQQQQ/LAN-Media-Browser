import { useEffect, useMemo, useState } from 'react';
import { api, mediaUrl, thumbnailUrl } from '../api.js';
import TagGroupList from './TagGroupList.jsx';
import ReactPlayer from 'react-player'
export default function FullscreenViewer({ files, initialPath, tagsTree, tagSettings, onClose, onApplyTags, onRemoveTags, onDeleteFile }) {
    const [currentPath, setCurrentPath] = useState(initialPath);
    const [fileTags, setFileTags] = useState([]);
    const [selectedTagIds, setSelectedTagIds] = useState([]);
    const [showMetadata, setShowMetadata] = useState(() => window.matchMedia('(min-width: 768px)').matches);
    const [missing, setMissing] = useState(false);
    const [zoom, setZoom] = useState(1.00001);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [touch, setTouch] = useState(null);
    const [autoPlay, setAutoPlay] = useState(() => localStorage.getItem('viewer-autoplay') === 'true');
    const [playbackRate, setPlaybackRate] = useState(() => Number(localStorage.getItem('viewer-playback-rate') || 1));
    const currentIndex = files.findIndex((file) => file.path === currentPath);
    const file = files[currentIndex] || files[0];
    const previous = currentIndex > 0 ? files[currentIndex - 1] : null;
    const next = currentIndex < files.length - 1 ? files[currentIndex + 1] : null;
    const tagNameById = useMemo(() => new Map(tagsTree.flatMap((category) => category.children.map((tag) => [tag.id, `${category.name} / ${tag.name}`]))), [tagsTree]);

    useEffect(() => { setCurrentPath(initialPath); }, [initialPath]);
    useEffect(() => {
        console.log(files);
        console.log('Loading tags for', file?.path);
        if (!file) return;
        api.fileTags(file.path).then((data) => setFileTags(data.tags)).catch(() => setFileTags([]));
        setSelectedTagIds([]);
        setMissing(false);
        setZoom(1.00001);
        setPan({ x: 0, y: 0 });
    }, [file?.path]);
    useEffect(() => {
        const handler = (event) => {
            if (event.key === 'Escape') onClose();
            if ((event.key === 'ArrowLeft' || event.key === 'ArrowUp') && previous) setCurrentPath(previous.path);
            if ((event.key === 'ArrowRight' || event.key === 'ArrowDown') && next) setCurrentPath(next.path);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [previous, next, onClose]);
    useEffect(() => { localStorage.setItem('viewer-autoplay', String(autoPlay)); }, [autoPlay]);
    useEffect(() => { localStorage.setItem('viewer-playback-rate', String(playbackRate)); }, [playbackRate]);

    if (!file) return null;
    const goPrevious = () => previous && setCurrentPath(previous.path);
    const goNext = () => next && setCurrentPath(next.path);
    const toggle = (id) => setSelectedTagIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
    const refreshTags = async () => setFileTags((await api.fileTags(file.path)).tags);
    const apply = async () => { await onApplyTags([file.path], selectedTagIds); await refreshTags(); };
    const remove = async () => { await onRemoveTags([file.path], selectedTagIds); await refreshTags(); };
    const removeMissing = async () => { await api.removeFile(file.path); onClose(); };
    const deleteCurrent = async () => {
        if (!confirm('Are you sure you want to delete this file?')) return;
        await onDeleteFile?.(file);
        onClose();
    };
    const searchByTag = (tag) => {
        window.open(`/search?${new URLSearchParams({ tags: tag.id, tagMode: 'and', page: 1, pageSize: 50 })}`, '_blank', 'noopener,noreferrer');
    };
    const distance = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const clampZoom = (value) => Math.min(4, Math.max(1, value));
    const zoomLevels = [1, 2, 4];

    const getPointRelativeToViewer = (clientX, clientY) => {
        const rect = document.querySelector('.viewer-content')?.getBoundingClientRect();
        if (!rect) return { x: 0, y: 0 };
        return {
            x: clientX - (rect.left + rect.width / 2),
            y: clientY - (rect.top + rect.height / 2)
        };
    };

    const zoomAtPoint = (clientX, clientY) => {
        const currentZoom = Math.abs(zoom - 1) < 0.02 ? 1 : zoom;
        const currentIndex = zoomLevels.findIndex((level) => Math.abs(level - currentZoom) < 0.02);
        const nextZoom = zoomLevels[((currentIndex === -1 ? 0 : currentIndex) + 1) % zoomLevels.length];

        if (nextZoom === 1) {
            setZoom(1);
            setPan({ x: 0, y: 0 });
            return;
        }

        const point = getPointRelativeToViewer(clientX, clientY);
        const scaleRatio = nextZoom / currentZoom;
        setZoom(nextZoom);
        setPan((currentPan) => ({
            x: point.x - (point.x - currentPan.x) * scaleRatio,
            y: point.y - (point.y - currentPan.y) * scaleRatio
        }));
    };

    const onDoubleClick = (event) => {
        zoomAtPoint(event.clientX, event.clientY);
    };
    const onTouchStart = (event) => {
    if (event.touches.length === 2) {
        const cx = (event.touches[0].clientX + event.touches[1].clientX) / 2;
        const cy = (event.touches[0].clientY + event.touches[1].clientY) / 2;

        setTouch({
            mode: 'pinch',
            initialized: false,
            lastX: cx,
            lastY: cy
        });
        return;
    }

    const point = event.touches[0];
    const video = document.querySelector('.viewer-content video');

    setTouch({
        mode: 'single',
        gesture: null, // 👈 新增（pan / swipe / scrub）
        startX: point.clientX,
        startY: point.clientY,
        lastX: point.clientX,
        lastY: point.clientY,
        startedAt: Date.now(),
        startTime: video ? video.currentTime : null,
        lastTime: Date.now(),   // 👈 新增
        velocityX: 0            // 👈 新增
    });
};
    const onTouchMove = (event) => {
    if (!touch) return;

    // ===== PINCH =====
    if (touch.mode === 'pinch' && event.touches.length === 2) {
        event.preventDefault();

        const d = distance(event.touches[0], event.touches[1]);

        if (!touch.initialized) {
            setTouch(t => ({
                ...t,
                startDistance: d,
                startZoom: zoom,
                initialized: true
            }));
            return;
        }

        const scale = d / touch.startDistance;
        if (Math.abs(scale - 1) < 0.01) return;

        const rawZoom = touch.startZoom * scale;
        const nextZoom = clampZoom(zoom * 0.8 + rawZoom * 0.2);

        const cx = (event.touches[0].clientX + event.touches[1].clientX) / 2;
        const cy = (event.touches[0].clientY + event.touches[1].clientY) / 2;

        setZoom(nextZoom);

        setPan(p => ({
            x: p.x + (cx - touch.lastX),
            y: p.y + (cy - touch.lastY)
        }));

        setTouch(t => ({ ...t, lastX: cx, lastY: cy }));
        return;
    }

    // ===== SINGLE =====
    const point = event.touches[0];
    const now = Date.now();
    const dt = now - touch.lastTime;
    const dx = point.clientX - touch.lastX;
    const dy = point.clientY - touch.lastY;
    const totalX = point.clientX - touch.startX;
    const totalY = point.clientY - touch.startY;
    const vx = dx / dt; // px/ms
    const smoothVX = touch.velocityX * 0.7 + vx * 0.3;

    const absX = Math.abs(totalX);
    const absY = Math.abs(totalY);

    const video = document.querySelector('.viewer-content video');

    const SWIPE_OVERRIDE = 13;
    const VELOCITY_THRESHOLD = 0.1; // 👈 关键（可调）

    let gesture = touch.gesture;

    // 👇 手势判定（只判定一次）
    if (!gesture) {
        if (Math.abs(smoothVX) > VELOCITY_THRESHOLD && absX > absY * 1.2) {
            gesture = 'swipe';
        } else if (video && absX > absY) {
            gesture = 'scrub';
        } else if (zoom > 1) {
            gesture = 'pan';
        } else if (absX > absY) {
            gesture = 'swipe';
        }

        if (gesture) {
            setTouch(t => ({ ...t, gesture }));
        }
    }

    // ===== 执行手势 =====

    // 👉 pan
    if (gesture === 'pan') {
        event.preventDefault();
        setPan(p => ({
            x: p.x + dx,
            y: p.y + dy
        }));
    }

    // 👉 swipe（只移动视觉，不立即切换）
    else if (gesture === 'swipe') {
        event.preventDefault();
        setPan(p => ({
            ...p,
            x: totalX // 👈 用 total 做拖拽效果
        }));
    }

    // 👉 视频 scrub
    else if (gesture === 'scrub' && video) {
        event.preventDefault();

        // 👇 强制显示 controls
        video.controls = true;

        const sensitivity = 0.05;
        const delta = totalX * sensitivity;

        const nextTime = Math.max(
            0,
            Math.min(video.duration, touch.startTime + delta)
        );

        video.currentTime = nextTime;
    }

    setTouch(t => ({
        ...t,
        lastX: point.clientX,
        lastY: point.clientY
    }));
};
const onTouchEnd = () => {
    if (!touch) return;

    const dx = touch.lastX - touch.startX;

    const video = document.querySelector('.viewer-content video');

    if (touch.gesture === 'swipe') {
        if (Math.abs(dx) > 80) {
            dx < 0 ? goNext() : goPrevious();
        } else {
            // 👇 回弹
            setPan({ x: 0, y: 0 });
        }
    }


    setTouch(null);
};
    return (
        <div className={`viewer ${showMetadata ? 'metadata-open' : 'metadata-hidden'}`} role="dialog" aria-modal="true" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
            {/* <button className="viewer-btn close" onClick={onClose} title="关闭">
                <span>✕</span>
            </button> */}

            {/* 删除按钮 */}
            <button className="viewer-btn delete" onClick={deleteCurrent} title="删除">
                <span>🗑</span>
            </button>

            {/* 属性信息切换按钮 */}
            <button className={`viewer-btn meta-toggle ${showMetadata ? 'active' : ''}`} onClick={() => setShowMetadata((x) => !x)} title={showMetadata ? '隐藏信息' : '显示信息'}>
                <span>ⓘ</span>
            </button>
            <section className="viewer-content" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} onDoubleClick={onDoubleClick} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
                {missing ? <div className="missing-file"><h2>File not found</h2><button onClick={removeMissing}>Remove from database</button></div> : file.type === 'image' ? <img className={zoom > 1 ? 'zoomed' : ''} style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }} src={mediaUrl(file.path)} alt={file.name} onError={() => setMissing(true)} /> : <video className={zoom > 1 ? 'zoomed' : ''} style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }} controls autoPlay={autoPlay} playsInline src={mediaUrl(file.path)} onLoadedMetadata={(event) => { event.currentTarget.playbackRate = playbackRate; }} onError={() => setMissing(true)} />}
            </section>
            {showMetadata && <aside className="viewer-meta">
                <h2>{file.name}</h2>
                <h3>Applied tags</h3>
                <div className="chips">{fileTags.length ? fileTags.map((tag) => <button className="chip clickable-tag" style={{ '--tag-color': tag.color || '#64748b' }} key={tag.id} onClick={() => searchByTag(tag)} title="Search files with this tag">{tagNameById.get(tag.id) || tag.name}</button>) : <span className="muted">No tags</span>}</div>
                <h3>Edit tags</h3>
                <div className="compact-tags"><TagGroupList tagsTree={tagsTree} selectedTagIds={selectedTagIds} onToggleTag={toggle} displayMode={tagSettings.displayMode} /></div>
                <div className="actions"><button disabled={!selectedTagIds.length} onClick={apply}>Add</button><button className="secondary" disabled={!selectedTagIds.length} onClick={remove}>Remove</button></div>
                {file.type === 'video' && <><h3>Playback</h3><label className="inline-check"><input type="checkbox" checked={autoPlay} onChange={(e) => setAutoPlay(e.target.checked)} /> Auto-play</label><br /><label>Speed<select value={playbackRate} onChange={(e) => setPlaybackRate(Number(e.target.value))}><option value="1">1x</option><option value="1.5">1.5x</option><option value="2">2x</option><option value="3">3x</option></select></label></>}
            </aside>}
            <div className="viewer-bottom-bar">
                <button className="nav-btn reset" onClick={() => {
                    setZoom(1);
                    setPan({ x: 0, y: 0 });
                    setPlaybackRate(1);
                    setAutoPlay(false);
                }}><span>↻</span></button>
                <button className="nav-btn prev" onClick={goPrevious} disabled={!previous}> <span>‹</span> </button>
                <span className="viewer-count">{currentIndex + 1} / {files.length}</span>
                <button className="nav-btn next" onClick={goNext} disabled={!next}> <span>›</span> </button>
                {/* <div className="viewer-previews">
                    {previous && <button onClick={goPrevious}><img src={thumbnailUrl(previous)} alt={previous.name} />Prev</button>}
                    {next && <button onClick={goNext}><img src={thumbnailUrl(next)} alt={next.name} />Next</button>}
                </div> */}
            </div>
        </div>
    );
}