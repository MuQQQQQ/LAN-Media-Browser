import { useState, useEffect } from 'react';
import { Image, Film, Star, Tags, FolderOpen, Type } from 'lucide-react';

const SCALES = [
  { label: 'S', value: 0.85 },
  { label: 'M', value: 1 },
  { label: 'L', value: 1.2 },
  { label: 'XL', value: 1.4 },
];

export default function Navbar() {
  const [scaleIdx, setScaleIdx] = useState(() => {
    const saved = localStorage.getItem('ui-font-scale');
    return saved ? Number(saved) : 1; // default M
  });

  useEffect(() => {
    document.documentElement.style.setProperty('--font-scale', String(SCALES[scaleIdx].value));
    localStorage.setItem('ui-font-scale', String(scaleIdx));
  }, [scaleIdx]);

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

        {/* font scale */}
        <button
          onClick={() => setScaleIdx((i) => (i + 1) % SCALES.length)}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-text-muted hover:text-text-primary hover:bg-surface-3/50 transition-colors"
          title={`Font size: ${SCALES[scaleIdx].label}`}
        >
          <Type size={14} />
          <span className="hidden sm:inline">{SCALES[scaleIdx].label}</span>
        </button>
      </div>
    </header>
  );
}
