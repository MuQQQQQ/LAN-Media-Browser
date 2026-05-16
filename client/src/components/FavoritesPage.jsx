import { useEffect, useState } from 'react';
import FileGrid from './FileGrid.jsx';

export default function FavoritesPage({ api, pageSize, onOpenFolder, onOpenFile, onToggleFavorite, onDeleteItem, selected, onToggleSelect }) {
    const [items, setItems] = useState([]);
    const [sort, setSort] = useState('time');
    const [type, setType] = useState('all');
    const [layoutMode, setLayoutMode] = useState(() => localStorage.getItem('layoutMode') || 'grid');
    const [error, setError] = useState('');
    useEffect(() => {
        api.favorites({ sort, type }).then((data) => setItems(data.items)).catch((err) => setError(err.message));
    }, [sort, type]);
    const toggleFavorite = async (item) => {
        await onToggleFavorite(item);
        const data = await api.favorites({ sort, type });
        setItems(data.items);
    };
    const changeLayoutMode = (mode) => {
        const next = mode === 'stream' ? 'stream' : 'grid';
        setLayoutMode(next);
        localStorage.setItem('layoutMode', next);
    };
    return (
        <main>
            <header className="app-header"><div><h1>Favorites</h1><p>{items.length} favorited item(s)</p></div><a className="button-link" href="/">Back to browser</a></header>
            <section className="toolbar">
                <label>Sort <select value={sort} onChange={(e) => setSort(e.target.value)}><option value="time">Recently added</option><option value="name">Name</option></select></label>
                <label>Type <select value={type} onChange={(e) => setType(e.target.value)}><option value="all">All</option><option value="file">Files</option><option value="folder">Folders</option></select></label>
            </section>
            {error && <div className="error">{error}</div>}
            <FileGrid items={items} selectedPaths={selected} layoutMode={layoutMode} onLayoutModeChange={changeLayoutMode} onToggleSelect={onToggleSelect} onOpenFolder={onOpenFolder} onLongPressSelect={onToggleSelect} onOpenFile={onOpenFile} onToggleFavorite={toggleFavorite} onDeleteItem={onDeleteItem} pageSize={pageSize} />
        </main>
    );
}