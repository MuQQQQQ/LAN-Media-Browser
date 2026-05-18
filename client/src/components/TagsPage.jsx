import { useState, useRef, useEffect } from 'react';
import { Plus, Edit2, Trash2, Check, X, ChevronDown, ChevronRight } from 'lucide-react';
import { saveTagSettings } from '../tagSettings.js';
import ContextMenu from './ui/ContextMenu.jsx';

// ─────────────────────── Confirm Dialog ───────────────────────
function ConfirmDialog({ open, tag, onConfirm, onCancel }) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onCancel}>
            <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
            <div className="relative w-full max-w-sm rounded-2xl bg-surface-1 border border-border p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-base font-semibold mb-2">Delete Tag</h3>
                <p className="text-sm text-text-secondary mb-1">Delete <strong>{tag?.name}</strong>?</p>
                {tag?.children?.length > 0 && <p className="text-xs text-text-muted mb-4">All {tag.children.length} sub-tag(s) and their file assignments will also be removed.</p>}
                <div className="flex gap-2 justify-end mt-4">
                    <button onClick={onCancel} className="btn-base btn-ghost text-sm px-4">Cancel</button>
                    <button onClick={onConfirm} className="btn-base text-sm px-4 bg-danger text-white hover:bg-red-600 rounded-xl">Delete</button>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────── Inline Edit Row ───────────────────────
function EditRow({ tag, categories, isCategory, onSave, onCancel }) {
    const [name, setName] = useState(tag.name);
    const [parentId, setParentId] = useState(tag.parentId || '');
    const [color, setColor] = useState(tag.color || '#64748b');
    const ref = useRef(null);
    useEffect(() => { ref.current?.focus(); }, []);

    const save = () => { onSave(tag.id, { name, parentId: isCategory ? null : parentId, color }); };

    return (
        <div className="flex items-center gap-2 py-2 px-3 rounded-xl bg-surface-2 ring-1 ring-brand/30">
            <input ref={ref} value={name} onChange={(e) => setName(e.target.value)}
                className="bg-surface-3 border border-border rounded-lg px-2 py-1 text-xs text-text-primary flex-1 min-w-0 outline-none"
                onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') onCancel(); }} />
            {!isCategory && (
                <select value={parentId} onChange={(e) => setParentId(e.target.value)}
                    className="bg-surface-3 border border-border rounded-lg px-2 py-1 text-xs text-text-primary">
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            )}
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
                className="w-7 h-7 rounded-lg cursor-pointer border border-border bg-transparent p-0.5" />
            <button onClick={save} className="btn-icon w-7 h-7 bg-brand/15 text-brand-glow rounded-lg"><Check size={14} /></button>
            <button onClick={onCancel} className="btn-icon w-7 h-7 text-text-muted hover:text-text-primary rounded-lg"><X size={14} /></button>
        </div>
    );
}

// ─────────────────────── Tag Group Section ───────────────────────
function TagGroupSection({ category, categories, editingId, onStartEdit, onSaveEdit, onCancelEdit, onDelete }) {
    const [ctxMenu, setCtxMenu] = useState(null);
    const [collapsed, setCollapsed] = useState(false);
    const sorted = [...category.children].sort((a, b) => {
        const at = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
        const bt = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;
        return bt - at;
    });

    const catContextItems = [
        { label: 'Edit', icon: <Edit2 size={12} />, onClick: () => onStartEdit(category.id) },
        { label: 'Delete', icon: <Trash2 size={12} />, onClick: () => onDelete(category), danger: true },
    ];

    const childContextItems = (tag) => [
        { label: 'Edit', icon: <Edit2 size={12} />, onClick: () => onStartEdit(tag.id) },
        { label: 'Delete', icon: <Trash2 size={12} />, onClick: () => onDelete(tag), danger: true },
    ];

    return (
        <div className="space-y-2">
            {/* category header */}
            <div className="flex items-center gap-2">
                <button onClick={() => setCollapsed((v) => !v)} className="text-text-muted hover:text-text-primary p-0.5">
                    {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                </button>
                {editingId === category.id ? (
                    <div className="flex-1">
                        <EditRow tag={category} categories={categories} isCategory
                            onSave={onSaveEdit} onCancel={onCancelEdit} />
                    </div>
                ) : (
                    <div
                        className="flex-1 flex items-center gap-3 px-4 py-2.5 rounded-xl border cursor-default"
                        style={{
                            borderColor: (category.color || '#64748b') + '40',
                            backgroundColor: (category.color || '#64748b') + '0d',
                        }}
                        onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY }); }}
                    >
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: category.color || '#64748b' }} />
                        <span className="text-lg font-semibold">{category.name}</span>
                        <span className="text-sm text-text-muted ml-auto">{category.children.length} sub-tags</span>
                    </div>
                )}
            </div>

            {/* children grid */}
            {!collapsed && sorted.length > 0 && (
                <div className="ml-7 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                    {sorted.map((tag) => (
                        editingId === tag.id ? (
                            <div key={tag.id} className="col-span-full">
                                <EditRow tag={tag} categories={categories} onSave={onSaveEdit} onCancel={onCancelEdit} />
                            </div>
                        ) : (
                            <div
                                key={tag.id}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border cursor-default transition-colors hover:opacity-80"
                                style={{
                                    color: tag.color || '#64748b',
                                    backgroundColor: (tag.color || '#64748b') + '15',
                                    borderColor: (tag.color || '#64748b') + '70',
                                }}
                                onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, tag }); }}
                            >
                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: tag.color || '#64748b' }} />
                                <span className="truncate">{tag.name}</span>
                            </div>
                        )
                    ))}
                </div>
            )}

            {/* context menu */}
            {ctxMenu && (
                <ContextMenu
                    x={ctxMenu.x} y={ctxMenu.y}
                    items={ctxMenu.tag ? childContextItems(ctxMenu.tag) : catContextItems}
                    onClose={() => setCtxMenu(null)}
                />
            )}
        </div>
    );
}

