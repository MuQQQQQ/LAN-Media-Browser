import { useEffect, useMemo, useState } from 'react';
import { api } from './api.js';
import Navbar from './components/ui/Navbar.jsx';
import SearchBar from './components/ui/SearchBar.jsx';
import QuickFilters from './components/ui/QuickFilters.jsx';
import ContentGrid from './components/ui/ContentGrid.jsx';
import Modal from './components/ui/Modal.jsx';
import Toast from './components/ui/Toast.jsx';
import FullscreenViewer from './components/FullscreenViewer.jsx';
import MovePicker from './components/ui/MovePicker.jsx';
import Pagination from './components/Pagination.jsx';
import TagsPage from './components/TagsPage.jsx';
import ApplyTagsModal from './components/ApplyTagsModal.jsx';
import CreateTagModal from './components/CreateTagModal.jsx';
import FavoritesPage from './components/FavoritesPage.jsx';
import { loadTagSettings, saveTagSettings } from './tagSettings.js';

const defaultFilters = { q: '', name: '', tags: [], tagMode: 'and', matchType: 'contains', scope: 'both', caseSensitive: false, itemType: 'all', pathFilter: '', dateFrom: '', dateTo: '', tagSearchEnabled: false };
const HISTORY_KEY = 'lan-media-search-history';
const SAVED_KEY = 'lan-media-saved-searches';
const SORT_PREF_KEY = 'lan-media-sort-preference';
const MISSING_ITEMS_PREVIEW_LIMIT = 200;

function updateUrl(params) {
  const next = typeof params === 'string' ? params : new URLSearchParams(params);
  window.history.replaceState(null, '', `${window.location.pathname}?${next}`);
}

function positiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export default function App() {
  const url = new URLSearchParams(window.location.search);
  const savedSort = (() => { try { return JSON.parse(localStorage.getItem(SORT_PREF_KEY) || '{}'); } catch { return {}; } })();
  const [currentPath, setCurrentPath] = useState(url.get('path') || '');
  const [page, setPage] = useState(positiveNumber(url.get('page'), 1));
  const [pageSize, setPageSize] = useState(positiveNumber(url.get('pageSize'), 50));
  const [sortBy, setSortBy] = useState(url.get('sortBy') || savedSort.sortBy || 'name');
  const [sortDir, setSortDir] = useState(url.get('sortDir') || savedSort.sortDir || 'asc');
  const [layoutMode, setLayoutMode] = useState(() => localStorage.getItem('layoutMode') || 'grid');
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState(new Set());
  const [tagsTree, setTagsTree] = useState([]);
  const [tagSettings, setTagSettings] = useState(loadTagSettings);
  const [filters, setFilters] = useState({ ...defaultFilters, itemType: url.get('itemType') || 'all' });
  const [isSearchPage] = useState(window.location.pathname === '/search');
  const [isTagsPage] = useState(window.location.pathname === '/tags');
  const [isFavoritesPage] = useState(window.location.pathname === '/favorites');
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [viewerPath, setViewerPath] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [tagAnalysis, setTagAnalysis] = useState({ common: [], partial: [] });
  const [missingItems, setMissingItems] = useState([]);
  const [missingItemsTotal, setMissingItemsTotal] = useState(0);
  const [missingDialogOpen, setMissingDialogOpen] = useState(false);
  const [missingDialogBusy, setMissingDialogBusy] = useState(false);
  const [clipboard, setClipboard] = useState(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [groupByTag, setGroupByTag] = useState(url.get('groupBy') === 'tag');
  const [groupCategory, setGroupCategory] = useState(url.get('groupCategory') || null);
  const [allItems, setAllItems] = useState(null); // full dataset when grouping
  const [history, setHistory] = useState(() => { try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; } });
  const [saved, setSaved] = useState(() => { try { return JSON.parse(localStorage.getItem(SAVED_KEY) || '[]'); } catch { return []; } });
  const [isSelectedAll, setIsSelectedAll] = useState(false);

  const selectedPaths = useMemo(() => new Set(Array.from(selected)), [selected]);
  const previewFiles = useMemo(() => {
    const src = groupByTag && allItems ? allItems : items;
    return src.filter((i) => i.type !== 'folder');
  }, [items, allItems, groupByTag]);
  const operationItems = useMemo(() => (groupByTag && allItems ? allItems : items), [groupByTag, allItems, items]);

  // ==================== DATA LOADING ====================
  async function loadTags() {
    const data = await api.tags(tagSettings.sortMode);
    setTagsTree(data.tags);
  }
  async function load() {
    setError('');
    try {
      if (isSearchPage) {
        const searchTags = (url.get('tags') || '').split(',').map(Number).filter(Boolean);
        const sf = { tags: searchTags, tagMode: url.get('tagMode') || 'and', q: url.get('q') || url.get('name') || '', name: url.get('q') || url.get('name') || '', matchType: url.get('matchType') || 'contains', scope: url.get('scope') || 'both', caseSensitive: url.get('caseSensitive') === 'true', itemType: url.get('itemType') || 'all', pathFilter: url.get('pathFilter') || '', dateFrom: url.get('dateFrom') || '', dateTo: url.get('dateTo') || '' };
        setFilters((f) => ({ ...f, ...sf, tagSearchEnabled: searchTags.length > 0 }));
        const data = await api.search({ ...sf, page, pageSize, sortBy, sortDir });
        setItems(data.files);
        setTotal(data.total);
        updateUrl(new URLSearchParams({ ...Object.fromEntries(url), page: String(page), pageSize: String(pageSize), sortBy, sortDir }));
      } else {
        const data = await api.browse({ path: currentPath, page, pageSize, sortBy, sortDir });
        setItems(data.items);
        setTotal(data.total);
        const params = new URLSearchParams({ path: currentPath, page, pageSize, sortBy, sortDir });
        if (groupByTag) params.set('groupBy', 'tag');
        if (groupByTag && groupCategory) params.set('groupCategory', groupCategory);
        updateUrl(params);
      }
    } catch (err) { setError(err.message); }
  }

  useEffect(() => { loadTags().catch((e) => setError(e.message)); }, [tagSettings.sortMode]);
  useEffect(() => {
    if (isSearchPage || isTagsPage || isFavoritesPage) return;
    const params = new URLSearchParams({ path: currentPath, page, pageSize, sortBy, sortDir });
    if (groupByTag) params.set('groupBy', 'tag');
    if (groupByTag && groupCategory) params.set('groupCategory', groupCategory);
    updateUrl(params);
  }, [currentPath, page, pageSize, sortBy, sortDir, groupByTag, groupCategory, isSearchPage, isTagsPage, isFavoritesPage]);
  useEffect(() => { if (!isTagsPage && !isFavoritesPage) load(); }, [currentPath, page, pageSize, sortBy, sortDir, groupByTag, groupCategory, isSearchPage, isTagsPage, isFavoritesPage]);

  // fetch all items for grouping (cross-page)
  useEffect(() => {
    if (!groupByTag || isTagsPage || isFavoritesPage || isSearchPage) { setAllItems(null); return; }
    let cancelled = false;
    (async () => {
      const pageSize = 200;
      const all = [];
      let p = 1;
      while (true) {
        const data = await api.browse({ path: currentPath, page: p, pageSize, sortBy, sortDir });
        all.push(...data.items);
        if (all.length >= data.total || data.items.length < pageSize) break;
        p++;
      }
      if (!cancelled) setAllItems(all);
    })().catch(() => { if (!cancelled) setAllItems(null); });
    return () => { cancelled = true; };
  }, [groupByTag, currentPath, sortBy, sortDir, refreshNonce, isTagsPage, isFavoritesPage, isSearchPage]);
  useEffect(() => { if (!isTagsPage) { api.orphanRecords().then((d) => { if (d.count > 0) { setMissingItems(d.items || []); setMissingItemsTotal(d.count); setMissingDialogOpen(true); } }).catch(() => { }); } }, []);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(''), 2600); return () => clearTimeout(t); } }, [toast]);
  useEffect(() => { if (applyModalOpen && selected.size) { const si = selectedItemsForOps().map((i) => ({ path: i.path, type: i.type === 'folder' ? 'folder' : 'file' })); api.tagAnalysis(si).then(setTagAnalysis).catch(() => setTagAnalysis({ common: [], partial: [] })); } }, [applyModalOpen, selected, operationItems]);
  useEffect(() => { localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 12))); }, [history]);
  useEffect(() => { localStorage.setItem(SAVED_KEY, JSON.stringify(saved)); }, [saved]);
  useEffect(() => { localStorage.setItem(SORT_PREF_KEY, JSON.stringify({ sortBy, sortDir })); }, [sortBy, sortDir]);

  // popstate
  useEffect(() => {
    const h = () => {
      const p = new URLSearchParams(window.location.search);
      setCurrentPath(p.get('path') || '');
      setPage(positiveNumber(p.get('page'), 1));
      setPageSize(positiveNumber(p.get('pageSize'), 50));
      setSortBy(p.get('sortBy') || 'name');
      setSortDir(p.get('sortDir') || 'asc');
      setGroupByTag(p.get('groupBy') === 'tag');
      setGroupCategory(p.get('groupCategory') || null);
      setViewerPath(p.get('view') || '');
    };
    window.addEventListener('popstate', h);
    return () => window.removeEventListener('popstate', h);
  }, []);

  // keyboard shortcuts
  useEffect(() => {
    const handler = (event) => {
      const t = event.target;
      if (t?.tagName === 'INPUT' && t.type !== 'checkbox' && t.type !== 'radio') return;
      if (t?.tagName === 'TEXTAREA' || t?.tagName === 'SELECT') return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') { event.preventDefault(); selectAllByKey(); }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); setApplyModalOpen(true); }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') { event.preventDefault(); deselectAll(); }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c') { event.preventDefault(); copyItemsToClipboard(selectedItemsForOps()); }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'x') { event.preventDefault(); cutItemsToClipboard(selectedItemsForOps()); }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v') { event.preventDefault(); pasteItems(); }
      if (event.key === 'Delete') { event.preventDefault(); deleteSelected(); }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [items, selected, clipboard, currentPath]);

  // ==================== ACTIONS ====================
  const navigate = (path) => { window.location.href = `/?${new URLSearchParams({ path, page: 1, pageSize, sortBy, sortDir })}`; };
  const [lastClickedPath, setLastClickedPath] = useState('');
  const toggleSelect = (path) => { setSelected((p) => { const n = new Set(p); n.has(path) ? n.delete(path) : n.add(path); return n; }); setLastClickedPath(path); };
  const shiftRangeSelect = (toPath) => {
    if (!lastClickedPath) { toggleSelect(toPath); return; }
    const fromIdx = operationItems.findIndex((i) => i.path === lastClickedPath);
    const toIdx = operationItems.findIndex((i) => i.path === toPath);
    if (fromIdx === -1 || toIdx === -1) { toggleSelect(toPath); return; }
    const start = Math.min(fromIdx, toIdx);
    const end = Math.max(fromIdx, toIdx);
    const range = operationItems.slice(start, end + 1).map((i) => i.path);
    setSelected((p) => { const n = new Set(p); range.forEach((path) => n.add(path)); return n; });
  };
  const changeLayoutMode = (mode) => { const n = mode === 'masonry' ? 'masonry' : 'grid'; setLayoutMode(n); localStorage.setItem('layoutMode', n); };
  const selectAll = () => setSelected(new Set(operationItems.map((i) => i.path)));
  const deselectAll = () => setSelected(new Set());
  const selectAllByKey = () => { if (isSelectedAll) { deselectAll(); setIsSelectedAll(false); } else { selectAll(); setIsSelectedAll(true); } };
  const selectedItemsForOps = () => operationItems.filter((i) => selected.has(i.path));
  const normalizeOpItems = (ti) => ti.map((i) => ({ path: i.path, type: i.type === 'folder' ? 'folder' : 'file' }));

  const runSearch = () => {
    const label = (filters.q || filters.name || '').trim() || (filters.tags.length ? filters.tags.join(',') : 'All');
    const entry = { label, filters: { ...filters }, at: Date.now() };
    setHistory((h) => [entry, ...h.filter((e) => JSON.stringify(e.filters) !== JSON.stringify(entry.filters))].slice(0, 12));
    const params = new URLSearchParams({ tagMode: filters.tagMode, page: 1, pageSize, sortBy, sortDir });
    params.set('q', filters.q || filters.name || '');
    params.set('matchType', filters.matchType);
    params.set('scope', filters.scope);
    params.set('caseSensitive', filters.caseSensitive);
    params.set('itemType', filters.itemType);
    if (filters.pathFilter) params.set('pathFilter', filters.pathFilter);
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    if (filters.tagSearchEnabled && filters.tags.length) params.set('tags', filters.tags.join(','));
    window.open(`/search?${params}`, '_blank');
  };
  const clearFilters = () => { setFilters(defaultFilters); setPage(1); };

  const refreshContent = async () => { await load().catch(() => { }); setRefreshNonce((n) => n + 1); };
  const assignPaths = async (paths, tagIds) => { await api.assignTags({ paths, tagIds }); await loadTags(); await refreshContent(); setToast('Tag added'); };
  const assignSelected = async (tagIds) => { const si = selectedItemsForOps().map((i) => ({ path: i.path, type: i.type === 'folder' ? 'folder' : 'file' })); await assignPaths(si, tagIds); setApplyModalOpen(false); };
  const removePaths = async (paths, tagIds) => { await api.removeTags({ paths, tagIds }); await loadTags(); await refreshContent(); setToast('Tag removed'); };
  const removeSelected = async (tagIds) => { const si = selectedItemsForOps().map((i) => ({ path: i.path, type: i.type === 'folder' ? 'folder' : 'file' })); await removePaths(si, tagIds); setApplyModalOpen(false); };
  const createTag = async (payload) => { const result = await api.createTag(payload); await loadTags(); setToast('Tag created'); return result.tag; };
  const updateTag = async (id, payload) => { await api.updateTag(id, payload); await loadTags(); setToast('Tag updated'); };
  const deleteTag = async (id) => { await api.deleteTag(id); await loadTags(); setToast('Tag deleted'); };

  const toggleFavorite = async (item) => {
    const payload = { path: item.path, type: item.type === 'folder' ? 'folder' : 'file' };
    if (item.favorite) { await api.removeFavorite(payload); setToast('Removed from favorites'); }
    else { await api.addFavorite(payload); setToast('Added to favorites'); }
    setItems((c) => c.map((e) => e.path === item.path ? { ...e, favorite: !item.favorite } : e));
  };

  const requestDeleteItems = (targetItems) => {
    if (!targetItems.length) return;
    setDeleteConfirm({ items: targetItems });
  };
  const confirmDeleteItems = async () => {
    const targetItems = deleteConfirm?.items || [];
    if (!targetItems.length) return;
    const payload = targetItems.map((i) => ({ path: i.path, type: i.type === 'folder' ? 'folder' : 'file' }));
    const result = await api.deleteItems(payload);
    setSelected(new Set());
    setDeleteConfirm(null);
    await refreshContent();
    setToast(result.failed ? `${result.deleted} deleted, ${result.failed} failed` : 'Deleted');
  };
  const deleteSingleItem = (item) => requestDeleteItems([item]);
  const deleteSelected = () => requestDeleteItems(selectedItemsForOps());

  const [moveOpen, setMoveOpen] = useState(false);
  const [movePending, setMovePending] = useState(null);
  const moveItems = (targetItems) => {
    if (!targetItems.length) return;
    setMovePending(targetItems);
    setMoveOpen(true);
  };
  const executeMove = async (targetFolder) => {
    if (!movePending?.length) return;
    await api.moveItems({ items: normalizeOpItems(movePending), targetFolder, createFolder: '' });
    setSelected(new Set()); setToast(`Moved ${movePending.length} items`); await refreshContent();
    setMovePending(null);
  };
  const renameItem = async (item) => {
    const renameTo = window.prompt('Rename', item.name);
    if (!renameTo || renameTo === item.name) return;
    const parent = item.path.split('/').slice(0, -1).join('/');
    await api.moveItems({ items: normalizeOpItems([item]), targetFolder: parent, renameTo });
    setToast('Renamed'); await refreshContent();
  };
  const copyItemsToClipboard = (ti) => { setClipboard({ mode: 'copy', items: normalizeOpItems(ti), at: Date.now() }); setToast(`Copied ${ti.length} items`); };
  const cutItemsToClipboard = (ti) => { setClipboard({ mode: 'cut', items: normalizeOpItems(ti), at: Date.now() }); setToast(`Cut ${ti.length} items`); };
  const pasteItems = async (targetFolder = currentPath) => {
    if (!clipboard?.items?.length) return;
    if (Date.now() - clipboard.at > 600000) { setClipboard(null); setToast('Clipboard expired'); return; }
    if (clipboard.mode === 'copy') await api.copyItems({ items: clipboard.items, targetFolder });
    else await api.moveItems({ items: clipboard.items, targetFolder });
    setToast(`${clipboard.mode === 'copy' ? 'Copied' : 'Moved'} ${clipboard.items.length} items`);
    if (clipboard.mode === 'cut') setClipboard(null);
    setSelected(new Set()); await refreshContent();
  };
  const tagItems = (ti) => { setSelected(new Set(ti.map((i) => i.path))); setApplyModalOpen(true); };
  const [saveSearchOpen, setSaveSearchOpen] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState('');
  const saveCurrent = () => {
    setSaveSearchName(filters.q || filters.name || 'Saved search');
    setSaveSearchOpen(true);
  };

  // Missing items dialog
  const closeMissingDialog = () => { if (!missingDialogBusy) setMissingDialogOpen(false); };
  const deleteAllMissingItems = async () => {
    setMissingDialogBusy(true);
    try { const r = await api.cleanupOrphans(); setToast(`Removed ${r.removed} records`); setMissingDialogOpen(false); setMissingItems([]); setMissingItemsTotal(0); await load().catch(() => { }); }
    catch (e) { setError(e.message); } finally { setMissingDialogBusy(false); }
  };
  const deleteSelectedMissingItems = async (ti) => {
    if (!ti.length) return;
    setMissingDialogBusy(true);
    try {
      const payload = ti.map((i) => ({ path: i.path, type: (i.itemType || i.type) === 'folder' ? 'folder' : 'file' }));
      await api.deleteItems(payload);
      setToast(`Removed ${ti.length} records`);
      setMissingItems((c) => c.filter((i) => !ti.some((t) => t.path === i.path)));
      setMissingItemsTotal((c) => Math.max(0, c - ti.length));
      if (ti.length >= missingItems.length && missingItemsTotal <= missingItems.length) setMissingDialogOpen(false);
    } catch (e) { setError(e.message); } finally { setMissingDialogBusy(false); }
  };
  const copyMissingPaths = async () => { await navigator.clipboard.writeText(missingItems.map((i) => i.path).join('\n')); setToast('Paths copied'); };
  const exportMissingPaths = () => {
    const content = missingItems.map((i) => `${(i.itemType || i.type) === 'folder' ? 'folder' : 'file'}\t${i.path}`).join('\n');
    const blob = new Blob([`type\tpath\n${content}\n`], { type: 'text/tab-separated-values;charset=utf-8' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'missing-items.tsv'; link.click(); URL.revokeObjectURL(link.href);
  };

  // ==================== RENDER ====================
  if (isTagsPage) return <TagsPage tagsTree={tagsTree} tagSettings={tagSettings} setTagSettings={setTagSettings} onCreateTag={createTag} onUpdateTag={updateTag} onDeleteTag={deleteTag} />;
  if (isFavoritesPage) return (
    <>
      <Navbar />
      <Toast message={toast} />
      <FavoritesPage api={api} pageSize={pageSize} selected={selectedPaths} onToggleSelect={toggleSelect} onOpenFolder={navigate}
        onOpenFile={(file) => { setViewerPath(file.path); const u = new URL(window.location.href); u.searchParams.set('view', file.path); window.history.pushState({ viewing: true, filePath: file.path }, '', u.toString()); }}
        onToggleFavorite={toggleFavorite} onDeleteItem={deleteSingleItem} />
    </>
  );

  return (
    <div className="min-h-screen bg-surface-0">
      {/* main page — hidden (not unmounted) when viewer active */}
      <div style={{ display: viewerPath ? 'none' : 'block' }}>
        <Navbar />
        <Toast message={toast} />

        {/* search bar */}
        <div className="pt-6 pb-2">
          <SearchBar tagsTree={tagsTree} filters={filters} setFilters={setFilters} onSearch={runSearch} onClear={clearFilters}
            history={history} saved={saved} onSave={saveCurrent} />
        </div>

        {/* quick filters + breadcrumbs */}
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6">
          {isSearchPage ? (
            <div className="flex items-center gap-2 py-2 text-xs text-text-muted flex-wrap">
              <span className="font-medium text-text-secondary">Search results</span>
              <span>{total} result(s)</span>
              {(url.get('q') || url.get('name')) && (
                <button className="px-2 py-0.5 rounded-full bg-surface-3 border border-border text-xs hover:text-text-primary"
                  onClick={() => { const n = new URLSearchParams(window.location.search); n.delete('q'); n.delete('name'); window.location.href = `/search?${n}`; }}>
                  Query: {url.get('q') || url.get('name')} ×
                </button>
              )}
              <span>Mode: {(url.get('tagMode') || 'and').toUpperCase()}</span>
              <button className="ml-auto btn-base btn-ghost text-xs" onClick={saveCurrent}>Save search</button>
              <button className="btn-base btn-ghost text-xs" onClick={clearFilters}>Clear</button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 py-2">
              <BreadcrumbsWrap path={currentPath} onNavigate={navigate} pageSize={pageSize} />
              <QuickFilters
                sortBy={sortBy} setSortBy={setSortBy} sortDir={sortDir} setSortDir={setSortDir}
                groupByTag={groupByTag} onGroupToggle={() => { setGroupByTag((v) => !v); if (groupByTag) setGroupCategory(null); }}
                groupCategory={groupCategory} onGroupCategoryChange={(id) => { setGroupCategory(id); setPage(1); }}
                tagsTree={tagsTree} />
            </div>
          )}

          {/* floating selection bar (does not push content) */}
          {(selected.size > 0 || clipboard?.items?.length > 0) && (
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 px-4 py-2 rounded-xl glass-strong shadow-2xl border border-brand/20">
              {!!selected.size && (
                <>
                  <span className="text-xs text-text-secondary mr-1">{selected.size} selected</span>
                  <button className="btn-base btn-ghost text-xs py-1.5 px-2.5" onClick={() => moveItems(selectedItemsForOps())}>Move</button>
                  <button className="btn-base btn-ghost text-xs py-1.5 px-2.5" onClick={() => copyItemsToClipboard(selectedItemsForOps())}>Copy</button>
                  <button className="btn-base btn-ghost text-xs py-1.5 px-2.5" onClick={() => cutItemsToClipboard(selectedItemsForOps())}>Cut</button>
                  <button className="btn-base text-xs py-1.5 px-2.5 bg-danger/20 text-danger hover:bg-danger/30 rounded-xl" onClick={deleteSelected}>Delete</button>
                </>
              )}
              {clipboard?.items?.length > 0 && (
                <button className="btn-base btn-primary text-xs py-1.5 px-2.5" onClick={() => pasteItems()}>Paste ({clipboard.mode})</button>
              )}
              <button className="btn-base btn-primary text-xs py-1.5 px-2.5" disabled={!selected.size} onClick={() => setApplyModalOpen(true)}>
                Tag ({selected.size})
              </button>
            </div>
          )}

          {error && <div className="px-3 py-2 mb-3 text-sm rounded-xl bg-danger/10 border border-danger/20 text-danger">{error}</div>}

          {/* content grid */}
          <div className="py-4">
            <ContentGrid items={groupByTag ? (allItems || []) : items} selectedPaths={selectedPaths} layoutMode={layoutMode} onLayoutModeChange={changeLayoutMode}
              onToggleSelect={toggleSelect} onOpenFolder={navigate} onLongPressSelect={toggleSelect}
              onOpenFile={(file) => { setViewerPath(file.path); const u = new URL(window.location.href); u.searchParams.set('view', file.path); window.history.pushState({ viewing: true, filePath: file.path }, '', u.toString()); }}
              onToggleFavorite={toggleFavorite} onDeleteItem={deleteSingleItem}
              onMoveItems={moveItems} onCopyItems={copyItemsToClipboard} onCutItems={cutItemsToClipboard} onTagItems={tagItems}
              onShiftRangeSelect={shiftRangeSelect} groupByTag={groupByTag} groupCategory={groupCategory} tagsTree={tagsTree} pageSize={pageSize} groupLoading={groupByTag && !allItems}
              groupPage={page} onGroupPageChange={setPage} />
          </div>

          {/* pagination — hidden when grouping (ContentGrid has its own) */}
          {!groupByTag && <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />}
        </div>

        {/* modals */}
        <ApplyTagsModal open={applyModalOpen} selectedCount={selected.size} tagsTree={tagsTree} tagSettings={tagSettings}
          onClose={() => setApplyModalOpen(false)} onApply={assignSelected} onRemove={removeSelected} onCreateTag={createTag} onDeleteTag={deleteTag} analysis={tagAnalysis} />
        <CreateTagModal open={createModalOpen} tagsTree={tagsTree} onClose={() => setCreateModalOpen(false)} onCreateTag={createTag} />

        {/* missing items modal */}
        <Modal open={missingDialogOpen} onClose={closeMissingDialog} title="Missing Items" maxWidth="max-w-2xl">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-text-muted">
              <strong>{missingItemsTotal} missing items</strong>
              <span>{missingItems.length} shown</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button className="btn-base btn-ghost text-xs" onClick={copyMissingPaths} disabled={!missingItems.length}>Copy paths</button>
              <button className="btn-base btn-ghost text-xs" onClick={exportMissingPaths} disabled={!missingItems.length}>Export</button>
            </div>
            <div className="max-h-[40vh] overflow-y-auto space-y-1">
              {missingItems.slice(0, MISSING_ITEMS_PREVIEW_LIMIT).map((item) => (
                <div key={item.path} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-surface-3 text-xs text-text-secondary">
                  <span>{(item.itemType || item.type) === 'folder' ? '📁' : '📄'}</span>
                  <code className="text-text-primary flex-1 truncate">{item.path}</code>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button className="btn-base bg-danger/20 text-danger hover:bg-danger/30 rounded-xl text-xs" onClick={deleteAllMissingItems} disabled={missingDialogBusy}>Delete All</button>
              <button className="btn-base btn-ghost text-xs" onClick={closeMissingDialog}>Close</button>
            </div>
          </div>
        </Modal>
      </div>{/* end visibility-hidden wrapper */}

      {/* save search modal */}
      <Modal open={saveSearchOpen} onClose={() => setSaveSearchOpen(false)} title="Save Search" maxWidth="max-w-sm">
        <div className="space-y-3">
          <input
            autoFocus
            value={saveSearchName}
            onChange={(e) => setSaveSearchName(e.target.value)}
            placeholder="Search name…"
            className="w-full bg-surface-3 border border-border rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && saveSearchName.trim()) {
                setSaved((s) => [{ id: Date.now(), label: saveSearchName.trim(), filters: { ...filters } }, ...s]);
                setSaveSearchOpen(false);
                setToast('Search saved');
              }
            }}
          />
          <div className="flex gap-2">
            <button
              disabled={!saveSearchName.trim()}
              onClick={() => { setSaved((s) => [{ id: Date.now(), label: saveSearchName.trim(), filters: { ...filters } }, ...s]); setSaveSearchOpen(false); setToast('Search saved'); }}
              className="btn-base btn-primary flex-1 text-sm"
            >
              Save
            </button>
            <button onClick={() => setSaveSearchOpen(false)} className="btn-base btn-ghost text-sm">Cancel</button>
          </div>
        </div>
      </Modal>

      {/* move picker */}
      <MovePicker
        open={moveOpen}
        onClose={() => { setMoveOpen(false); setMovePending(null); }}
        currentPath={currentPath}
        items={movePending}
        onMove={(target) => { setMoveOpen(false); executeMove(target); }}
      />

      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Confirm delete" maxWidth="max-w-md">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Delete <strong className="text-text-primary">{deleteConfirm?.items?.length || 0}</strong> item{(deleteConfirm?.items?.length || 0) === 1 ? '' : 's'}? This cannot be undone.
          </p>
          <div className="max-h-48 overflow-y-auto rounded-xl border border-border bg-surface-2/60 p-2 space-y-1">
            {(deleteConfirm?.items || []).slice(0, 20).map((item) => (
              <div key={item.path} className="flex items-center gap-2 text-xs text-text-secondary px-2 py-1 rounded-lg">
                <span>{item.type === 'folder' ? '📁' : '📄'}</span>
                <span className="truncate" title={item.path}>{item.path}</span>
              </div>
            ))}
            {(deleteConfirm?.items?.length || 0) > 20 && <p className="px-2 py-1 text-xs text-text-muted">+{deleteConfirm.items.length - 20} more…</p>}
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setDeleteConfirm(null)} className="btn-base btn-ghost text-sm px-4">Cancel</button>
            <button onClick={confirmDeleteItems} className="btn-base text-sm px-4 bg-danger text-white hover:bg-red-600 rounded-xl">Delete</button>
          </div>
        </div>
      </Modal>

      {/* fullscreen viewer over everything */}
      {viewerPath && (
        <FullscreenViewer files={previewFiles} initialPath={viewerPath} tagsTree={tagsTree} tagSettings={tagSettings}
          onClose={() => { setViewerPath(''); window.history.back(); }}
          onApplyTags={assignPaths} onRemoveTags={removePaths} onDeleteFile={deleteSingleItem}
          onToggleFavorite={toggleFavorite} />
      )}
    </div>
  );
}

