import { useState, useRef, useCallback } from 'react';
import { Play, Film, Star, FolderOpen, Trash2, Copy, Scissors, Move, Tags } from 'lucide-react';
import { thumbnailUrl, browseUrl } from '../../api.js';
import ContextMenu from './ContextMenu.jsx';

export default function MediaCard({ item, selected, layout, onOpen, onToggleSelect, onToggleFavorite, onLongPress, onDelete, onMove, onCopy, onCut, onTag, onShiftClick }) {
  const [imgError, setImgError] = useState(false);
  const [ctxMenu, setCtxMenu] = useState(null);
  const isVideo = item.type === 'video';
  const isFolder = item.type === 'folder';
  const longPressTimer = useRef(null);

  const startLongPress = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => onLongPress?.(item.path), 450);
  }, [onLongPress, item.path]);
  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  }, []);

  const tagCount = item.tags?.length || 0;
  const visibleTags = item.tags?.slice(0, 2) || [];
  const thumbnailSrc = isFolder ? (item.preview ? thumbnailUrl({ type: item.preview.type, path: item.preview.path }) : null) : thumbnailUrl(item);

  const handleClick = (e) => {
    // ignore right-click / middle-click
    if (e.button !== 0) return;
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      onToggleSelect?.(item.path);
      return;
    }
    if (e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      window.getSelection()?.removeAllRanges();
      onShiftClick?.(item.path);
      return;
    }
    onOpen?.(item);
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY });
  };

  const ctxItems = [
    { label: selected ? 'Deselect' : 'Select', onClick: () => onToggleSelect?.(item.path), shortcut: 'Ctrl+Click' },
    { label: 'Toggle Favorite', onClick: () => onToggleFavorite?.(item) },
    { separator: true },
    ...(onMove ? [{ label: 'Move', icon: <Move size={12} />, onClick: () => onMove?.([item]) }] : []),
    ...(onCopy ? [{ label: 'Copy', icon: <Copy size={12} />, onClick: () => onCopy?.([item]) }] : []),
    ...(onCut ? [{ label: 'Cut', icon: <Scissors size={12} />, onClick: () => onCut?.([item]) }] : []),
    ...(onTag ? [{ label: 'Tag', icon: <Tags size={12} />, onClick: () => onTag?.([item]) }] : []),
    { separator: true },
    ...(onDelete ? [{ label: 'Delete', icon: <Trash2 size={12} />, onClick: () => { if (confirm('Delete?')) onDelete(); }, danger: true }] : []),
  ];

  return (
    <article
      className={`relative group rounded-xl overflow-hidden bg-surface-2 border border-border/40 cursor-pointer card-hover ${
        selected ? 'ring-2 ring-brand ring-offset-2 ring-offset-surface-0' : ''
      }`}
      onClick={handleClick}
      onPointerDown={startLongPress}
      onPointerUp={clearLongPress}
      onPointerLeave={clearLongPress}
      onContextMenu={handleContextMenu}
    >
      {/* thumbnail area */}
      <div className={`relative ${isFolder ? 'aspect-[4/5]' : 'aspect-[3/4]'} bg-surface-3 overflow-hidden`}>
        {isFolder && !item.preview ? (
          <div className="w-full h-full flex items-center justify-center text-4xl">
            <FolderOpen size={48} className="text-text-muted/40" />
          </div>
        ) : imgError ? (
          <div className="w-full h-full flex items-center justify-center text-text-muted">
            <Film size={32} />
          </div>
        ) : (
          <img
            src={thumbnailSrc || ''}
            alt={item.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        )}

        {/* video overlay */}
        {isVideo && !imgError && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent">
            <span className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 rounded-md bg-black/50 text-[10px] font-medium">
              <Play size={10} fill="white" /> Video
            </span>
          </div>
        )}

        {/* folder badge */}
        {isFolder && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/50 text-[10px] font-medium text-white/80">📁</span>
        )}

        {/* hover overlay — actions */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 pointer-events-none">
          {/* favorite button */}
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite?.(item); }}
            className={`pointer-events-auto absolute top-2 right-2 btn-icon w-8 h-8 glass transition-all duration-200 ${
              item.favorite ? 'opacity-100 text-yellow-400' : 'opacity-0 group-hover:opacity-100 text-white/80 hover:text-yellow-300'
            }`}
          >
            <Star size={15} fill={item.favorite ? 'currentColor' : 'none'} />
          </button>

          {/* select checkbox — always visible */}
          <div
            className={`pointer-events-auto absolute bottom-2 right-2 w-5 h-5 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all ${
              selected ? 'border-brand bg-brand' : 'border-white/50 bg-black/40 hover:border-white/80'
            }`}
            onClick={(e) => { e.stopPropagation(); onToggleSelect?.(item.path); }}
          >
            {selected && <span className="text-white text-[10px]">✓</span>}
          </div>

          {/* delete button */}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
              className="pointer-events-auto absolute top-2 left-2 btn-icon w-7 h-7 glass opacity-0 group-hover:opacity-100 text-white/60 hover:text-danger transition-all"
              title="Delete"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* info */}
      <div className="px-3 py-2 space-y-0.5">
        {visibleTags.length > 0 && (
          <div className="flex flex-wrap gap-0.5">
            {visibleTags.map((tag) => (
              <span
                key={tag.id}
                className="px-1.5 py-0.5 rounded text-[9px] font-medium truncate max-w-[80px]"
                style={{ backgroundColor: (tag.color || '#64748b') + '18', color: tag.color || '#94a3b8' }}
              >
                {tag.name}
              </span>
            ))}
            {tagCount > 2 && <span className="text-[9px] text-text-muted">+{tagCount - 2}</span>}
          </div>
        )}
        <p className="text-[11px] text-text-secondary truncate leading-tight" title={item.path}>
          {item.name}
        </p>
        {isFolder && (
          <p className="text-[9px] text-text-muted">📁 folder</p>
        )}
      </div>

      {/* context menu */}
      {ctxMenu && <ContextMenu x={ctxMenu.x} y={ctxMenu.y} items={ctxItems} onClose={() => setCtxMenu(null)} />}
    </article>
  );
}
