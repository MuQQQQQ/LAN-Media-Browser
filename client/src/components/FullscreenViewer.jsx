import { useEffect, useMemo, useState } from 'react';
import { api, mediaUrl, thumbnailUrl } from '../api.js';
import TagGroupList from './TagGroupList.jsx';

export default function FullscreenViewer({ files, initialPath, tagsTree, tagSettings, onClose, onApplyTags, onRemoveTags }) {
    const [currentPath, setCurrentPath] = useState(initialPath);
    const [fileTags, setFileTags] = useState([]);
    const [selectedTagIds, setSelectedTagIds] = useState([]);
    const [showMetadata, setShowMetadata] = useState(() => window.matchMedia('(min-width: 768px)').matches);
    const [missing, setMissing] = useState(false);
    const [zoom, setZoom] = useState(1.00001);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [touch, setTouch] = useState(null);
    const currentIndex = files.findIndex((file) => file.path === currentPath);
    const file = files[currentIndex] || files[0];
    const previous = files[(currentIndex - 1 + files.length) % files.length];
    const next = files[(currentIndex + 1) % files.length];
    const tagNameById = useMemo(() => new Map(tagsTree.flatMap((category) => category.children.map((tag) => [tag.id, `${category.name} / ${tag.name}`]))), [tagsTree]);

    useEffect(() => { setCurrentPath(initialPath); }, [initialPath]);
    useEffect(() => {
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
            if (event.key === 'ArrowLeft' && previous) setCurrentPath(previous.path);
            if (event.key === 'ArrowRight' && next) setCurrentPath(next.path);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [previous, next, onClose]);

    if (!file) return null;
    const goPrevious = () => previous && setCurrentPath(previous.path);
    const goNext = () => next && setCurrentPath(next.path);
    const toggle = (id) => setSelectedTagIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
    const refreshTags = async () => setFileTags((await api.fileTags(file.path)).tags);
    const apply = async () => { await onApplyTags([file.path], selectedTagIds); await refreshTags(); };
    const remove = async () => { await onRemoveTags([file.path], selectedTagIds); await refreshTags(); };
    const removeMissing = async () => { await api.removeFile(file.path); onClose(); };
    const distance = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const clampZoom = (value) => Math.min(4, Math.max(1, value));
    const onDoubleClick = (event) => {
        const nextZoom = zoom === 1 ? 2 : 1;
        setZoom(nextZoom);
        setPan(nextZoom === 1 ? { x: 0, y: 0 } : { x: 0, y: 0 });
    };
    // const onTouchStart = (event) => {
    //     console.log('Touch start', zoom);
    //     if (event.touches.length === 2) {
    //         setTouch({
    //             mode: 'pinch',
    //             startDistance: distance(event.touches[0], event.touches[1]),
    //             startZoom: zoom,
    //             lastX: (event.touches[0].clientX + event.touches[1].clientX) / 2,
    //             lastY: (event.touches[0].clientY + event.touches[1].clientY) / 2
    //         });
    //         return;
    //     }
    //     const point = event.touches[0];
    //     setTouch({ mode: 'single', startX: point.clientX, startY: point.clientY, lastX: point.clientX, lastY: point.clientY, startedAt: Date.now() });
    // };
    // const onTouchMove = (event) => {
    //     if (!touch) return;
    //     if (touch.mode === 'pinch' && event.touches.length === 2) {
    //         event.preventDefault();
    //         const currentDistance = distance(event.touches[0], event.touches[1]);
    //         const nextZoom = clampZoom(touch.startZoom * (currentDistance / touch.startDistance));
    //         const centerX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
    //         const centerY = (event.touches[0].clientY + event.touches[1].clientY) / 2;
    //         setZoom(nextZoom);
    //         setPan((current) => ({ x: current.x + (centerX - touch.lastX), y: current.y + (centerY - touch.lastY) }));
    //         setTouch((current) => current && { ...current, lastX: centerX, lastY: centerY });
    //         return;
    //     }
    //     const point = event.touches[0];
    //     const dx = point.clientX - touch.lastX;
    //     const dy = point.clientY - touch.lastY;
    //     const totalX = point.clientX - touch.startX;
    //     const totalY = point.clientY - touch.startY;
    //     if (zoom > 1) {
    //         event.preventDefault();
    //         setPan((current) => ({ x: current.x + dx, y: current.y + dy }));
    //     } else if (Math.abs(totalX) > Math.abs(totalY)) {
    //         event.preventDefault();
    //     }
    //     setTouch((current) => current && { ...current, lastX: point.clientX, lastY: point.clientY });
    // };
    // const onTouchEnd = (event) => {
    //     if (!touch) return;
    //     if (touch.mode === 'pinch') {
    //         if (zoom <= 1.0) { setZoom(1); setPan({ x: 0, y: 0 }); }
    //         setTouch(null);
    //         return;
    //     }
    //     const dx = touch.lastX - touch.startX;
    //     const dy = touch.lastY - touch.startY;
    //     const horizontal = Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.4;
    //     const quickTap = Math.abs(dx) < 12 && Math.abs(dy) < 12 && Date.now() - touch.startedAt < 260;
    //     if (quickTap) {
    //         const now = Date.now();
    //         if (onTouchEnd.lastTap && now - onTouchEnd.lastTap < 300) onDoubleClick(event);
    //         onTouchEnd.lastTap = now;
    //     } else if (horizontal) {
    //         if (file.type === 'video' && zoom === 1) {
    //             const video = document.querySelector('.viewer-content video');
    //             if (video) video.currentTime += dx < 0 ? 8 : -8;
    //         } else if (zoom === 1) {
    //             dx < 0 ? goNext() : goPrevious();
    //         }
    //     }
    //     setTouch(null);
    // };

    const onTouchStart = (event) => {
        if (event.touches.length === 2) {
            const centerX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
            const centerY = (event.touches[0].clientY + event.touches[1].clientY) / 2;

            setTouch({
                mode: 'pinch',
                initialized: false,
                lastX: centerX,
                lastY: centerY
            });
            return;
        }

        const point = event.touches[0];

        const video = document.querySelector('.viewer-content video');

        setTouch({
            mode: 'single',
            startX: point.clientX,
            startY: point.clientY,
            lastX: point.clientX,
            lastY: point.clientY,
            startedAt: Date.now(),
            startTime: video ? video.currentTime : null
        });
    };
    const onTouchMove = (event) => {
        if (!touch) return;

        // ===== PINCH =====
        if (touch.mode === 'pinch' && event.touches.length === 2) {
            event.preventDefault();

            const currentDistance = distance(event.touches[0], event.touches[1]);

            // 👇 延迟初始化
            if (!touch.initialized) {
                setTouch((t) => ({
                    ...t,
                    startDistance: currentDistance,
                    startZoom: zoom,
                    initialized: true
                }));
                return;
            }

            const scale = currentDistance / touch.startDistance;

            // 👇 threshold（防抖）
            if (Math.abs(scale - 1) < 0.01) return;

            const rawZoom = touch.startZoom * scale;

            // 👇 平滑
            const nextZoom = clampZoom(zoom * 0.8 + rawZoom * 0.2);

            const centerX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
            const centerY = (event.touches[0].clientY + event.touches[1].clientY) / 2;

            setZoom(nextZoom);

            setPan((current) => ({
                x: current.x + (centerX - touch.lastX),
                y: current.y + (centerY - touch.lastY)
            }));

            setTouch((t) => ({
                ...t,
                lastX: centerX,
                lastY: centerY
            }));

            return;
        }

        // ===== SINGLE TOUCH =====
        const point = event.touches[0];
        const dx = point.clientX - touch.lastX;
        const dy = point.clientY - touch.lastY;
        const totalX = point.clientX - touch.startX;
        const totalY = point.clientY - touch.startY;

        const video = document.querySelector('.viewer-content video');

        if (zoom > 1) {
            event.preventDefault();
            setPan((current) => ({
                x: current.x + dx,
                y: current.y + dy
            }));
        }
        // 👇 视频拖动（实时 scrub）
        else if (video && Math.abs(totalX) > Math.abs(totalY)) {
            event.preventDefault();

            const sensitivity = 0.05; // 👈 可调（越大越快）
            const delta = totalX * sensitivity;

            const nextTime = Math.max(
                0,
                Math.min(video.duration, touch.startTime + delta)
            );

            video.currentTime = nextTime;
        }
        else if (Math.abs(totalX) > Math.abs(totalY)) {
            event.preventDefault();
        }

        setTouch((t) => ({
            ...t,
            lastX: point.clientX,
            lastY: point.clientY
        }));
    };
    const onTouchEnd = (event) => {
        if (!touch) return;

        if (touch.mode === 'pinch') {
            if (zoom <= 1.0) {
                setZoom(1);
                setPan({ x: 0, y: 0 });
            }
            setTouch(null);
            return;
        }

        const dx = touch.lastX - touch.startX;
        const dy = touch.lastY - touch.startY;

        const horizontal = Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.4;
        const quickTap =
            Math.abs(dx) < 12 &&
            Math.abs(dy) < 12 &&
            Date.now() - touch.startedAt < 260;

        if (quickTap) {
            const now = Date.now();
            if (onTouchEnd.lastTap && now - onTouchEnd.lastTap < 300) {
                onDoubleClick(event);
            }
            onTouchEnd.lastTap = now;
        }
        // 👇 图片左右切换（视频不再用 end 判断）
        else if (horizontal && zoom === 1 && file.type !== 'video') {
            dx < 0 ? goNext() : goPrevious();
        }

        setTouch(null);
    };
    return (
        <div className={`viewer ${showMetadata ? 'metadata-open' : 'metadata-hidden'}`} role="dialog" aria-modal="true">
            <button className="viewer-close" onClick={onClose}>✕</button>
            <button className="viewer-meta-toggle" onClick={() => setShowMetadata((x) => !x)}>{showMetadata ? 'Hide info' : 'Show info'}</button>
            <section className="viewer-content" onDoubleClick={onDoubleClick} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
                {missing ? <div className="missing-file"><h2>File not found</h2><button onClick={removeMissing}>Remove from database</button></div> : file.type === 'image' ? <img className={zoom > 1 ? 'zoomed' : ''} style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }} src={mediaUrl(file.path)} alt={file.name} onError={() => setMissing(true)} /> : <video className={zoom > 1 ? 'zoomed' : ''} style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }} controls autoPlay={false} playsInline src={mediaUrl(file.path)} onError={() => setMissing(true)} />}
            </section>
            {showMetadata && <aside className="viewer-meta">
                <h2>{file.name}</h2>
                <h3>Applied tags</h3>
                <div className="chips">{fileTags.length ? fileTags.map((tag) => <span className="chip readonly" key={tag.id}>{tagNameById.get(tag.id) || tag.name}</span>) : <span className="muted">No tags</span>}</div>
                <h3>Edit tags</h3>
                <div className="compact-tags"><TagGroupList tagsTree={tagsTree} selectedTagIds={selectedTagIds} onToggleTag={toggle} displayMode={tagSettings.displayMode} /></div>
                <div className="actions"><button disabled={!selectedTagIds.length} onClick={apply}>Add</button><button className="secondary" disabled={!selectedTagIds.length} onClick={remove}>Remove</button></div>
            </aside>}
            <div className="viewer-bottom-bar">
                <button onClick={() => {
                    setZoom(1);
                    setPan({ x: 0, y: 0 });
                }}>Reset</button>
                <button onClick={goPrevious}>Previous</button>
                <span className="viewer-count">{currentIndex + 1} / {files.length}</span>
                <button onClick={goNext}>Next</button>
                <div className="viewer-previews">
                    {previous && <button onClick={goPrevious}><img src={thumbnailUrl(previous)} alt={previous.name} />Prev</button>}
                    {next && <button onClick={goNext}><img src={thumbnailUrl(next)} alt={next.name} />Next</button>}
                </div>
            </div>
        </div>
    );
}