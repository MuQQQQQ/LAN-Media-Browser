import { useState, useEffect, useCallback } from 'react';
import { FolderOpen, ChevronRight, Search, Home } from 'lucide-react';
import Modal from './Modal.jsx';
import { api } from '../../api.js';

function folderName(path) {
    if (!path) return 'Root';
    return path.split('/').filter(Boolean).pop() || path;
}

function isDescendant(path, parent) {
    if (!parent) return true;
    return path === parent || path.startsWith(`${parent}/`);
}

function FolderNode({ node, depth, selected, expanded, loading, childrenByPath, onSelect, onToggle }) {
    const children = childrenByPath[node.path] || [];
    const isOpen = expanded.has(node.path);
    return (
        <div>
            <div
                className={`flex items-center gap-1 rounded-lg border text-xs transition-colors ${selected === node.path
                    ? 'bg-brand/10 text-brand-glow border-brand/30'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-3 border-transparent'
                    }`}
                style={{ paddingLeft: `${8 + depth * 16}px` }}
            >
                <button type="button" onClick={() => onToggle(node.path)} className="w-6 h-8 flex items-center justify-center text-text-muted hover:text-text-primary" title={isOpen ? 'Collapse' : 'Expand'}>
                    <ChevronRight size={13} className={`transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                </button>
                <button type="button" onClick={() => onSelect(node.path)} className="min-w-0 flex-1 h-8 flex items-center gap-2 text-left">
                    <FolderOpen size={14} className="shrink-0" />
                    <span className="truncate" title={node.path || 'Root'}>{folderName(node.path)}</span>
                    {loading.has(node.path) && <span className="ml-auto text-[10px] text-text-muted">Loading…</span>}
                </button>
            </div>
            {isOpen && children.map((child) => (
                <FolderNode key={child.path} node={child} depth={depth + 1} selected={selected} expanded={expanded} loading={loading} childrenByPath={childrenByPath} onSelect={onSelect} onToggle={onToggle} />
            ))}
        </div>
    );
}

export default function MovePicker({ open, onClose, currentPath, items, onMove }) {
    const [target, setTarget] = useState(currentPath || '');
    const [search, setSearch] = useState('');
    const [childrenByPath, setChildrenByPath] = useState({});
    const [expanded, setExpanded] = useState(new Set(['']));
    const [loading, setLoading] = useState(new Set());

    const loadChildren = useCallback(async (path) => {
        if (childrenByPath[path]) return;
        setLoading((s) => new Set(s).add(path));
        try {
            const data = await api.browse({ path, page: 1, pageSize: 200, sortBy: 'name', sortDir: 'asc' });
            setChildrenByPath((m) => ({ ...m, [path]: data.items.filter((i) => i.type === 'folder') }));
        } catch {
            setChildrenByPath((m) => ({ ...m, [path]: [] }));
        } finally {
            setLoading((s) => { const n = new Set(s); n.delete(path); return n; });
        }
    }, [childrenByPath]);

    useEffect(() => {
        if (!open) return;
        setTarget(currentPath || '');
        setSearch('');
        setChildrenByPath({});
        setExpanded(new Set(['']));
    }, [open, currentPath]);

    useEffect(() => { if (open) loadChildren(''); }, [open, loadChildren]);

    const toggleNode = async (path) => {
        setExpanded((s) => {
            const n = new Set(s);
            n.has(path) ? n.delete(path) : n.add(path);
            return n;
        });
        await loadChildren(path);
    };

    const visibleFlat = Object.values(childrenByPath).flat().filter((f) => {
        const q = search.trim().toLowerCase();
        return q && (f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q));
    });

    const movingFolders = (items || []).filter((item) => item.type === 'folder').map((item) => item.path);
    const invalidTarget = movingFolders.some((source) => isDescendant(target, source));

    const handleMove = () => {
        if (invalidTarget) return;
        onMove?.(target);
        onClose();
    };

    return (
        <Modal open={open} onClose={onClose} title={`Move ${items?.length || 0} item(s)`} maxWidth="max-w-2xl">
            <div className="space-y-3">
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search loaded folders…" className="w-full bg-surface-3 border border-border rounded-xl pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted" />
                </div>

                <div className="grid gap-2 sm:grid-cols-[1fr_1.2fr] text-xs">
                    <div className="rounded-xl border border-border bg-surface-2/50 p-3 space-y-1">
                        <div className="text-text-muted">Current</div>
                        <code className="block text-text-secondary truncate" title={currentPath || 'Root'}>{currentPath || 'Root'}</code>
                    </div>
                    <div className="rounded-xl border border-border bg-surface-2/50 p-3 space-y-1">
                        <div className="text-text-muted">Target</div>
                        <code className="block text-text-primary truncate" title={target || 'Root'}>{target || 'Root'}</code>
                    </div>
                </div>

                {invalidTarget && <div className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-xl px-3 py-2">Cannot move a folder into itself or one of its descendants.</div>}

                <div className="max-h-[45vh] overflow-y-auto rounded-xl border border-border bg-surface-1 p-2 space-y-0.5">
                    <button type="button" onClick={() => setTarget('')} className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-left ${target === '' ? 'bg-brand/10 text-brand-glow border border-brand/30' : 'text-text-secondary hover:bg-surface-3 border border-transparent'}`}>
                        <Home size={14} /> Root
                    </button>

                    {search.trim() ? (
                        visibleFlat.length ? visibleFlat.map((f) => (
                            <button key={f.path} onClick={() => setTarget(f.path)} className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${target === f.path ? 'bg-brand/10 text-brand-glow border border-brand/30' : 'hover:bg-surface-3 text-text-secondary hover:text-text-primary border border-transparent'}`}>
                                <FolderOpen size={14} className="shrink-0" />
                                <span className="truncate" title={f.path}>{f.path}</span>
                            </button>
                        )) : <p className="text-xs text-text-muted p-3">No loaded folders match. Expand folders to load more.</p>
                    ) : (
                        (childrenByPath[''] || []).map((folder) => (
                            <FolderNode key={folder.path} node={folder} depth={0} selected={target} expanded={expanded} loading={loading} childrenByPath={childrenByPath} onSelect={setTarget} onToggle={toggleNode} />
                        ))
                    )}
                </div>

                <div className="flex gap-2">
                    <button disabled={invalidTarget} onClick={handleMove} className="btn-base btn-primary flex-1 text-sm disabled:opacity-50">Move Here</button>
                    <button onClick={onClose} className="btn-base btn-ghost text-sm">Cancel</button>
                </div>
            </div>
        </Modal>
    );
}