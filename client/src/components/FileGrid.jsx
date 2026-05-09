import { browseUrl, thumbnailUrl } from '../api.js';

export default function FileGrid({ items, selectedPaths, onToggleSelect, onOpenFolder, onLongPressSelect, onOpenFile, pageSize }) {
    let longPressTimer;
    const startLongPress = (item) => {
        if (item.type === 'folder') return;
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
                        {item.type !== 'folder' && (
                            <label className="check">
                                <input type="checkbox" checked={selected} onChange={() => onToggleSelect(item.path)} />
                            </label>
                        )}
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
                        <div className="filename" title={item.path}>{item.name}</div>
                    </article>
                );
            })}
        </div>
    );
}