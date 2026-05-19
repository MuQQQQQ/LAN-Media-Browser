import { useEffect, useState } from 'react';
import Modal from './ui/Modal.jsx';
import TagGroupList from './TagGroupList.jsx';

// ── SIZE CONFIG ── change these to adjust the whole modal
const MODAL_WIDTH = 'max-w-[80rem]';       // max-w-2xl | max-w-3xl | max-w-4xl | max-w-5xl
const TAG_AREA_H = 'max-h-[70vh]';    // max-h-[40vh] | max-h-[55vh] | max-h-[70vh]

export default function ApplyTagsModal({ open, selectedCount, tagsTree, tagSettings, onClose, onApply, onRemove, onCreateTag, analysis }) {
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [newTagName, setNewTagName] = useState('');
  const [newParentId, setNewParentId] = useState('');
  useEffect(() => { if (!open) setSelectedTagIds([]); }, [open]);
  const toggle = (id) => setSelectedTagIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  const createInline = async () => { if (!newTagName.trim()) return; await onCreateTag({ name: newTagName, parentId: newParentId || undefined }); setNewTagName(''); };

  return (
    <Modal open={open} onClose={onClose} title={`Tags · ${selectedCount} file(s)`} maxWidth={MODAL_WIDTH}>
      <div className="space-y-5">
        {/* analysis */}
        {(analysis?.common?.length || analysis?.partial?.length) ? (
          <div className="space-y-2">
            {analysis.common.length > 0 && (
              <div>
                <h3 className="text-sm text-text-muted mb-2">Common Tags</h3>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.common.map((tag) => (
                    <span key={tag.id} className="px-3 py-1 rounded-full text-sm font-medium border"
                      style={{ color: tag.color || '#64748b', backgroundColor: (tag.color || '#64748b') + '15', borderColor: (tag.color || '#64748b') + '70' }}>
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {analysis.partial.length > 0 && (
              <div>
                <h3 className="text-sm text-text-muted mb-2">Partial Tags</h3>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.partial.map((tag) => (
                    <span key={tag.id} className="px-3 py-1 rounded-full text-sm font-medium border"
                      style={{ color: tag.color || '#64748b', backgroundColor: (tag.color || '#64748b') + '15', borderColor: (tag.color || '#64748b') + '70' }}>
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* tag selector */}
        <div className={`${TAG_AREA_H} overflow-y-auto`}>
          <TagGroupList tagsTree={tagsTree} selectedTagIds={selectedTagIds} onToggleTag={toggle} displayMode={tagSettings.displayMode} />
        </div>

        {/* create tag inline */}
        <div className="border-t border-border pt-4">
          <h3 className="text-sm text-text-muted mb-2">Quick Create</h3>
          <div className="flex gap-2 items-center max-w-lg">
            <select value={newParentId} onChange={(e) => setNewParentId(e.target.value)}
              className="bg-surface-3 border border-border rounded-xl px-3 py-2 text-sm text-text-primary shrink-0">
              <option value="">Level 1</option>
              {tagsTree.map((c) => <option key={c.id} value={c.id}>Sub of {c.name}</option>)}
            </select>
            <input value={newTagName} onChange={(e) => setNewTagName(e.target.value)} placeholder="New tag name"
              className="bg-surface-3 border border-border rounded-xl px-4 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none flex-1 min-w-0"
              onKeyDown={(e) => { if (e.key === 'Enter' && newTagName.trim()) createInline(); }} />
            <button disabled={!newTagName.trim()} onClick={createInline}
              className="btn-base btn-primary text-sm py-2 px-5 shrink-0">Create</button>
          </div>
        </div>

        <div className="flex gap-3">
          <button disabled={!selectedTagIds.length || !selectedCount} onClick={() => onApply(selectedTagIds)}
            className="btn-base btn-primary flex-1 text-sm py-2.5">Apply Tags</button>
          <button disabled={!selectedTagIds.length || !selectedCount} onClick={() => onRemove?.(selectedTagIds)}
            className="btn-base flex-1 text-sm py-2.5 border border-border text-text-secondary hover:text-text-primary hover:bg-surface-3 rounded-xl">Remove Tags</button>
          <button onClick={onClose} className="btn-base btn-ghost text-sm py-2.5">Cancel</button>
        </div>
      </div>
    </Modal>
  );
}