// ─────────────────────── Main Page ───────────────────────
export default function TagsPage({ tagsTree, tagSettings, setTagSettings, onCreateTag, onUpdateTag, onDeleteTag }) {
    const [name, setName] = useState('');
    const [parentId, setParentId] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null);

    const updateSettings = (patch) => { const n = { ...tagSettings, ...patch }; setTagSettings(n); saveTagSettings(n); };
    const create = async () => { if (!name.trim()) return; await onCreateTag({ name, parentId: parentId || undefined }); setName(''); };
    const categories = tagsTree.filter((c) => c.parentId === null);

    const handleDelete = (tag) => setConfirmDelete(tag);
    const confirmDeleteAction = async () => {
        if (confirmDelete) await onDeleteTag(confirmDelete.id);
        setConfirmDelete(null);
    };

    const handleSaveEdit = async (id, payload) => {
        await onUpdateTag(id, payload);
        setEditingId(null);
    };

    return (
        <div className="min-h-screen bg-surface-0">
            <div className="max-w-[1000px] mx-auto px-4 sm:px-6 py-6 space-y-6">

                {/* Header */}
                <header className="flex items-start justify-between">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">Tags</h1>
                        <p className="text-sm text-text-muted mt-1">Categories & sub-tags for your media</p>
                    </div>
                    <a href="/" className="btn-base btn-ghost text-sm">← Browse</a>
                </header>

                {/* Create + Settings row */}
                <div className="flex flex-wrap gap-4">
                    {/* Create */}
                    <div className="flex-1 min-w-[280px] rounded-2xl bg-surface-1/60 border border-border/60 p-4">
                        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">New Tag</h2>
                        <div className="flex gap-2 flex-wrap items-center">
                            <select value={parentId} onChange={(e) => setParentId(e.target.value)}
                                className="bg-surface-2 border border-border rounded-xl px-3 py-2 text-sm text-text-primary outline-none">
                                <option value="">Category</option>
                                {categories.map((c) => <option key={c.id} value={c.id}>Sub of {c.name}</option>)}
                            </select>
                            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name"
                                className="bg-surface-2 border border-border rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none flex-1 min-w-[100px]"
                                onKeyDown={(e) => { if (e.key === 'Enter') create(); }} />
                            <button disabled={!name.trim()} onClick={create}
                                className="btn-base btn-primary text-sm gap-1"><Plus size={15} /> Create</button>
                        </div>
                    </div>

                    {/* Settings */}
                    <div className="rounded-2xl bg-surface-1/60 border border-border/60 p-4">
                        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Display</h2>
                        <div className="flex gap-3 flex-wrap">
                            <label className="flex items-center gap-2 text-sm text-text-secondary">
                                <span className="text-text-muted text-xs">View</span>
                                <select value={tagSettings.displayMode} onChange={(e) => updateSettings({ displayMode: e.target.value })}
                                    className="bg-surface-2 border border-border rounded-xl px-2 py-1.5 text-sm text-text-primary outline-none">
                                    <option value="collapsed">Collapsed</option>
                                    <option value="expanded">Expanded</option>
                                </select>
                            </label>
                            <label className="flex items-center gap-2 text-sm text-text-secondary">
                                <span className="text-text-muted text-xs">Sort</span>
                                <select value={tagSettings.sortMode} onChange={(e) => updateSettings({ sortMode: e.target.value })}
                                    className="bg-surface-2 border border-border rounded-xl px-2 py-1.5 text-sm text-text-primary outline-none">
                                    <option value="recent">Recent</option>
                                    <option value="alphabetical">A–Z</option>
                                    <option value="creation">Created</option>
                                </select>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Tag list */}
                <section className="rounded-2xl bg-surface-1/60 border border-border/60 p-5">
                    <h2 className="text-lg font-semibold text-text-muted uppercase tracking-wider mb-4">
                        All Tags · {tagsTree.reduce((s, c) => s + 1 + c.children.length, 0)}
                    </h2>
                    {tagsTree.length === 0 ? (
                        <p className="text-s text-text-muted py-12 text-center">No tags yet.</p>
                    ) : (
                        <div className="space-y-4">
                            {tagsTree.map((cat) => (
                                <TagGroupSection
                                    key={cat.id}
                                    category={cat}
                                    categories={categories}
                                    editingId={editingId}
                                    onStartEdit={setEditingId}
                                    onSaveEdit={handleSaveEdit}
                                    onCancelEdit={() => setEditingId(null)}
                                    onDelete={handleDelete}
                                />
                            ))}
                        </div>
                    )}
                </section>
            </div>

            {/* Confirm Dialog */}
            <ConfirmDialog
                open={!!confirmDelete}
                tag={confirmDelete}
                onConfirm={confirmDeleteAction}
                onCancel={() => setConfirmDelete(null)}
            />
        </div>
    );
}
