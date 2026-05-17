import { useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';

function fmt(s) {
  if (!Number.isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

export default function ProgressBar({ currentTime, duration, onSeek, onScrub, onScrubEnd }) {
  const trackRef = useRef(null);
  const downX = useRef(0);
  const moved = useRef(false);
  const activeRef = useRef(false);
  const [hovered, setHovered] = useState(false);
  const [barActive, setBarActive] = useState(false);

  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;
  const isActive = hovered || barActive;

  const getTime = useCallback((clientX) => {
    const r = trackRef.current?.getBoundingClientRect();
    if (!r || !duration) return 0;
    return Math.max(0, Math.min(duration, ((clientX - r.left) / r.width) * duration));
  }, [duration]);

  const start = useCallback((clientX, e) => {
    e?.stopPropagation?.();
    downX.current = clientX;
    moved.current = false;
    activeRef.current = true;
    setBarActive(true);
  }, []);

  const move = useCallback((clientX) => {
    if (!activeRef.current) return;
    if (Math.abs(clientX - downX.current) > 2) moved.current = true;
    if (moved.current) onScrub?.(getTime(clientX));
  }, [getTime, onScrub]);

  const end = useCallback((clientX) => {
    activeRef.current = false;
    setBarActive(false);
    const t = getTime(clientX);
    moved.current ? onScrubEnd?.(t) : onSeek?.(t);
  }, [getTime, onScrubEnd, onSeek]);

  // pointer events (desktop)
  const onPDown = (e) => { try { trackRef.current?.setPointerCapture(e.pointerId); } catch (_) {} start(e.clientX, e); };
  const onPMove = (e) => move(e.clientX);
  const onPUp = (e) => end(e.clientX);

  // touch events (mobile including Edge)
  const onTStart = (e) => { e.preventDefault(); const t = e.touches[0]; if (t) start(t.clientX, e); };
  const onTMove = (e) => { const t = e.touches[0]; if (t) move(t.clientX); };
  const onTEnd = (e) => { const t = e.changedTouches[0]; if (t) end(t.clientX); };

  return (
    <div
      ref={trackRef}
      className="relative w-full cursor-pointer select-none py-3 md:py-0.5"
      style={{ touchAction: 'none' }}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onPointerDown={onPDown}
      onPointerMove={onPMove}
      onPointerUp={onPUp}
      onTouchStart={onTStart}
      onTouchMove={onTMove}
      onTouchEnd={onTEnd}
    >
      <div className={`relative w-full rounded-full bg-white/20 transition-all duration-150 pointer-events-none ${isActive ? 'h-1.5' : 'h-1'}`}>
        <motion.div
          className="absolute left-0 top-0 h-full rounded-full bg-white"
          style={{ width: `${progress * 100}%` }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ type: 'tween', duration: 0.1 }}
        />
        {isActive && (
          <motion.div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-lg"
            style={{ left: `${progress * 100}%` }}
            initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
          />
        )}
      </div>
      <div className="mt-0.5 px-0.5">
        <span className="text-[10px] text-white/60 tabular-nums">{fmt(currentTime)}/{fmt(duration)}</span>
      </div>
    </div>
  );
}
