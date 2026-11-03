import { useEffect, useRef, type RefObject } from 'react';
import { buildPal } from '../engine/color';
import { buildClassroom, isFree, RH, RW, T } from '../engine/classroom';
import { randomDesign } from '../engine/design';
import { buildFrames, FH, FW, type Face, type Frames } from '../engine/sprite';

interface Walker {
  name: string;
  x: number;
  y: number;
  face: Face;
  moving: boolean;
  t: number;
  path: { x: number; y: number } | null;
  wait: number;
  frames: Frames | null;
}

const NPC_NAMES = ['이서연', '박지호', '최수아'];
const MOVE_KEYS = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'];

// 공방 오른쪽 "미리 걸어보기". 내 캐릭터(framesRef)를 방향키나 클릭으로 걷게 한다.
export default function RoomPreview({ framesRef, name }: { framesRef: RefObject<Frames | null>; name: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nameRef = useRef(name);
  useEffect(() => {
    nameRef.current = name;
  }, [name]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { canvas: bg, blocks } = buildClassroom();
    const keys = new Set<string>();
    const me: Walker = { name: '', x: 6 * T, y: 7 * T + 8, face: 'down', moving: false, t: 0, path: null, wait: 0, frames: null };
    const npcs: Walker[] = NPC_NAMES.map((n) => {
      let x = 0;
      let y = 0;
      do {
        x = 10 + Math.random() * (RW * T - 20);
        y = 5 * T + Math.random() * 5 * T;
      } while (!isFree(blocks, x, y));
      const d = randomDesign();
      return { name: n, x, y, face: 'down', moving: false, t: 0, path: null, wait: Math.random() * 2, frames: buildFrames(d.layers, buildPal(d.palette)) };
    });

    let cs = 2;
    let rs = 3;
    const size = () => {
      const host = canvas.parentElement;
      const w = (host?.clientWidth ?? 600) - 28;
      cs = Math.max(1, Math.min(3, Math.floor(w / (RW * T * 1.5))));
      rs = cs * 1.5;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const W = Math.round(RW * T * rs);
      const H = Math.round(RH * T * rs);
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();

    const step = (e: Walker, dt: number, speed: number) => {
      let dx = 0;
      let dy = 0;
      if (e === me && keys.size) {
        if (keys.has('arrowleft') || keys.has('a')) dx -= 1;
        if (keys.has('arrowright') || keys.has('d')) dx += 1;
        if (keys.has('arrowup') || keys.has('w')) dy -= 1;
        if (keys.has('arrowdown') || keys.has('s')) dy += 1;
      } else if (e.path) {
        dx = e.path.x - e.x;
        dy = e.path.y - e.y;
        const d = Math.hypot(dx, dy);
        if (d < 1.5) {
          e.path = null;
          dx = 0;
          dy = 0;
        } else {
          dx /= d;
          dy /= d;
        }
      }
      if (!dx && !dy) {
        e.moving = false;
        return;
      }
      const l = Math.hypot(dx, dy);
      const sx = (dx / l) * speed * dt;
      const sy = (dy / l) * speed * dt;
      let moved = false;
      if (isFree(blocks, e.x + sx, e.y)) { e.x += sx; moved = true; }
      if (isFree(blocks, e.x, e.y + sy)) { e.y += sy; moved = true; }
      if (!moved && e.path) e.path = null;
      e.face = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down';
      e.moving = moved;
      e.t += dt;
    };

    const draw = () => {
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bg, 0, 0, RW * T * rs, RH * T * rs);
      const all = [me, ...npcs].sort((a, b) => a.y - b.y);
      for (const e of all) {
        const fr = e === me ? framesRef.current : e.frames;
        if (!fr) continue;
        const img = fr[e.face][e.moving ? Math.floor(e.t * 8) % 4 : 0];
        ctx.fillStyle = 'rgba(30,20,40,.22)';
        ctx.beginPath();
        ctx.ellipse(e.x * rs, e.y * rs, 7 * cs, 2.4 * cs, 0, 0, 7);
        ctx.fill();
        ctx.drawImage(img, Math.round(e.x * rs - 16 * cs), Math.round(e.y * rs - 46 * cs), FW * cs, FH * cs);
      }
      for (const e of all) {
        const label = e === me ? nameRef.current : e.name;
        const fs = cs >= 2 ? 12 : 10;
        ctx.font = `700 ${fs}px "Noto Sans KR", sans-serif`;
        const w = ctx.measureText(label).width + 14;
        const h = fs + 7;
        const x = e.x * rs;
        const y = e.y * rs - 44 * cs - 6;
        ctx.fillStyle = e === me ? 'rgba(63,220,170,.95)' : 'rgba(20,22,44,.72)';
        ctx.beginPath();
        ctx.roundRect(x - w / 2, y - h, w, h, h / 2);
        ctx.fill();
        ctx.fillStyle = e === me ? '#0f2a22' : '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x, y - h / 2 + 1);
      }
    };

    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      step(me, dt, 52);
      for (const n of npcs) {
        if (!n.path) {
          n.wait -= dt;
          n.moving = false;
          if (n.wait <= 0) {
            let x = 0;
            let y = 0;
            let k = 0;
            do {
              x = 10 + Math.random() * (RW * T - 20);
              y = 5 * T + Math.random() * 5 * T;
              k++;
            } while (!isFree(blocks, x, y) && k < 30);
            n.path = { x, y };
            n.wait = 1 + Math.random() * 3;
          }
        }
        step(n, dt, 32);
      }
      draw();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const isTyping = (t: EventTarget | null) => t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement;
    const onDown = (ev: KeyboardEvent) => {
      if (isTyping(ev.target) || ev.ctrlKey || ev.metaKey || ev.altKey) return;
      const k = ev.key.toLowerCase();
      if (MOVE_KEYS.includes(k)) {
        keys.add(k);
        me.path = null;
        ev.preventDefault();
      }
    };
    const onUp = (ev: KeyboardEvent) => keys.delete(ev.key.toLowerCase());
    const onBlur = () => keys.clear();
    const onClick = (ev: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      const x = ((ev.clientX - r.left) / r.width) * RW * T;
      const y = ((ev.clientY - r.top) / r.height) * RH * T;
      if (isFree(blocks, x, y)) me.path = { x, y };
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', onBlur);
    window.addEventListener('resize', size);
    canvas.addEventListener('pointerdown', onClick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('resize', size);
      canvas.removeEventListener('pointerdown', onClick);
    };
  }, [framesRef]);

  return <canvas ref={canvasRef} className="room-canvas" data-testid="room-preview" />;
}
