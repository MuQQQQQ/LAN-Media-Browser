export default function Breadcrumbs({ path, onNavigate }) {
    const parts = path ? path.split('/').filter(Boolean) : [];
    const crumbs = [{ label: 'Base', path: '' }, ...parts.map((part, index) => ({ label: part, path: parts.slice(0, index + 1).join('/') }))];
    return (
        <nav className="breadcrumbs" aria-label="Breadcrumb">
            {crumbs.map((crumb, index) => (
                <span key={crumb.path || 'root'}>
                    <button onClick={() => onNavigate(crumb.path)}>{crumb.label}</button>
                    {index < crumbs.length - 1 && <span className="separator">/</span>}
                </span>
            ))}
        </nav>
    );
}