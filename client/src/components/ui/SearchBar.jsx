import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, SlidersHorizontal, Clock, Bookmark } from 'lucide-react';

export default function SearchBar({ tagsTree, filters, setFilters, onSearch, onClear, history = [], saved = [], onSave }) {
  const [focused, setFocused] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const query = filters.q || filters.name || '';
  const hasQuery = query.trim().length > 0;

  const suggestions = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term || term.length < 1) return [];
    return tagsTree
      .flatMap((cat) => cat.children.map((t) => ({ ...t, category: cat.name })))
      .filter((t) => t.name.toLowerCase().includes(term) || t.category.toLowerCase().includes(term))
      .slice(0, 6);
  }, [query, tagsTree]);

  const toggleTag = (id) => {
    setFilters((f) => ({
      ...f,
      tags: f.tags.includes(id) ? f.tags.filter((x) => x !== id) : [...f.tags, id],
      tagSearchEnabled: true,
    }));
  };

  return (
    <div className="relative w-full max-w-3xl mx-auto px-2">
      {/* main search bar */}
      <motion.div
        className={`relative flex items-center rounded-2xl border transition-all duration-200 ${
          focused
            ? 'border-brand/40 bg-surface-2 shadow-lg shadow-brand/5'
            : 'border-border bg-surface-2/60'
        }`}
        animate={focused ? { scale: 1.01 } : { scale: 1 }}
      >
        <Search size={18} className="ml-4 text-text-muted shrink-0" />
        <input
          className="flex-1 bg-transparent border-none outline-none px-3 py-3 text-sm placeholder:text-text-muted"
          placeholder="Search by name, tag, or path…"
          value={query}
          onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value, name: e.target.value }))}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          onKeyDown={(e) => { if (e.key === 'Enter') onSearch?.(); }}
        />
        {hasQuery && (
          <button onClick={() => setFilters((f) => ({ ...f, q: '', name: '' }))} className="mr-2 btn-icon w-7 h-7 text-text-muted hover:text-text-primary">
            <X size={14} />
          </button>
        )}
        <button
          onClick={() => setShowAdvanced((x) => !x)}
          className={`mr-1.5 btn-icon w-8 h-8 transition-colors ${showAdvanced ? 'text-brand-glow bg-brand/10' : 'text-text-muted hover:text-text-secondary'}`}
          title="Advanced filters"
        >
          <SlidersHorizontal size={16} />
        </button>
        <button
          disabled={!hasQuery && (!filters.tags || !filters.tags.length)}
          onClick={onSearch}
          className="mr-1.5 btn-base btn-primary text-xs py-1.5 px-4 rounded-xl"
        >
          Search
        </button>
      </motion.div>

      {/* dropdown: suggestions + history */}
      <AnimatePresence>
        {focused && (hasQuery || suggestions.length > 0 || history.length > 0) && (
          <motion.div
            className="absolute left-2 right-2 top-full mt-2 rounded-xl border border-border bg-surface-1 shadow-2xl overflow-hidden z-20"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          >
            {/* tag suggestions */}
            {suggestions.length > 0 && (
              <div className="p-3 border-b border-border">
                <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2">Matching Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => {
                        setFilters((f) => ({ ...f, q: tag.name, name: tag.name }));
                        onSearch?.();
                      }}
                      className="px-2.5 py-1 rounded-full text-xs font-medium bg-surface-3 hover:bg-surface-4 transition-colors border border-border"
                      style={{ color: tag.color || '#94a3b8' }}
                    >
                      {tag.category} / {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* recent history */}
            {history.length > 0 && !hasQuery && (
              <div className="p-3 border-b border-border">
                <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1"><Clock size={11} /> Recent</p>
                <div className="space-y-0.5">
                  {history.slice(0, 5).map((entry, i) => (
                    <button
                      key={i}
                      onClick={() => { setFilters({ ...entry.filters }); onSearch?.(); }}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-text-secondary hover:bg-surface-3 hover:text-text-primary transition-colors"
                    >
                      {entry.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* saved searches */}
            {saved.length > 0 && !hasQuery && (
              <div className="p-3">
                <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1"><Bookmark size={11} /> Saved</p>
                <div className="space-y-0.5">
                  {saved.map((entry, i) => (
                    <button
                      key={i}
                      onClick={() => { setFilters({ ...entry.filters }); onSearch?.(); }}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-text-secondary hover:bg-surface-3 hover:text-text-primary transition-colors"
                    >
                      {entry.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* advanced filters panel */}
      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            className="mt-3 p-4 rounded-xl border border-border bg-surface-2/60 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"
            initial={{ height: 0, opacity: 0, marginTop: 0 }}
            animate={{ height: 'auto', opacity: 1, marginTop: 12 }}
            exit={{ height: 0, opacity: 0, marginTop: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            <label className="flex flex-col gap-1 text-xs text-text-muted">
              Match
              <select className="bg-surface-3 border border-border rounded-lg px-2 py-1.5 text-xs text-text-primary" value={filters.matchType || 'contains'} onChange={(e) => setFilters((f) => ({ ...f, matchType: e.target.value }))}>
                <option value="contains">Contains</option>
                <option value="exact">Exact</option>
                <option value="starts">Starts with</option>
                <option value="ends">Ends with</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-text-muted">
              Scope
              <select className="bg-surface-3 border border-border rounded-lg px-2 py-1.5 text-xs text-text-primary" value={filters.scope || 'both'} onChange={(e) => setFilters((f) => ({ ...f, scope: e.target.value }))}>
                <option value="both">Name + Tags</option>
                <option value="name">Name only</option>
                <option value="tags">Tags only</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-text-muted">
              Path contains
              <input className="bg-surface-3 border border-border rounded-lg px-2 py-1.5 text-xs text-text-primary placeholder:text-text-muted" placeholder="folder/name" value={filters.pathFilter || ''} onChange={(e) => setFilters((f) => ({ ...f, pathFilter: e.target.value }))} />
            </label>
            <label className="flex flex-col gap-1 text-xs text-text-muted">
              Date from
              <input type="date" className="bg-surface-3 border border-border rounded-lg px-2 py-1.5 text-xs text-text-primary" value={filters.dateFrom || ''} onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))} />
            </label>
            <label className="flex flex-col gap-1 text-xs text-text-muted">
              Date to
              <input type="date" className="bg-surface-3 border border-border rounded-lg px-2 py-1.5 text-xs text-text-primary" value={filters.dateTo || ''} onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))} />
            </label>
            <label className="flex items-center gap-2 text-xs text-text-muted pt-5">
              <input type="checkbox" className="accent-brand" checked={!!filters.caseSensitive} onChange={(e) => setFilters((f) => ({ ...f, caseSensitive: e.target.checked }))} />
              Case sensitive
            </label>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
