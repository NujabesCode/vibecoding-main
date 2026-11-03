import { useEffect, useRef, useState } from 'react';
import { api, type Me } from '../api';
import { buildPal } from '../engine/color';
import { newDesign, parseDesign } from '../engine/design';
import { TS } from '../engine/items';
import { buildFrames, FH, FW, type Face, type Frames } from '../engine/sprite';
import { buildAssetLibrary, collisionGrid, parseMap, renderBackground, sortedObjects, type MapData } from '../engine/world';
import { useItems } from '../hooks';
import { connectWorld, type PlayerView, type WorldConnection, type WorldEvent } from '../ws';

const EMOTES = ['👋', '👏', '❤️', '😂', '🔥', '🎉'];
const SPEED = 120; // 픽셀/초
const NEAR = 8 * TS; // 이 거리 안에 있는 사람 말만 들린다

interface Avatar {
  id: number;
  nickname: string;
  x: number; // 화면에 그리는 위치 (부드럽게 따라감)
  y: number;
  tx: number; // 서버에서 받은 목표 위치
  ty: number;
  face: Face;
  moving: boolean;
  walk: number;
  bubble: { text: string; until: number } | null;
  emote: { e: string; at: number } | null;
}

interface ChatLine {
  key: number;
  name: string;
  text: string;
  mine: boolean;
}

