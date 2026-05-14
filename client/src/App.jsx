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

const defaultFilters = { q: '', name: '', tags: [], tagMode: 'and', matchType: 'contains', scope: 'both', caseSensitive: false, itemType: 'all', tagSearchEnabled: false };

function updateUrl(params) {
    const next = new URLSearchParams(params);
    window.history.replaceState(null, '', `${window.location.pathname}?${next}`);
}

export default function App() {
    const url = new URLSearchParams(window.location.search);
    const [currentPath, setCurrentPath] = useState(url.get('path') || '');
    const [page, setPage] = useState(Number(url.get('page') || 1));
    const [pageSize, setPageSize] = useState(Number(url.get('pageSize') || 50));
    const [items, setItems] = useState([]);
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

    const selectedPaths = useMemo(() => Array.from(selected), [selected]);

    async function loadTags() {
        const data = await api.tags(tagSettings.sortMode);
        setTagsTree(data.tags);
    }

    async function load() {
        setError('');
        try {
            if (isSearchPage) {
                const searchTags = (url.get('tags') || '').split(',').map(Number).filter(Boolean);
                const searchFilters = { tags: searchTags, tagMode: url.get('tagMode') || 'and', q: url.get('q') || url.get('name') || '', name: url.get('q') || url.get('name') || '', matchType: url.get('matchType') || 'contains', scope: url.get('scope') || 'both', caseSensitive: url.get('caseSensitive') === 'true', itemType: url.get('itemType') || 'all' };
                setFilters((current) => ({ ...current, ...searchFilters, tagSearchEnabled: searchTags.length > 0 }));
                const data = await api.search({ ...searchFilters, page, pageSize });
                setItems(data.files);
                setTotal(data.total);
            } else {
                const data = await api.browse({ path: currentPath, page, pageSize });
                setItems(data.items);
                setTotal(data.total);
                updateUrl({ path: currentPath, page, pageSize });
            }
        } catch (err) {
            setError(err.message);
        }
    }

    useEffect(() => { loadTags().catch((err) => setError(err.message)); }, [tagSettings.sortMode]);
    useEffect(() => { if (!isTagsPage && !isFavoritesPage) load(); }, [currentPath, page, pageSize, isSearchPage, isTagsPage, isFavoritesPage]);
    useEffect(() => {
        if (isTagsPage) return;

        api.orphanRecords()
            .then(async (data) => {
                console.log('Orphan records:', data.items);

                if (data.count > 0) {
                    // 假设 data.items 是一个数组，每个 item 有 path 字段
                    const paths = data.items
                        .map(item => item.path)   // 根据你的数据结构调整
                        .join('\n');

                    const message = `${data.count} item(s) exist in the database but are missing locally:\n\n${paths}\n\nRemove these invalid records?`;

                    if (confirm(message)) {
                        const cleanup = await api.cleanupOrphans();
                        setToast(`Removed ${cleanup.removed} invalid database record(s)`);
                        await load().catch(() => {});
                    }
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
                if (viewerPath) {
                    setViewerPath(''); // 关闭预览
                }
            };
            window.addEventListener('popstate', handlePopState);
            // window.addEventListener('click', function() {
            //     if (!document.fullscreenElement) {
            //         document.documentElement.requestFullscreen();
            //     }
            // }, { once: true }); 
            return () => window.removeEventListener('popstate', handlePopState);
        }, [viewerPath]);
    const navigate = (path) => {
        window.location.href = `/?${new URLSearchParams({
            path,
            page: 1,
            pageSize
        })}`;
        // window.open(`/?${new URLSearchParams({ path, page: 1, pageSize })}`, '_blank', 'noopener,noreferrer');
    };
    const toggleSelect = (path) => setSelected((prev) => {
        const next = new Set(prev);
        next.has(path) ? next.delete(path) : next.add(path);
        return next;
    });
    const runSearch = () => {
        const params = new URLSearchParams({ tagMode: filters.tagMode, page: 1, pageSize });
        params.set('q', filters.q || filters.name || '');
        params.set('matchType', filters.matchType);
        params.set('scope', filters.scope);
        params.set('caseSensitive', filters.caseSensitive);
        params.set('itemType', filters.itemType);
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

    const selectAll = () => setSelected(new Set(items.map((item) => item.path)));
    const deselectAll = () => setSelected(new Set());
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

    if (isTagsPage) {
        return <TagsPage tagsTree={tagsTree} tagSettings={tagSettings} setTagSettings={setTagSettings} onCreateTag={createTag} onUpdateTag={updateTag} onDeleteTag={deleteTag} />;
    }

    if (isFavoritesPage) {
        return <><Toast message={toast} /><FavoritesPage api={api} pageSize={pageSize} selected={selected} onToggleSelect={toggleSelect} onOpenFolder={navigate} onOpenFile={(file) => {setViewerPath(file.path);}} onToggleFavorite={toggleFavorite} onDeleteItem={deleteSingleItem} /></>;
    }

    return (
        <main>
            <header className="app-header">
                <div>
                    <h1>LAN Media Browser</h1>
                    <p>Explorer + tags + search for local images/videos</p>
                </div>
                <div className="header-actions"><a className="button-link" href="/favorites">Favorites ★</a><a className="button-link" href="/tags">Manage Tags</a><button onClick={() => setCreateModalOpen(true)}>Create Tag</button></div>
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
                {!!selected.size && <><button className="secondary" onClick={selectAll}>Select All</button><button className="secondary" onClick={deselectAll}>Deselect All</button><button className="danger" onClick={deleteSelected}>Delete selected</button></>}
                <button className="toolbar-push" disabled={!selected.size} onClick={() => setApplyModalOpen(true)}>Tag selected files ({selected.size})</button>
            </div>
            <FileGrid items={items} selectedPaths={selected} onToggleSelect={toggleSelect} onOpenFolder={navigate} onLongPressSelect={toggleSelect} onOpenFile={(file) => {setViewerPath(file.path);window.history.pushState({ viewing: true }, '');}} onToggleFavorite={toggleFavorite} onDeleteItem={deleteSingleItem} pageSize={pageSize} />
            <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
            <ApplyTagsModal open={applyModalOpen} selectedCount={selected.size} tagsTree={tagsTree} tagSettings={tagSettings} onClose={() => setApplyModalOpen(false)} onApply={assignSelected} onRemove={removeSelected} onCreateTag={createTag} analysis={tagAnalysis} />
            <CreateTagModal open={createModalOpen} tagsTree={tagsTree} onClose={() => setCreateModalOpen(false)} onCreateTag={createTag} />
            {viewerPath && <FullscreenViewer files={items.filter((item) => item.type !== 'folder')} initialPath={viewerPath} tagsTree={tagsTree} tagSettings={tagSettings} onClose={() => {setViewerPath('');if (window.history.state?.viewing) {window.history.back(); }}} onApplyTags={assignPaths} onRemoveTags={removePaths} onDeleteFile={deleteSingleItem} />}
            <Toast message={toast} />
        </main>
    );
}