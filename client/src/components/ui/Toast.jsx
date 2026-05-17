import { motion, AnimatePresence } from 'framer-motion';

export default function Toast({ message }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl glass-strong text-sm font-medium shadow-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
