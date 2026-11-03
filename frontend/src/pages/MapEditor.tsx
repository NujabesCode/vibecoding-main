import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, ApiError, type Me } from '../api';
import { TS } from '../engine/items';
import {
  buildAssetLibrary, newMap, objectAt, parseMap, renderBackground, serializeMap, sortedObjects, type Asset, type AssetRef, type MapData,
} from '../engine/world';
import { useItems } from '../hooks';

type Tool = 'floor' | 'object' | 'wall' | 'erase' | 'spawn';

export default function MapEditor({ me, mapId, onBack }: {
  me: Me;
  mapId: number | null;
  onBack: () => void;
}) {
  // 새 맵을 처음 저장하면 번호가 생긴다. 화면은 그대로 두고 주소만 #edit/번호로 바꾼다.
  const [savedId, setSavedId] = useState<number | null>(mapId);
  const { items } = useItems();
  const lib = useMemo(() => buildAssetLibrary(items ?? []), [items]);
  const [map, setMap] = useState<MapData>(() => newMap());
  const [name, setName] = useState('우리반 교실');
  const [ownerId, setOwnerId] = useState<number>(me.id);
  const [loading, setLoading] = useState(mapId !== null);
  const [tool, setTool] = useState<Tool>('object');
  const [floorRef, setFloorRef] = useState<AssetRef>('t:tile');
  const [objectRef, setObjectRef] = useState<AssetRef>('t:desk');
  const [tab, setTab] = useState<'object' | 'floor'>('object');
  const [toast, setToast] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const undo = useRef<string[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hover = useRef<{ x: number; y: number } | null>(null);
  const painting = useRef(false);

  const showToast = useCallback((t: string) => {
    setToast(t);
    window.setTimeout(() => setToast((cur) => (cur === t ? null : cur)), 2600);
  }, []);

  useEffect(() => {
    if (mapId === null) return;
    let alive = true;
    api.getMap(mapId)
      .then((d) => {
        if (!alive) return;
        const m = parseMap(d.data);
        if (m) setMap(m);
        setName(d.name);
        setOwnerId(d.ownerId);
        setLoading(false);
      })
      .catch(() => alive && showToast('맵을 불러오지 못했어요'));
    return () => {
      alive = false;
    };
  }, [mapId, showToast]);

  const mine = ownerId === me.id;
  const bg = useMemo(() => renderBackground(map, lib), [map, lib]);
  const urls = useMemo(() => new Map([...lib].map(([k, a]) => [k, a.canvas.toDataURL()])), [lib]);

  const draw = useCallback(() => {
    const cv = canvasRef.current;
    const c = cv?.getContext('2d');
    if (!cv || !c) return;
    cv.width = map.w * TS;
    cv.height = map.h * TS;
    c.imageSmoothingEnabled = false;
    c.drawImage(bg, 0, 0);
    for (const { o, a } of sortedObjects(map, lib)) c.drawImage(a.canvas, o.x * TS, o.y * TS);
    // 격자
    c.strokeStyle = 'rgba(255,255,255,.08)';
    c.lineWidth = 1;
    c.beginPath();
    for (let x = 1; x < map.w; x++) { c.moveTo(x * TS + 0.5, 0); c.lineTo(x * TS + 0.5, map.h * TS); }
    for (let y = 1; y < map.h; y++) { c.moveTo(0, y * TS + 0.5); c.lineTo(map.w * TS, y * TS + 0.5); }
    c.stroke();
    // 시작 위치
    const s = map.spawn;
    c.fillStyle = 'rgba(63,220,170,.35)';
    c.fillRect(s.x * TS + 2, s.y * TS + 2, TS - 4, TS - 4);
    c.strokeStyle = '#3fdcaa';
    c.lineWidth = 2;
    c.strokeRect(s.x * TS + 2, s.y * TS + 2, TS - 4, TS - 4);
    c.fillStyle = '#0f2a22';
    c.font = '900 12px "Noto Sans KR", sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('시작', s.x * TS + TS / 2, s.y * TS + TS / 2 + 1);
    // 마우스 미리보기
    const hv = hover.current;
    if (hv) {
      let w = 1;
      let h = 1;
      const a = tool === 'object' ? lib.get(objectRef) : undefined;
      if (a) {
        w = a.w;
        h = a.h;
        c.globalAlpha = 0.6;
        c.drawImage(a.canvas, hv.x * TS, hv.y * TS);
        c.globalAlpha = 1;
      }
      c.strokeStyle = tool === 'erase' ? '#ff6b6b' : '#ffffff';
      c.lineWidth = 2;
      c.strokeRect(hv.x * TS + 1, hv.y * TS + 1, w * TS - 2, h * TS - 2);
    }
  }, [map, lib, bg, tool, objectRef]);

  useEffect(() => {
    draw();
  }, [draw]);

  const cellAt = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    const r = ev.currentTarget.getBoundingClientRect();
    const x = Math.floor(((ev.clientX - r.left) / r.width) * map.w);
    const y = Math.floor(((ev.clientY - r.top) / r.height) * map.h);
    return x >= 0 && y >= 0 && x < map.w && y < map.h ? { x, y } : null;
  };

  const apply = (p: { x: number; y: number }, first: boolean) => {
    const i = p.y * map.w + p.x;
    setMap((m) => {
      if (tool === 'floor') {
        if (m.floor[i] === floorRef) return m;
        const floor = m.floor.slice();
        floor[i] = floorRef;
        return { ...m, floor };
      }
      if (tool === 'wall') {
        if (m.blocked.includes(i)) return m;
        return { ...m, blocked: [...m.blocked, i] };
      }
      if (tool === 'spawn') return { ...m, spawn: { x: p.x, y: p.y } };
      if (tool === 'erase') {
        const k = objectAt(m, lib, p.x, p.y);
        if (k >= 0) return { ...m, objects: m.objects.filter((_, j) => j !== k) };
        if (m.blocked.includes(i)) return { ...m, blocked: m.blocked.filter((b) => b !== i) };
        return m;
      }
      if (tool === 'object' && first) {
        const a = lib.get(objectRef);
        if (!a || p.x + a.w > m.w || p.y + a.h > m.h) return m;
        // 겹치는 가구는 치우고 놓는다
        const keep = m.objects.filter((o) => {
          const b = lib.get(o.ref);
          const bw = b?.w ?? 1;
          const bh = b?.h ?? 1;
          return o.x >= p.x + a.w || o.x + bw <= p.x || o.y >= p.y + a.h || o.y + bh <= p.y;
        });
        return { ...m, objects: [...keep, { x: p.x, y: p.y, ref: objectRef }] };
      }
      return m;
    });
  };

  const pushUndo = () => {
    undo.current.push(serializeMap(map));
    if (undo.current.length > 60) undo.current.shift();
  };
  const onUndo = () => {
    const s = undo.current.pop();
    const m = s ? parseMap(s) : null;
    if (m) setMap(m);
  };
  const fillFloor = () => {
    pushUndo();
    setMap((m) => ({ ...m, floor: m.floor.map(() => floorRef) }));
  };

  const save = async () => {
    if (!name.trim()) return showToast('맵 이름을 지어 주세요');
    setSaving(true);
    try {
      const data = serializeMap(map);
      if (savedId !== null) {
        await api.updateMap(savedId, name.trim(), data);
        showToast('저장했어요');
      } else {
        const created = await api.createMap(name.trim(), data);
        setSavedId(created.id);
        history.replaceState(null, '', `#edit/${created.id}`);
        showToast('새 맵을 만들었어요');
      }
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : '저장하지 못했어요');
    } finally {
      setSaving(false);
    }
  };

  const assets = [...lib.values()].filter((a) => a.kind === tab);
  const choose = (a: Asset) => {
    if (a.kind === 'floor') {
      setFloorRef(a.ref);
      setTool('floor');
    } else {
      setObjectRef(a.ref);
      setTool('object');
    }
  };

  const TOOLS: [Tool, string][] = [['object', '가구 놓기'], ['floor', '바닥 칠하기'], ['wall', '벽 세우기'], ['erase', '지우개'], ['spawn', '시작 위치']];
  return (
    <div className="wrap">
      <header className="top">
        <div className="brand">
          <button className="btn ghost" type="button" onClick={onBack}>← 맵 목록</button>
          <div>
            <h1>우리반 <span>맵 에디터</span></h1>
            <p>{mine ? '우리반 가구 갤러리에 있는 걸로 맵을 꾸며요' : '다른 사람 맵이라 구경만 할 수 있어요'}</p>
          </div>
        </div>
        <div className="top-actions">
          <input className="name-input" data-testid="map-name" value={name} maxLength={30} onChange={(e) => setName(e.target.value)} aria-label="맵 이름" />
          <button className="btn primary" type="button" onClick={save} disabled={saving || loading || !mine} data-testid="save-map">{saving ? '저장 중…' : '맵 저장'}</button>
        </div>
      </header>
      <div className="map-grid">
        <section className="card palette">
          <div className="tabs">
            <button type="button" aria-pressed={tab === 'object'} onClick={() => setTab('object')}>가구</button>
            <button type="button" aria-pressed={tab === 'floor'} onClick={() => setTab('floor')}>바닥</button>
          </div>
          <div className="asset-list">
            {assets.map((a) => (
              <button
                key={a.ref}
                type="button"
                className="asset"
                aria-pressed={(a.kind === 'floor' ? floorRef : objectRef) === a.ref}
                onClick={() => choose(a)}
                data-testid={`asset-${a.ref}`}
              >
                <img src={urls.get(a.ref)} alt="" className="pixel" style={{ width: a.w * 32, maxWidth: '100%' }} />
                <span>{a.name}</span>
                <small>{a.owner ? a.owner : '기본'}{a.solid ? ' · 막힘' : ''}</small>
              </button>
            ))}
          </div>
          {tab === 'floor' && <button className="btn small" type="button" onClick={fillFloor}>선택한 바닥으로 전체 칠하기</button>}
        </section>
        <section className="card">
          <div className="editor-head">
            <div className="tool-row">
              {TOOLS.map(([t, label]) => (
                <button key={t} type="button" className="chip" aria-pressed={tool === t} onClick={() => setTool(t)} data-testid={`tool-${t}`}>{label}</button>
              ))}
              <button type="button" className="chip" onClick={onUndo}>↶ 되돌리기</button>
            </div>
            <div className="now">{map.w}×{map.h}칸 · 가구 {map.objects.length}개</div>
          </div>
          <canvas
            ref={canvasRef}
            className="map-canvas pixel"
            data-testid="map-canvas"
            onPointerDown={(ev) => {
              if (!mine) return;
              const p = cellAt(ev);
              if (!p) return;
              ev.currentTarget.setPointerCapture(ev.pointerId);
              pushUndo();
              painting.current = true;
              apply(p, true);
            }}
            onPointerMove={(ev) => {
              const p = cellAt(ev);
              const prev = hover.current;
              hover.current = p;
              if (painting.current && p && (!prev || prev.x !== p.x || prev.y !== p.y) && tool !== 'object' && tool !== 'spawn') apply(p, false);
              draw();
            }}
            onPointerUp={() => (painting.current = false)}
            onPointerCancel={() => (painting.current = false)}
            onPointerLeave={() => { hover.current = null; draw(); }}
          />
          <p className="dim hint">가구는 클릭한 칸이 왼쪽 위가 돼요. 바닥·벽·지우개는 끌면서 칠할 수 있어요.</p>
        </section>
      </div>
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
