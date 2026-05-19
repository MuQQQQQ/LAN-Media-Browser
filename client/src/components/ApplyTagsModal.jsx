import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import Modal from './ui/Modal.jsx';
import TagGroupList from './TagGroupList.jsx';
import ContextMenu from './ui/ContextMenu.jsx';
import { Search, Plus, X, Trash2 } from 'lucide-react';

const MODAL_WIDTH = 'max-w-2xl';

export default function ApplyTagsModal({ open, selectedCount, tagsTree, tagSettings, onClose, onApply, onRemove, onCreateTag, onDeleteTag, analysis }) {
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [query, setQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [quickCreate, setQuickCreate] = useState(null); // { name, parentId }
  const [tagCtxMenu, setTagCtxMenu] = useState(null);
  const [removeConfirm, setRemoveConfirm] = useState(null); // { tag } to remove
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const inputRef = useRef(null);
  const lastParentKey = 'tag-create-last-parent';

  useEffect(() => { if (!open) { setSelectedTagIds([]); setQuery(''); } }, [open]);
  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  // flatten all tags for search
  const allTags = useMemo(() =>
    tagsTree.flatMap((cat) => [
      { ...cat, category: cat.name, isCat: true },
      ...cat.children.map((t) => ({ ...t, category: cat.name, isCat: false })),
    ]),
    [tagsTree]
  );

  // autocomplete results
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return allTags
      .filter((t) => t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q))
      .slice(0, 12);
  }, [query, allTags]);

  const exactMatch = query.trim() && allTags.some((t) => t.name.toLowerCase() === query.trim().toLowerCase());

  const toggle = (id) => setSelectedTagIds((ids) => ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
  const removeTag = (id) => setSelectedTagIds((ids) => ids.filter((x) => x !== id));

  const handleQuickCreate = async () => {
    if (!quickCreate?.name.trim()) return;
    setQuickCreate(null);
    const created = await onCreateTag({ name: quickCreate.name.trim(), parentId: quickCreate.parentId || undefined });
    if (created?.id) setSelectedTagIds((ids) => [...ids, created.id]);
  };

  const selectedTags = allTags.filter((t) => selectedTagIds.includes(t.id));

  return (
    <Modal open={open} onClose={onClose} title={`Tags · ${selectedCount} file(s)`} maxWidth={MODAL_WIDTH}>
      <div className="space-y-4">
        {/* analysis */}
        {(analysis?.common?.length || analysis?.partial?.length) ? (
          <div className="space-y-2">
            {analysis.common.length > 0 && (
              <div>
                <h3 className="text-xs text-text-muted mb-1.5">Common Tags</h3>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.common.map((tag) => (
                    <button key={tag.id}
                      onContextMenu={(e) => { e.preventDefault(); setRemoveConfirm({ tag }); }}
                      className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors cursor-context-menu ${selectedTagIds.includes(tag.id)
                        ? 'bg-brand/20 border-brand/50 text-brand-glow'
                        : ''
                        }`}
                      style={selectedTagIds.includes(tag.id) ? {} : { color: tag.color || '#64748b', backgroundColor: (tag.color || '#64748b') + '15', borderColor: (tag.color || '#64748b') + '70' }}>
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {analysis.partial.length > 0 && (
              <div>
                <h3 className="text-xs text-text-muted mb-1.5">Partial Tags</h3>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.partial.map((tag) => (
                    <button key={tag.id}
                      onClick={() => toggle(tag.id)}
                      onContextMenu={(e) => { e.preventDefault(); setRemoveConfirm({ tag }); }}
                      className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors cursor-context-menu ${selectedTagIds.includes(tag.id)
                        ? 'bg-brand/20 border-brand/50 text-brand-glow'
                        : ''
                        }`}
                      style={selectedTagIds.includes(tag.id) ? {} : { color: tag.color || '#64748b', backgroundColor: (tag.color || '#64748b') + '15', borderColor: (tag.color || '#64748b') + '70' }}>
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* selected tags */}
        {selectedTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selectedTags.map((tag) => (
              <span key={tag.id} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border bg-brand/15 border-brand/30 text-brand-glow">
                {tag.name}
                <button onClick={() => removeTag(tag.id)} className="hover:text-white"><X size={13} /></button>
              </span>
            ))}
          </div>
        )}

        {/* autocomplete input */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setDropdownOpen(true); setHighlightIdx(-1); }}
            onFocus={() => setDropdownOpen(true)}
            onBlur={() => setTimeout(() => setDropdownOpen(false), 200)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightIdx((i) => Math.min(i + 1, results.length - 1)); return; }
              if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightIdx((i) => Math.max(i - 1, -1)); return; }
              if (e.key === 'Enter' && query.trim()) {
                // if highlighted, select that
                if (highlightIdx >= 0 && highlightIdx < results.length) {
                  toggle(results[highlightIdx].id);
                  setQuery(''); setHighlightIdx(-1);
                  return;
                }
                // exact match
                const match = results.find((t) => t.name.toLowerCase() === query.trim().toLowerCase());
                if (match) { toggle(match.id); setQuery(''); setHighlightIdx(-1); }
                // quick create
                else if (!exactMatch) {
                  const lastPid = localStorage.getItem(lastParentKey) || tagsTree[0]?.id || '';
                  setQuickCreate({ name: query.trim(), parentId: lastPid });
                  setQuery(''); setHighlightIdx(-1);
                }
              }
              if (e.key === 'Escape') { setQuery(''); setHighlightIdx(-1); }
            }}
            placeholder="Type to find or create tags…"
            className="w-full bg-surface-2 border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-brand/40 transition-colors"
          />
          {/* dropdown */}
          {dropdownOpen && query.trim() && (
            <div className="absolute top-full left-0 right-0 mt-1 rounded-xl bg-surface-1 border border-border shadow-xl z-10 max-h-[35vh] overflow-y-auto">
              {results.length > 0 ? (
                results.map((tag, idx) => (
                  <button key={tag.id}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { toggle(tag.id); setQuery(''); setHighlightIdx(-1); }}
                    className={`w-full text-left flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${idx === highlightIdx ? 'bg-brand/10' : 'hover:bg-surface-2'
                      } ${selectedTagIds.includes(tag.id) ? 'text-brand-glow' : 'text-text-secondary'
                      }`}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: tag.color || '#64748b' }} />
                    <span>{tag.name}</span>
                    <span className="text-xs text-text-muted ml-auto">{tag.isCat ? 'category' : tag.category}</span>
                    {selectedTagIds.includes(tag.id) && <span className="text-brand-glow text-xs">✓</span>}
                  </button>
                ))
              ) : null}
              {!exactMatch && query.trim() && (
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    const lastPid = localStorage.getItem(lastParentKey) || tagsTree[0]?.id || '';
                    setQuickCreate({ name: query.trim(), parentId: lastPid });
                    setQuery('');
                  }}
                  className="w-full text-left flex items-center gap-2 px-4 py-2.5 text-sm text-brand-glow hover:bg-brand/5 transition-colors border-t border-border"
                >
                  <Plus size={14} />
                  <span>Quick create "<strong>{query.trim()}</strong>"</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* tag browser — clickable list of all tags */}
        <div className="border-t border-border pt-4">
          <h3 className="text-xs text-text-muted uppercase tracking-wider mb-2">All Tags</h3>
          <div className="max-h-[40vh] overflow-y-auto">
            <TagGroupList tagsTree={tagsTree} selectedTagIds={selectedTagIds} onToggleTag={toggle} displayMode={tagSettings.displayMode}
              onTagContextMenu={(tag, e) => { if (!tag.isCat && tag.parentId) setTagCtxMenu({ x: e.clientX, y: e.clientY, tag }); }} />
          </div>
        </div>

        {/* actions */}
        <div className="flex gap-3 pt-2">
          <button disabled={!selectedTagIds.length || !selectedCount} onClick={() => onApply(selectedTagIds)}
            className="btn-base btn-primary flex-1 text-sm py-2.5">Apply Tags</button>
          <button disabled={!selectedTagIds.length || !selectedCount} onClick={() => onRemove?.(selectedTagIds)}
            className="btn-base flex-1 text-sm py-2.5 border border-border text-text-secondary hover:text-text-primary hover:bg-surface-3 rounded-xl">Remove Tags</button>
          <button onClick={onClose} className="btn-base btn-ghost text-sm py-2.5">Cancel</button>
        </div>
      </div>

      {/* tag context menu */}
      {tagCtxMenu && (
        <ContextMenu
          x={tagCtxMenu.x} y={tagCtxMenu.y}
          items={[{
            label: 'Delete Tag',
            icon: <Trash2 size={12} />,
            danger: true,
            onClick: async () => {
              const tag = tagCtxMenu.tag;
              if (tag.parentId && onDeleteTag) {
                await onDeleteTag(tag.id);
                removeTag(tag.id);
              }
            }
          }]}
          onClose={() => setTagCtxMenu(null)}
        />
      )}

      {/* remove confirm dialog */}
      {removeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setRemoveConfirm(null)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative w-full max-w-sm rounded-2xl bg-surface-1 border border-border p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold mb-2">Remove Tag</h3>
            <p className="text-sm text-text-secondary mb-5">
              Remove <strong>{removeConfirm.tag.name}</strong> from {selectedCount} selected file(s)?
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setRemoveConfirm(null)} className="btn-base btn-ghost text-sm px-4">Cancel</button>
              <button onClick={async () => {
                await onRemove([removeConfirm.tag.id]);
                setRemoveConfirm(null);
              }} className="btn-base text-sm px-4 bg-danger text-white hover:bg-red-600 rounded-xl">Remove</button>
            </div>
          </div>
        </div>
      )}

      {/* quick create modal */}
      {quickCreate && (
        <QuickCreateModal
          name={quickCreate.name}
          parentId={quickCreate.parentId}
          categories={tagsTree}
          lastParentKey={lastParentKey}
          onChangeName={(n) => setQuickCreate((q) => ({ ...q, name: n }))}
          onChangeParent={(p) => setQuickCreate((q) => ({ ...q, parentId: p }))}
          onConfirm={handleQuickCreate}
          onCancel={() => setQuickCreate(null)}
        />
      )}
    </Modal>
  );
}

function QuickCreateModal({ name, parentId, categories, onChangeName, onChangeParent, onConfirm, onCancel, lastParentKey }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative w-full max-w-sm rounded-2xl bg-surface-1 border border-border p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold mb-4">New Tag</h3>
        <div className="space-y-3">
          <input value={name} onChange={(e) => onChangeName(e.target.value)}
            placeholder="Tag name"
            autoFocus
            className="w-full bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none"
            onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) onConfirm(); }} />
          <select value={parentId} onChange={(e) => { onChangeParent(e.target.value); localStorage.setItem(lastParentKey, e.target.value); }}
            className="w-full bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary outline-none">
            <option value="">Level 1 category</option>
            {categories.map((c) => <option key={c.id} value={c.id}>Sub-tag of {c.name}</option>)}
          </select>
          <div className="flex gap-2 pt-2">
            <button disabled={!name.trim()} onClick={onConfirm}
              className="btn-base btn-primary flex-1 text-sm py-2">Create & Add</button>
            <button onClick={onCancel} className="btn-base btn-ghost text-sm py-2">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}
