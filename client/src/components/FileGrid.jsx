import { browseUrl, thumbnailUrl } from '../api.js';

export default function FileGrid({ items, selectedPaths, onToggleSelect, onOpenFolder, onLongPressSelect, onOpenFile, onToggleFavorite, onDeleteItem, pageSize }) {
    let longPressTimer;
    const startLongPress = (item) => {
        longPressTimer = setTimeout(() => onLongPressSelect(item.path), 450);
    };
    const clearLongPress = () => clearTimeout(longPressTimer);

    return (
        <div className="grid">
            {items.map((item) => {
                const selected = selectedPaths.has(item.path);
                return (
                    <article
                        key={`${item.type}:${item.path}`}
                        className={`card ${selected ? 'selected' : ''}`}
                        onPointerDown={() => startLongPress(item)}
                        onPointerUp={clearLongPress}
                        onPointerLeave={clearLongPress}
                    >
                        <label className="check">
                            <input type="checkbox" checked={selected} onChange={() => onToggleSelect(item.path)} />
                        </label>
                        <button className={`favorite-button ${item.favorite ? 'active' : ''}`} title={item.favorite ? 'Remove from favorites' : 'Add to favorites'} onClick={() => onToggleFavorite?.(item)}>{item.favorite ? '★' : '☆'}</button>
                        <button className="delete-card-button" title="Delete item" onClick={() => onDeleteItem?.(item)}>🗑</button>
                        {item.type === 'folder' ? (
                            <a className={`folder ${item.preview ? 'folder-with-preview' : ''}`} href={browseUrl(item.path, pageSize)} target="_blank" rel="noreferrer" onClick={(event) => { event.preventDefault(); onOpenFolder(item.path); }}>
                                {item.preview ? <img loading="lazy" src={thumbnailUrl({ path: item.preview.path, type: item.preview.type })} alt={`${item.name} preview`} /> : <span className="folder-icon">📁</span>}
                                <span className="folder-badge">📁</span>
                            </a>
                        ) : (
                            <button className="thumb-button" onClick={() => onOpenFile(item)}>
                                <img loading="lazy" src={thumbnailUrl(item)} alt={item.name} />
                                {item.type === 'video' && <span className="play-overlay">▶</span>}
                            </button>
                        )}
                        {item.tags?.length > 0 && <div className="card-tags">{item.tags.slice(0, 3).map((tag) => <span key={tag.id} className="mini-tag" style={{ '--tag-color': tag.color || '#64748b' }}>{tag.name}</span>)}</div>}
                        <div className="filename" title={item.path}>{item.name}</div>
                    </article>
                );
            })}
        </div>
    );
}