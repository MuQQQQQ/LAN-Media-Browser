import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className={`relative w-full ${maxWidth} max-h-[85vh] overflow-y-auto rounded-2xl border border-border bg-surface-1 p-6 shadow-2xl`}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            <header className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{title}</h2>
              <button onClick={onClose} className="btn-base btn-ghost btn-icon"><X size={18} /></button>
            </header>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
