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
import { loadTagSettings, saveTagSettings } from './tagSettings.js';

const defaultFilters = { nameEnabled: false, name: '', tags: [], tagMode: 'and' };

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
    const [applyModalOpen, setApplyModalOpen] = useState(false);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [viewerPath, setViewerPath] = useState('');
    const [error, setError] = useState('');

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
                const searchFilters = { tags: searchTags, tagMode: url.get('tagMode') || 'and', name: url.get('name') || '' };
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
    useEffect(() => { if (!isTagsPage) load(); }, [currentPath, page, pageSize, isSearchPage, isTagsPage]);
    useEffect(() => {
            const handlePopState = () => {
                if (viewerPath) {
                    setViewerPath(''); // 关闭预览
                }
            };
            window.addEventListener('popstate', handlePopState);
            window.addEventListener('click', function() {
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen();
                }
            }, { once: true }); // 只执行一次
            return () => window.removeEventListener('popstate', handlePopState);
        }, [viewerPath]);
    const navigate = (path) => {
        setCurrentPath(path);
        setPage(1);
        setSelected(new Set());
    };
    const toggleSelect = (path) => setSelected((prev) => {
        const next = new Set(prev);
        next.has(path) ? next.delete(path) : next.add(path);
        return next;
    });
    const runSearch = () => {
        const params = new URLSearchParams({ tagMode: filters.tagMode, page: 1, pageSize });
        if (filters.tags.length) params.set('tags', filters.tags.join(','));
        if (filters.nameEnabled && filters.name.trim()) params.set('name', filters.name.trim());
        window.open(`/search?${params}`, '_blank');
    };
    const clearFilters = () => {
        setFilters(defaultFilters);
        setPage(1);
    };
    const assignPaths = async (paths, tagIds) => {
        await api.assignTags({ paths, tagIds });
        await loadTags();
    };
    const assignSelected = async (tagIds) => {
        await assignPaths(selectedPaths, tagIds);
        setApplyModalOpen(false);
    };
    const removePaths = async (paths, tagIds) => {
        await api.removeTags({ paths, tagIds });
        await loadTags();
    };
    const createTag = async (payload) => {
        await api.createTag(payload);
        await loadTags();
    };

    const updateTag = async (id, payload) => {
        await api.updateTag(id, payload);
        await loadTags();
    };
    const deleteTag = async (id) => {
        if (!confirm('Delete this tag? Child tags and file assignments may be removed.')) return;
        await api.deleteTag(id);
        await loadTags();
    };

    if (isTagsPage) {
        return <TagsPage tagsTree={tagsTree} tagSettings={tagSettings} setTagSettings={setTagSettings} onCreateTag={createTag} onUpdateTag={updateTag} onDeleteTag={deleteTag} />;
    }

    return (
        <main>
            <header className="app-header">
                <div>
                    <h1>LAN Media Browser</h1>
                    <p>Explorer + tags + search for local images/videos</p>
                </div>
                <div className="header-actions"><a className="button-link" href="/tags">Manage Tags</a><button onClick={() => setCreateModalOpen(true)}>Create Tag</button></div>
            </header>
            {!isSearchPage && <SearchPanel tagsTree={tagsTree} filters={filters} setFilters={setFilters} onSearch={runSearch} onClear={clearFilters} />}
            {isSearchPage ? (
                <section className="active-filters">
                    <strong>Search results</strong>
                    <span>Name: {url.get('name') || 'Disabled'}</span>
                    <span>Mode: {(url.get('tagMode') || 'and').toUpperCase()}</span>
                    <span>Tags: {url.get('tags') || 'Any'}</span>
                </section>
            ) : (
                <Breadcrumbs path={currentPath} onNavigate={navigate} />
            )}
            {error && <div className="error">{error}</div>}
            <div className="toolbar">
                <label>Page size <input type="number" min="1" max="200" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} /></label>
                <button className="toolbar-push" disabled={!selected.size} onClick={() => setApplyModalOpen(true)}>Tag selected files ({selected.size})</button>
            </div>
            <FileGrid items={items} selectedPaths={selected} onToggleSelect={toggleSelect} onOpenFolder={navigate} onLongPressSelect={toggleSelect} onOpenFile={(file) => {setViewerPath(file.path);window.history.pushState({ viewing: true }, '');}} />
            <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
            <ApplyTagsModal open={applyModalOpen} selectedCount={selected.size} tagsTree={tagsTree} tagSettings={tagSettings} onClose={() => setApplyModalOpen(false)} onApply={assignSelected} />
            <CreateTagModal open={createModalOpen} tagsTree={tagsTree} onClose={() => setCreateModalOpen(false)} onCreateTag={createTag} />
            {viewerPath && <FullscreenViewer files={items.filter((item) => item.type !== 'folder')} initialPath={viewerPath} tagsTree={tagsTree} tagSettings={tagSettings} onClose={() => {setViewerPath('');if (window.history.state?.viewing) {window.history.back(); }}} onApplyTags={assignPaths} onRemoveTags={removePaths} />}
        </main>
    );
}