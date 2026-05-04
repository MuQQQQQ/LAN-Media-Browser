import { mediaUrl } from '../api.js';
import VideoPlayer from './VideoPlayer.jsx';

export default function FileGrid({ items, selectedPaths, onToggleSelect, onOpenFolder, onLongPressSelect }) {
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
                            <button className="folder" onClick={() => onOpenFolder(item.path)}>📁</button>
                        ) : item.type === 'image' ? (
                            <img loading="lazy" src={mediaUrl(item.path)} alt={item.name} />
                        ) : (
                            <VideoPlayer file={item} />
                        )}
                        <div className="filename" title={item.path}>{item.name}</div>
                    </article>
                );
            })}
        </div>
    );
}