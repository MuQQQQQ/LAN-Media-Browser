import { useEffect, useMemo, useState } from 'react';
import { api } from './api.js';
import Breadcrumbs from './components/Breadcrumbs.jsx';
import FileGrid from './components/FileGrid.jsx';
import ApplyTagsModal from './components/ApplyTagsModal.jsx';
import CreateTagModal from './components/CreateTagModal.jsx';
import FullscreenViewer from './components/FullscreenViewer.jsx';
import Pagination from './components/Pagination.jsx';
import SearchPanel from './components/SearchPanel.jsx';
import TagsPage from './components/TagsPage.jsx';
import FavoritesPage from './components/FavoritesPage.jsx';
import Toast from './components/Toast.jsx';
import { loadTagSettings, saveTagSettings } from './tagSettings.js';

const defaultFilters = { q: '', name: '', tags: [], tagMode: 'and', matchType: 'contains', scope: 'both', caseSensitive: false, itemType: 'all', pathFilter: '', dateFrom: '', dateTo: '', tagSearchEnabled: false };

function updateUrl(params) {
    const next = new URLSearchParams(params);
    window.history.replaceState(null, '', `${window.location.pathname}?${next}`);
}

const MISSING_ITEMS_PREVIEW_LIMIT = 200;

function MissingItemsDialog({ open, items, totalCount, busy, onClose, onDeleteAll, onDeleteSelected, onCopyAll, onExportList }) {
    const [selectedPaths, setSelectedPaths] = useState(new Set());

    useEffect(() => {
        if (open) setSelectedPaths(new Set(items.map((item) => item.path)));
    }, [open, items]);

    if (!open) return null;

    const shownCount = items.length;
    const isTruncated = totalCount > shownCount;
    const selectedItems = items.filter((item) => selectedPaths.has(item.path));
    const allShownSelected = shownCount > 0 && selectedPaths.size === shownCount;
    const togglePath = (path) => setSelectedPaths((current) => {
        const next = new Set(current);
        next.has(path) ? next.delete(path) : next.add(path);
        return next;
    });
    const toggleAllShown = () => setSelectedPaths(allShownSelected ? new Set() : new Set(items.map((item) => item.path)));

    return (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="missing-items-title">
            <section className="modal missing-items-modal">
                <header>
                    <div>
                        <h2 id="missing-items-title">Missing Items Detected</h2>
                        <p className="muted">These items exist in the database but are missing locally.</p>
                    </div>
                    <button className="secondary" onClick={onClose} disabled={busy} aria-label="Close missing items dialog">✕</button>
                </header>

                <div className="missing-items-summary">
                    <strong>{totalCount} missing item(s)</strong>
                    <span>{selectedPaths.size} selected from {shownCount} shown</span>
                    {isTruncated && <span className="warning-text">Showing first {MISSING_ITEMS_PREVIEW_LIMIT} items for performance.</span>}
                </div>

                <div className="missing-items-tools">
                    <label className="inline-check">
                        <input type="checkbox" checked={allShownSelected} onChange={toggleAllShown} disabled={!shownCount || busy} />
                        Select all shown
                    </label>
                    <button className="secondary" onClick={onCopyAll} disabled={!shownCount || busy}>Copy all paths</button>
                    <button className="secondary" onClick={onExportList} disabled={!shownCount || busy}>Export list</button>
                </div>

                <div className="missing-items-list" role="list" aria-label="Missing item paths">
                    {items.map((item) => {
                        const type = item.itemType === 'folder' || item.type === 'folder' ? 'folder' : 'file';
                        return (
                            <label className="missing-item-row" key={item.path} title={item.path} role="listitem">
                                <input type="checkbox" checked={selectedPaths.has(item.path)} onChange={() => togglePath(item.path)} disabled={busy} />
                                <span className="missing-item-type" aria-label={type}>{type === 'folder' ? '📁' : '📄'}</span>
                                <code>{item.path}</code>
                            </label>
                        );
                    })}
                </div>

                <div className="actions missing-items-actions">
                    <button className="danger" onClick={() => onDeleteAll()} disabled={busy || !totalCount}>Delete All</button>
                    <button className="danger" onClick={() => onDeleteSelected(selectedItems)} disabled={busy || !selectedItems.length}>Delete selected ({selectedItems.length})</button>
                    <button className="secondary" onClick={onClose} disabled={busy}>Cancel</button>
                </div>
            </section>
        </div>
    );
}

