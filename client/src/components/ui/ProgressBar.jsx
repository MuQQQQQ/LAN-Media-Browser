import { useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function fmt(s) {
  if (!Number.isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

export default function ProgressBar({ currentTime, duration, onSeek, onScrub, onScrubEnd, spriteData, spriteEnabled, onSpriteToggle }) {
  const trackRef = useRef(null);
  const downX = useRef(0);
  const moved = useRef(false);
  const activeRef = useRef(false);
  const [hovered, setHovered] = useState(false);
  const [barActive, setBarActive] = useState(false);
  const [previewTime, setPreviewTime] = useState(null);
  const [previewX, setPreviewX] = useState(0);

  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;
  const isActive = hovered || barActive;

  const getTime = useCallback((clientX) => {
    const r = trackRef.current?.getBoundingClientRect();
    if (!r || !duration) return 0;
    return Math.max(0, Math.min(duration, ((clientX - r.left) / r.width) * duration));
  }, [duration]);

  const getSpriteIdx = useCallback((time) => {
    if (!spriteData || !spriteEnabled) return -1;
    const { actualFrames, interval } = spriteData;
    if (!actualFrames || !interval) return -1;
    const idx = Math.floor(time / interval);
    return Math.min(idx, actualFrames - 1);
  }, [spriteData, spriteEnabled]);

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
    if (moved.current) {
      const t = getTime(clientX);
      onScrub?.(t);
      // update preview
      if (spriteEnabled && spriteData) {
        setPreviewTime(t);
        setPreviewX(clientX);
      }
    }
  }, [getTime, onScrub, spriteEnabled, spriteData]);

  const end = useCallback((clientX) => {
    activeRef.current = false;
    setBarActive(false);
    setPreviewTime(null);
    const t = getTime(clientX);
    moved.current ? onScrubEnd?.(t) : onSeek?.(t);
  }, [getTime, onScrubEnd, onSeek]);

  const onPDown = (e) => { try { trackRef.current?.setPointerCapture(e.pointerId); } catch (_) {} start(e.clientX, e); };
  const onPMove = (e) => move(e.clientX);
  const onPUp = (e) => end(e.clientX);

  const onTStart = (e) => { e.preventDefault(); const t = e.touches[0]; if (t) start(t.clientX, e); };
  const onTMove = (e) => { const t = e.touches[0]; if (t) move(t.clientX); };
  const onTEnd = (e) => { const t = e.changedTouches[0]; if (t) end(t.clientX); };

  const spriteIdx = previewTime != null ? getSpriteIdx(previewTime) : -1;
  const spriteCol = spriteIdx >= 0 ? spriteIdx % spriteData.cols : 0;
  const spriteRow = spriteIdx >= 0 ? Math.floor(spriteIdx / spriteData.cols) : 0;
  
  
  return (
    <div
      ref={trackRef}
      className="relative w-full cursor-pointer select-none py-3 md:py-0.5"
      style={{ touchAction: 'none' }}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => { setHovered(false); setPreviewTime(null); }}
      onPointerDown={onPDown}
      onPointerMove={onPMove}
      onPointerUp={onPUp}
      onTouchStart={onTStart}
      onTouchMove={onTMove}
      onTouchEnd={onTEnd}
    >
      {/* sprite preview thumb */}
      <AnimatePresence>
        {spriteIdx >= 0 && spriteData && spriteEnabled && barActive && (
          <motion.div
            className="absolute bottom-full left-0 mb-2 pointer-events-none z-30"
            style={{ left: previewX - trackRef.current?.getBoundingClientRect()?.left - 60 }}
            initial={{ opacity: 0, scale: 0.9, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
          >
            <div
              className="rounded-lg overflow-hidden bg-black/80 border border-white/10 shadow-xl"
              style={{
                width: spriteData.thumbW || 90,
                height: spriteData.thumbH || 160,
                backgroundImage: `url(${spriteData.spriteUrl})`,
                backgroundSize: `${spriteData.cols * 100}% ${Math.ceil(spriteData.actualFrames / spriteData.cols) * 100}%`,
                backgroundPosition: `${spriteData.cols > 1 ? (spriteCol / (spriteData.cols-1)) * 100 : 0}% ${spriteData.cols > 1 ? (spriteRow / (Math.ceil(spriteData.actualFrames / spriteData.cols)-1)) * 100 : 0}%`,
              }}
            />
            <span className="block text-center text-[10px] text-white/60 mt-0.5 tabular-nums">{fmt(previewTime)}</span>
          </motion.div>
        )}
      </AnimatePresence>

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

      <div className="flex items-center justify-between mt-0.5 px-0.5">
        <span className="text-[10px] text-white/60 tabular-nums">{fmt(currentTime)}/{fmt(duration)}</span>
        {/* sprite toggle */}
        {spriteData && (
          <button
            onClick={(e) => { e.stopPropagation(); onSpriteToggle?.(); }}
            onPointerDown={(e) => e.stopPropagation()}
            className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${spriteEnabled ? 'bg-white/15 text-white/80' : 'text-white/30 hover:text-white/50'}`}
          >
            ▦
          </button>
        )}
      </div>
    </div>
  );
}
