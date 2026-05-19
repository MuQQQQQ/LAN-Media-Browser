import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Search } from 'lucide-react';
import ResizablePanel from './ResizablePanel.jsx';
import ContextMenu from './ContextMenu.jsx';

export default function MetadataDrawer({ open, onClose, fileName, fileTags, tagNameById, selectedTagIds, onToggleTag, onApplyTags, onRemoveTags, onTagSearch, onRemoveSingleTag, tagsTree, tagSettings, onDelete, children }) {
  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
  const [appliedTagMenu, setAppliedTagMenu] = useState(null);

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          className={
            isMobile
              ? 'fixed bottom-0 left-0 right-0 max-h-[70vh] glass-strong z-30 flex flex-col border-t border-border overflow-hidden rounded-t-2xl'
              : 'fixed top-0 right-0 h-full w-[380px] max-w-[92vw] glass-strong z-30 flex flex-col border-l border-border overflow-hidden'
          }
          initial={isMobile ? { y: '100%' } : { x: '100%' }}
          animate={isMobile ? { y: 0 } : { x: 0 }}
          exit={isMobile ? { y: '100%' } : { x: '100%' }}
          transition={{ type: 'spring', stiffness: 350, damping: 32 }}
        >
          {/* header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
            <h2 className="font-semibold text-base truncate pr-2">{fileName}</h2>
            <button onClick={onClose} className="btn-base btn-ghost btn-icon"><X size={18} /></button>
          </div>

          {/* scrollable content */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {/* applied tags */}
            <section>
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Applied Tags</h3>
              <div className="flex flex-wrap gap-1.5">
                {fileTags.length === 0 ? (
                  <span className="text-sm text-text-muted">No tags</span>
                ) : (
                  fileTags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => onTagSearch?.(tag)}
                      onContextMenu={(e) => { e.preventDefault(); setAppliedTagMenu({ x: e.clientX, y: e.clientY, tag }); }}
                      className="px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-all hover:scale-105 border active:scale-95"
                      style={{
                        backgroundColor: (tag.color || '#64748b') + '20',
                        borderColor: (tag.color || '#64748b') + '40',
                        color: tag.color || '#94a3b8',
                      }}
                      title="Left-click: search · Right-click: options"
                    >
                      {tagNameById?.get?.(tag.id) || tag.name}
                    </button>
                  )))}
              </div>
            </section>

            {/* tag editor — resizable */}
            <section>
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Edit Tags</h3>
              <ResizablePanel min={140} max={420} initial={220} className="rounded-xl border border-border bg-surface-2/50">
                <div className="p-3 space-y-3">
                  {tagsTree.map((category) => (
                    <div key={category.id}>
                      <h4 className="text-xs text-text-muted mb-1.5 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: category.color || '#64748b' }} />
                        {category.name}
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {[...category.children].sort((a, b) => {
                          const at = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
                          const bt = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;
                          return bt - at;
                        }).map((tag) => {
                          const selected = selectedTagIds.includes(tag.id);
                          return (
                            <button
                              key={tag.id}
                              onClick={() => onToggleTag(tag.id)}
                              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-150 border ${
                                selected
                                  ? 'bg-brand/20 border-brand/50 text-brand-glow shadow-sm shadow-brand/10'
                                  : 'bg-surface-3/50 border-transparent text-text-secondary hover:border-border hover:text-text-primary'
                              }`}
                              style={selected ? {} : { color: tag.color || '#94a3b8', backgroundColor: (tag.color || '#64748b') + '15', borderColor: (tag.color || '#64748b') + '30' }}
                            >
                              {tag.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </ResizablePanel>

              {/* action buttons */}
              <div className="flex gap-2 mt-3">
                <button
                  disabled={!selectedTagIds.length}
                  onClick={onApplyTags}
                  className="btn-base btn-primary flex-1 text-xs"
                >
                  Add Tags
                </button>
                <button
                  disabled={!selectedTagIds.length}
                  onClick={onRemoveTags}
                  className="btn-base flex-1 text-xs border border-border text-text-secondary hover:text-text-primary hover:bg-surface-3 rounded-xl"
                >
                  Remove Tags
                </button>
              </div>
            </section>

            {/* extra children (playback, info, etc.) */}
            {children}

            {/* danger zone */}
            <section className="pt-3 border-t border-border">
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Danger Zone</h3>
              <button
                onClick={() => { if (confirm('Delete this file permanently?')) onDelete?.(); }}
                className="btn-base w-full text-xs gap-2 text-danger-muted hover:text-danger border border-danger/20 hover:border-danger/40 hover:bg-danger/5 rounded-xl transition-colors"
              >
                <Trash2 size={14} />
                Delete File
              </button>
            </section>
          </div>
        </motion.aside>
      )}
      {/* applied tag context menu — outside aside to avoid overflow clipping */}
      {appliedTagMenu && (
        <ContextMenu
          x={appliedTagMenu.x} y={appliedTagMenu.y}
          items={[
            { label: 'Search with this tag', icon: <Search size={12} />, onClick: () => onTagSearch?.(appliedTagMenu.tag) },
            { label: 'Remove Tag', icon: <X size={12} />, onClick: () => { onRemoveSingleTag?.(appliedTagMenu.tag); setAppliedTagMenu(null); }, danger: true },
          ]}
          onClose={() => setAppliedTagMenu(null)}
        />
      )}
    </AnimatePresence>
  );
}
