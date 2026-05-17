import { useRef, useState, useCallback } from 'react';
import { GripHorizontal } from 'lucide-react';

export default function ResizablePanel({ min = 120, max = 480, initial = 220, children, className = '' }) {
  const [height, setHeight] = useState(initial);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);

  const onPointerDown = useCallback((e) => {
    dragging.current = true;
    startY.current = e.clientY;
    startHeight.current = height;
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [height]);

  const onPointerMove = useCallback((e) => {
    if (!dragging.current) return;
    const delta = startY.current - e.clientY;
    setHeight(Math.min(max, Math.max(min, startHeight.current + delta)));
  }, [min, max]);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  return (
    <div className={`flex flex-col ${className}`} style={{ height }}>
      {/* drag handle */}
      <div
        className="flex items-center justify-center py-1.5 cursor-ns-resize group shrink-0"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <GripHorizontal size={18} className="text-text-muted group-hover:text-text-secondary transition-colors" />
      </div>
      {/* content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-1">
        {children}
      </div>
    </div>
  );
}
