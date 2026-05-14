import { useEffect, useMemo, useState } from 'react';
import TagGroupList from './TagGroupList.jsx';

const HISTORY_KEY = 'lan-media-search-history';

export default function SearchPanel({ tagsTree, filters, setFilters, onSearch, onClear }) {
    const [advancedOpen, setAdvancedOpen] = useState(false);
    const [history, setHistory] = useState(() => {
        try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
    });
    const queryValue = filters.q ?? filters.name ?? '';
    const hasTyped = queryValue.trim().length > 0;
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
        const label = queryValue.trim() || (filters.tags.length ? filters.tags.map((id) => tagNameById.get(id) || `#${id}`).join(', ') : 'All files');
        const entry = { label, filters: { ...filters }, at: Date.now() };
        setHistory((items) => [entry, ...items.filter((item) => JSON.stringify(item.filters) !== JSON.stringify(entry.filters))].slice(0, 12));
        onSearch();
    };
    const applyHistory = (entry) => setFilters({ ...entry.filters });
    const suggestions = useMemo(() => {
        const term = queryValue.trim().toLowerCase();
        if (!term) return [];
        return tagsTree.flatMap((category) => category.children.map((tag) => ({ ...tag, label: `${category.name} / ${tag.name}` }))).filter((tag) => tag.label.toLowerCase().includes(term) || tag.name.toLowerCase().includes(term)).slice(0, 8);
    }, [queryValue, tagsTree]);
    return (
        <section className="panel search-panel">
            <div className="search-entry">
                <button className="advanced-toggle" title="Advanced Options" onClick={() => setAdvancedOpen((x) => !x)}>{advancedOpen ? '▾' : '▸'}</button>
                <input placeholder="Search names and tags…" value={queryValue} onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value, name: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter') search(); }} />
                <button disabled={!filters.name.trim() && !filters.tags.length} onClick={search}>Search</button>
            </div>
            {suggestions.length > 0 && <div className="tag-suggestions">{suggestions.map((tag) => <button key={tag.id} className="history-chip" onClick={() => setFilters((f) => ({ ...f, q: tag.name, name: tag.name }))}>{tag.label}</button>)}</div>}
            {history.length > 0 && <div className="search-history"><span className="muted">Recent:</span>{history.map((entry) => <button key={entry.at} className="history-chip" onClick={() => applyHistory(entry)}>{entry.label}</button>)}</div>}
            {(showOptions || advancedOpen) && <div className="search-options">
                {advancedOpen && <div className="advanced-options">
                    <label>Match type<select value={filters.matchType || 'contains'} onChange={(e) => setFilters((f) => ({ ...f, matchType: e.target.value }))}><option value="contains">Contains</option><option value="exact">Exact match</option><option value="starts">Starts with</option><option value="ends">Ends with</option></select></label>
                    <label>Search scope<select value={filters.scope || 'both'} onChange={(e) => setFilters((f) => ({ ...f, scope: e.target.value }))}><option value="both">Name + Tags</option><option value="name">Name only</option><option value="tags">Tags only</option></select></label>
                    <label>File type<select value={filters.itemType || 'all'} onChange={(e) => setFilters((f) => ({ ...f, itemType: e.target.value }))}><option value="all">All</option><option value="image">Images</option><option value="video">Videos</option><option value="folder">Folders</option><option value="file">Files</option></select></label>
                    <label className="inline-check"><input type="checkbox" checked={!!filters.caseSensitive} onChange={(e) => setFilters((f) => ({ ...f, caseSensitive: e.target.checked }))} /> Case sensitive</label>
                </div>}
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