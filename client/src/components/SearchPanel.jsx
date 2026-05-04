export default function SearchPanel({ tagsTree, filters, setFilters, onSearch, onClear }) {
    const toggleTag = (id) => {
        setFilters((current) => ({
            ...current,
            tags: current.tags.includes(id) ? current.tags.filter((tagId) => tagId !== id) : [...current.tags, id]
        }));
    };
    return (
        <section className="panel search-panel">
            <h2>Search files</h2>
            <input placeholder="Name contains…" value={filters.name} onChange={(e) => setFilters((f) => ({ ...f, name: e.target.value }))} />
            <div className="mode-toggle">
                <label><input type="radio" checked={filters.tagMode === 'and'} onChange={() => setFilters((f) => ({ ...f, tagMode: 'and' }))} /> AND</label>
                <label><input type="radio" checked={filters.tagMode === 'or'} onChange={() => setFilters((f) => ({ ...f, tagMode: 'or' }))} /> OR</label>
            </div>
            <div className="tag-groups">
                {tagsTree.map((category) => (
                    <div className="tag-group" key={category.id}>
                        <strong>{category.name}</strong>
                        <div className="chips">
                            {category.children.map((tag) => (
                                <button key={tag.id} className={filters.tags.includes(tag.id) ? 'chip active' : 'chip'} onClick={() => toggleTag(tag.id)}>{tag.name}</button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            <div className="actions">
                <button onClick={onSearch}>Search</button>
                <button className="secondary" onClick={onClear}>Clear filters</button>
            </div>
        </section>
    );
}