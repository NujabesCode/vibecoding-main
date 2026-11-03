import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, ApiError, type PlayerDto } from '../api';
import RoomPreview from '../components/RoomPreview';
import { ACCENT, BOTTOM, buildPal, HAIR, resolveColor, SHOES, SKIN, TOP, type PaletteSel } from '../engine/color';
import { cloneDesign, newDesign, parseDesign, randomDesign, serializeDesign, type Design } from '../engine/design';
import { ACCS, BOTTOMS, EYES, HAIRS, replacePart, TOPS, type Parts } from '../engine/parts';
import { blankLayer, buildFrames, compose, drawSheet, FH, FW, inBounds, LAYERS, ORDER, pixelsToCanvas, type Dir, type Frames, type LayerName } from '../engine/sprite';

type Tool = 'pen' | 'eraser' | 'fill' | 'picker';

const LAYER_NAME: Record<LayerName, string | Record<Dir, string>> = {
  acc: '액세서리', hair: '머리카락', face: '얼굴', head: '머리(피부)', body: '몸통',
  arm1: { down: '왼팔', up: '왼팔', side: '앞팔' }, arm2: { down: '오른팔', up: '오른팔', side: '뒷팔' },
  leg1: { down: '왼다리', up: '왼다리', side: '앞다리' }, leg2: { down: '오른다리', up: '오른다리', side: '뒷다리' },
};
const LAYER_ROLE: Record<LayerName, string> = { acc: 'a0', hair: 'h0', face: 'e', head: 's0', body: 't0', arm1: 't0', arm2: 't0', leg1: 'b0', leg2: 'o0' };
const SWATCHES = ['s2', 's0', 's1', 'h2', 'h0', 'h1', 'h3', 't2', 't0', 't1', 'b0', 'b1', 'o0', 'o3', 'a0', 'a1', 'e', 'w', 'p', 'm', 'k'];
const PART_TABS: [keyof Parts, string, [string, string][], number][] = [
  ['hair', '헤어', HAIRS, 0], ['eyes', '눈', EYES, 2], ['top', '상의', TOPS, 20], ['bottom', '하의', BOTTOMS, 20], ['acc', '소품', ACCS, 0],
];
const PALETTES: [keyof PaletteSel, string, string[]][] = [
  ['skin', '피부톤', SKIN], ['hair', '머리색', HAIR], ['top', '상의', TOP], ['bottom', '하의', BOTTOM], ['shoes', '신발', SHOES], ['accent', '포인트 색 (넥타이 · 소품)', ACCENT],
];
const lname = (l: LayerName, dir: Dir) => {
  const n = LAYER_NAME[l];
  return typeof n === 'string' ? n : n[dir];
};

