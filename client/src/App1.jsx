import { useEffect, useRef, useState } from "react";

export default function App() {
const containerRef = useRef(null);
const imgRef = useRef(null);

const [zoom, setZoom] = useState(1);
const [pan, setPan] = useState({ x: 0, y: 0 });
const [touch, setTouch] = useState(null);

// 👇 切换 scale(1) vs scale(1.00001)
const [useOffset, setUseOffset] = useState(false);

const baseScale = useOffset ? 1.00001 : 1;

const distance = (a, b) =>
Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

const clampZoom = (z) => Math.max(1, Math.min(4, z));

useEffect(() => {
const el = containerRef.current;
if (!el) return;


const onTouchStart = (e) => {
  if (e.touches.length === 2) {
    const cx =
      (e.touches[0].clientX + e.touches[1].clientX) / 2;
    const cy =
      (e.touches[0].clientY + e.touches[1].clientY) / 2;

    setTouch({
      mode: "pinch",
      initialized: false,
      lastX: cx,
      lastY: cy,
    });
  } else {
    const t = e.touches[0];
    setTouch({
      mode: "pan",
      lastX: t.clientX,
      lastY: t.clientY,
    });
  }
};

const onTouchMove = (e) => {
  if (!touch) return;

  // ===== PINCH =====
  if (touch.mode === "pinch" && e.touches.length === 2) {
    e.preventDefault();

    const d = distance(e.touches[0], e.touches[1]);

    if (!touch.initialized) {
      setTouch((t) => ({
        ...t,
        startDistance: d,
        startZoom: zoom,
        initialized: true,
      }));
      return;
    }

    const scale = d / touch.startDistance;

    if (Math.abs(scale - 1) < 0.01) return;

    const rawZoom = touch.startZoom * scale;

    // 👇 平滑
    const nextZoom = clampZoom(
      zoom * 0.8 + rawZoom * 0.2
    );

    const cx =
      (e.touches[0].clientX + e.touches[1].clientX) / 2;
    const cy =
      (e.touches[0].clientY + e.touches[1].clientY) / 2;

    setZoom(nextZoom);

    setPan((p) => ({
      x: p.x + (cx - touch.lastX),
      y: p.y + (cy - touch.lastY),
    }));

    setTouch((t) => ({
      ...t,
      lastX: cx,
      lastY: cy,
    }));

    return;
  }

  // ===== PAN =====
  if (touch.mode === "pan") {
    const t = e.touches[0];

    setPan((p) => ({
      x: p.x + (t.clientX - touch.lastX),
      y: p.y + (t.clientY - touch.lastY),
    }));

    setTouch((tt) => ({
      ...tt,
      lastX: t.clientX,
      lastY: t.clientY,
    }));
  }
};

const onTouchEnd = () => setTouch(null);

el.addEventListener("touchstart", onTouchStart, { passive: false });
el.addEventListener("touchmove", onTouchMove, { passive: false });
el.addEventListener("touchend", onTouchEnd);

return () => {
  el.removeEventListener("touchstart", onTouchStart);
  el.removeEventListener("touchmove", onTouchMove);
  el.removeEventListener("touchend", onTouchEnd);
};


}, [touch, zoom]);

const scale = zoom * baseScale;

return (
<div
ref={containerRef}
style={{
width: "100vw",
height: "100vh",
overflow: "hidden",
touchAction: "none", // 🔥 关键
background: "#111",
display: "flex",
alignItems: "center",
justifyContent: "center",
}}
>
<img
ref={imgRef}
src="https://picsum.photos/1200/800"
alt=""
style={{
maxWidth: "100%",
maxHeight: "100%",
transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${scale})`,
willChange: "transform", // 🔥 GPU hint
}}
/>

```
  {/* 控制面板 */}
  <div
    style={{
      position: "fixed",
      top: 10,
      left: 10,
      color: "#fff",
      background: "rgba(0,0,0,0.6)",
      padding: 10,
      borderRadius: 8,
      fontSize: 14,
    }}
  >
    <div>zoom: {scale.toFixed(5)}</div>
    <button onClick={() => setUseOffset((v) => !v)}>
      toggle 1 vs 1.00001
    </button>
    <div>
      mode: {useOffset ? "scale(1.00001)" : "scale(1)"}
    </div>
  </div>
</div>

);
}