// inline breadcrumbs
function BreadcrumbsWrap({ path, onNavigate, pageSize }) {
  const parts = path ? path.split('/').filter(Boolean) : [];
  if (parts.length === 0) return <span className="text-xs text-text-muted">Root</span>;
  // show first, last, ellipsis for middle
  const maxVisible = 3;
  let visibleParts;
  if (parts.length <= maxVisible) {
    visibleParts = parts.map((p, i) => ({ label: p, path: parts.slice(0, i + 1).join('/'), truncated: false }));
  } else {
    visibleParts = [
      { label: parts[0], path: parts[0], truncated: parts[0].length > 10 ? parts[0].slice(0, 10) + '…' : parts[0] },
      { label: '…', path: null, truncated: false, ellipsis: true },
      { label: parts[parts.length - 2], path: parts.slice(0, parts.length - 1).join('/'), truncated: parts[parts.length - 2].length > 10 ? parts[parts.length - 2].slice(0, 10) + '…' : parts[parts.length - 2] },
      { label: parts[parts.length - 1], path: path, truncated: parts[parts.length - 1].length > 12 ? parts[parts.length - 1].slice(0, 12) + '…' : parts[parts.length - 1] },
    ];
  }
  return (
    <nav className="flex items-center gap-1 text-xs text-text-muted">
      <button onClick={() => onNavigate('')} className="hover:text-text-primary transition-colors">Root</button>
      {visibleParts.map((c, i) => (
        <span key={i} className="flex items-center gap-1">
          <span className="text-text-muted">/</span>
          {c.ellipsis ? (
            <span className="text-text-muted">…</span>
          ) : (
            <button
              onClick={c.path ? () => onNavigate(c.path) : undefined}
              className="hover:text-text-primary transition-colors truncate max-w-[120px]"
              title={c.path || c.label}
            >
              {c.truncated || c.label}
            </button>
          )}
        </span>
      ))}
    </nav>
  );
}
