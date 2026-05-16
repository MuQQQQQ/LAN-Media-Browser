import { useEffect, useState } from 'react';
import TagGroupList from './TagGroupList.jsx';

export default function ApplyTagsModal({ open, selectedCount, tagsTree, tagSettings, onClose, onApply, onRemove, onCreateTag, analysis }) {
    const [selectedTagIds, setSelectedTagIds] = useState([]);
    const [newTagName, setNewTagName] = useState('');
    const [newParentId, setNewParentId] = useState('');
    useEffect(() => { if (!open) setSelectedTagIds([]); }, [open]);
    if (!open) return null;
    const toggle = (id) => setSelectedTagIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
    const createInline = async () => {
        if (!newTagName.trim()) return;
        const created = await onCreateTag({ name: newTagName, parentId: newParentId || undefined });
        setNewTagName('');
        return created;
    };
    return (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
            <section className="modal">
                <header><h2>Apply tags to {selectedCount} file(s)</h2><button onClick={onClose}>✕</button></header>
                <div className="modal-tags">
                    {(analysis?.common?.length || analysis?.partial?.length) && <div className="tag-analysis">
                        <h3>Common Tags</h3>
                        <div className="chips">{analysis.common.map((tag) => <span key={tag.id} className="chip readonly" style={{ '--tag-color': tag.color || '#2f9ec6' }}>{tag.name}</span>)}</div>
                        <h3>Partial Tags</h3>
                        <div className="chips">{analysis.partial.map((tag) => <span key={tag.id} className="chip readonly" style={{ '--tag-color': tag.color || '#64748b' }}>{tag.name}</span>)}</div>
                    </div>}
                    <TagGroupList tagsTree={tagsTree} selectedTagIds={selectedTagIds} onToggleTag={toggle} displayMode={tagSettings.displayMode} />
                    {!tagsTree.some((category) => category.children.length) && <p className="muted">No sub-tags yet. Use “Create Tag” first.</p>}
                </div>
                <div className="inline-tag-create">
                    <h3>Create tag here</h3>
                    <div className="inline-form">
                        <select value={newParentId} onChange={(e) => setNewParentId(e.target.value)}><option value="">Level 1 category</option>{tagsTree.map((category) => <option key={category.id} value={category.id}>Sub-tag under {category.name}</option>)}</select>
                        <input value={newTagName} onChange={(e) => setNewTagName(e.target.value)} placeholder="New tag name" />
                        <button disabled={!newTagName.trim()} onClick={createInline}>Create</button>
                    </div>
                </div>
                <div className="actions">
                    <button disabled={!selectedTagIds.length || !selectedCount} onClick={() => onApply(selectedTagIds)}>Apply selected tags</button>
                    <button className="secondary" disabled={!selectedTagIds.length || !selectedCount} onClick={() => onRemove?.(selectedTagIds)}>Remove selected tags</button>
                    <button className="secondary" onClick={onClose}>Cancel</button>
                </div>
            </section>
        </div>
    );
}