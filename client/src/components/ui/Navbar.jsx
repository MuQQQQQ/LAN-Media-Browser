import { Image, Film, Star, Tags, FolderOpen } from 'lucide-react';

export default function Navbar() {
  const links = [
    { href: '/', label: 'Browse', icon: FolderOpen },
    { href: '/search?itemType=image&page=1&pageSize=50&sortBy=name&sortDir=asc', label: 'Images', icon: Image },
    { href: '/search?itemType=video&page=1&pageSize=50&sortBy=name&sortDir=asc', label: 'Videos', icon: Film },
    { href: '/favorites', label: 'Favorites', icon: Star },
    { href: '/tags', label: 'Tags', icon: Tags },
  ];

  return (
    <header className="sticky top-0 z-20 glass border-b border-border/60">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
        {/* logo */}
        <a href="/" className="flex items-center gap-2 shrink-0">
          <span className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center text-white text-sm font-bold">M</span>
          <span className="font-semibold text-sm tracking-tight hidden sm:inline">Browser</span>
        </a>

        {/* nav links */}
        <nav className="flex items-center gap-1">
          {links.map((link) => {
            const isActive = window.location.pathname === link.href.split('?')[0] ||
              (link.href === '/' && window.location.pathname === '/');
            return (
              <a
                key={link.label}
                href={link.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-brand/10 text-brand-glow'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-3/50'
                }`}
              >
                <link.icon size={14} />
                <span className="hidden sm:inline">{link.label}</span>
              </a>
            );
          })}
        </nav>

        {/* spacer */}
        <div className="w-7 sm:w-0" />
      </div>
    </header>
  );
}
