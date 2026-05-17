import { useMemo } from 'react';
import { LayoutGrid, Columns } from 'lucide-react';
import MediaCard from './MediaCard.jsx';

export default function ContentGrid({
  items,
  selectedPaths,
  layoutMode,
  onLayoutModeChange,
  onToggleSelect,
  onOpenFolder,
  onLongPressSelect,
  onOpenFile,
  onToggleFavorite,
  pageSize,
}) {
  const folders = useMemo(() => items.filter((i) => i.type === 'folder'), [items]);
  const media = useMemo(() => items.filter((i) => i.type !== 'folder'), [items]);

  return (
    <div className="space-y-4">
      {/* layout toggle */}
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-text-muted">
          {items.length} item{items.length !== 1 ? 's' : ''}
        </p>
        <div className="flex gap-1 bg-surface-2 rounded-lg p-0.5 border border-border">
          <button
            onClick={() => onLayoutModeChange?.('grid')}
            className={`p-1.5 rounded-md transition-colors ${layoutMode === 'grid' ? 'bg-surface-3 text-brand-glow' : 'text-text-muted hover:text-text-secondary'}`}
            title="Grid"
          >
            <LayoutGrid size={15} />
          </button>
          <button
            onClick={() => onLayoutModeChange?.('masonry')}
            className={`p-1.5 rounded-md transition-colors ${layoutMode === 'masonry' ? 'bg-surface-3 text-brand-glow' : 'text-text-muted hover:text-text-secondary'}`}
            title="Masonry"
          >
            <Columns size={15} />
          </button>
        </div>
      </div>

      {/* folders section */}
      {folders.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {folders.map((item) => (
            <button
              key={`folder:${item.path}`}
              className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-surface-2 border border-border/60 card-hover text-center"
              onClick={() => onOpenFolder?.(item.path)}
            >
              <span className="text-3xl">📁</span>
              <span className="text-xs text-text-secondary truncate w-full">{item.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* media grid */}
      <div
        className={
          layoutMode === 'masonry'
            ? 'columns-2 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6 gap-3 space-y-3'
            : 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3'
        }
      >
        {media.map((item) => (
          <div key={`${item.type}:${item.path}`} className={layoutMode === 'masonry' ? 'break-inside-avoid' : ''}>
            <MediaCard
              item={item}
              selected={selectedPaths?.has(item.path)}
              layout={layoutMode}
              onOpen={onOpenFile}
              onToggleSelect={onToggleSelect}
              onToggleFavorite={onToggleFavorite}
              onLongPress={onLongPressSelect}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
