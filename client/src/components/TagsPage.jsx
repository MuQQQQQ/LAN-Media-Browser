import { useState } from 'react';
import { saveTagSettings } from '../tagSettings.js';

export default function TagsPage({ tagsTree, tagSettings, setTagSettings, onCreateTag, onUpdateTag, onDeleteTag }) {
    const [name, setName] = useState('');
    const [parentId, setParentId] = useState('');
    const [editing, setEditing] = useState({});
    const updateSettings = (patch) => {
        const next = { ...tagSettings, ...patch };
        setTagSettings(next);
        saveTagSettings(next);
    };
    const create = async () => {
        await onCreateTag({ name, parentId: parentId || undefined });
        setName('');
    };
    const categories = tagsTree.filter((category) => category.parentId === null);
    return (
        <main>
            <header className="app-header"><div><h1>Tag Management</h1><p>Create, edit, delete, and organize tags</p></div><a className="button-link" href="/">Back to browser</a></header>
            <section className="panel settings-panel">
                <h2>Settings</h2>
                <label>Default tag display mode<select value={tagSettings.displayMode} onChange={(e) => updateSettings({ displayMode: e.target.value })}><option value="collapsed">Collapsed</option><option value="expanded">Expanded</option></select></label>
                <label>Tag sorting mode<select value={tagSettings.sortMode} onChange={(e) => updateSettings({ sortMode: e.target.value })}><option value="recent">Recent first</option><option value="alphabetical">Alphabetical</option><option value="creation">Creation time</option></select></label>
            </section>
            <section className="panel">
                <h2>Create tag</h2>
                <div className="inline-form">
                    <select value={parentId} onChange={(e) => setParentId(e.target.value)}><option value="">Level 1 category</option>{categories.map((category) => <option key={category.id} value={category.id}>Sub-tag under {category.name}</option>)}</select>
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tag name" />
                    <button disabled={!name.trim()} onClick={create}>Create</button>
                </div>
            </section>
            <section className="panel tag-management-list">
                <h2>All tags</h2>
                {tagsTree.map((category) => (
                    <div className="manage-category" key={category.id}>
                        <TagEditor tag={category} categories={categories} editing={editing} setEditing={setEditing} onUpdateTag={onUpdateTag} onDeleteTag={onDeleteTag} isCategory />
                        <div className="manage-children">
                            {category.children.map((tag) => <TagEditor key={tag.id} tag={tag} categories={categories} editing={editing} setEditing={setEditing} onUpdateTag={onUpdateTag} onDeleteTag={onDeleteTag} />)}
                        </div>
                    </div>
                ))}
            </section>
        </main>
    );
}

function TagEditor({ tag, categories, editing, setEditing, onUpdateTag, onDeleteTag, isCategory = false }) {
    const draft = editing[tag.id] || { name: tag.name, parentId: tag.parentId || '' };
    const setDraft = (patch) => setEditing((all) => ({ ...all, [tag.id]: { ...draft, ...patch } }));
    const save = async () => {
        await onUpdateTag(tag.id, { name: draft.name, parentId: isCategory ? null : draft.parentId });
        setEditing((all) => { const next = { ...all }; delete next[tag.id]; return next; });
    };
    return (
        <div className={`tag-editor ${isCategory ? 'category-row' : ''}`}>
            <input value={draft.name} onChange={(e) => setDraft({ name: e.target.value })} />
            {!isCategory && <select value={draft.parentId} onChange={(e) => setDraft({ parentId: e.target.value })}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>}
            <span className="muted">Created: {tag.createdAt || '-'}</span>
            <span className="muted">Last used: {tag.lastUsedAt || '-'}</span>
            <button onClick={save}>Save</button>
            <button className="danger" onClick={() => onDeleteTag(tag.id)}>Delete</button>
        </div>
    );
}