import { useCallback, useEffect, useRef } from 'react';
import type { Cells } from '../engine/rle';

export type PixelTool = 'pen' | 'eraser' | 'fill' | 'picker';

// 범용 도트 캔버스: W x H 칸에 hex 색을 찍는다. 셀 배열은 부모가 들고 있고, 바뀌면 onChange.
export default function PixelCanvas({
  W, H, cells, tool, color, mirror, maxPx, onChange, onBeforeEdit, onPick, testId,
}: {
  W: number;
  H: number;
  cells: Cells;
  tool: PixelTool;
  color: string;
  mirror: boolean;
  maxPx: number;
  onChange: (cells: Cells) => void;
  onBeforeEdit: () => void;
  onPick: (color: string) => void;
  testId?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const cell = Math.max(4, Math.floor(maxPx / Math.max(W, H)));
  const hover = useRef<{ x: number; y: number } | null>(null);
  const drawing = useRef(false);
  const work = useRef<Cells>(cells);
  useEffect(() => {
    work.current = cells;
  }, [cells]);

  const draw = useCallback(() => {
    const cv = ref.current;
    const c = cv?.getContext('2d');
    if (!cv || !c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== W * cell * dpr) {
      cv.width = W * cell * dpr;
      cv.height = H * cell * dpr;
      cv.style.width = W * cell + 'px';
      cv.style.height = H * cell + 'px';
    }
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const v = work.current[y * W + x];
        c.fillStyle = v ?? ((x + y) % 2 ? '#2f3561' : '#2a2f58');
        c.fillRect(x * cell, y * cell, cell, cell);
      }
    }
    c.strokeStyle = 'rgba(255,255,255,.05)';
    c.lineWidth = 1;
    c.beginPath();
    for (let i = 1; i < W; i++) { c.moveTo(i * cell + 0.5, 0); c.lineTo(i * cell + 0.5, H * cell); }
    for (let i = 1; i < H; i++) { c.moveTo(0, i * cell + 0.5); c.lineTo(W * cell, i * cell + 0.5); }
    c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.18)';
    c.beginPath();
    for (let i = 32; i < W; i += 32) { c.moveTo(i * cell + 0.5, 0); c.lineTo(i * cell + 0.5, H * cell); }
    for (let i = 32; i < H; i += 32) { c.moveTo(0, i * cell + 0.5); c.lineTo(W * cell, i * cell + 0.5); }
    c.stroke();
    if (mirror) {
      c.strokeStyle = 'rgba(63,220,170,.5)';
      c.setLineDash([4, 4]);
      c.beginPath();
      c.moveTo((W / 2) * cell, 0);
      c.lineTo((W / 2) * cell, H * cell);
      c.stroke();
      c.setLineDash([]);
    }
    const hv = hover.current;
    if (hv) {
      c.strokeStyle = '#fff';
      c.lineWidth = 2;
      c.strokeRect(hv.x * cell + 1, hv.y * cell + 1, cell - 2, cell - 2);
    }
  }, [W, H, cell, mirror]);

  useEffect(() => {
    draw();
  }, [draw, cells]);

  const at = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    const r = ev.currentTarget.getBoundingClientRect();
    const x = Math.floor(((ev.clientX - r.left) / r.width) * W);
    const y = Math.floor(((ev.clientY - r.top) / r.height) * H);
    return x >= 0 && y >= 0 && x < W && y < H ? { x, y } : null;
  };
  const paint = (p: { x: number; y: number }) => {
    const v = tool === 'eraser' ? null : color;
    const next = work.current.slice();
    let changed = false;
    const pts: [number, number][] = [[p.x, p.y]];
    if (mirror) pts.push([W - 1 - p.x, p.y]);
    for (const [x, y] of pts) {
      if (next[y * W + x] !== v) {
        next[y * W + x] = v;
        changed = true;
      }
    }
    if (changed) {
      work.current = next;
      onChange(next);
    }
  };
  const fill = (p: { x: number; y: number }) => {
    const next = work.current.slice();
    const target = next[p.y * W + p.x];
    if (target === color) return;
    const stack: [number, number][] = [[p.x, p.y]];
    const seen = new Set<number>();
    while (stack.length) {
      const [x, y] = stack.pop() as [number, number];
      const k = y * W + x;
      if (x < 0 || y < 0 || x >= W || y >= H || seen.has(k) || next[k] !== target) continue;
      seen.add(k);
      next[k] = color;
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    work.current = next;
    onChange(next);
  };

  return (
    <canvas
      ref={ref}
      className="editor"
      data-testid={testId}
      onPointerDown={(ev) => {
        const p = at(ev);
        if (!p) return;
        ev.currentTarget.setPointerCapture(ev.pointerId);
        if (tool === 'picker') {
          const v = work.current[p.y * W + p.x];
          if (v) onPick(v);
          return;
        }
        onBeforeEdit();
        if (tool === 'fill') return fill(p);
        drawing.current = true;
        paint(p);
      }}
      onPointerMove={(ev) => {
        hover.current = at(ev);
        if (drawing.current && hover.current) paint(hover.current);
        else draw();
      }}
      onPointerUp={() => (drawing.current = false)}
      onPointerCancel={() => (drawing.current = false)}
      onPointerLeave={() => {
        hover.current = null;
        draw();
      }}
    />
  );
}
