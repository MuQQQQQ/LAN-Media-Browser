import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const DOUBLE_TAP_MS = 280;
const DOUBLE_TAP_MOVE_TOLERANCE = 18;
const TAP_MAX_TRAVEL = 14;
const CONTROLS_HIDE_DELAY = 2600;
const SEEK_STEP = 5;
const ACTIVE_VIDEO_EVENT = 'mobile-player:play';

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function formatTime(value) {
    if (!Number.isFinite(value) || value < 0) return '0:00';
    const totalSeconds = Math.floor(value);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function useStableVideoEvents(videoRef, handlers) {
    const handlersRef = useRef(handlers);

    useEffect(() => {
        handlersRef.current = handlers;
    }, [handlers]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return undefined;

        const boundEvents = Object.entries(handlersRef.current).map(([eventName]) => {
            const listener = (event) => handlersRef.current[eventName]?.(event);
            video.addEventListener(eventName, listener);
            return [eventName, listener];
        });

        return () => boundEvents.forEach(([eventName, listener]) => video.removeEventListener(eventName, listener));
    }, [videoRef]);
}

function useIntersectionPlayback(containerRef, videoRef, setIsInView) {
    useEffect(() => {
        const container = containerRef.current;
        if (!container || !('IntersectionObserver' in window)) return undefined;

        const observer = new IntersectionObserver(([entry]) => {
            const visible = entry.isIntersecting && entry.intersectionRatio >= 0.42;
            setIsInView(visible);
            if (!visible && videoRef.current && !videoRef.current.paused) videoRef.current.pause();
        }, {
            threshold: [0, 0.25, 0.42, 0.7, 1],
            rootMargin: '160px 0px 160px 0px'
        });

        observer.observe(container);
        return () => observer.disconnect();
    }, [containerRef, videoRef, setIsInView]);
}

function bufferedEnd(video) {
    if (!video?.buffered?.length) return 0;
    const current = video.currentTime || 0;
    for (let index = 0; index < video.buffered.length; index += 1) {
        if (video.buffered.start(index) <= current && current <= video.buffered.end(index)) {
            return video.buffered.end(index);
        }
    }
    return video.buffered.end(video.buffered.length - 1);
}

function requestOrientationLock(orientation) {
    const lock = screen.orientation?.lock;
    if (!lock) return;
    Promise.resolve(lock.call(screen.orientation, orientation)).catch(() => {});
}

