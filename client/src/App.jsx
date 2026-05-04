import { useEffect, useMemo, useState } from 'react';
import { api } from './api.js';
import Breadcrumbs from './components/Breadcrumbs.jsx';
import FileGrid from './components/FileGrid.jsx';
import Pagination from './components/Pagination.jsx';
import SearchPanel from './components/SearchPanel.jsx';
import TagModal from './components/TagModal.jsx';

const defaultFilters = { name: '', tags: [], tagMode: 'and' };

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
    const [filters, setFilters] = useState(defaultFilters);
    const [searchMode, setSearchMode] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [error, setError] = useState('');

    const selectedPaths = useMemo(() => Array.from(selected), [selected]);

    async function loadTags() {
        const data = await api.tags();
        setTagsTree(data.tags);
    }

    async function load() {
        setError('');
        try {
            if (searchMode) {
                const data = await api.search({ ...filters, page, pageSize });
                setItems(data.files);
                setTotal(data.total);
                updateUrl({ search: '1', name: filters.name, tags: filters.tags.join(','), tagMode: filters.tagMode, page, pageSize });
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

    useEffect(() => { loadTags().catch((err) => setError(err.message)); }, []);
    useEffect(() => { load(); }, [currentPath, page, pageSize, searchMode]);

    const navigate = (path) => {
        setSearchMode(false);
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
        setSearchMode(true);
        setPage(1);
        setSelected(new Set());
        setTimeout(load, 0);
    };
    const clearFilters = () => {
        setFilters(defaultFilters);
        setSearchMode(false);
        setPage(1);
    };
    const assign = async (tagIds) => {
        await api.assignTags({ paths: selectedPaths, tagIds });
        await loadTags();
    };
    const remove = async (tagIds) => {
        await api.removeTags({ paths: selectedPaths, tagIds });
        await loadTags();
    };
    const createTag = async (payload) => {
        await api.createTag(payload);
        await loadTags();
    };

    return (
        <main>
            <header className="app-header">
                <div>
                    <h1>LAN Media Browser</h1>
                    <p>Explorer + tags + search for local images/videos</p>
                </div>
                <button disabled={!selected.size} onClick={() => setModalOpen(true)}>Tag selected ({selected.size})</button>
            </header>
            <SearchPanel tagsTree={tagsTree} filters={filters} setFilters={setFilters} onSearch={runSearch} onClear={clearFilters} />
            {searchMode ? (
                <section className="active-filters">
                    <strong>Search results</strong>
                    <span>Name: {filters.name || 'Any'}</span>
                    <span>Mode: {filters.tagMode.toUpperCase()}</span>
                    <span>Tags: {filters.tags.length || 'Any'}</span>
                    <button onClick={clearFilters}>Back to folder</button>
                </section>
            ) : (
                <Breadcrumbs path={currentPath} onNavigate={navigate} />
            )}
            {error && <div className="error">{error}</div>}
            <div className="toolbar">
                <label>Page size <input type="number" min="1" max="200" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} /></label>
            </div>
            <FileGrid items={items} selectedPaths={selected} onToggleSelect={toggleSelect} onOpenFolder={navigate} onLongPressSelect={toggleSelect} />
            <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
            <TagModal open={modalOpen} selectedCount={selected.size} tagsTree={tagsTree} onClose={() => setModalOpen(false)} onAssign={assign} onRemove={remove} onCreateTag={createTag} />
        </main>
    );
}