export default function Studio({ me, onDone }: { me: PlayerDto; onDone: () => void }) {
  const design = useRef<Design>(newDesign());
  const [ver, setVer] = useState(0);
  const touch = useCallback(() => setVer((v) => v + 1), []);
  const [loaded, setLoaded] = useState(false);
  const [dir, setDir] = useState<Dir>('down');
  const [layer, setLayer] = useState<LayerName>('hair');
  const [tool, setTool] = useState<Tool>('pen');
  const [mirror, setMirror] = useState(true);
  const [brush, setBrush] = useState('h0');
  const [focus, setFocus] = useState(true);
  const [tab, setTab] = useState<keyof Parts>('hair');
  const [toast, setToast] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const undoStack = useRef<string[]>([]);
  const redoStack = useRef<string[]>([]);
  const framesRef = useRef<Frames | null>(null);
  const editorRef = useRef<HTMLCanvasElement>(null);
  const sheetRef = useRef<HTMLCanvasElement>(null);
  const walkRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const hover = useRef<{ x: number; y: number } | null>(null);
  const cell = useRef(11);
  const stroke = useRef(false);

  const pal = buildPal(design.current.palette);

  const showToast = useCallback((t: string) => {
    setToast(t);
    window.setTimeout(() => setToast((cur) => (cur === t ? null : cur)), 2600);
  }, []);

  // 처음 들어오면 서버에 저장된 내 캐릭터를 불러온다
  useEffect(() => {
    let alive = true;
    api
      .getCharacter(me.id)
      .then((c) => {
        if (!alive) return;
        const d = c ? parseDesign(c.design) : null;
        if (d) design.current = d;
        setLoaded(true);
        touch();
      })
      .catch(() => {
        if (alive) {
          setLoaded(true);
          showToast('저장된 캐릭터를 불러오지 못했어요. 새로 만들어 볼까요?');
        }
      });
    return () => {
      alive = false;
    };
  }, [me.id, touch, showToast]);

  const pushUndo = () => {
    undoStack.current.push(serializeDesign(design.current));
    if (undoStack.current.length > 60) undoStack.current.shift();
    redoStack.current = [];
  };
  const doUndo = useCallback(() => {
    const s = undoStack.current.pop();
    if (!s) return;
    redoStack.current.push(serializeDesign(design.current));
    const d = parseDesign(s);
    if (d) design.current = d;
    touch();
  }, [touch]);
  const doRedo = useCallback(() => {
    const s = redoStack.current.pop();
    if (!s) return;
    undoStack.current.push(serializeDesign(design.current));
    const d = parseDesign(s);
    if (d) design.current = d;
    touch();
  }, [touch]);

  /* ---------- 에디터 그리기 ---------- */
  const drawEditor = useCallback(() => {
    const cv = editorRef.current;
    const c = cv?.getContext('2d');
    if (!cv || !c) return;
    const p = buildPal(design.current.palette);
    const s = cell.current;
    const w = s * FW;
    const h = s * FH;
    for (let y = 0; y < FH; y++) {
      for (let x = 0; x < FW; x++) {
        c.fillStyle = (x + y) % 2 ? '#2f3561' : '#2a2f58';
        c.fillRect(x * s, y * s, s, s);
      }
    }
    for (const ln of ORDER[dir]) {
      const L = design.current.layers[dir][ln];
      c.globalAlpha = focus && ln !== layer ? 0.42 : 1;
      for (let i = 0; i < L.length; i++) {
        const v = L[i];
        if (!v) continue;
        c.fillStyle = resolveColor(v, p);
        c.fillRect((i % FW) * s, Math.floor(i / FW) * s, s, s);
      }
    }
    c.globalAlpha = 1;
    c.strokeStyle = 'rgba(255,255,255,.05)';
    c.lineWidth = 1;
    c.beginPath();
    for (let i = 1; i < FW; i++) { c.moveTo(i * s + 0.5, 0); c.lineTo(i * s + 0.5, h); }
    for (let i = 1; i < FH; i++) { c.moveTo(0, i * s + 0.5); c.lineTo(w, i * s + 0.5); }
    c.stroke();
    if (mirror && dir !== 'side') {
      c.strokeStyle = 'rgba(63,220,170,.5)';
      c.setLineDash([4, 4]);
      c.beginPath();
      c.moveTo(16 * s, 0);
      c.lineTo(16 * s, h);
      c.stroke();
      c.setLineDash([]);
    }
    c.strokeStyle = 'rgba(255,207,74,.35)';
    c.beginPath();
    c.moveTo(0, 47 * s - 0.5);
    c.lineTo(w, 47 * s - 0.5);
    c.stroke();
    const hv = hover.current;
    if (hv) {
      c.strokeStyle = '#fff';
      c.lineWidth = 2;
      c.strokeRect(hv.x * s + 1, hv.y * s + 1, s - 2, s - 2);
      if (mirror && dir !== 'side') {
        c.strokeStyle = 'rgba(255,255,255,.4)';
        c.strokeRect((FW - 1 - hv.x) * s + 1, hv.y * s + 1, s - 2, s - 2);
      }
    }
  }, [dir, layer, focus, mirror]);

  const sizeEditor = useCallback(() => {
    const cv = editorRef.current;
    const host = cv?.parentElement;
    if (!cv || !host) return;
    const avail = Math.min(352, host.clientWidth - 56);
    cell.current = Math.max(6, Math.floor(avail / FW));
    const w = cell.current * FW;
    const h = cell.current * FH;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = w * dpr;
    cv.height = h * dpr;
    cv.style.width = w + 'px';
    cv.style.height = h + 'px';
    cv.getContext('2d')?.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawEditor();
  }, [drawEditor]);

  useEffect(() => {
    sizeEditor();
    window.addEventListener('resize', sizeEditor);
    return () => window.removeEventListener('resize', sizeEditor);
  }, [sizeEditor]);

  useEffect(() => {
    drawEditor();
  }, [drawEditor, ver]);

  // 디자인이 바뀌면 걷기 프레임과 스프라이트 시트를 다시 만든다
  useEffect(() => {
    framesRef.current = buildFrames(design.current.layers, buildPal(design.current.palette));
    const sc = sheetRef.current?.getContext('2d');
    if (sc) drawSheet(sc, framesRef.current);
  }, [ver]);

  // 걷기 미리보기 4개
  useEffect(() => {
    let raf = 0;
    const faces = ['down', 'left', 'right', 'up'] as const;
    const tick = (now: number) => {
      const fr = framesRef.current;
      const i = Math.floor(now / 125) % 4;
      if (fr) {
        walkRefs.current.forEach((cv, k) => {
          const c = cv?.getContext('2d');
          if (!c) return;
          c.clearRect(0, 0, FW, FH);
          c.drawImage(fr[faces[k]][i], 0, 0);
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  /* ---------- 그리기 동작 ---------- */
  const cellAt = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    const r = ev.currentTarget.getBoundingClientRect();
    const x = Math.floor(((ev.clientX - r.left) / r.width) * FW);
    const y = Math.floor(((ev.clientY - r.top) / r.height) * FH);
    return inBounds(x, y) ? { x, y } : null;
  };
  const paint = (p: { x: number; y: number }) => {
    const L = design.current.layers[dir][layer];
    const v = tool === 'eraser' ? null : brush;
    const list: [number, number][] = [[p.x, p.y]];
    if (mirror && dir !== 'side') list.push([FW - 1 - p.x, p.y]);
    let changed = false;
    for (const [x, y] of list) {
      if (L[y * FW + x] !== v) {
        L[y * FW + x] = v;
        changed = true;
      }
    }
    if (changed) touch();
  };
  const flood = (p: { x: number; y: number }) => {
    const L = design.current.layers[dir][layer];
    const target = L[p.y * FW + p.x];
    if (target === brush) return;
    const stack: [number, number][] = [[p.x, p.y]];
    const seen = new Set<number>();
    while (stack.length) {
      const [x, y] = stack.pop() as [number, number];
      const k = y * FW + x;
      if (!inBounds(x, y) || seen.has(k) || L[k] !== target) continue;
      seen.add(k);
      L[k] = brush;
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    touch();
  };
  const pick = (p: { x: number; y: number }) => {
    for (const ln of ORDER[dir].slice().reverse()) {
      const v = design.current.layers[dir][ln][p.y * FW + p.x];
      if (v) {
        setLayer(ln);
        setBrush(v);
        setTool('pen');
        return;
      }
    }
  };
  const onPointerDown = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    const p = cellAt(ev);
    if (!p) return;
    ev.currentTarget.setPointerCapture(ev.pointerId);
    if (tool === 'picker') return pick(p);
    pushUndo();
    if (tool === 'fill') return flood(p);
    stroke.current = true;
    paint(p);
  };
  const onPointerMove = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    const p = cellAt(ev);
    hover.current = p;
    if (stroke.current && p) paint(p);
    else drawEditor();
  };
  const endStroke = () => {
    stroke.current = false;
  };

  /* ---------- 키보드 ---------- */
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.target instanceof HTMLInputElement) return;
      const k = ev.key.toLowerCase();
      if ((ev.ctrlKey || ev.metaKey) && k === 'z') {
        ev.preventDefault();
        if (ev.shiftKey) doRedo();
        else doUndo();
        return;
      }
      if ((ev.ctrlKey || ev.metaKey) && k === 'y') {
        ev.preventDefault();
        doRedo();
        return;
      }
      if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
      if (k === 'b') setTool('pen');
      else if (k === 'e') setTool('eraser');
      else if (k === 'g') setTool('fill');
      else if (k === 'i') setTool('picker');
      else if (k === 'm') setMirror((m) => !m);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [doUndo, doRedo]);

  /* ---------- 파츠 / 색 ---------- */
  const setPart = (key: keyof Parts, value: string) => {
    pushUndo();
    const d = design.current;
    d.parts = { ...d.parts, [key]: value } as Parts;
    replacePart(d.layers, d.parts, key);
    touch();
  };
  const setPalette = (key: keyof PaletteSel, i: number) => {
    pushUndo();
    design.current.palette = { ...design.current.palette, [key]: i };
    touch();
  };
  const randomize = () => {
    pushUndo();
    design.current = randomDesign();
    touch();
  };
  const clearLayer = () => {
    pushUndo();
    design.current.layers[dir][layer] = blankLayer();
    touch();
    showToast(`${lname(layer, dir)} 레이어를 비웠어요. 되돌리기로 살릴 수 있어요`);
  };

  const thumbs = useMemo(() => {
    const t = PART_TABS.find((x) => x[0] === tab);
    if (!t) return [];
    const [key, , list, crop] = t;
    void ver;
    return list.map(([value, label]) => {
      const d = cloneDesign(design.current);
      d.parts = { ...d.parts, [key]: value } as Parts;
      replacePart(d.layers, d.parts, key);
      const full = pixelsToCanvas(compose(d.layers, buildPal(d.palette), 'down', 0, true));
      const cv = document.createElement('canvas');
      cv.width = 32;
      cv.height = 28;
      cv.getContext('2d')?.drawImage(full, 0, crop, 32, 28, 0, 0, 32, 28);
      return { value, label, url: cv.toDataURL() };
    });
  }, [tab, ver]);

  const save = async () => {
    setSaving(true);
    try {
      await api.saveMyCharacter(serializeDesign(design.current));
      showToast('저장했어요! 우리반 친구들 목록에 바로 보여요');
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : '저장하지 못했어요. 서버가 켜져 있는지 확인해 주세요');
    } finally {
      setSaving(false);
    }
  };

  const d = design.current;
  return (
    <div className="wrap">
      <header className="top">
        <div className="brand">
          <button className="btn ghost" type="button" onClick={onDone}>← 로비</button>
          <div>
            <h1>우리반 <span>캐릭터 공방</span></h1>
            <p>파츠를 고르고, 원하는 만큼 직접 찍고, 바로 걸어보기</p>
          </div>
        </div>
        <div className="top-actions">
          <button className="btn" type="button" onClick={randomize}>🎲 랜덤</button>
          <button className="btn primary" type="button" onClick={save} disabled={saving || !loaded} data-testid="save-character">
            {saving ? '저장 중…' : '저장하기'}
          </button>
        </div>
      </header>

      <div className="studio-grid">
        <div className="stack">
          <section className="card">
            <h2>파츠 고르기</h2>
            <div className="tabs" role="tablist">
              {PART_TABS.map(([k, label]) => (
                <button key={k} type="button" aria-pressed={tab === k} onClick={() => setTab(k)}>{label}</button>
              ))}
            </div>
            <div className="parts">
              {thumbs.map((t) => (
                <button key={t.value} type="button" aria-pressed={d.parts[tab] === t.value} onClick={() => setPart(tab, t.value)} data-testid={`part-${tab}-${t.value}`}>
                  <img src={t.url} alt="" className="pixel" width={64} height={56} />
                  {t.label}
                </button>
              ))}
            </div>
          </section>
          <section className="card">
            <h2>색 고르기 · 그린 그림까지 한 번에 바뀌어요</h2>
            {PALETTES.map(([k, label, list]) => (
              <div key={k}>
                <div className="pal-label">{label}</div>
                <div className="pal-row">
                  {list.map((c, i) => (
                    <button key={c} type="button" title={label} style={{ background: c }} aria-pressed={d.palette[k] === i} onClick={() => setPalette(k, i)} />
                  ))}
                </div>
              </div>
            ))}
          </section>
        </div>

        <div className="stack">
          <section className="card">
            <div className="editor-head">
              <div className="seg">
                {(['down', 'side', 'up'] as Dir[]).map((v) => (
                  <button key={v} type="button" aria-pressed={dir === v} onClick={() => { setDir(v); if (v === 'up' && layer === 'face') setLayer('hair'); }}>
                    {v === 'down' ? '앞' : v === 'side' ? '옆' : '뒤'}
                  </button>
                ))}
              </div>
              <div className="now"><b>{lname(layer, dir)}</b>에 그리는 중</div>
            </div>
            <div className="editor-body">
              <canvas
                ref={editorRef}
                className="editor"
                data-testid="pixel-editor"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endStroke}
                onPointerCancel={endStroke}
                onPointerLeave={() => { hover.current = null; drawEditor(); }}
              />
              <div className="toolbar">
                {([['pen', '펜 (B)', 'M4 20l4-1 11-11-3-3L5 16z'], ['eraser', '지우개 (E)', 'M7 21h10M5 15l9-9 5 5-7 7H8z'], ['fill', '채우기 (G)', 'M5 11l7-7 7 7-7 7z'], ['picker', '스포이트 (I)', 'M14 4l6 6-2 2-6-6zM12 8l-8 8v4h4l8-8']] as [Tool, string, string][]).map(([t, title, path]) => (
                  <button key={t} className="tool" type="button" title={title} aria-pressed={tool === t} onClick={() => setTool(t)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={path} /></svg>
                  </button>
                ))}
                <button className="tool" type="button" title="좌우 대칭 (M)" aria-pressed={mirror} onClick={() => setMirror((m) => !m)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18M8 7L3 12l5 5zM16 7l5 5-5 5z" /></svg>
                </button>
                <button className="tool" type="button" title="되돌리기 (Ctrl+Z)" onClick={doUndo}>↶</button>
                <button className="tool" type="button" title="다시하기 (Ctrl+Y)" onClick={doRedo}>↷</button>
              </div>
            </div>
            <div className="walk-row">
              {['앞', '왼쪽', '오른쪽', '뒤'].map((label, k) => (
                <div className="walk" key={label}>
                  <canvas ref={(el) => { walkRefs.current[k] = el; }} width={FW} height={FH} className="pixel" />
                  {label}
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="stack studio-right">
          <section className="card room-card">
            <div className="room-head">
              <h2>미리 걸어보기 · 우리반 교실</h2>
              <span className="keys"><kbd>←↑↓→</kbd> <kbd>WASD</kbd> 또는 바닥 클릭</span>
            </div>
            <RoomPreview framesRef={framesRef} name={me.nickname} />
          </section>
          <div className="two">
            <section className="card">
              <h2>레이어 · 직접 그리기</h2>
              <ul className="layers">
                {LAYERS.filter((l) => !(dir === 'up' && l === 'face')).map((l) => (
                  <li key={l}>
                    <button type="button" aria-pressed={l === layer} onClick={() => { setLayer(l); if (brush[0] !== '#') setBrush(LAYER_ROLE[l]); }}>
                      <span className="sw" style={{ background: pal[LAYER_ROLE[l]] }} />
                      {lname(l, dir)}
                    </button>
                  </li>
                ))}
              </ul>
              <label className="check"><input type="checkbox" checked={focus} onChange={(e) => setFocus(e.target.checked)} /> 선택한 레이어만 진하게</label>
              <button className="btn small" type="button" onClick={clearLayer}>이 레이어 비우기</button>
              <h2 style={{ marginTop: 14 }}>물감</h2>
              <div className="swatches">
                {SWATCHES.map((code) => (
                  <button key={code} type="button" className="swatch" style={{ background: pal[code] }} aria-pressed={brush === code} onClick={() => { setBrush(code); if (tool !== 'fill') setTool('pen'); }} />
                ))}
              </div>
              <label className="custom">
                <input type="color" defaultValue="#7b7fff" onChange={(e) => { setBrush(e.target.value); if (tool !== 'fill') setTool('pen'); }} />
                <span>자유 색상</span>
              </label>
            </section>
            <section className="card">
              <h2>스프라이트 시트 · 서버에 저장되는 그림</h2>
              <div className="sheet-wrap">
                <canvas ref={sheetRef} width={FW * 4} height={FH * 4} className="sheet pixel" />
                <p className="sheet-note"><b>128×192 한 장</b>에 4방향 × 4프레임. 위에서부터 앞 · 왼쪽 · 오른쪽 · 뒤.</p>
              </div>
            </section>
          </div>
        </div>
      </div>
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
