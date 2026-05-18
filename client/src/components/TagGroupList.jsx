import { useState } from 'react';

export default function TagGroupList({ tagsTree, selectedTagIds = [], onToggleTag, displayMode = 'collapsed', limit = 12, recentHighlight = true }) {
    const [expanded, setExpanded] = useState({});
    return (
        <div className="space-y-3">
            {tagsTree.map((category) => {
                const sorted = [...category.children].sort((a, b) => {
                    const at = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
                    const bt = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;
                    return bt - at;
                });
                const isExpanded = expanded[category.id] ?? displayMode === 'expanded';
                const visibleTags = isExpanded ? sorted : sorted.slice(0, limit);
                return (
                    <div key={category.id} className="space-y-1.5">
                        <h4 className="flex items-center gap-1.5 text-xs font-semibold text-text-muted">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: category.color || '#64748b' }} />
                            {category.name}
                        </h4>
                        <div className="flex flex-wrap gap-1">
                            {visibleTags.map((tag) => {
                                const selected = selectedTagIds.includes(tag.id);
                                const recent = recentHighlight && tag.lastUsedAt;
                                return (
                                    <button
                                        key={tag.id}
                                        onClick={() => onToggleTag?.(tag.id)}
                                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-150 border ${selected
                                            ? 'bg-brand/20 border-brand/50 text-brand-glow shadow-sm shadow-brand/10'
                                            : 'bg-surface-3/50 border-transparent text-text-secondary hover:border-border hover:text-text-primary'
                                            } ${recent ? 'ring-1 ring-text-muted/30' : ''}`}
                                        style={{ color: selected ? undefined : tag.color || '#94a3b8', backgroundColor: (tag.color || '#64748b') + '15', borderColor: (tag.color || '#64748b') + '70' }}
                                    >
                                        {tag.name}
                                    </button>
                                );
                            })}
                        </div>
                        {category.children.length > limit && (
                            <button
                                onClick={() => setExpanded((x) => ({ ...x, [category.id]: !isExpanded }))}
                                className="text-[10px] text-text-muted hover:text-text-secondary transition-colors"
                            >
                                {isExpanded ? 'Show less' : `+${category.children.length - limit} more`}
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
