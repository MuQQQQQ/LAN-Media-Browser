import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ContextMenu({ x, y, onClose, items = [] }) {
  const ref = useRef(null);

  useEffect(() => {
    // delay to avoid closing on the same event that opened us
    const id = setTimeout(() => {
      const handler = (e) => {
        if (ref.current && !ref.current.contains(e.target)) onClose();
      };
      document.addEventListener('click', handler, true);
      document.addEventListener('contextmenu', handler, true);
      // store for cleanup
      ref.current._cleanup = () => {
        document.removeEventListener('click', handler, true);
        document.removeEventListener('contextmenu', handler, true);
      };
    }, 0);
    return () => {
      clearTimeout(id);
      ref.current?._cleanup?.();
    };
  }, [onClose]);

  // keep menu within viewport
  let posX = x, posY = y;
  if (typeof window !== 'undefined') {
    if (posX + 200 > window.innerWidth) posX = window.innerWidth - 210;
    if (posY + items.length * 36 > window.innerHeight) posY = window.innerHeight - items.length * 36 - 10;
  }

  return (
    <AnimatePresence>
      <motion.div
        ref={ref}
        className="fixed z-50 min-w-[180px] py-1 rounded-xl glass-strong shadow-2xl border border-border overflow-hidden"
        style={{ left: posX, top: posY }}
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.92 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      >
        {items.map((item, i) => (
          item.separator ? (
            <div key={i} className="my-1 border-t border-border" />
          ) : (
            <button
              key={i}
              onClick={() => { item.onClick?.(); onClose(); }}
              className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2 ${
                item.danger ? 'text-danger hover:bg-danger/10' : 'text-text-secondary hover:bg-surface-3 hover:text-text-primary'
              }`}
            >
              {item.icon && <span className="w-4 flex justify-center">{item.icon}</span>}
              {item.label}
              {item.shortcut && <span className="ml-auto text-text-muted text-[10px]">{item.shortcut}</span>}
            </button>
          )
        ))}
      </motion.div>
    </AnimatePresence>
  );
}
