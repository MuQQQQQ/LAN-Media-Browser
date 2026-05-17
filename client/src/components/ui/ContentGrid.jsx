import { useMemo } from 'react';
import MediaCard from './MediaCard.jsx';

function groupItems(items, tagsTree, groupCategory) {
  if (!groupCategory) {
    // no specific category selected: group by all level-1 categories
    const result = [];
    const seen = new Set();
    for (const category of tagsTree) {
      const groupItems = [];
      for (const item of items) {
        if (seen.has(item.path)) continue;
        const hasTag = item.tags?.some((t) => category.children.some((c) => c.id === t.id));
        const hasCategoryTag = item.tags?.some((t) => t.id === category.id);
        if (hasTag || hasCategoryTag) {
          groupItems.push(item);
          seen.add(item.path);
        }
      }
      if (groupItems.length > 0) result.push({ category, items: groupItems });
    }
    const rest = items.filter((i) => !seen.has(i.path));
    if (rest.length > 0) result.push({ category: { name: 'Uncategorized', color: '#64748b', id: '_other' }, items: rest });
    return result;
  }

  // specific category selected: group by level-2 tags
  const category = tagsTree.find((c) => c.id === groupCategory || String(c.id) === String(groupCategory));
  if (!category) return [{ category: { name: 'All', color: '#64748b', id: '_all' }, items }];

  const groups = [];
  const usedPaths = new Set();

  for (const subTag of category.children) {
    const groupItems = items.filter((item) =>
      item.tags?.some((t) => t.id === subTag.id)
    );
    if (groupItems.length > 0) {
      groups.push({ category: subTag, items: groupItems });
      groupItems.forEach((i) => usedPaths.add(i.path));
    }
  }

  // items without any of the category's sub-tags
  const rest = items.filter((i) => !usedPaths.has(i.path));
  if (rest.length > 0) {
    groups.push({ category: { name: 'Others', color: '#64748b', id: '_other' }, items: rest });
  }

  return groups;
}

export default function ContentGrid({
  items,
  selectedPaths,
  layoutMode,
  onLayoutModeChange,
  onToggleSelect,
  onOpenFolder,
  onLongPressSelect,
  onOpenFile,
  onToggleFavorite,
  onDeleteItem,
  onMoveItems,
  onCopyItems,
  onCutItems,
  onTagItems,
  onShiftRangeSelect,
  groupByTag,
  onGroupToggle,
  groupCategory,
  tagsTree,
  pageSize,
}) {
  const groups = useMemo(
    () => (groupByTag ? groupItems(items, tagsTree || [], groupCategory) : null),
    [groupByTag, items, tagsTree, groupCategory]
  );

  const gridClass =
    layoutMode === 'masonry'
      ? 'columns-2 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6 gap-3 space-y-3'
      : 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3';

  const renderCard = (item) => (
    <MediaCard
      key={`${item.type}:${item.path}`}
      item={item}
      selected={selectedPaths?.has?.(item.path)}
      layout={layoutMode}
      onOpen={item.type === 'folder' ? () => onOpenFolder?.(item.path) : () => onOpenFile?.(item)}
      onToggleSelect={onToggleSelect}
      onToggleFavorite={onToggleFavorite}
      onLongPress={onLongPressSelect}
      onDelete={onDeleteItem ? () => onDeleteItem(item) : undefined}
      onMove={onMoveItems ? () => onMoveItems([item]) : undefined}
      onCopy={onCopyItems ? () => onCopyItems([item]) : undefined}
      onCut={onCutItems ? () => onCutItems([item]) : undefined}
      onTag={onTagItems ? () => onTagItems([item]) : undefined}
      onShiftClick={(path) => onShiftRangeSelect?.(path)}
    />
  );

  return (
    <div className="space-y-4 select-none">
      {/* item count */}
      <div className="px-1">
        <p className="text-xs text-text-muted">
          {items.length} item{items.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* grouped view */}
      {groupByTag && groups ? (
        groups.map((group) => (
          <div key={group.category.id} className="space-y-2">
            <div className="flex items-center gap-2 px-1 py-1.5">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: group.category.color || '#64748b' }} />
              <h3 className="text-sm font-medium text-text-primary">{group.category.name}</h3>
              <span className="text-xs text-text-muted">{group.items.length}</span>
            </div>
            <div className={gridClass}>
              {group.items.map((item) => (
                <div key={`${item.type}:${item.path}`} className={layoutMode === 'masonry' ? 'break-inside-avoid' : ''}>
                  {renderCard(item)}
                </div>
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className={gridClass}>
          {items.map((item) => (
            <div key={`${item.type}:${item.path}`} className={layoutMode === 'masonry' ? 'break-inside-avoid' : ''}>
              {renderCard(item)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
