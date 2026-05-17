import { useState, useEffect } from 'react';
import { FolderOpen, ChevronRight, Search } from 'lucide-react';
import Modal from './Modal.jsx';
import { api } from '../../api.js';

export default function MovePicker({ open, onClose, currentPath, items, onMove }) {
  const [target, setTarget] = useState(currentPath);
  const [search, setSearch] = useState('');
  const [folderTree, setFolderTree] = useState([]);
  const [loading, setLoading] = useState(false);

  // load root-level folders
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api.browse({ path: '', page: 1, pageSize: 500, sortBy: 'name' })
      .then((d) => setFolderTree(d.items.filter((i) => i.type === 'folder')))
      .catch(() => setFolderTree([]))
      .finally(() => setLoading(false));
  }, [open]);

  const handleMove = () => {
    onMove?.(target);
    onClose();
  };

  const filtered = search
    ? folderTree.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()) || f.path.toLowerCase().includes(search.toLowerCase()))
    : folderTree;

  return (
    <Modal open={open} onClose={onClose} title={`Move ${items?.length || 0} item(s)`} maxWidth="max-w-md">
      <div className="space-y-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter folders…"
            className="w-full bg-surface-3 border border-border rounded-xl pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
          />
        </div>

        {/* current path */}
        <div className="flex items-center gap-1.5 text-xs text-text-muted">
          <span>Current: </span>
          <code className="text-text-secondary bg-surface-3 px-2 py-0.5 rounded">{currentPath || 'Root'}</code>
        </div>

        {/* target */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-text-muted">Target:</span>
          <input
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="/path/to/folder"
            className="flex-1 bg-surface-3 border border-border rounded-lg px-3 py-1.5 text-xs text-text-primary font-mono"
          />
          <button onClick={() => setTarget('')} className="text-text-muted hover:text-text-primary text-xs">Root</button>
        </div>

        {/* folder list */}
        <div className="max-h-[40vh] overflow-y-auto space-y-0.5">
          {loading ? (
            <p className="text-xs text-text-muted p-3">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-text-muted p-3">No folders found</p>
          ) : (
            filtered.map((f) => (
              <button
                key={f.path}
                onClick={() => setTarget(f.path)}
                className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
                  target === f.path ? 'bg-brand/10 text-brand-glow border border-brand/30' : 'hover:bg-surface-3 text-text-secondary hover:text-text-primary border border-transparent'
                }`}
              >
                <FolderOpen size={14} className="shrink-0" />
                <span className="truncate">{f.path || 'Root'}</span>
              </button>
            ))
          )}
        </div>

        <div className="flex gap-2">
          <button onClick={handleMove} className="btn-base btn-primary flex-1 text-sm">Move Here</button>
          <button onClick={onClose} className="btn-base btn-ghost text-sm">Cancel</button>
        </div>
      </div>
    </Modal>
  );
}
