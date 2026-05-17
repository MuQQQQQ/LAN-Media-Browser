import { useState } from 'react';
import { saveTagSettings } from '../tagSettings.js';

function TagEditor({ tag, categories, editing, setEditing, onUpdateTag, onDeleteTag, isCategory = false }) {
  const draft = editing[tag.id] || { name: tag.name, parentId: tag.parentId || '', color: tag.color || '#64748b' };
  const setDraft = (patch) => setEditing((all) => ({ ...all, [tag.id]: { ...draft, ...patch } }));
  const save = async () => { await onUpdateTag(tag.id, { name: draft.name, parentId: isCategory ? null : draft.parentId, color: draft.color }); setEditing((all) => { const n = { ...all }; delete n[tag.id]; return n; }); };
  return (
    <div className={`flex items-center gap-2 py-1.5 px-2 rounded-lg ${isCategory ? 'bg-surface-2 border border-border' : ''}`}>
      <input value={draft.name} onChange={(e) => setDraft({ name: e.target.value })} className="bg-surface-3 border border-border rounded-lg px-2 py-1 text-xs text-text-primary flex-1 min-w-0" />
      {!isCategory && <select value={draft.parentId} onChange={(e) => setDraft({ parentId: e.target.value })} className="bg-surface-3 border border-border rounded-lg px-2 py-1 text-xs text-text-primary">{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>}
      <input type="color" value={draft.color} onChange={(e) => setDraft({ color: e.target.value })} className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent" />
      <span className="text-[10px] text-text-muted hidden sm:inline">Created: {tag.createdAt || '-'}</span>
      <span className="text-[10px] text-text-muted hidden sm:inline">Used: {tag.lastUsedAt || '-'}</span>
      <button onClick={save} className="btn-base btn-primary text-xs py-1 px-3">Save</button>
      <button className="btn-base text-xs py-1 px-3 border border-danger/20 text-danger/80 hover:bg-danger/5 rounded-xl" onClick={() => onDeleteTag(tag.id)}>Delete</button>
    </div>
  );
}

export default function TagsPage({ tagsTree, tagSettings, setTagSettings, onCreateTag, onUpdateTag, onDeleteTag }) {
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [color, setColor] = useState('#64748b');
  const [editing, setEditing] = useState({});
  const updateSettings = (patch) => { const next = { ...tagSettings, ...patch }; setTagSettings(next); saveTagSettings(next); };
  const create = async () => { await onCreateTag({ name, color, parentId: parentId || undefined }); setName(''); };
  const categories = tagsTree.filter((c) => c.parentId === null);
  return (
    <div className="min-h-screen bg-surface-0">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        <header className="flex items-center justify-between">
          <div><h1 className="text-xl font-semibold">Tags</h1><p className="text-sm text-text-muted">Manage tag hierarchy</p></div>
          <a href="/" className="btn-base btn-ghost text-xs">← Browse</a>
        </header>

        {/* settings */}
        <section className="rounded-xl border border-border bg-surface-1/50 p-4 space-y-2">
          <h2 className="text-sm font-semibold">Settings</h2>
          <div className="flex gap-3 flex-wrap">
            <label className="flex items-center gap-2 text-xs text-text-muted">
              Display <select value={tagSettings.displayMode} onChange={(e) => updateSettings({ displayMode: e.target.value })} className="bg-surface-3 border border-border rounded-lg px-2 py-1 text-xs text-text-primary">
                <option value="collapsed">Collapsed</option><option value="expanded">Expanded</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-xs text-text-muted">
              Sort <select value={tagSettings.sortMode} onChange={(e) => updateSettings({ sortMode: e.target.value })} className="bg-surface-3 border border-border rounded-lg px-2 py-1 text-xs text-text-primary">
                <option value="recent">Recent</option><option value="alphabetical">Alphabetical</option><option value="creation">Creation</option>
              </select>
            </label>
          </div>
        </section>

        {/* create tag */}
        <section className="rounded-xl border border-border bg-surface-1/50 p-4 space-y-3">
          <h2 className="text-sm font-semibold">Create Tag</h2>
          <div className="flex gap-2 flex-wrap items-center">
            <select value={parentId} onChange={(e) => setParentId(e.target.value)} className="bg-surface-3 border border-border rounded-lg px-2 py-2 text-xs text-text-primary">
              <option value="">Level 1 category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>Sub-tag under {c.name}</option>)}
            </select>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tag name" className="bg-surface-3 border border-border rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-muted" />
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
            <button disabled={!name.trim()} onClick={create} className="btn-base btn-primary text-xs py-2">Create</button>
          </div>
        </section>

        {/* all tags */}
        <section className="rounded-xl border border-border bg-surface-1/50 p-4 space-y-4">
          <h2 className="text-sm font-semibold">All Tags</h2>
          {tagsTree.map((cat) => (
            <div key={cat.id} className="space-y-1">
              <TagEditor tag={cat} categories={categories} editing={editing} setEditing={setEditing} onUpdateTag={onUpdateTag} onDeleteTag={onDeleteTag} isCategory />
              <div className="ml-6 space-y-1">
                {cat.children.map((tag) => <TagEditor key={tag.id} tag={tag} categories={categories} editing={editing} setEditing={setEditing} onUpdateTag={onUpdateTag} onDeleteTag={onDeleteTag} />)}
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
