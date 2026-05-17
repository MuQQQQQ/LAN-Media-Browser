import { motion } from 'framer-motion';

export default function FloatingRail({ children, offset = 0 }) {
  return (
    <motion.div
      className="absolute top-1/2 -translate-y-1/2 flex flex-col gap-2 z-40"
      animate={{ right: 24 + offset }}
      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
      style={{ right: 24 + offset }}
    >
      {children}
    </motion.div>
  );
}

export function RailButton({ icon: Icon, label, active, onClick, danger }) {
  return (
    <motion.button
      className={`glass btn-icon relative group ${active ? 'ring-2 ring-brand/60' : ''} ${danger ? 'text-danger hover:text-red-300' : 'text-text-secondary hover:text-text-primary'}`}
      onClick={onClick}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.92 }}
      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      title={label}
    >
      <Icon size={20} />
      {/* tooltip */}
      <span className="absolute right-full mr-3 px-2.5 py-1.5 rounded-lg bg-surface-2 text-xs font-medium text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 shadow-lg border border-border">
        {label}
      </span>
    </motion.button>
  );
}
