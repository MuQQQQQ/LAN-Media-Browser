import { useState } from 'react';
import TagGroupList from './TagGroupList.jsx';

export default function ApplyTagsModal({ open, selectedCount, tagsTree, tagSettings, onClose, onApply }) {
    const [selectedTagIds, setSelectedTagIds] = useState([]);
    if (!open) return null;
    const toggle = (id) => setSelectedTagIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
    return (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
            <section className="modal">
                <header><h2>Apply tags to {selectedCount} file(s)</h2><button onClick={onClose}>✕</button></header>
                <div className="modal-tags">
                    <TagGroupList tagsTree={tagsTree} selectedTagIds={selectedTagIds} onToggleTag={toggle} displayMode={tagSettings.displayMode} />
                    {!tagsTree.some((category) => category.children.length) && <p className="muted">No sub-tags yet. Use “Create Tag” first.</p>}
                </div>
                <div className="actions">
                    <button disabled={!selectedTagIds.length || !selectedCount} onClick={() => onApply(selectedTagIds)}>Apply selected tags</button>
                    <button className="secondary" onClick={onClose}>Cancel</button>
                </div>
            </section>
        </div>
    );
}