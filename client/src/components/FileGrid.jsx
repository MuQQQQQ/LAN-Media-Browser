import { browseUrl, mediaUrl, thumbnailUrl } from '../api.js';
import ReactPlayer from 'react-player'
import VideoPlayer from './VideoPlayer.jsx';
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

export default function FileGrid({ items, selectedPaths, layoutMode = 'grid', onLayoutModeChange, onToggleSelect, onOpenFolder, onLongPressSelect, onOpenFile, onToggleFavorite, onDeleteItem, onRenameItem, onMoveItems, onCopyItems, onCutItems, onPasteItems, onTagItems, pageSize }) {
    let longPressTimer;
    const startLongPress = (item) => {
        longPressTimer = setTimeout(() => onLongPressSelect(item.path), 450);
    };
    const clearLongPress = () => clearTimeout(longPressTimer);

    const renderActions = (item) => (
        <div className="card-actions">
            <button title="Rename" onClick={() => onRenameItem?.(item)}>Rename</button>
            <button title="Move" onClick={() => onMoveItems?.([item])}>Move</button>
            <button title="Copy" onClick={() => onCopyItems?.([item])}>Copy</button>
            <button title="Cut" onClick={() => onCutItems?.([item])}>Cut</button>
            <button title="Paste here" disabled={item.type !== 'folder'} onClick={() => onPasteItems?.(item.path)}>Paste</button>
            <button title="Tag" onClick={() => onTagItems?.([item])}>Tag</button>
        </div>
    );

    const renderInfo = (item) => (
        <>
            {item.tags?.length > 0 && <div className="card-tags">{item.tags.slice(0, 3).map((tag) => <span key={tag.id} className="mini-tag" style={{ '--tag-color': tag.color || '#64748b' }}>{tag.name}</span>)}</div>}
            <div className="filename" title={item.path}>{item.name}</div>
            <div className="file-meta">
                {item.type !== 'folder' && Number.isFinite(item.size) && <span>{formatBytes(item.size)}</span>}
                {item.modifiedAt && <span title={`Created: ${formatDate(item.createdAt) || 'Unknown'}`}>Modified: {formatDate(item.modifiedAt)}</span>}
            </div>
        </>
    );

    return (
        <section className="file-grid-section">
            <div className="layout-toggle" aria-label="Layout mode">
                <button className={layoutMode === 'grid' ? 'active' : 'secondary'} onClick={() => onLayoutModeChange?.('grid')}>Grid View</button>
                <button className={layoutMode === 'stream' ? 'active' : 'secondary'} onClick={() => onLayoutModeChange?.('stream')}>Stream View</button>
            </div>
        <div className={layoutMode === 'stream' ? 'stream-list' : 'grid'}>
            {items.map((item) => {
                const selected = selectedPaths.has(item.path);
                if (layoutMode === 'stream') {
                    return (
                        <article key={`${item.type}:${item.path}`} className={`stream-item ${selected ? 'selected' : ''}`}>
                            {item.type === 'folder' ? (
                                <a className="stream-folder" href={browseUrl(item.path, pageSize)} onClick={(event) => { event.preventDefault(); onOpenFolder(item.path); }}>📁 {item.name}</a>
                            ) : item.type === 'image' ? (
                                <button className="stream-media-button" onClick={() => onOpenFile(item)}><img loading="lazy" src={mediaUrl(item.path)} alt={item.name} /></button>
                            ) : item.type === 'video' ? (
                                <video className="stream-video" controls preload="metadata" playsInline src={mediaUrl(item.path)} />
                                // <VideoPlayer item={item} url={mediaUrl(item.path)} />
                            ) : null}
                        </article>
                    );
                }
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
                        {/* {renderActions(item)} */}
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
                        {renderInfo(item)}
                    </article>
                );
            })}
        </div>
        </section>
    );
}