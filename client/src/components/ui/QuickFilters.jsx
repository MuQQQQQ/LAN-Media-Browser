import { Image, Film, FolderOpen, Calendar, ArrowUpDown } from 'lucide-react';

export default function QuickFilters({ type, setType, sortBy, setSortBy, sortDir, setSortDir, onReset }) {
  const types = [
    { value: 'all', label: 'All', icon: null },
    { value: 'image', label: 'Images', icon: Image },
    { value: 'video', label: 'Videos', icon: Film },
    { value: 'folder', label: 'Folders', icon: FolderOpen },
  ];

  const sorts = [
    { value: 'name', label: 'Name' },
    { value: 'modifiedAt', label: 'Modified' },
    { value: 'createdAt', label: 'Created' },
    { value: 'size', label: 'Size' },
  ];

  return (
    <div className="flex items-center gap-3 px-2 py-2 flex-wrap justify-center">
      {/* type chips */}
      <div className="flex gap-1 bg-surface-2/60 rounded-xl p-1 border border-border">
        {types.map((t) => (
          <button
            key={t.value}
            onClick={() => { setType?.(t.value); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
              type === t.value
                ? 'bg-brand text-white shadow-sm'
                : 'text-text-muted hover:text-text-secondary hover:bg-surface-3/50'
            }`}
          >
            {t.icon && <t.icon size={13} />}
            {t.label}
          </button>
        ))}
      </div>

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
