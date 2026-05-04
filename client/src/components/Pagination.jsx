export default function Pagination({ page, pageSize, total, onPageChange }) {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2);
    return (
        <div className="pagination">
            <button disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Previous</button>
            {pages.map((p, i) => (
                <span key={p}>
                    {i > 0 && p - pages[i - 1] > 1 && <span className="ellipsis">…</span>}
                    <button className={p === page ? 'active' : ''} onClick={() => onPageChange(p)}>{p}</button>
                </span>
            ))}
            <button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Next</button>
            <span className="muted">{total} items</span>
        </div>
    );
}