const VideoPlayer = memo(function VideoPlayer({ item, url }) {
    const containerRef = useRef(null);
    const videoRef = useRef(null);
    const progressRef = useRef(null);
    const hideTimerRef = useRef(null);
    const rafRef = useRef(0);
    const wasPlayingBeforeDragRef = useRef(false);
    const dragStateRef = useRef({ active: false, pointerId: null });
    const tapRef = useRef({ time: 0, x: 0, y: 0, side: null });
    const pointerStartRef = useRef({ x: 0, y: 0, time: 0 });
    const feedbackTimerRef = useRef(null);

    const [activated, setActivated] = useState(false);
    const [wantsToPlay, setWantsToPlay] = useState(false);
    const [isInView, setIsInView] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [buffered, setBuffered] = useState(0);
    const [muted, setMuted] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [controlsVisible, setControlsVisible] = useState(true);
    const [isDragging, setIsDragging] = useState(false);
    const [aspectRatio, setAspectRatio] = useState(16 / 9);
    const [orientation, setOrientation] = useState('landscape');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [seekFeedback, setSeekFeedback] = useState(null);
    const [ended, setEnded] = useState(false);

    const progress = duration ? clamp(currentTime / duration, 0, 1) : 0;
    const bufferedProgress = duration ? clamp(buffered / duration, 0, 1) : 0;
    const formattedCurrent = useMemo(() => formatTime(currentTime), [currentTime]);
    const formattedDuration = useMemo(() => formatTime(duration), [duration]);
    const title = item?.name || 'Video';

    const showControls = useCallback((keepVisible = false) => {
        setControlsVisible(true);
        window.clearTimeout(hideTimerRef.current);
        if (!keepVisible && !videoRef.current?.paused) {
            hideTimerRef.current = window.setTimeout(() => setControlsVisible(false), CONTROLS_HIDE_DELAY);
        }
    }, []);

    const syncProgress = useCallback(() => {
        const video = videoRef.current;
        if (!video || dragStateRef.current.active) return;
        setCurrentTime((previous) => Math.abs(previous - video.currentTime) > 0.18 ? video.currentTime : previous);
        setBuffered(bufferedEnd(video));
    }, []);

    const scheduleProgressSync = useCallback(() => {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = window.requestAnimationFrame(syncProgress);
    }, [syncProgress]);

    const seekTo = useCallback((time) => {
        const video = videoRef.current;
        if (!video || !Number.isFinite(duration)) return;
        const next = clamp(time, 0, duration || video.duration || 0);
        video.currentTime = next;
        setCurrentTime(next);
        setEnded(false);
    }, [duration]);

    const togglePlay = useCallback(async () => {
        const video = videoRef.current;
        if (!video) return;
        setActivated(true);
        showControls();
        try {
            if (video.paused || video.ended) {
                setWantsToPlay(true);
                if (!video.currentSrc) {
                    video.src = url;
                    video.load();
                }
                await video.play();
            } else {
                setWantsToPlay(false);
                video.pause();
            }
        } catch (error) {
            setWantsToPlay(false);
            setControlsVisible(true);
        }
    }, [showControls, url]);

    const cycleSpeed = useCallback(() => {
        const video = videoRef.current;
        const currentIndex = SPEEDS.indexOf(playbackRate);
        const nextRate = SPEEDS[(currentIndex + 1) % SPEEDS.length];
        if (video) video.playbackRate = nextRate;
        setPlaybackRate(nextRate);
        showControls();
    }, [playbackRate, showControls]);

    const toggleMute = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;
        video.muted = !video.muted;
        setMuted(video.muted);
        showControls();
    }, [showControls]);

    const toggleFullscreen = useCallback(async () => {
        const container = containerRef.current;
        if (!container) return;
        showControls(true);

        try {
            if (!document.fullscreenElement) {
                await container.requestFullscreen?.({ navigationUI: 'hide' });
                if (orientation === 'landscape') requestOrientationLock('landscape');
                else requestOrientationLock('portrait');
            } else {
                await document.exitFullscreen?.();
            }
        } catch (error) {
            container.classList.toggle('mobile-player--pseudo-fullscreen');
            setIsFullscreen(container.classList.contains('mobile-player--pseudo-fullscreen'));
        }
    }, [orientation, showControls]);

    const updateFromPointer = useCallback((clientX) => {
        const bar = progressRef.current;
        if (!bar) return;
        const rect = bar.getBoundingClientRect();
        const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
        seekTo(ratio * duration);
    }, [duration, seekTo]);

    const beginDrag = useCallback((event) => {
        if (!duration) return;
        event.preventDefault();
        event.stopPropagation();
        const video = videoRef.current;
        dragStateRef.current = { active: true, pointerId: event.pointerId };
        wasPlayingBeforeDragRef.current = Boolean(video && !video.paused);
        setWantsToPlay(false);
        video?.pause();
        event.currentTarget.setPointerCapture?.(event.pointerId);
        setIsDragging(true);
        showControls(true);
        updateFromPointer(event.clientX);
    }, [duration, showControls, updateFromPointer]);

    const moveDrag = useCallback((event) => {
        if (!dragStateRef.current.active || dragStateRef.current.pointerId !== event.pointerId) return;
        event.preventDefault();
        event.stopPropagation();
        updateFromPointer(event.clientX);
    }, [updateFromPointer]);

    const endDrag = useCallback(async (event) => {
        if (!dragStateRef.current.active || dragStateRef.current.pointerId !== event.pointerId) return;
        event.preventDefault();
        event.stopPropagation();
        dragStateRef.current = { active: false, pointerId: null };
        event.currentTarget.releasePointerCapture?.(event.pointerId);
        setIsDragging(false);
        if (wasPlayingBeforeDragRef.current && videoRef.current) {
            try {
                setWantsToPlay(true);
                await videoRef.current.play();
            } catch (error) { setWantsToPlay(false); }
        }
        showControls();
    }, [showControls]);

    const triggerSeekFeedback = useCallback((side, amount) => {
        setSeekFeedback((current) => ({
            side,
            amount: (current?.side === side ? current.amount : 0) + amount,
            key: Date.now()
        }));
        window.clearTimeout(feedbackTimerRef.current);
        feedbackTimerRef.current = window.setTimeout(() => setSeekFeedback(null), 760);
    }, []);

    const handleSurfacePointerDown = useCallback((event) => {
        if (event.pointerType === 'mouse') return;
        pointerStartRef.current = { x: event.clientX, y: event.clientY, time: Date.now() };
    }, []);

    const handleSurfacePointerUp = useCallback((event) => {
        if (dragStateRef.current.active || event.pointerType === 'mouse') return;
        const container = containerRef.current;
        if (!container) return;
        const travel = Math.hypot(event.clientX - pointerStartRef.current.x, event.clientY - pointerStartRef.current.y);
        if (travel > TAP_MAX_TRAVEL) return;

        const rect = container.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const now = Date.now();
        const side = x < rect.width / 2 ? 'left' : 'right';
        const last = tapRef.current;
        const moved = Math.hypot(x - last.x, y - last.y);
        const isDoubleTap = now - last.time < DOUBLE_TAP_MS && moved < DOUBLE_TAP_MOVE_TOLERANCE && last.side === side;

        if (isDoubleTap) {
            event.preventDefault();
            event.stopPropagation();
            const delta = side === 'left' ? -SEEK_STEP : SEEK_STEP;
            seekTo((videoRef.current?.currentTime || 0) + delta);
            triggerSeekFeedback(side, SEEK_STEP);
            tapRef.current = { time: 0, x: 0, y: 0, side: null };
            showControls();
            return;
        }

        tapRef.current = { time: now, x, y, side };
        window.setTimeout(() => {
            if (tapRef.current.time === now) {
                setControlsVisible((visible) => !visible);
                tapRef.current = { time: 0, x: 0, y: 0, side: null };
            }
        }, DOUBLE_TAP_MS + 30);
    }, [seekTo, showControls, triggerSeekFeedback]);

    const onKeyDown = useCallback((event) => {
        if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); togglePlay(); }
        if (event.key === 'ArrowLeft') { event.preventDefault(); seekTo(currentTime - SEEK_STEP); triggerSeekFeedback('left', SEEK_STEP); }
        if (event.key === 'ArrowRight') { event.preventDefault(); seekTo(currentTime + SEEK_STEP); triggerSeekFeedback('right', SEEK_STEP); }
        if (event.key.toLowerCase() === 'm') toggleMute();
        if (event.key.toLowerCase() === 'f') toggleFullscreen();
    }, [currentTime, seekTo, toggleFullscreen, toggleMute, togglePlay, triggerSeekFeedback]);

    useStableVideoEvents(videoRef, {
        loadedmetadata: () => {
            const video = videoRef.current;
            if (!video) return;
            const nextDuration = Number.isFinite(video.duration) ? video.duration : 0;
            const ratio = video.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : 16 / 9;
            setDuration(nextDuration);
            setAspectRatio(ratio);
            setOrientation(ratio < 0.9 ? 'portrait' : 'landscape');
            setIsLoading(false);
        },
        durationchange: () => setDuration(Number.isFinite(videoRef.current?.duration) ? videoRef.current.duration : 0),
        timeupdate: scheduleProgressSync,
        progress: scheduleProgressSync,
        waiting: () => setIsLoading(true),
        canplay: () => setIsLoading(false),
        playing: () => { setIsPlaying(true); setIsLoading(false); setEnded(false); showControls(); },
        pause: () => { setIsPlaying(false); setControlsVisible(true); },
        ended: () => { setIsPlaying(false); setEnded(true); setControlsVisible(true); },
        volumechange: () => setMuted(Boolean(videoRef.current?.muted)),
        ratechange: () => setPlaybackRate(videoRef.current?.playbackRate || 1)
    });

    useIntersectionPlayback(containerRef, videoRef, setIsInView);

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !activated || !wantsToPlay || video.src) return;
        video.src = url;
        video.load();
        video.play().catch(() => {
            setWantsToPlay(false);
            setControlsVisible(true);
        });
    }, [activated, url, wantsToPlay]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return undefined;

        const handleAnyPlayerStarted = (event) => {
            if (event.detail !== video && !video.paused) {
                setWantsToPlay(false);
                video.pause();
            }
        };

        window.addEventListener(ACTIVE_VIDEO_EVENT, handleAnyPlayerStarted);
        return () => window.removeEventListener(ACTIVE_VIDEO_EVENT, handleAnyPlayerStarted);
    }, []);

    useEffect(() => {
        const handleFullscreenChange = () => {
            const active = document.fullscreenElement === containerRef.current;
            setIsFullscreen(active || containerRef.current?.classList.contains('mobile-player--pseudo-fullscreen'));
            if (!active && screen.orientation?.unlock) {
                try { screen.orientation.unlock(); } catch (error) {}
            }
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        video.playbackRate = playbackRate;
        video.muted = muted;
    }, [muted, playbackRate]);

    useEffect(() => {
        if (isPlaying && videoRef.current) window.dispatchEvent(new CustomEvent(ACTIVE_VIDEO_EVENT, { detail: videoRef.current }));
    }, [isPlaying]);

    useEffect(() => () => {
        window.clearTimeout(hideTimerRef.current);
        window.clearTimeout(feedbackTimerRef.current);
        window.cancelAnimationFrame(rafRef.current);
        const video = videoRef.current;
        if (video) {
            video.pause();
            video.removeAttribute('src');
            video.load();
        }
    }, []);

    return (
        <div
            ref={containerRef}
            className={`mobile-player mobile-player--${orientation} ${controlsVisible || !isPlaying ? 'controls-visible' : 'controls-hidden'} ${isFullscreen ? 'is-fullscreen' : ''}`}
            style={{ '--video-aspect-ratio': aspectRatio }}
            role="group"
            aria-label={`Custom video player for ${title}`}
            tabIndex={0}
            onKeyDown={onKeyDown}
            onPointerMove={() => showControls()}
        >
            <div className="mobile-player__viewport" onPointerDown={handleSurfacePointerDown} onPointerUp={handleSurfacePointerUp}>
                <video
                    ref={videoRef}
                    className="mobile-player__video"
                    src={activated || isInView ? url : undefined}
                    preload={isInView ? 'metadata' : 'none'}
                    playsInline
                    webkit-playsinline="true"
                    controls={false}
                    disablePictureInPicture
                    controlsList="nodownload noplaybackrate noremoteplayback"
                    aria-label={title}
                />
                {!activated && !isPlaying && (
                    <button className="mobile-player__starter" type="button" onClick={togglePlay} aria-label={`Play ${title}`}>
                        <span>▶</span>
                    </button>
                )}
                {isLoading && (activated || isInView) && <div className="mobile-player__spinner" aria-label="Video loading" />}
                {ended && (
                    <button className="mobile-player__replay" type="button" onClick={togglePlay} aria-label="Replay video">
                        ↻ Replay
                    </button>
                )}
                {seekFeedback && (
                    <div className={`mobile-player__seek-feedback ${seekFeedback.side}`} key={seekFeedback.key} aria-hidden="true">
                        <span>{seekFeedback.side === 'left' ? '↶' : '↷'}</span>
                        <strong>{seekFeedback.amount}s</strong>
                    </div>
                )}
            </div>

            <div className="mobile-player__shade" aria-hidden="true" />
            {/* <div className="mobile-player__topbar">
                <div className="mobile-player__title" title={title}>{title}</div>
                <span className="mobile-player__badge">{orientation}</span>
            </div> */}

            <div className="mobile-player__controls" onPointerUp={(event) => event.stopPropagation()}>
                <div
                    ref={progressRef}
                    className={`mobile-player__progress ${isDragging ? 'dragging' : ''}`}
                    role="slider"
                    tabIndex={0}
                    aria-label="Seek video"
                    aria-valuemin={0}
                    aria-valuemax={Math.floor(duration || 0)}
                    aria-valuenow={Math.floor(currentTime || 0)}
                    aria-valuetext={`${formattedCurrent} of ${formattedDuration}`}
                    onPointerDown={beginDrag}
                    onPointerMove={moveDrag}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                >
                    <div className="mobile-player__progress-track">
                        <span className="mobile-player__buffered" style={{ transform: `scaleX(${bufferedProgress})` }} />
                        <span className="mobile-player__played" style={{ transform: `scaleX(${progress})` }} />
                        <span className="mobile-player__thumb" style={{ left: `${progress * 100}%` }} />
                    </div>
                </div>

                <div className="mobile-player__control-row">
                    <button type="button" className="mobile-player__icon-button" onClick={togglePlay} aria-label={isPlaying ? 'Pause video' : 'Play video'}>{isPlaying ? '❚❚' : '▶'}</button>
                    <div className="mobile-player__time" aria-live="off"><span>{formattedCurrent}</span><span>/</span><span>{formattedDuration}</span></div>
                    <button type="button" className="mobile-player__pill-button" onClick={cycleSpeed} aria-label="Change playback speed">{playbackRate}×</button>
                    <button type="button" className="mobile-player__icon-button" onClick={toggleMute} aria-label={muted ? 'Unmute video' : 'Mute video'}>{muted ? '🔇' : '🔊'}</button>
                    <button type="button" className="mobile-player__icon-button" onClick={toggleFullscreen} aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>{isFullscreen ? '⇲' : '⛶'}</button>
                </div>
            </div>
        </div>
    );
});

export default VideoPlayer;