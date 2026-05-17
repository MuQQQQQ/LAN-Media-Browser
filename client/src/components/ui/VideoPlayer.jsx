import { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, ChevronLeft, ChevronRight } from 'lucide-react';
import ProgressBar from './ProgressBar.jsx';

function pad(n) { return String(n).padStart(2, '0'); }
function fmtTime(s) {
  if (!Number.isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  return `${m}:${pad(Math.floor(s % 60))}`;
}

export default function VideoPlayer({ src, autoPlay, playbackRate, onLoadedMetadata, onError }) {
  const videoRef = useRef(null);
  const overlayRef = useRef(null);
  const [playing, setPlaying] = useState(autoPlay);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(() => Number(localStorage.getItem('player-volume') ?? 1));
  const [centerIcon, setCenterIcon] = useState(null);
  const [seekHint, setSeekHint] = useState(null);
  const [scrubTime, setScrubTime] = useState(null);
  const [scrubbing, setScrubbing] = useState(false);
  const [gestureScrubTime, setGestureScrubTime] = useState(null);
  const [gestureScrubX, setGestureScrubX] = useState(null);
  const [showVolume, setShowVolume] = useState(false);
  const [spriteData, setSpriteData] = useState(null);
  const [spriteEnabled, setSpriteEnabled] = useState(() => localStorage.getItem('sprite-preview') !== 'off');

  const g = useRef({
    mode: 'idle',
    startX: 0, startY: 0,
    startTime: 0, startVideoTime: 0,
    dx: 0, dy: 0, axis: null, locked: false,
    lastTapT: 0, lastTapX: 0, tapTimer: null,
    ptrId: null,
  }).current;

  // ── video sync ──
  useEffect(() => {
    const v = videoRef.current; if (!v) return;
    playing ? v.play().catch(() => {}) : v.pause();
  }, [playing]);
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = playbackRate || 1;
  }, [playbackRate]);

  // fetch sprite on src change
  useEffect(() => {
    setSpriteData(null);
    if (!src) return;
    const rawPath = src.includes('?path=') ? src.split('?path=')[1]?.split('&')[0] : src;
    const u = `/api/thumbnail/video-sprite?path=${encodeURIComponent(decodeURIComponent(rawPath || ''))}`;
    fetch(u).then(r => r.json()).then(d => {
      if (d.spriteUrl) setSpriteData(d);
    }).catch(() => {});
  }, [src]);

  // reset on src change
  useEffect(() => {
    g.mode = 'idle'; g.locked = false; g.axis = null;
    g.startVideoTime = 0; g.lastTapT = 0;
    setPlaying(autoPlay);
    setCurrentTime(0); setDuration(0); setScrubTime(null); setScrubbing(false);
    setCenterIcon(null); setSeekHint(null);
    if (videoRef.current) { videoRef.current.volume = volume; videoRef.current.playbackRate = playbackRate || 1; }
  }, [src]);

  // volume sync
  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = volume;
    localStorage.setItem('player-volume', String(volume));
  }, [volume]);

  // close volume popup on outside click
  useEffect(() => {
    if (!showVolume) return;
    const h = (e) => { if (!e.target.closest('.volume-popup') && !e.target.closest('.volume-btn')) setShowVolume(false); };
    document.addEventListener('pointerdown', h);
    return () => document.removeEventListener('pointerdown', h);
  }, [showVolume]);
  useEffect(() => {
    const v = videoRef.current; if (!v) return;
    if (v.readyState >= 1) { // HAVE_METADATA
      setDuration(v.duration);
      onLoadedMetadata?.({ currentTarget: v });
    }
    const t = () => { if (!scrubbing) setCurrentTime(v.currentTime); };
    const d = () => { setDuration(v.duration); onLoadedMetadata?.({ currentTarget: v }); };
    const e = () => onError?.();
    // oncanplay
    const c = () => { { // HAVE_METADATA
      setDuration(v.duration);
      onLoadedMetadata?.({ currentTarget: v });
    } };
    v.addEventListener('canplay', c);
    v.addEventListener('timeupdate', t);
    v.addEventListener('loadedmetadata', d);
    v.addEventListener('error', e);
    return () => { v.removeEventListener('timeupdate', t); v.removeEventListener('loadedmetadata', d); v.removeEventListener('error', e); };
  }, [scrubbing, onLoadedMetadata, onError]);

  const flashIcon = useCallback((icon) => { setCenterIcon(icon); setTimeout(() => setCenterIcon(null), 600); }, []);
  const flashSeek = useCallback((dir, s) => { setSeekHint({ dir, s }); setTimeout(() => setSeekHint(null), 800); }, []);

  // keyboard: space = play/pause
  useEffect(() => {
    const handler = (e) => {
      if (e.key === ' ' || e.code === 'Space') {
        const v = videoRef.current; if (!v) return;
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
        e.preventDefault();
        const wantPlay = v.paused || v.ended;
        setPlaying(wantPlay);
        flashIcon(wantPlay ? 'play' : 'pause');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [flashIcon]);

  // ── zone helper ──
  const getZone = useCallback((clientX) => {
    const r = overlayRef.current?.getBoundingClientRect();
    if (!r) return 'center';
    const w = r.width;
    if (clientX - r.left < w * 0.3) return 'left';
    if (clientX - r.left > w * 0.7) return 'right';
    return 'center';
  }, []);

  // ── POINTER DOWN ──
  const onDown = useCallback((e) => {
    const v = videoRef.current; if (!v) return;
    // capture pointer so move/up fire on this element
    e.currentTarget.setPointerCapture(e.pointerId);
    g.ptrId = e.pointerId;

    g.startX = e.clientX;
    g.startY = e.clientY;
    g.startTime = Date.now();
    g.startVideoTime = v.currentTime;
    g.dx = 0; g.dy = 0;
    g.locked = false; g.axis = null;
    g.mode = 'tapping';

    const now = Date.now();
    const dt = now - g.lastTapT;
    const dist = Math.abs(e.clientX - g.lastTapX);
    g.lastTapT = now;
    g.lastTapX = e.clientX;

    const zone = getZone(e.clientX);
    // double-tap detection (only left/right zones)
    if (dt < 300 && dist < 40 && (zone === 'left' || zone === 'right')) {
      clearTimeout(g.tapTimer);
      g.mode = 'doubleTapSeeking';
      const seek = zone === 'left' ? -3 : 3;
      const nt = Math.max(0, Math.min(duration, v.currentTime + seek));
      v.currentTime = nt;
      setCurrentTime(nt);
      flashSeek(zone, 3);
      g.mode = 'idle';
      return;
    }

    // single-tap timer — any zone
    g.tapTimer = setTimeout(() => {
      if (g.mode === 'tapping') {
        const wantPlay = v.paused || v.ended;
        setPlaying(wantPlay);
        flashIcon(wantPlay ? 'pause' : 'play');
        g.mode = 'idle';
      }
    }, 250);
  }, [duration, flashIcon, flashSeek, getZone, g]);

  // ── POINTER MOVE ──
  const onMove = useCallback((e) => {
    if (g.mode === 'idle') return;
    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    g.dx = dx; g.dy = dy;

    if (!g.locked && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
      g.locked = true;
      g.axis = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
    }
    if (!g.locked) return;

    if (g.axis === 'h') {
      clearTimeout(g.tapTimer);
      g.mode = 'scrubbing';
      setScrubbing(true);
      setGestureScrubX(e.clientX);
      const v = videoRef.current;
      if (!v || !duration) return;
      const secPerScreen = 10;
      const delta = (dx / window.innerWidth) * secPerScreen;
      const nt = Math.max(0, Math.min(duration, g.startVideoTime + delta));
      v.currentTime = nt;
      setScrubTime(nt);
      setGestureScrubTime(nt);
      setCurrentTime(nt);
    }
    if (g.axis === 'v') {
      g.mode = 'idle'; // release: let page scroll
    }
  }, [g, duration]);

  // ── POINTER UP ──
  const onUp = useCallback((e) => {
    if (g.mode === 'scrubbing') { setScrubbing(false); setScrubTime(null); setGestureScrubTime(null); setGestureScrubX(null); }
    if (g.mode !== 'tapping') { g.mode = 'idle'; }
    g.locked = false; g.axis = null;
    if (g.ptrId != null) {
      try { e.currentTarget.releasePointerCapture(g.ptrId); } catch (_) {}
      g.ptrId = null;
    }
  }, [g]);

  // ── progress callbacks ──
  const onProgressSeek = useCallback((t) => {
    const v = videoRef.current; if (!v) return;
    v.currentTime = t; setCurrentTime(t);
  }, []);
  const onProgressScrub = useCallback((t) => {
    const v = videoRef.current; if (!v) return;
    v.currentTime = t; setCurrentTime(t); setScrubTime(t); setScrubbing(true);
  }, []);
  const onProgressEnd = useCallback((t) => {
    onProgressSeek(t); setScrubbing(false); setScrubTime(null);
  }, [onProgressSeek]);

  const displayTime = scrubTime ?? currentTime;

  return (
    <div className="relative w-full h-full overflow-hidden bg-black select-none" style={{ touchAction: 'none' }}>
      <video
        ref={videoRef}
        src={src}
        className="absolute inset-0 w-full h-full object-contain"
        playsInline preload="metadata" autoPlay={autoPlay}
        onError={onError}
        onLoadedMetadata={(e) => { setDuration(e.currentTarget.duration); onLoadedMetadata?.(e); }}
      />

      {/* gesture overlay */}
      <div
        ref={overlayRef}
        className="absolute inset-0 z-10"
        style={{ touchAction: 'none' }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* center icon */}
      <AnimatePresence>
        {centerIcon && (
          <motion.div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
            initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.2 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}>
            <div className="w-20 h-20 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center">
              {centerIcon === 'play' ? <Play size={32} fill="white" className="text-white ml-1" /> : <Pause size={32} fill="white" className="text-white" />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* seek hint */}
      <AnimatePresence>
        {seekHint && (
          <motion.div
            className={`absolute top-1/2 -translate-y-1/2 z-20 pointer-events-none flex items-center gap-1 px-3 py-2 rounded-xl bg-black/50 backdrop-blur-md ${seekHint.dir === 'left' ? 'left-6' : 'right-6'}`}
            initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}>
            {seekHint.dir === 'left' ? (
              <><ChevronLeft size={22} className="text-white" /><ChevronLeft size={22} className="text-white -ml-2" /><span className="text-white font-bold text-sm">{seekHint.s}s</span></>
            ) : (
              <><span className="text-white font-bold text-sm">{seekHint.s}s</span><ChevronRight size={22} className="text-white -mr-2" /><ChevronRight size={22} className="text-white" /></>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* scrub HUD */}
      <AnimatePresence>
        {scrubTime !== null && scrubbing && (
          <motion.div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            <div className="px-4 py-2 rounded-xl bg-black/60 backdrop-blur-lg">
              <span className="text-white font-mono text-lg font-semibold tabular-nums">
                {fmtTime(scrubTime)} / {fmtTime(duration)}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* progress bar + volume */}
      <div className="absolute bottom-0 left-0 right-0 z-20 px-2 pb-1">
        <ProgressBar
          currentTime={displayTime}
          duration={duration}
          onSeek={onProgressSeek}
          onScrub={onProgressScrub}
          onScrubEnd={onProgressEnd}
          spriteData={spriteData}
          spriteEnabled={spriteEnabled}
          gestureScrubTime={gestureScrubTime}
          gestureScrubX={gestureScrubX}
          onSpriteToggle={() => {
            const next = !spriteEnabled;
            setSpriteEnabled(next);
            localStorage.setItem('sprite-preview', next ? 'on' : 'off');
          }}
        />
        {/* volume — right side, bigger tap target */}
        <div className="flex justify-end mt-0.5">
          <div className="relative" onPointerDown={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowVolume((v) => !v)}
              onPointerDown={(e) => e.stopPropagation()}
              className="volume-btn flex items-center justify-center w-6 h-6 rounded-full hover:bg-white/10 transition-colors"
            >
              <span className="text-sm leading-none">{volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}</span>
            </button>
            <AnimatePresence>
              {showVolume && (
                <motion.div
                  className="volume-popup absolute bottom-full right-0 mb-2 flex flex-col items-center gap-1 px-3 py-3 rounded-xl bg-black/80 backdrop-blur-xl border border-white/10 z-50 shadow-xl"
                  initial={{ opacity: 0, scale: 0.9, y: 4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 4 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <input
                    type="range"
                    min="0" max="1" step="0.05"
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    className="h-28 w-1.5 accent-white appearance-none bg-white/20 rounded-full cursor-pointer"
                    style={{
                      writingMode: 'vertical-lr',
                      direction: 'rtl',
                      WebkitAppearance: 'slider-vertical',
                    }}
                    orient="vertical"
                  />
                  <span className="text-[11px] text-white/70 font-medium tabular-nums">{Math.round(volume * 100)}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
