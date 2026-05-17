import { useState } from 'react';
import { Play, Film, Star } from 'lucide-react';
import { thumbnailUrl } from '../../api.js';

export default function MediaCard({ item, selected, layout, onOpen, onToggleSelect, onToggleFavorite, onLongPress }) {
  const [imgError, setImgError] = useState(false);
  const isVideo = item.type === 'video';
  const isFolder = item.type === 'folder';
  let longPressTimer;

  const startLongPress = () => { longPressTimer = setTimeout(() => onLongPress?.(item.path), 450); };
  const clearLongPress = () => clearTimeout(longPressTimer);

  const tagCount = item.tags?.length || 0;
  const visibleTags = item.tags?.slice(0, 3) || [];

  return (
    <article
      className={`relative group rounded-xl overflow-hidden bg-surface-2 border border-border/40 cursor-pointer card-hover animate-card-in ${
        selected ? 'ring-2 ring-brand ring-offset-2 ring-offset-surface-0' : ''
      }`}
      onPointerDown={startLongPress}
      onPointerUp={clearLongPress}
      onPointerLeave={clearLongPress}
      onClick={() => { if (isFolder) return; onOpen?.(item); }}
    >
      {/* thumbnail */}
      <div className="relative aspect-[4/3] bg-surface-3 overflow-hidden">
        {isFolder ? (
          <div className="w-full h-full flex items-center justify-center text-4xl">📁</div>
        ) : imgError ? (
          <div className="w-full h-full flex items-center justify-center text-text-muted">
            <Film size={32} />
          </div>
        ) : (
          <img
            src={thumbnailUrl(item)}
            alt={item.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        )}

        {/* video overlay */}
        {isVideo && !imgError && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent">
            <span className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 rounded-md bg-black/50 text-xs font-medium">
              <Play size={12} fill="white" /> Video
            </span>
          </div>
        )}

        {/* hover overlay — actions */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200">
          {/* favorite button */}
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite?.(item); }}
            className={`absolute top-2 right-2 btn-icon w-8 h-8 glass transition-all duration-200 ${
              !isFolder ? 'opacity-0 group-hover:opacity-100' : ''
            } ${item.favorite ? 'opacity-100 text-yellow-400' : 'text-white/80 hover:text-yellow-300'}`}
          >
            <Star size={15} fill={item.favorite ? 'currentColor' : 'none'} />
          </button>

          {/* select checkbox */}
          <label
            className={`absolute top-2 left-2 w-5 h-5 rounded-md border-2 border-white/40 bg-black/30 flex items-center justify-center cursor-pointer transition-all ${
              !isFolder ? 'opacity-0 group-hover:opacity-100' : ''
            } ${selected ? 'opacity-100 border-brand bg-brand' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggleSelect?.(item.path)}
              className="sr-only"
            />
            {selected && <span className="text-white text-xs">✓</span>}
          </label>
        </div>
      </div>

      {/* info */}
      {!isFolder && (
        <div className="px-3 py-2.5 space-y-1">
          {/* tags */}
          {visibleTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {visibleTags.map((tag) => (
                <span
                  key={tag.id}
                  className="px-1.5 py-0.5 rounded-md text-[10px] font-medium truncate max-w-[100px]"
                  style={{ backgroundColor: (tag.color || '#64748b') + '18', color: tag.color || '#94a3b8' }}
                >
                  {tag.name}
                </span>
              ))}
              {tagCount > 3 && <span className="text-[10px] text-text-muted">+{tagCount - 3}</span>}
            </div>
          )}
          {/* filename */}
          <p className="text-xs text-text-secondary truncate leading-tight" title={item.path}>
            {item.name}
          </p>
        </div>
      )}
    </article>
  );
}
