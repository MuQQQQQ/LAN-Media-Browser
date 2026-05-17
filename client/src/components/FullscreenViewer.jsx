import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Info, Star, RotateCw } from 'lucide-react';
import { api, mediaUrl } from '../api.js';
import FloatingRail, { RailButton } from './ui/FloatingRail.jsx';
import MetadataDrawer from './ui/MetadataDrawer.jsx';
import VideoPlayer from './ui/VideoPlayer.jsx';

export default function FullscreenViewer({ files, initialPath, tagsTree, tagSettings, onClose, onApplyTags, onRemoveTags, onDeleteFile, onToggleFavorite }) {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [fileTags, setFileTags] = useState([]);
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [missing, setMissing] = useState(false);
  const [zoom, setZoom] = useState(1.00001);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [touch, setTouch] = useState(null);
  const [autoPlay, setAutoPlay] = useState(() => localStorage.getItem('viewer-autoplay') === 'true');
  const [playbackRate, setPlaybackRate] = useState(() => Number(localStorage.getItem('viewer-playback-rate') || 1));
  const [showControls, setShowControls] = useState(true);

  const currentIndex = files.findIndex((f) => f.path === currentPath);
  const file = files[currentIndex] || files[0];
  const previous = currentIndex > 0 ? files[currentIndex - 1] : null;
  const next = currentIndex < files.length - 1 ? files[currentIndex + 1] : null;

  const tagNameById = useMemo(
    () => new Map(tagsTree.flatMap((c) => c.children.map((t) => [t.id, `${c.name} / ${t.name}`]))),
    [tagsTree]
  );

  useEffect(() => { setCurrentPath(initialPath); }, [initialPath]);
  useEffect(() => {
    if (!file) return;
    api.fileTags(file.path).then((d) => setFileTags(d.tags)).catch(() => setFileTags([]));
    setSelectedTagIds([]);
    setMissing(false);
    setZoom(1.00001);
    setPan({ x: 0, y: 0 });
  }, [file?.path]);

  // keyboard
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
      if ((e.key === 'ArrowLeft' || e.key === 'ArrowUp') && previous) setCurrentPath(previous.path);
      if ((e.key === 'ArrowRight' || e.key === 'ArrowDown') && next) setCurrentPath(next.path);
      if (e.key === 'i' || e.key === 'I') setDrawerOpen((x) => !x);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [previous, next, onClose]);

  useEffect(() => { localStorage.setItem('viewer-autoplay', String(autoPlay)); }, [autoPlay]);
  useEffect(() => { localStorage.setItem('viewer-playback-rate', String(playbackRate)); }, [playbackRate]);

  const wakeControls = () => setShowControls(true);

  if (!file) return null;

  const goPrevious = () => previous && setCurrentPath(previous.path);
  const goNext = () => next && setCurrentPath(next.path);
  const toggle = (id) => setSelectedTagIds((ids) => ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
  const refreshTags = async () => setFileTags((await api.fileTags(file.path)).tags);

  // zoom / pan
  const distance = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  const zoomLevels = [1, 2, 4];
  const zoomAtPoint = (clientX, clientY) => {
    const currentZoom = Math.abs(zoom - 1) < 0.02 ? 1 : zoom;
    const idx = zoomLevels.findIndex((l) => Math.abs(l - currentZoom) < 0.02);
    const nextZoom = zoomLevels[((idx === -1 ? 0 : idx) + 1) % zoomLevels.length];
    if (nextZoom === 1) { setZoom(1); setPan({ x: 0, y: 0 }); return; }
    const container = document.querySelector('.viewer-media-container');
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const px = clientX - (rect.left + rect.width / 2);
    const py = clientY - (rect.top + rect.height / 2);
    const ratio = nextZoom / currentZoom;
    setZoom(nextZoom);
    setPan((p) => ({ x: px - (px - p.x) * ratio, y: py - (py - p.y) * ratio }));
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onMouseMove={wakeControls}
      onPointerDown={wakeControls}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onDoubleClick={(e) => { if (file.type === 'image') zoomAtPoint(e.clientX, e.clientY); }}
    >
      {/* === TOP BAR (auto-hide) === */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/70 to-transparent"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="glass btn-icon w-9 h-9 text-white/80 hover:text-white" title="Close (Esc)">
                <X size={20} />
              </button>
              <span className="text-xs text-white/60 font-medium">{currentIndex + 1} / {files.length}</span>
            </div>
            <h1 className="text-sm font-medium text-white/80 truncate max-w-[40%]">{file.name}</h1>
            <div className="w-[72px]" />{/* spacer */}
          </motion.div>
        )}
      </AnimatePresence>

      {/* === MEDIA === */}
      <motion.div
        className="viewer-media-container absolute flex items-center justify-center overflow-hidden"
        style={{ top: 0, left: 0, right: 0, bottom: file.type === 'video' ? 60 : 60 }}
        animate={{
          transform: (drawerOpen && window.innerWidth >= 768) ? 'scale(0.9) translateX(-120px)' : 'scale(1) translateX(0)',
        }}
        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
      >
        {missing ? (
          <div className="text-center text-white/60">
            <h2 className="text-lg font-semibold mb-3">File not found</h2>
            <button onClick={async () => { await api.removeFile(file.path); onClose(); }} className="btn-base btn-primary text-sm">
              Remove from database
            </button>
          </div>
        ) : file.type === 'image' ? (
          <img
            className="max-w-full max-h-full object-contain select-none"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transition: zoom === 1 ? 'transform 0.3s ease' : 'none', cursor: zoom > 1 ? 'grab' : 'zoom-in' }}
            src={mediaUrl(file.path)}
            alt={file.name}
            draggable={false}
            onError={() => setMissing(true)}
          />
        ) : (
          <VideoPlayer
            src={mediaUrl(file.path)}
            autoPlay={autoPlay}
            playbackRate={playbackRate}
            onLoadedMetadata={(e) => { if (e?.currentTarget) e.currentTarget.playbackRate = playbackRate; }}
            onError={() => setMissing(true)}
          />
        )}
      </motion.div>

      {/* === FLOATING ACTION RAIL (right) === */}
      <FloatingRail offset={drawerOpen ? 380 : 0}>
        <RailButton icon={Info} label="Info" active={drawerOpen} onClick={() => setDrawerOpen((x) => !x)} />
        <RailButton
          icon={Star}
          label={file?.favorite ? 'Unfavorite' : 'Favorite'}
          active={!!file?.favorite}
          onClick={async () => {
            if (onToggleFavorite && file) {
              await onToggleFavorite(file);
            }
          }}
        />
        <RailButton icon={RotateCw} label="Reset view" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} />
      </FloatingRail>

      {/* === METADATA DRAWER === */}
      <MetadataDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        fileName={file.name}
        fileTags={fileTags}
        tagNameById={tagNameById}
        selectedTagIds={selectedTagIds}
        onToggleTag={toggle}
        onApplyTags={async () => { await onApplyTags?.([file.path], selectedTagIds); await refreshTags(); }}
        onRemoveTags={async () => { await onRemoveTags?.([file.path], selectedTagIds); await refreshTags(); }}
        onTagSearch={(tag) => window.open(`/search?${new URLSearchParams({ tags: tag.id, tagMode: 'and', page: 1, pageSize: 50 })}`, '_blank', 'noopener,noreferrer')}
        onRemoveSingleTag={async (tag) => { await api.removeTags({ paths: [{ path: file.path, type: 'file' }], tagIds: [tag.id] }); await refreshTags(); }}
        tagsTree={tagsTree}
        tagSettings={tagSettings}
        onDelete={async () => { await onDeleteFile?.(file); onClose(); }}
      >
        {/* file info */}
        <section>
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Details</h3>
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-text-muted">Type</dt><dd className="text-text-primary capitalize">{file.type}</dd></div>
            <div><dt className="text-text-muted text-xs mb-0.5">Path</dt><dd className="text-text-primary text-xs leading-relaxed" title={file.path}>{ellipsisPath(file.path)}</dd></div>
            {file.size != null && <div className="flex justify-between"><dt className="text-text-muted">Size</dt><dd className="text-text-primary">{formatBytes(file.size)}</dd></div>}
          </dl>
        </section>

        {/* playback for video */}
        {file.type === 'video' && (
          <section>
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Playback</h3>
            <div className="space-y-2 text-sm">
              <label className="flex items-center gap-2 text-text-secondary">
                <input type="checkbox" checked={autoPlay} onChange={(e) => setAutoPlay(e.target.checked)} className="accent-brand" />
                Auto-play
              </label>
              <label className="flex items-center gap-2 text-text-secondary">
                Speed
                <select value={playbackRate} onChange={(e) => setPlaybackRate(Number(e.target.value))} className="bg-surface-3 border border-border rounded-lg px-2 py-1 text-xs text-text-primary">
                  <option value="0.5">0.5x</option>
                  <option value="1">1x</option>
                  <option value="1.5">1.5x</option>
                  <option value="2">2x</option>
                  <option value="3">3x</option>
                </select>
              </label>
            </div>
          </section>
        )}
      </MetadataDrawer>

      {/* === BOTTOM NAV BAR === */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            className="absolute bottom-0 left-0 right-0 z-30 flex items-center justify-center gap-6 px-4 py-3 bg-gradient-to-t from-black/70 to-transparent"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            <button
              onClick={goPrevious}
              disabled={!previous}
              className="glass btn-icon w-11 h-11 text-white/80 hover:text-white disabled:opacity-30"
              title="Previous"
            >
              <ChevronLeft size={22} />
            </button>
            <span className="text-sm text-white/60 font-medium tabular-nums min-w-[60px] text-center">
              {currentIndex + 1} / {files.length}
            </span>
            <button
              onClick={goNext}
              disabled={!next}
              className="glass btn-icon w-11 h-11 text-white/80 hover:text-white disabled:opacity-30"
              title="Next"
            >
              <ChevronRight size={22} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function formatBytes(value) {
  if (!Number.isFinite(value)) return '';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) { size /= 1024; unitIndex++; }
  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function ellipsisPath(path) {
  if (!path) return '';
  const parts = path.split('/');
  if (parts.length <= 3) return path;
  // show: first / second / … / last
  return parts[0] + ' / ' + parts[1] + ' / … / ' + parts[parts.length - 1];
}