export default function App() {
    const url = new URLSearchParams(window.location.search);
    const [currentPath, setCurrentPath] = useState(url.get('path') || '');
    const [page, setPage] = useState(Number(url.get('page') || 1));
    const [pageSize, setPageSize] = useState(Number(url.get('pageSize') || 50));
    const [sortBy, setSortBy] = useState(url.get('sortBy') || 'name');
    const [sortDir, setSortDir] = useState(url.get('sortDir') || 'asc');
    const [layoutMode, setLayoutMode] = useState(() => localStorage.getItem('layoutMode') || 'grid');
    const [items, setItems] = useState([]);
    const [isSelectedAll, setIsSelectedAll] = useState(false);
    const [total, setTotal] = useState(0);
    const [selected, setSelected] = useState(new Set());
    const [tagsTree, setTagsTree] = useState([]);
    const [tagSettings, setTagSettings] = useState(loadTagSettings);
    const [filters, setFilters] = useState(defaultFilters);
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

    const selectedPaths = useMemo(() => Array.from(selected), [selected]);
    const previewFiles = useMemo(() => items.filter((item) => item.type !== 'folder'), [items]);

    const changeLayoutMode = (mode) => {
        const next = mode === 'stream' ? 'stream' : 'grid';
        setLayoutMode(next);
        localStorage.setItem('layoutMode', next);
    };

    async function loadTags() {
        const data = await api.tags(tagSettings.sortMode);
        setTagsTree(data.tags);
    }

    async function load() {
        setError('');
        try {
            if (isSearchPage) {
                const searchTags = (url.get('tags') || '').split(',').map(Number).filter(Boolean);
                const searchFilters = { tags: searchTags, tagMode: url.get('tagMode') || 'and', q: url.get('q') || url.get('name') || '', name: url.get('q') || url.get('name') || '', matchType: url.get('matchType') || 'contains', scope: url.get('scope') || 'both', caseSensitive: url.get('caseSensitive') === 'true', itemType: url.get('itemType') || 'all', pathFilter: url.get('pathFilter') || '', dateFrom: url.get('dateFrom') || '', dateTo: url.get('dateTo') || '' };
                setFilters((current) => ({ ...current, ...searchFilters, tagSearchEnabled: searchTags.length > 0 }));
                const data = await api.search({ ...searchFilters, page, pageSize, sortBy, sortDir });
                setItems(data.files);
                setTotal(data.total);
                const nextParams = new URLSearchParams(window.location.search);
                nextParams.set('page', page);
                nextParams.set('pageSize', pageSize);
                nextParams.set('sortBy', sortBy);
                nextParams.set('sortDir', sortDir);
                updateUrl(nextParams);
            } else {
                const data = await api.browse({ path: currentPath, page, pageSize, sortBy, sortDir });
                setItems(data.items);
                setTotal(data.total);
                updateUrl({ path: currentPath, page, pageSize, sortBy, sortDir });
            }
        } catch (err) {
            setError(err.message);
        }
    }

    useEffect(() => { loadTags().catch((err) => setError(err.message)); }, [tagSettings.sortMode]);
    useEffect(() => { if (!isTagsPage && !isFavoritesPage) load(); }, [currentPath, page, pageSize, sortBy, sortDir, isSearchPage, isTagsPage, isFavoritesPage]);
    useEffect(() => {
        if (isTagsPage) return;

        api.orphanRecords()
            .then((data) => {
                console.log('Orphan records:', data.items);

                if (data.count > 0) {
                    setMissingItems(Array.isArray(data.items) ? data.items : []);
                    setMissingItemsTotal(data.count);
                    setMissingDialogOpen(true);
                }
            })
            .catch(() => {});
    }, []);
    useEffect(() => { if (toast) { const timer = setTimeout(() => setToast(''), 2600); return () => clearTimeout(timer); } }, [toast]);
    useEffect(() => {
        if (!applyModalOpen || !selected.size) return;
        const selectedItems = items.filter((item) => selected.has(item.path)).map((item) => ({ path: item.path, type: item.type === 'folder' ? 'folder' : 'file' }));
        api.tagAnalysis(selectedItems).then(setTagAnalysis).catch(() => setTagAnalysis({ common: [], partial: [] }));
    }, [applyModalOpen, selected, items]);
    useEffect(() => {
        const handlePopState = () => {
            const params = new URLSearchParams(window.location.search);
            const viewPath = params.get('view');
            setViewerPath(viewPath || '');
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);
    const navigate = (path) => {
        window.location.href = `/?${new URLSearchParams({
            path,
            page: 1,
            pageSize,
            sortBy,
            sortDir
        })}`;
        // window.open(`/?${new URLSearchParams({ path, page: 1, pageSize })}`, '_blank', 'noopener,noreferrer');
    };
    const toggleSelect = (path) => setSelected((prev) => {
        const next = new Set(prev);
        next.has(path) ? next.delete(path) : next.add(path);
        return next;
    });
    const runSearch = () => {
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
    const clearFilters = () => {
        setFilters(defaultFilters);
        setPage(1);
    };
    const assignPaths = async (paths, tagIds) => {
        await api.assignTags({ paths, tagIds });
        await loadTags();
        await load().catch(() => {});
        setToast('Tag added successfully');
    };
    const assignSelected = async (tagIds) => {
        const selectedItems = items.filter((item) => selected.has(item.path)).map((item) => ({ path: item.path, type: item.type === 'folder' ? 'folder' : 'file' }));
        await assignPaths(selectedItems, tagIds);
        setApplyModalOpen(false);
    };
    const removePaths = async (paths, tagIds) => {
        await api.removeTags({ paths, tagIds });
        await loadTags();
        await load().catch(() => {});
        setToast('Tag removed');
    };
    const removeSelected = async (tagIds) => {
        const selectedItems = items.filter((item) => selected.has(item.path)).map((item) => ({ path: item.path, type: item.type === 'folder' ? 'folder' : 'file' }));
        await removePaths(selectedItems, tagIds);
        setApplyModalOpen(false);
    };
    const createTag = async (payload) => {
        await api.createTag(payload);
        await loadTags();
        setToast('Tag added successfully');
    };

    const updateTag = async (id, payload) => {
        await api.updateTag(id, payload);
        await loadTags();
        setToast('Tag updated');
    };
    const deleteTag = async (id) => {
        if (!confirm('Delete this tag? Child tags and file assignments may be removed.')) return;
        await api.deleteTag(id);
        await loadTags();
    };

    const toggleFavorite = async (item) => {
        const payload = { path: item.path, type: item.type === 'folder' ? 'folder' : 'file' };
        if (item.favorite) {
            await api.removeFavorite(payload);
            setToast('Removed from favorites');
        } else {
            await api.addFavorite(payload);
            setToast('Added to favorites');
        }
        setItems((current) => current.map((entry) => entry.path === item.path ? { ...entry, favorite: !item.favorite } : entry));
    };

    const selectAll = () => {
        
        setSelected(new Set(items.map((item) => item.path)));
    }
    const deselectAll = () => setSelected(new Set());

    const selectAllByKey =()=>{
        if(isSelectedAll){
            deselectAll();
            setIsSelectedAll(false);
        }else{
            selectAll();
            setIsSelectedAll(true);
        }
    }
    const selectedItemsForOps = () => items.filter((item) => selected.has(item.path));
    const normalizeOpItems = (targetItems) => targetItems.map((item) => ({ path: item.path, type: item.type === 'folder' ? 'folder' : 'file' }));
    const deleteItems = async (targetItems) => {
        if (!targetItems.length) return;
        const label = targetItems.length === 1 ? 'selected item' : `${targetItems.length} selected item(s)`;
        if (!confirm(`Are you sure you want to delete the ${label}?`)) return;
        const payload = targetItems.map((item) => ({ path: item.path, type: item.type === 'folder' ? 'folder' : 'file' }));
        const result = await api.deleteItems(payload);
        setSelected(new Set());
        await load().catch(() => {});
        if (result.failed) setToast(`${result.deleted} deleted, ${result.failed} failed`);
        else if (result.results?.some((item) => item.status === 'db-only')) setToast('File not found locally, removed database record only');
        else setToast('Deleted successfully');
    };
    const deleteSingleItem = (item) => deleteItems([item]);
    const deleteSelected = () => deleteItems(items.filter((item) => selected.has(item.path)));

    const moveItems = async (targetItems) => {
        if (!targetItems.length) return;
        const targetFolder = window.prompt('Move to folder path (relative to base)', currentPath);
        if (targetFolder === null) return;
        const createFolder = window.prompt('Optional new folder name to create inside target', '') || '';
        await api.moveItems({ items: normalizeOpItems(targetItems), targetFolder, createFolder });
        setSelected(new Set());
        setToast(`Moved ${targetItems.length} item(s)`);
        await load().catch(() => {});
    };
    const renameItem = async (item) => {
        const renameTo = window.prompt('Rename item', item.name);
        if (!renameTo || renameTo === item.name) return;
        const parent = item.path.split('/').slice(0, -1).join('/');
        await api.moveItems({ items: normalizeOpItems([item]), targetFolder: parent, renameTo });
        setToast('Renamed successfully');
        await load().catch(() => {});
    };
    const copyItemsToClipboard = (targetItems) => {
        setClipboard({ mode: 'copy', items: normalizeOpItems(targetItems), at: Date.now() });
        setToast(`Copied ${targetItems.length} item(s). Paste within 10 minutes.`);
    };
    const cutItemsToClipboard = (targetItems) => {
        setClipboard({ mode: 'cut', items: normalizeOpItems(targetItems), at: Date.now() });
        setToast(`Cut ${targetItems.length} item(s). Paste within 10 minutes.`);
    };
    const pasteItems = async (targetFolder = currentPath) => {
        if (!clipboard?.items?.length) return;
        if (Date.now() - clipboard.at > 10 * 60 * 1000) {
            setClipboard(null);
            setToast('Clipboard expired');
            return;
        }
        if (clipboard.mode === 'copy') await api.copyItems({ items: clipboard.items, targetFolder });
        else await api.moveItems({ items: clipboard.items, targetFolder });
        setToast(`${clipboard.mode === 'copy' ? 'Copied' : 'Moved'} ${clipboard.items.length} item(s)`);
        if (clipboard.mode === 'cut') setClipboard(null);
        setSelected(new Set());
        await load().catch(() => {});
    };
    const tagItems = (targetItems) => {
        setSelected(new Set(targetItems.map((item) => item.path)));
        setApplyModalOpen(true);
    };

    useEffect(() => {
        const handler = (event) => {
            const target = event.target;
            if (target?.tagName === 'INPUT' && target.type !== 'checkbox' && target.type !== 'radio') return;
            if (target?.tagName === 'TEXTAREA' || target?.tagName === 'SELECT') return;
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') { event.preventDefault(); selectAllByKey(); }
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); setApplyModalOpen(true); }
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') { event.preventDefault(); deselectAll(); }
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c') { event.preventDefault(); setToast('copy successfully');copyItemsToClipboard(selectedItemsForOps()); }
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'x') { event.preventDefault(); setToast('cut successfully');cutItemsToClipboard(selectedItemsForOps()); }
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v') { event.preventDefault(); setToast('paste successfully');pasteItems(); }
            if (event.key === 'Delete') { event.preventDefault(); deleteSelected(); }
        };
        window.addEventListener('keydown', handler,true);
        return () => window.removeEventListener('keydown', handler,true);
    }, [items, selected, clipboard, currentPath]);

    const closeMissingDialog = () => {
        if (missingDialogBusy) return;
        setMissingDialogOpen(false);
    };
    const deleteAllMissingItems = async () => {
        setMissingDialogBusy(true);
        try {
            const cleanup = await api.cleanupOrphans();
            setToast(`Removed ${cleanup.removed} invalid database record(s)`);
            setMissingDialogOpen(false);
            setMissingItems([]);
            setMissingItemsTotal(0);
            await load().catch(() => {});
        } catch (err) {
            setError(err.message);
        } finally {
            setMissingDialogBusy(false);
        }
    };
    const deleteSelectedMissingItems = async (targetItems) => {
        if (!targetItems.length) return;
        setMissingDialogBusy(true);
        try {
            const payload = targetItems.map((item) => ({ path: item.path, type: item.itemType === 'folder' || item.type === 'folder' ? 'folder' : 'file' }));
            const result = await api.deleteItems(payload);
            const removed = result.results?.reduce((count, item) => count + (item.removedRecords || (item.status === 'deleted' || item.status === 'db-only' ? 1 : 0)), 0) ?? result.deleted ?? 0;
            setToast(`Removed ${removed} invalid database record(s)`);
            setMissingItems((current) => current.filter((item) => !targetItems.some((target) => target.path === item.path)));
            setMissingItemsTotal((current) => Math.max(0, current - targetItems.length));
            if (targetItems.length >= missingItems.length && missingItemsTotal <= missingItems.length) setMissingDialogOpen(false);
            await load().catch(() => {});
        } catch (err) {
            setError(err.message);
        } finally {
            setMissingDialogBusy(false);
        }
    };
    const copyMissingPaths = async () => {
        const paths = missingItems.map((item) => item.path).join('\n');
        await navigator.clipboard.writeText(paths);
        setToast('Missing item paths copied');
    };
    const exportMissingPaths = () => {
        const content = missingItems.map((item) => `${item.itemType === 'folder' || item.type === 'folder' ? 'folder' : 'file'}\t${item.path}`).join('\n');
        const blob = new Blob([`type\tpath\n${content}\n`], { type: 'text/tab-separated-values;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'missing-items.tsv';
        link.click();
        URL.revokeObjectURL(url);
    };

    if (isTagsPage) {
        return <TagsPage tagsTree={tagsTree} tagSettings={tagSettings} setTagSettings={setTagSettings} onCreateTag={createTag} onUpdateTag={updateTag} onDeleteTag={deleteTag} />;
    }

    if (isFavoritesPage) {
        return <><Toast message={toast} /><FavoritesPage api={api} pageSize={pageSize} selected={selected} onToggleSelect={toggleSelect} onOpenFolder={navigate} onOpenFile={(file) => { setViewerPath(file.path); const u = new URL(window.location.href); u.searchParams.set('view', file.path); window.history.pushState({ viewing: true, filePath: file.path }, '', u.toString()); }} onToggleFavorite={toggleFavorite} onDeleteItem={deleteSingleItem} /></>;
    }

    if (viewerPath) {
        return <FullscreenViewer files={previewFiles} initialPath={viewerPath} tagsTree={tagsTree} tagSettings={tagSettings} onClose={() => { setViewerPath(''); window.history.back(); }} onApplyTags={assignPaths} onRemoveTags={removePaths} onDeleteFile={deleteSingleItem} />;
    }

    return (
        <main>
            <header className="app-header">
                <div>
                    <h1>LAN Media Browser</h1>
                    <p>Explorer + tags + search for local images/videos</p>
                </div>
                <div className="header-actions"><a className="button-link" href={`/search?${new URLSearchParams({ itemType: 'image', page: 1, pageSize, sortBy, sortDir })}`}>All Images</a><a className="button-link" href={`/search?${new URLSearchParams({ itemType: 'video', page: 1, pageSize, sortBy, sortDir })}`}>All Videos</a><a className="button-link" href="/favorites">Favorites ★</a><a className="button-link" href="/tags">Manage Tags</a><button onClick={() => setCreateModalOpen(true)}>Create Tag</button></div>
            </header>
            <SearchPanel tagsTree={tagsTree} filters={filters} setFilters={setFilters} onSearch={runSearch} onClear={clearFilters} />
            {isSearchPage ? (
                <section className="active-filters">
                    <strong>Search results</strong>
                    <span>{total} result(s)</span>
                    {(url.get('q') || url.get('name')) && <button className="filter-chip" onClick={() => { const next = new URLSearchParams(window.location.search); next.delete('q'); next.delete('name'); window.location.href = `/search?${next}`; }}>Query: {url.get('q') || url.get('name')} ×</button>}
                    <span>Mode: {(url.get('tagMode') || 'and').toUpperCase()}</span>
                    <span>Tags: {url.get('tags') || 'Any'}</span>
                </section>
            ) : (
                <Breadcrumbs path={currentPath} onNavigate={navigate} pageSize={pageSize} />
            )}
            {error && <div className="error">{error}</div>}
            <div className="toolbar">
                <label>Page size <input type="number" min="1" max="200" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} /></label>
                <label>Sort by <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1); }}><option value="name">Name</option><option value="createdAt">Created time</option><option value="modifiedAt">Modified time</option><option value="size">File size</option></select></label>
                <label>Direction <select value={sortDir} onChange={(e) => { setSortDir(e.target.value); setPage(1); }}><option value="asc">Ascending</option><option value="desc">Descending</option></select></label>
                {!!selected.size && <><button className="secondary" onClick={selectAll}>Select All</button><button className="secondary" onClick={deselectAll}>Deselect All</button><button className="secondary" onClick={() => moveItems(selectedItemsForOps())}>Move selected</button><button className="secondary" onClick={() => copyItemsToClipboard(selectedItemsForOps())}>Copy</button><button className="secondary" onClick={() => cutItemsToClipboard(selectedItemsForOps())}>Cut</button><button className="danger" onClick={deleteSelected}>Delete selected</button></>}
                {clipboard?.items?.length > 0 && <button className="secondary" onClick={() => pasteItems()}>Paste here ({clipboard.mode})</button>}
                <button className="toolbar-push" disabled={!selected.size} onClick={() => setApplyModalOpen(true)}>Tag selected files ({selected.size})</button>
            </div>
            <FileGrid items={items} selectedPaths={selected} layoutMode={layoutMode} onLayoutModeChange={changeLayoutMode} onToggleSelect={toggleSelect} onOpenFolder={navigate} onLongPressSelect={toggleSelect} onOpenFile={(file) => { setViewerPath(file.path); const u = new URL(window.location.href); u.searchParams.set('view', file.path); window.history.pushState({ viewing: true, filePath: file.path }, '', u.toString()); }} onToggleFavorite={toggleFavorite} onDeleteItem={deleteSingleItem} onRenameItem={renameItem} onMoveItems={moveItems} onCopyItems={copyItemsToClipboard} onCutItems={cutItemsToClipboard} onPasteItems={pasteItems} onTagItems={tagItems} pageSize={pageSize} />
            <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
            <ApplyTagsModal open={applyModalOpen} selectedCount={selected.size} tagsTree={tagsTree} tagSettings={tagSettings} onClose={() => setApplyModalOpen(false)} onApply={assignSelected} onRemove={removeSelected} onCreateTag={createTag} analysis={tagAnalysis} />
            <CreateTagModal open={createModalOpen} tagsTree={tagsTree} onClose={() => setCreateModalOpen(false)} onCreateTag={createTag} />
            <MissingItemsDialog open={missingDialogOpen} items={missingItems} totalCount={missingItemsTotal} busy={missingDialogBusy} onClose={closeMissingDialog} onDeleteAll={deleteAllMissingItems} onDeleteSelected={deleteSelectedMissingItems} onCopyAll={copyMissingPaths} onExportList={exportMissingPaths} />
            <Toast message={toast} />
        </main>
    );
}