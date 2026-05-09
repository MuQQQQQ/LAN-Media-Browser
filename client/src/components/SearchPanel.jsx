import { useEffect, useMemo, useState } from 'react';
import TagGroupList from './TagGroupList.jsx';

const HISTORY_KEY = 'lan-media-search-history';

export default function SearchPanel({ tagsTree, filters, setFilters, onSearch, onClear }) {
    const [history, setHistory] = useState(() => {
        try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
    });
    const hasTyped = filters.name.trim().length > 0;
    const showOptions = hasTyped || filters.tagSearchEnabled || filters.tags.length > 0;
    const tagNameById = useMemo(() => new Map(tagsTree.flatMap((category) => category.children.map((tag) => [tag.id, `${category.name} / ${tag.name}`]))), [tagsTree]);

    useEffect(() => {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 12)));
    }, [history]);

    const toggleTag = (id) => {
        setFilters((current) => ({
            ...current,
            tags: current.tags.includes(id) ? current.tags.filter((tagId) => tagId !== id) : [...current.tags, id]
        }));
    };
    const search = () => {
        const label = filters.name.trim() || (filters.tags.length ? filters.tags.map((id) => tagNameById.get(id) || `#${id}`).join(', ') : 'All files');
        const entry = { label, filters: { ...filters }, at: Date.now() };
        setHistory((items) => [entry, ...items.filter((item) => JSON.stringify(item.filters) !== JSON.stringify(entry.filters))].slice(0, 12));
        onSearch();
    };
    const applyHistory = (entry) => setFilters({ ...entry.filters });
    return (
        <section className="panel search-panel">
            <div className="search-entry">
                <input placeholder="Search by file name…" value={filters.name} onChange={(e) => setFilters((f) => ({ ...f, name: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter') search(); }} />
                <button disabled={!filters.name.trim() && !filters.tags.length} onClick={search}>Search</button>
            </div>
            {history.length > 0 && <div className="search-history"><span className="muted">Recent:</span>{history.map((entry) => <button key={entry.at} className="history-chip" onClick={() => applyHistory(entry)}>{entry.label}</button>)}</div>}
            {showOptions && <div className="search-options">
                <label className="inline-check"><input type="checkbox" checked={filters.tagSearchEnabled} onChange={(e) => setFilters((f) => ({ ...f, tagSearchEnabled: e.target.checked, tags: e.target.checked ? f.tags : [] }))} /> Enable tag search</label>
                {filters.tagSearchEnabled && <>
                    <div className="mode-toggle">
                        <label><input type="radio" checked={filters.tagMode === 'and'} onChange={() => setFilters((f) => ({ ...f, tagMode: 'and' }))} /> Match all selected tags</label>
                        <label><input type="radio" checked={filters.tagMode === 'or'} onChange={() => setFilters((f) => ({ ...f, tagMode: 'or' }))} /> Match any selected tag</label>
                    </div>
                    <TagGroupList tagsTree={tagsTree} selectedTagIds={filters.tags} onToggleTag={toggleTag} displayMode="collapsed" limit={10} />
                </>}
                <div className="actions"><button className="secondary" onClick={onClear}>Clear filters</button></div>
            </div>}
        </section>
    );
}