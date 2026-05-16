import { browseUrl, thumbnailUrl } from '../api.js';

function formatBytes(value) {
    if (!Number.isFinite(value)) return '';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = value;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex += 1;
    }
    return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatDate(value) {
    if (!value) return '';
    return new Date(value).toLocaleString();
}

export default function FileGrid({ items, selectedPaths, onToggleSelect, onOpenFolder, onLongPressSelect, onOpenFile, onToggleFavorite, onDeleteItem, onRenameItem, onMoveItems, onCopyItems, onCutItems, onPasteItems, onTagItems, pageSize }) {
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
                        <div className="card-actions">
                            <button title="Rename" onClick={() => onRenameItem?.(item)}>Rename</button>
                            <button title="Move" onClick={() => onMoveItems?.([item])}>Move</button>
                            <button title="Copy" onClick={() => onCopyItems?.([item])}>Copy</button>
                            <button title="Cut" onClick={() => onCutItems?.([item])}>Cut</button>
                            <button title="Paste here" disabled={item.type !== 'folder'} onClick={() => onPasteItems?.(item.path)}>Paste</button>
                            <button title="Tag" onClick={() => onTagItems?.([item])}>Tag</button>
                        </div>
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
                        <div className="file-meta">
                            {item.type !== 'folder' && Number.isFinite(item.size) && <span>{formatBytes(item.size)}</span>}
                            {item.modifiedAt && <span title={`Created: ${formatDate(item.createdAt) || 'Unknown'}`}>Modified: {formatDate(item.modifiedAt)}</span>}
                        </div>
                    </article>
                );
            })}
        </div>
    );
}