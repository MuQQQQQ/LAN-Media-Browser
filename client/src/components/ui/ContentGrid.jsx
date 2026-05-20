import { useEffect, useMemo, useState } from 'react';
import MediaCard from './MediaCard.jsx';

function groupItems(items, tagsTree, groupCategory) {
  if (!groupCategory) {
    const result = [];
    const seen = new Set();
    for (const category of tagsTree) {
      const groupItems = [];
      for (const item of items) {
        if (seen.has(item.path)) continue;
        const hasTag = item.tags?.some((t) => category.children.some((c) => c.id === t.id));
        const hasCategoryTag = item.tags?.some((t) => t.id === category.id);
        if (hasTag || hasCategoryTag) { groupItems.push(item); seen.add(item.path); }
      }
      if (groupItems.length > 0) result.push({ category, items: groupItems });
    }
    const rest = items.filter((i) => !seen.has(i.path));
    if (rest.length > 0) result.push({ category: { name: 'Uncategorized', color: '#64748b', id: '_other' }, items: rest });
    return result;
  }
  const category = tagsTree.find((c) => c.id === groupCategory || String(c.id) === String(groupCategory));
  if (!category) return [{ category: { name: 'All', color: '#64748b', id: '_all' }, items }];
  const groups = [];
  for (const subTag of category.children) {
    const groupItems = items.filter((item) => item.tags?.some((t) => t.id === subTag.id));
    if (groupItems.length > 0) groups.push({ category: subTag, items: groupItems });
  }
  const used = new Set(groups.flatMap((g) => g.items.map((i) => i.path)));
  const rest = items.filter((i) => !used.has(i.path));
  if (rest.length > 0) groups.push({ category: { name: 'Others', color: '#64748b', id: '_other' }, items: rest });
  return groups;
}

