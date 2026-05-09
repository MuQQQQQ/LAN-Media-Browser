import { useState } from 'react';

export default function CreateTagModal({ open, tagsTree, onClose, onCreateTag }) {
    const [mode, setMode] = useState('level1');
    const [name, setName] = useState('');
    const [parentId, setParentId] = useState('');
    const [color, setColor] = useState('#64748b');
    if (!open) return null;
    const create = async () => {
        await onCreateTag({ name, color, parentId: mode === 'level2' ? parentId : undefined });
        setName('');
    };
    return (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
            <section className="modal">
                <header><h2>Create Tag</h2><button onClick={onClose}>✕</button></header>
                <div className="mode-toggle">
                    <label><input type="radio" checked={mode === 'level1'} onChange={() => setMode('level1')} /> Level 1 category</label>
                    <label><input type="radio" checked={mode === 'level2'} onChange={() => setMode('level2')} /> Level 2 sub-tag</label>
                </div>
                {mode === 'level2' && (
                    <select value={parentId} onChange={(e) => setParentId(e.target.value)}>
                        <option value="">Select parent category</option>
                        {tagsTree.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                    </select>
                )}
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder={mode === 'level1' ? 'Character' : 'Red dress'} />
                <label className="color-field">Tag color <input type="color" value={color} onChange={(e) => setColor(e.target.value)} /></label>
                <div className="actions">
                    <button disabled={!name.trim() || (mode === 'level2' && !parentId)} onClick={create}>Create</button>
                    <button className="secondary" onClick={onClose}>Cancel</button>
                </div>
            </section>
        </div>
    );
}