export default function World({ me, mapId, onBack }: { me: Me; mapId: number; onBack: () => void }) {
  const { items } = useItems();
  const [map, setMap] = useState<MapData | null>(null);
  const [mapName, setMapName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [people, setPeople] = useState<{ id: number; nickname: string; x: number; y: number }[]>([]);
  const [chatLog, setChatLog] = useState<ChatLine[]>([]);
  const [text, setText] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const connRef = useRef<WorldConnection | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // 게임 루프 안의 "내 캐릭터"에게 말풍선/이모트를 띄우는 함수 (아래 useEffect가 채운다)
  const sayRef = useRef<(t: string) => void>(() => undefined);
  const emoteRef = useRef<(e: string) => void>(() => undefined);

  useEffect(() => {
    let alive = true;
    api.getMap(mapId)
      .then((d) => {
        if (!alive) return;
        const m = parseMap(d.data);
        if (!m) return setError('맵 데이터가 깨져 있어요');
        setMap(m);
        setMapName(d.name);
      })
      .catch(() => alive && setError('맵을 불러오지 못했어요'));
    return () => {
      alive = false;
    };
  }, [mapId]);

  useEffect(() => {
    if (!map || !items) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const lib = buildAssetLibrary(items);
    const bg = renderBackground(map, lib);
    const objects = sortedObjects(map, lib);
    const grid = collisionGrid(map, lib);
    const blocked = (px: number, py: number) => {
      const tx = Math.floor(px / TS);
      const ty = Math.floor(py / TS);
      return tx < 0 || ty < 0 || tx >= map.w || ty >= map.h || grid[ty * map.w + tx] === 1;
    };
    const free = (x: number, y: number) => !blocked(x - 7, y - 4) && !blocked(x + 7, y - 4) && !blocked(x - 7, y + 2) && !blocked(x + 7, y + 2);

    // 캐릭터 그림 (사람마다 한 번만 만든다)
    const defaultFrames = (() => { const d = newDesign(); return buildFrames(d.layers, buildPal(d.palette)); })();
    const frames = new Map<number, Frames>();
    const loading = new Set<number>();
    const framesOf = (id: number) => {
      const f = frames.get(id);
      if (f) return f;
      if (!loading.has(id)) {
        loading.add(id);
        api.getCharacter(id).then((c) => {
          const d = c ? parseDesign(c.design) : null;
          if (d) frames.set(id, buildFrames(d.layers, buildPal(d.palette)));
        }).catch(() => undefined);
      }
      return defaultFrames;
    };

    const start = { x: map.spawn.x * TS + TS / 2, y: map.spawn.y * TS + TS / 2 + 6 };
    const self: Avatar = { id: me.id, nickname: me.nickname, x: start.x, y: start.y, tx: start.x, ty: start.y, face: 'down', moving: false, walk: 0, bubble: null, emote: null };
    const others = new Map<number, Avatar>();
    let path: { x: number; y: number }[] = [];
    const keys = new Set<string>();
    let lineKey = 0;

    const syncPeople = () => setPeople([self, ...others.values()].map((a) => ({ id: a.id, nickname: a.nickname, x: Math.round(a.tx), y: Math.round(a.ty) })));
    const addLine = (a: Avatar, text: string) => {
      const mine = a === self;
      if (!mine && Math.hypot(a.x - self.x, a.y - self.y) > NEAR) return;
      setChatLog((l) => [...l.slice(-5), { key: lineKey++, name: a.nickname, text, mine }]);
    };
    const upsert = (p: PlayerView) => {
      if (p.id === me.id) return;
      const a = others.get(p.id);
      if (a) {
        Object.assign(a, { tx: p.x, ty: p.y, face: p.face, moving: p.moving, nickname: p.nickname });
      } else {
        others.set(p.id, { id: p.id, nickname: p.nickname, x: p.x, y: p.y, tx: p.x, ty: p.y, face: p.face, moving: p.moving, walk: 0, bubble: null, emote: null });
      }
    };

    const onEvent = (e: WorldEvent) => {
      if (e.type === 'join') { upsert(e.player); syncPeople(); return; }
      if (e.type === 'leave') { others.delete(e.id); syncPeople(); return; }
      const a = e.id === me.id ? self : others.get(e.id);
      if (!a) return;
      if (e.type === 'move' && a !== self) { Object.assign(a, { tx: e.x, ty: e.y, face: e.face, moving: e.moving }); syncPeople(); }
      if (e.type === 'chat' && a !== self) { a.bubble = { text: e.text, until: performance.now() + 4500 }; addLine(a, e.text); }
      if (e.type === 'emote' && a !== self) a.emote = { e: e.emote, at: performance.now() };
    };

    const conn = connectWorld({
      mapId,
      token: me.token,
      start,
      onEvent,
      onSnapshot: (list) => { list.forEach(upsert); syncPeople(); },
      onStatus: setConnected,
    });
    connRef.current = conn;
    sayRef.current = (t) => {
      self.bubble = { text: t, until: performance.now() + 4500 };
      addLine(self, t);
    };
    emoteRef.current = (e) => {
      self.emote = { e, at: performance.now() };
    };
    syncPeople();

    // 클릭한 칸까지 길 찾기 (BFS)
    const findPath = (gx: number, gy: number) => {
      const sx = Math.floor(self.x / TS);
      const sy = Math.floor(self.y / TS);
      if (gx < 0 || gy < 0 || gx >= map.w || gy >= map.h || grid[gy * map.w + gx]) return [];
      const prev = new Int32Array(map.w * map.h).fill(-1);
      const q = [sy * map.w + sx];
      prev[q[0]] = q[0];
      for (let h = 0; h < q.length; h++) {
        const cur = q[h];
        if (cur === gy * map.w + gx) break;
        const cx = cur % map.w;
        const cy = Math.floor(cur / map.w);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx;
          const ny = cy + dy;
          const n = ny * map.w + nx;
          if (nx < 0 || ny < 0 || nx >= map.w || ny >= map.h || prev[n] !== -1 || grid[n]) continue;
          prev[n] = cur;
          q.push(n);
        }
      }
      const goal = gy * map.w + gx;
      if (prev[goal] === -1) return [];
      const out: { x: number; y: number }[] = [];
      for (let c = goal; c !== prev[c]; c = prev[c]) out.push({ x: (c % map.w) * TS + TS / 2, y: Math.floor(c / map.w) * TS + TS / 2 + 6 });
      return out.reverse();
    };

    let scale = 2;
    let cam = { x: self.x, y: self.y };
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      scale = (window.innerWidth >= 900 ? 2 : 1.5) * dpr;
    };
    resize();

    let lastSent = 0;
    let sentState = '';
    let lastT = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - lastT) / 1000);
      lastT = now;
      // 내 이동
      let dx = 0;
      let dy = 0;
      if (keys.has('arrowleft') || keys.has('a')) dx -= 1;
      if (keys.has('arrowright') || keys.has('d')) dx += 1;
      if (keys.has('arrowup') || keys.has('w')) dy -= 1;
      if (keys.has('arrowdown') || keys.has('s')) dy += 1;
      if (!dx && !dy && path.length) {
        const p = path[0];
        const ddx = p.x - self.x;
        const ddy = p.y - self.y;
        const d = Math.hypot(ddx, ddy);
        if (d < 3) path.shift();
        else { dx = ddx / d; dy = ddy / d; }
      }
      if (dx || dy) {
        const l = Math.hypot(dx, dy);
        const sx = (dx / l) * SPEED * dt;
        const sy = (dy / l) * SPEED * dt;
        let moved = false;
        if (free(self.x + sx, self.y)) { self.x += sx; moved = true; }
        if (free(self.x, self.y + sy)) { self.y += sy; moved = true; }
        if (!moved) path = [];
        self.face = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down';
        self.moving = moved;
      } else self.moving = false;
      if (self.moving) self.walk += dt;
      self.tx = self.x;
      self.ty = self.y;
      // 서버로 보내기: 0.1초마다, 바뀌었을 때만
      const state = `${Math.round(self.x)},${Math.round(self.y)},${self.face},${self.moving}`;
      if (state !== sentState && now - lastSent > 100) {
        conn.move(self.x, self.y, self.face, self.moving);
        sentState = state;
        lastSent = now;
        syncPeople();
      }
      // 다른 사람: 목표 위치로 부드럽게
      for (const a of others.values()) {
        const k = Math.min(1, dt * 12);
        a.x += (a.tx - a.x) * k;
        a.y += (a.ty - a.y) * k;
        if (a.moving || Math.hypot(a.tx - a.x, a.ty - a.y) > 1) a.walk += dt;
      }

      // 카메라
      const vw = canvas.width / scale;
      const vh = canvas.height / scale;
      cam.x += (self.x - cam.x) * Math.min(1, dt * 8);
      cam.y += (self.y - 16 - cam.y) * Math.min(1, dt * 8);
      const mw = map.w * TS;
      const mh = map.h * TS;
      const cx = mw <= vw ? mw / 2 : Math.max(vw / 2, Math.min(mw - vw / 2, cam.x));
      const cy = mh <= vh ? mh / 2 : Math.max(vh / 2, Math.min(mh - vh / 2, cam.y));
      const ox = vw / 2 - cx;
      const oy = vh / 2 - cy;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#14162b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(scale, 0, 0, scale, Math.round(ox * scale), Math.round(oy * scale));
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(bg, 0, 0);

      // 가구와 사람을 아래쪽 끝 순서대로
      const avatars = [self, ...others.values()];
      const drawables: { key: number; draw: () => void }[] = [];
      for (const { o, a } of objects) drawables.push({ key: (o.y + a.h) * TS - 1, draw: () => ctx.drawImage(a.canvas, o.x * TS, o.y * TS) });
      for (const a of avatars) {
        drawables.push({
          key: a.y,
          draw: () => {
            const f = framesOf(a.id);
            const moving = a === self ? a.moving : a.moving || Math.hypot(a.tx - a.x, a.ty - a.y) > 1;
            const img = f[a.face][moving ? Math.floor(a.walk * 8) % 4 : 0];
            ctx.fillStyle = 'rgba(20,10,30,.25)';
            ctx.beginPath();
            ctx.ellipse(a.x, a.y, 8, 3, 0, 0, 7);
            ctx.fill();
            ctx.drawImage(img, Math.round(a.x - FW / 2), Math.round(a.y - 46), FW, FH);
          },
        });
      }
      drawables.sort((p, q) => p.key - q.key).forEach((d) => d.draw());

      // 이름표, 말풍선, 이모트 (화면 좌표로 선명하게)
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      for (const a of avatars) {
        const sx = (a.x + ox) * scale;
        const sy = (a.y - 46 + oy) * scale;
        const fs = 12 * dpr;
        ctx.font = `700 ${fs}px "Noto Sans KR", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const tw = ctx.measureText(a.nickname).width + 14 * dpr;
        const th = fs + 8 * dpr;
        ctx.fillStyle = a === self ? 'rgba(63,220,170,.95)' : 'rgba(20,22,44,.75)';
        ctx.beginPath();
        ctx.roundRect(sx - tw / 2, sy - th - 4 * dpr, tw, th, th / 2);
        ctx.fill();
        ctx.fillStyle = a === self ? '#0f2a22' : '#fff';
        ctx.fillText(a.nickname, sx, sy - th / 2 - 4 * dpr + 1);
        if (a.bubble && a.bubble.until > now) {
          const dist = Math.hypot(a.x - self.x, a.y - self.y);
          const alpha = a === self ? 1 : Math.max(0, Math.min(1, (NEAR - dist) / (NEAR / 2)));
          if (alpha > 0.02) {
            ctx.globalAlpha = alpha * Math.min(1, (a.bubble.until - now) / 400);
            ctx.font = `500 ${13 * dpr}px "Noto Sans KR", sans-serif`;
            const bw = Math.min(ctx.measureText(a.bubble.text).width, 220 * dpr) + 20 * dpr;
            const bh = 26 * dpr;
            const by = sy - th - bh - 12 * dpr;
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.roundRect(sx - bw / 2, by, bw, bh, 10 * dpr);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(sx - 6 * dpr, by + bh - 1);
            ctx.lineTo(sx, by + bh + 6 * dpr);
            ctx.lineTo(sx + 6 * dpr, by + bh - 1);
            ctx.fill();
            ctx.fillStyle = '#1e2436';
            ctx.fillText(a.bubble.text, sx, by + bh / 2 + 1, 220 * dpr);
            ctx.globalAlpha = 1;
          }
        }
        if (a.emote) {
          const t = (now - a.emote.at) / 1000;
          if (t > 1.8) a.emote = null;
          else {
            ctx.globalAlpha = Math.max(0, Math.min(1, 1.8 - t));
            ctx.font = `${28 * dpr}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
            ctx.fillText(a.emote.e, sx + 20 * dpr, sy - 40 * dpr - t * 30 * dpr);
            ctx.globalAlpha = 1;
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const typing = (t: EventTarget | null) => t instanceof HTMLInputElement;
    const onDown = (ev: KeyboardEvent) => {
      if (typing(ev.target)) {
        if (ev.key === 'Escape') (ev.target as HTMLInputElement).blur();
        return;
      }
      const k = ev.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(k)) {
        keys.add(k);
        path = [];
        ev.preventDefault();
      } else if (ev.key === 'Enter') {
        inputRef.current?.focus();
        ev.preventDefault();
      } else if (/^[1-6]$/.test(ev.key)) {
        const e = EMOTES[Number(ev.key) - 1];
        self.emote = { e, at: performance.now() };
        conn.emote(e);
      }
    };
    const onUp = (ev: KeyboardEvent) => keys.delete(ev.key.toLowerCase());
    const onBlur = () => keys.clear();
    const onClick = (ev: PointerEvent) => {
      const vw = canvas.width / scale;
      const vh = canvas.height / scale;
      const mw = map.w * TS;
      const mh = map.h * TS;
      const cx = mw <= vw ? mw / 2 : Math.max(vw / 2, Math.min(mw - vw / 2, cam.x));
      const cy = mh <= vh ? mh / 2 : Math.max(vh / 2, Math.min(mh - vh / 2, cam.y));
      const r = canvas.getBoundingClientRect();
      const px = ((ev.clientX - r.left) / r.width) * canvas.width;
      const py = ((ev.clientY - r.top) / r.height) * canvas.height;
      const wx = px / scale - (vw / 2 - cx);
      const wy = py / scale - (vh / 2 - cy);
      path = findPath(Math.floor(wx / TS), Math.floor(wy / TS));
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', onBlur);
    window.addEventListener('resize', resize);
    canvas.addEventListener('pointerdown', onClick);
    cam = { x: self.x, y: self.y };
    return () => {
      cancelAnimationFrame(raf);
      conn.close();
      connRef.current = null;
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('pointerdown', onClick);
    };
  }, [map, items, mapId, me.id, me.nickname, me.token]);

  const sendChat = (e: React.FormEvent) => {
    e.preventDefault();
    const t = text.trim().slice(0, 80);
    if (!t) return;
    connRef.current?.chat(t);
    sayRef.current(t);
    setText('');
    inputRef.current?.blur();
  };
  const sendEmote = (em: string) => {
    connRef.current?.emote(em);
    emoteRef.current(em);
  };

  return (
    <div className="world">
      <canvas ref={canvasRef} className="world-canvas" data-testid="world-canvas" />
      <div className="hud-top">
        <button className="btn" type="button" onClick={onBack}>← 나가기</button>
        <div className="hud-title">
          <b>{mapName || '불러오는 중…'}</b>
          <span className={connected ? 'online' : 'offline'}>{connected ? `● ${people.length}명 접속` : '● 연결 중…'}</span>
        </div>
      </div>
      {error && <div className="hud-error">{error}</div>}
      <aside className="hud-people">
        <h2>지금 여기 있는 사람</h2>
        <ul data-testid="presence">
          {people.map((p) => (
            <li key={p.id} data-id={p.id} data-x={p.x} data-y={p.y} className={p.id === me.id ? 'me' : ''}>{p.nickname}</li>
          ))}
        </ul>
      </aside>
      <div className="hud-chat" data-testid="chat-log" aria-live="polite">
        {chatLog.map((l) => (
          <div key={l.key} className={'chatline' + (l.mine ? ' mine' : '')}><b>{l.name}</b>{l.text}</div>
        ))}
      </div>
      <form className="hud-dock" onSubmit={sendChat}>
        <input ref={inputRef} data-testid="chat-input" value={text} maxLength={80} onChange={(e) => setText(e.target.value)} placeholder="근처 사람에게 말하기 (Enter)" />
        {EMOTES.map((em, i) => (
          <button key={em} type="button" className="emote-btn" title={`${i + 1}`} onClick={() => sendEmote(em)}>{em}</button>
        ))}
      </form>
      <div className="hud-keys"><kbd>←↑↓→</kbd> 걷기 · 바닥 클릭 이동 · <kbd>Enter</kbd> 채팅 · <kbd>1</kbd>~<kbd>6</kbd> 이모트</div>
    </div>
  );
}