export default function ContentGrid({
  items, selectedPaths, layoutMode, onLayoutModeChange,
  onToggleSelect, onOpenFolder, onLongPressSelect, onOpenFile,
  onToggleFavorite, onDeleteItem, onMoveItems, onCopyItems, onCutItems, onTagItems,
  onShiftRangeSelect, groupByTag, groupCategory, tagsTree, pageSize, groupLoading = false, groupPage = 1, onGroupPageChange,
}) {
  const [jumpValue, setJumpValue] = useState(String(groupPage || 1));
  const groups = useMemo(
    () => (groupByTag ? groupItems(items, tagsTree || [], groupCategory) : null),
    [groupByTag, items, tagsTree, groupCategory]
  );

  // flatten + paginate (count items only, not headers)
  const groupedView = useMemo(() => {
    if (!groups) return null;
    const ps = pageSize || 50;
    // build pages: each page has groups, each group has header + items
    const pages = [];
    let curPage = [];
    let curCount = 0;
    for (const g of groups) {
      const need = 1 + g.items.length; // header + items
      if (curCount > 0 && curCount + need > ps) {
        pages.push(curPage);
        curPage = [];
        curCount = 0;
      }
      curPage.push({ t: 'hdr', cat: g.category, n: g.items.length });
      curCount++;
      for (const item of g.items) {
        if (curCount >= ps) {
          pages.push(curPage);
          curPage = [{ t: 'hdr', cat: g.category, n: g.items.length, continued: true }];
          curCount = 1;
        }
        curPage.push({ t: 'item', item });
        curCount++;
      }
    }
    if (curPage.length > 0) pages.push(curPage);
    const totalItems = groups.reduce((s, g) => s + g.items.length, 0);
    const totalPages = Math.max(1, pages.length);
    const safeGroupPage = Math.min(Math.max(1, groupPage), totalPages);
    const slice = pages[safeGroupPage - 1] || [];
    return { slice, totalPages, totalItems, safeGroupPage };
  }, [groups, groupPage, pageSize]);

  // Clamp externally controlled group page if URL/state points past the available grouped pages.
  useEffect(() => {
    if (groupLoading) return;
    if (groupedView && groupPage !== groupedView.safeGroupPage) onGroupPageChange?.(groupedView.safeGroupPage);
  }, [groupedView, groupPage, onGroupPageChange, groupLoading]);
  useEffect(() => { setJumpValue(String(groupedView?.safeGroupPage || groupPage || 1)); }, [groupedView?.safeGroupPage, groupPage]);

  const commitJump = () => {
    if (!groupedView) return;
    const next = Number(jumpValue);
    if (!Number.isInteger(next) || next < 1 || next > groupedView.totalPages) {
      setJumpValue(String(groupedView.safeGroupPage));
      return;
    }
    onGroupPageChange?.(next);
  };

  const gridClass = layoutMode === 'masonry'
    ? 'columns-2 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6 gap-3 space-y-3'
    : 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3';

  const renderCard = (item) => (
    <div key={`${item.type}:${item.path}`} className={layoutMode === 'masonry' ? 'break-inside-avoid' : ''}>
      <MediaCard
        item={item} selected={selectedPaths?.has?.(item.path)} layout={layoutMode}
        onOpen={item.type === 'folder' ? () => onOpenFolder?.(item.path) : () => onOpenFile?.(item)}
        onToggleSelect={onToggleSelect} onToggleFavorite={onToggleFavorite}
        onLongPress={onLongPressSelect}
        onDelete={onDeleteItem ? () => onDeleteItem(item) : undefined}
        onMove={onMoveItems ? () => onMoveItems([item]) : undefined}
        onCopy={onCopyItems ? () => onCopyItems([item]) : undefined}
        onCut={onCutItems ? () => onCutItems([item]) : undefined}
        onTag={onTagItems ? () => onTagItems([item]) : undefined}
        onShiftClick={(path) => onShiftRangeSelect?.(path)}
      />
    </div>
  );

  return (
    <div className="space-y-4 select-none">
      <div className="px-1">
        <p className="text-xs text-text-muted">
          {groupedView ? groupedView.totalItems : items.length} item{(groupedView ? groupedView.totalItems : items.length) !== 1 ? 's' : ''}
        </p>
      </div>

      {groupedView ? (
        groupLoading ? (
          <div className="rounded-xl border border-border bg-surface-2/50 px-4 py-8 text-center text-sm text-text-muted">Loading grouped items…</div>
        ) :
          (() => {
            const els = [];
            let curHeader = null;
            let curItems = [];
            let keyIdx = 0;

            const flush = () => {
              if (curHeader) {
                els.push(
                  <div key={`grp-${curHeader.cat.id}-${groupedView.safeGroupPage}-${keyIdx++}`}>
                    <div className="flex items-center gap-2 px-1 py-1.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: curHeader.cat.color || '#64748b' }} />
                      <h3 className="text-sm font-medium text-text-primary">{curHeader.cat.name}</h3>
                      <span className="text-xs text-text-muted">{curHeader.n}</span>
                      {curHeader.continued && <span className="text-[10px] text-text-muted ml-1">(cont.)</span>}
                    </div>
                    <div className={gridClass}>{curItems}</div>
                  </div>
                );
                curItems = [];
              }
            };

            for (const seg of groupedView.slice) {
              if (seg.t === 'hdr') { flush(); curHeader = seg; }
              else { curItems.push(renderCard(seg.item)); }
            }
            flush();
            return (
              <div className="space-y-3">
                {els}
                {/* pagination */}
                {groupedView.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 py-4">
                    <button disabled={groupedView.safeGroupPage <= 1} onClick={() => onGroupPageChange?.(groupedView.safeGroupPage - 1)} className="btn-base btn-ghost text-xs py-1.5 px-3">‹ Prev</button>
                    <span className="text-xs text-text-muted">{groupedView.safeGroupPage} / {groupedView.totalPages}</span>
                    <label className="flex items-center gap-1 text-xs text-text-muted">
                      Jump
                      <input
                        type="number"
                        min="1"
                        max={groupedView.totalPages}
                        value={jumpValue}
                        onChange={(e) => setJumpValue(e.target.value)}
                        onBlur={commitJump}
                        onKeyDown={(e) => { if (e.key === 'Enter') commitJump(); if (e.key === 'Escape') setJumpValue(String(groupedView.safeGroupPage)); }}
                        className="w-16 bg-surface-2 border border-border rounded-lg px-2 py-1 text-xs text-text-primary text-center"
                      />
                    </label>
                    <button disabled={groupedView.safeGroupPage >= groupedView.totalPages} onClick={() => onGroupPageChange?.(groupedView.safeGroupPage + 1)} className="btn-base btn-ghost text-xs py-1.5 px-3">Next ›</button>
                  </div>
                )}
              </div>
            );
          })()

      ) : (
        <div className={gridClass}>
          {items.map((item) => renderCard(item))}
        </div>
      )}
    </div>
  );
}
