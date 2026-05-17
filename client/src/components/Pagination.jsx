export default function Pagination({ page, pageSize, total, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2);
  return (
    <div className="flex items-center justify-center gap-1.5 py-6">
      <button disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="btn-base btn-ghost text-xs py-2 px-3">‹ Prev</button>
      {pages.map((p, i) => (
        <span key={p} className="flex items-center gap-1">
          {i > 0 && p - pages[i - 1] > 1 && <span className="text-text-muted text-xs px-1">…</span>}
          <button onClick={() => onPageChange(p)} className={`min-w-[2rem] h-8 rounded-lg text-xs font-medium transition-colors ${p === page ? 'bg-brand text-white' : 'text-text-muted hover:text-text-primary hover:bg-surface-3'}`}>{p}</button>
        </span>
      ))}
      <button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className="btn-base btn-ghost text-xs py-2 px-3">Next ›</button>
      <span className="text-xs text-text-muted ml-2">{total} items</span>
    </div>
  );
}
