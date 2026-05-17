import { ArrowUpDown, Layers } from 'lucide-react';

export default function QuickFilters({ sortBy, setSortBy, sortDir, setSortDir, groupByTag, onGroupToggle, groupCategory, onGroupCategoryChange, tagsTree }) {
  const sorts = [
    { value: 'name', label: 'Name' },
    { value: 'modifiedAt', label: 'Modified' },
    { value: 'createdAt', label: 'Created' },
    { value: 'size', label: 'Size' },
    { value: 'path', label: 'Path' },
  ];

  const categories = (tagsTree || []).filter((c) => !c.parentId);

  return (
    <div className="flex items-center gap-2 px-2 py-1 flex-wrap">
      {/* group toggle */}
      {categories.length > 0 && (
        <>
          <button
            onClick={onGroupToggle}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
              groupByTag ? 'bg-brand/15 text-brand-glow' : 'bg-surface-2 text-text-muted hover:text-text-secondary border border-border'
            }`}
            title="Group by tag"
          >
            <Layers size={13} />
            <span className="hidden sm:inline">Group</span>
          </button>
          {groupByTag && (
            <select
              value={groupCategory || ''}
              onChange={(e) => onGroupCategoryChange?.(e.target.value || null)}
              className="bg-surface-2 border border-border rounded-lg px-2 py-1 text-xs text-text-secondary"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
        </>
      )}

      {/* sort */}
      <div className="flex items-center gap-1.5 text-xs text-text-muted">
        <ArrowUpDown size={13} />
        <select
          value={sortBy}
          onChange={(e) => setSortBy?.(e.target.value)}
          className="bg-transparent border-none outline-none text-xs text-text-secondary cursor-pointer"
        >
          {sorts.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <button
          onClick={() => setSortDir?.(sortDir === 'asc' ? 'desc' : 'asc')}
          className="px-1.5 py-0.5 rounded-md bg-surface-2 border border-border text-text-muted hover:text-text-primary text-xs transition-colors"
        >
          {sortDir === 'asc' ? '↑' : '↓'}
        </button>
      </div>
    </div>
  );
}
