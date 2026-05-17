import { useState } from 'react';
import Modal from './ui/Modal.jsx';

export default function CreateTagModal({ open, tagsTree, onClose, onCreateTag }) {
  const [mode, setMode] = useState('level1');
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [color, setColor] = useState('#64748b');
  const create = async () => { await onCreateTag({ name, color, parentId: mode === 'level2' ? parentId : undefined }); setName(''); };

  return (
    <Modal open={open} onClose={onClose} title="Create Tag" maxWidth="max-w-md">
      <div className="space-y-4">
        <div className="flex gap-3">
          <label className="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer">
            <input type="radio" checked={mode === 'level1'} onChange={() => setMode('level1')} className="accent-brand" />
            Category
          </label>
          <label className="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer">
            <input type="radio" checked={mode === 'level2'} onChange={() => setMode('level2')} className="accent-brand" />
            Sub-tag
          </label>
        </div>
        {mode === 'level2' && (
          <select value={parentId} onChange={(e) => setParentId(e.target.value)} className="w-full bg-surface-3 border border-border rounded-lg px-3 py-2 text-sm text-text-primary">
            <option value="">Select parent category</option>
            {tagsTree.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={mode === 'level1' ? 'e.g. Character' : 'e.g. Red dress'} className="w-full bg-surface-3 border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" />
        <label className="flex items-center gap-2 text-xs text-text-muted">
          Color <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent border-0" />
        </label>
        <div className="flex gap-2">
          <button disabled={!name.trim() || (mode === 'level2' && !parentId)} onClick={create} className="btn-base btn-primary flex-1 text-sm">Create</button>
          <button onClick={onClose} className="btn-base btn-ghost text-sm">Cancel</button>
        </div>
      </div>
    </Modal>
  );
}
