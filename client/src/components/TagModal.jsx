import { useMemo, useState } from 'react';

export default function TagModal({ open, selectedCount, tagsTree, onClose, onAssign, onRemove, onCreateTag }) {
    const [selectedTagIds, setSelectedTagIds] = useState([]);
    const [categoryName, setCategoryName] = useState('');
    const [subTagName, setSubTagName] = useState('');
    const [parentId, setParentId] = useState('');
    const flatTags = useMemo(() => tagsTree.flatMap((category) => category.children), [tagsTree]);
    if (!open) return null;

    const toggle = (id) => setSelectedTagIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

    return (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
            <section className="modal">
                <header>
                    <h2>Tag {selectedCount} selected file(s)</h2>
                    <button onClick={onClose}>✕</button>
                </header>
                <div className="tag-groups modal-tags">
                    {tagsTree.map((category) => (
                        <div className="tag-group" key={category.id}>
                            <strong>{category.name}</strong>
                            <div className="chips">
                                {category.children.map((tag) => (
                                    <button key={tag.id} className={selectedTagIds.includes(tag.id) ? 'chip active' : 'chip'} onClick={() => toggle(tag.id)}>{tag.name}</button>
                                ))}
                            </div>
                        </div>
                    ))}
                    {!flatTags.length && <p className="muted">Create a category and sub-tag first.</p>}
                </div>
                <div className="actions">
                    <button disabled={!selectedTagIds.length} onClick={() => onAssign(selectedTagIds)}>Add selected tags</button>
                    <button className="secondary" disabled={!selectedTagIds.length} onClick={() => onRemove(selectedTagIds)}>Remove selected tags</button>
                </div>
                <hr />
                <div className="create-tags">
                    <label>New Level 1 category</label>
                    <div className="inline-form">
                        <input value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder="Character" />
                        <button onClick={() => onCreateTag({ name: categoryName }).then(() => setCategoryName(''))}>Create</button>
                    </div>
                    <label>New Level 2 sub-tag</label>
                    <div className="inline-form">
                        <select value={parentId} onChange={(e) => setParentId(e.target.value)}>
                            <option value="">Select category</option>
                            {tagsTree.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                        </select>
                        <input value={subTagName} onChange={(e) => setSubTagName(e.target.value)} placeholder="Red dress" />
                        <button disabled={!parentId} onClick={() => onCreateTag({ name: subTagName, parentId }).then(() => setSubTagName(''))}>Create</button>
                    </div>
                </div>
            </section>
        </div>
    );
}