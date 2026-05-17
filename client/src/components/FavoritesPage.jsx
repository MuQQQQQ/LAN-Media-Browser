import { useEffect, useState } from 'react';
import ContentGrid from './ui/ContentGrid.jsx';
import QuickFilters from './ui/QuickFilters.jsx';

export default function FavoritesPage({ api, pageSize, onOpenFolder, onOpenFile, onToggleFavorite, onDeleteItem, selected, onToggleSelect }) {
  const [items, setItems] = useState([]);
  const [sort, setSort] = useState('time');
  const [type, setType] = useState('all');
  const [layoutMode, setLayoutMode] = useState(() => localStorage.getItem('layoutMode') || 'grid');
  const [error, setError] = useState('');
  useEffect(() => { api.favorites({ sort, type }).then((d) => setItems(d.items)).catch((e) => setError(e.message)); }, [sort, type]);
  const toggleFavorite = async (item) => { await onToggleFavorite(item); const d = await api.favorites({ sort, type }); setItems(d.items); };
  const changeLayoutMode = (mode) => { const n = mode === 'masonry' ? 'masonry' : 'grid'; setLayoutMode(n); localStorage.setItem('layoutMode', n); };
  return (
    <div className="min-h-screen bg-surface-0">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6">
        <header className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold">Favorites</h1>
            <p className="text-sm text-text-muted">{items.length} item(s)</p>
          </div>
          <a href="/" className="btn-base btn-ghost text-xs">← Browse</a>
        </header>
        <QuickFilters sortBy={sort} setSortBy={setSort} sortDir="asc" setSortDir={() => {}} />
        {error && <div className="px-3 py-2 my-3 text-sm rounded-xl bg-danger/10 border border-danger/20 text-danger">{error}</div>}
        <div className="py-4">
          <ContentGrid items={items} selectedPaths={selected} layoutMode={layoutMode} onLayoutModeChange={changeLayoutMode}
            onToggleSelect={onToggleSelect} onOpenFolder={onOpenFolder} onLongPressSelect={onToggleSelect}
            onOpenFile={onOpenFile} onToggleFavorite={toggleFavorite} onDeleteItem={onDeleteItem}
            onMoveItems={undefined} onCopyItems={undefined} onCutItems={undefined} onTagItems={undefined} pageSize={pageSize} />
        </div>
      </div>
    </div>
  );
}
