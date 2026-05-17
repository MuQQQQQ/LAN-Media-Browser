import { useEffect, useState } from 'react';
import Modal from './ui/Modal.jsx';
import TagGroupList from './TagGroupList.jsx';

export default function ApplyTagsModal({ open, selectedCount, tagsTree, tagSettings, onClose, onApply, onRemove, onCreateTag, analysis }) {
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [newTagName, setNewTagName] = useState('');
  const [newParentId, setNewParentId] = useState('');
  useEffect(() => { if (!open) setSelectedTagIds([]); }, [open]);
  const toggle = (id) => setSelectedTagIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  const createInline = async () => { if (!newTagName.trim()) return; await onCreateTag({ name: newTagName, parentId: newParentId || undefined }); setNewTagName(''); };

  return (
    <Modal open={open} onClose={onClose} title={`Tags — ${selectedCount} file(s)`} maxWidth="max-w-2xl">
      <div className="space-y-4">
        {/* analysis */}
        {(analysis?.common?.length || analysis?.partial?.length) ? (
          <div className="space-y-2">
            {analysis.common.length > 0 && (
              <div>
                <h3 className="text-xs text-text-muted mb-1.5">Common Tags</h3>
                <div className="flex flex-wrap gap-1">
                  {analysis.common.map((tag) => <span key={tag.id} className="px-2 py-0.5 rounded-full text-xs font-medium bg-surface-3 border border-border" style={{ color: tag.color || '#64748b' }}>{tag.name}</span>)}
                </div>
              </div>
            )}
            {analysis.partial.length > 0 && (
              <div>
                <h3 className="text-xs text-text-muted mb-1.5">Partial Tags</h3>
                <div className="flex flex-wrap gap-1">
                  {analysis.partial.map((tag) => <span key={tag.id} className="px-2 py-0.5 rounded-full text-xs font-medium bg-surface-3 border border-border" style={{ color: tag.color || '#64748b' }}>{tag.name}</span>)}
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* tag selector */}
        <div className="max-h-[40vh] overflow-y-auto">
          <TagGroupList tagsTree={tagsTree} selectedTagIds={selectedTagIds} onToggleTag={toggle} displayMode={tagSettings.displayMode} />
        </div>

        {/* create tag inline */}
        <div className="border-t border-border pt-3">
          <h3 className="text-xs text-text-muted mb-2">Quick Create</h3>
          <div className="flex gap-2 flex-wrap items-center">
            <select value={newParentId} onChange={(e) => setNewParentId(e.target.value)} className="bg-surface-3 border border-border rounded-lg px-2 py-1.5 text-xs text-text-primary">
              <option value="">Level 1</option>
              {tagsTree.map((c) => <option key={c.id} value={c.id}>Sub under {c.name}</option>)}
            </select>
            <input value={newTagName} onChange={(e) => setNewTagName(e.target.value)} placeholder="New tag name" className="bg-surface-3 border border-border rounded-lg px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted" />
            <button disabled={!newTagName.trim()} onClick={createInline} className="btn-base btn-primary text-xs py-1.5">Create</button>
          </div>
        </div>

        <div className="flex gap-2">
          <button disabled={!selectedTagIds.length || !selectedCount} onClick={() => onApply(selectedTagIds)} className="btn-base btn-primary flex-1 text-xs">Apply</button>
          <button disabled={!selectedTagIds.length || !selectedCount} onClick={() => onRemove?.(selectedTagIds)} className="btn-base flex-1 text-xs border border-border text-text-secondary hover:text-text-primary hover:bg-surface-3 rounded-xl">Remove</button>
          <button onClick={onClose} className="btn-base btn-ghost text-xs">Cancel</button>
        </div>
      </div>
    </Modal>
  );
}
