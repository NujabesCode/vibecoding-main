// 맵 = 바닥 칸 + 가구 + 벽 + 시작 위치. 그리기/충돌 계산은 맵 에디터와 메타버스가 같이 쓴다.
import { FLOOR_TEMPLATES, itemCanvas, OBJECT_TEMPLATES, TS, type Item } from './items';

// 에셋 주소: 't:wood' = 기본 템플릿, 'i:12' = 우리반 갤러리 12번 가구
export type AssetRef = string;

export interface MapObject {
  x: number;
  y: number;
  ref: AssetRef;
}

export interface MapData {
  v: 1;
  w: number;
  h: number;
  floor: (AssetRef | null)[];
  objects: MapObject[];
  blocked: number[];
  spawn: { x: number; y: number };
}

export interface Asset {
  ref: AssetRef;
  name: string;
  kind: 'floor' | 'object';
  w: number;
  h: number;
  solid: boolean;
  canvas: HTMLCanvasElement;
  owner?: string;
}

export const MAP_W = 24;
export const MAP_H = 16;

export function buildAssetLibrary(items: Item[]): Map<AssetRef, Asset> {
  const lib = new Map<AssetRef, Asset>();
  for (const t of [...FLOOR_TEMPLATES, ...OBJECT_TEMPLATES]) {
    const d = t.make();
    lib.set('t:' + t.id, { ref: 't:' + t.id, name: t.label, kind: d.kind, w: d.w, h: d.h, solid: d.solid, canvas: itemCanvas(d) });
  }
  for (const it of items) {
    lib.set('i:' + it.id, { ref: 'i:' + it.id, name: it.name, kind: it.kind, w: it.w, h: it.h, solid: it.solid, canvas: itemCanvas(it), owner: it.ownerName });
  }
  return lib;
}

export function newMap(): MapData {
  const blocked: number[] = [];
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (x === 0 || y === 0 || x === MAP_W - 1 || y === MAP_H - 1 || y === 1) blocked.push(y * MAP_W + x);
    }
  }
  return {
    v: 1,
    w: MAP_W,
    h: MAP_H,
    floor: new Array(MAP_W * MAP_H).fill('t:wood'),
    objects: [],
    blocked,
    spawn: { x: Math.floor(MAP_W / 2), y: Math.floor(MAP_H / 2) },
  };
}

export const serializeMap = (m: MapData) => JSON.stringify(m);

// 서버에서 온 맵은 믿지 않는다: 모양이 이상하면 null
export function parseMap(raw: string): MapData | null {
  try {
    const m = JSON.parse(raw) as MapData;
    if (m.v !== 1 || !Number.isInteger(m.w) || !Number.isInteger(m.h) || m.w < 8 || m.h < 8 || m.w > 40 || m.h > 40) return null;
    if (!Array.isArray(m.floor) || m.floor.length !== m.w * m.h) return null;
    if (!Array.isArray(m.objects) || !Array.isArray(m.blocked) || !m.spawn) return null;
    const inMap = (x: unknown, y: unknown) => Number.isInteger(x) && Number.isInteger(y) && (x as number) >= 0 && (y as number) >= 0 && (x as number) < m.w && (y as number) < m.h;
    if (!inMap(m.spawn.x, m.spawn.y)) return null;
    return {
      v: 1,
      w: m.w,
      h: m.h,
      floor: m.floor.map((f) => (typeof f === 'string' ? f : null)),
      objects: m.objects.filter((o) => o && typeof o.ref === 'string' && inMap(o.x, o.y)),
      blocked: m.blocked.filter((i) => Number.isInteger(i) && i >= 0 && i < m.w * m.h),
      spawn: { x: m.spawn.x, y: m.spawn.y },
    };
  } catch {
    return null;
  }
}

/* ---------- 벽 ---------- */
function drawWall(c: CanvasRenderingContext2D, x: number, y: number, face: boolean) {
  const px = x * TS;
  const py = y * TS;
  if (face) {
    c.fillStyle = '#efe4d3';
    c.fillRect(px, py, TS, TS);
    c.fillStyle = '#e4d6c1';
    for (let i = 0; i < TS; i += 8) c.fillRect(px + i, py + 4, 1, TS - 10);
    c.fillStyle = '#4b3f5c';
    c.fillRect(px, py, TS, 3);
    c.fillStyle = '#a8794f';
    c.fillRect(px, py + TS - 6, TS, 6);
    c.fillStyle = '#c4935f';
    c.fillRect(px, py + TS - 6, TS, 1);
  } else {
    c.fillStyle = '#5c4f70';
    c.fillRect(px, py, TS, TS);
    c.fillStyle = '#6e6184';
    c.fillRect(px + 2, py + 2, TS - 4, TS - 4);
    c.fillStyle = '#7d7095';
    c.fillRect(px + 2, py + 2, TS - 4, 2);
  }
}

// 바닥 + 벽만 그린 배경 (가구는 캐릭터와 앞뒤를 맞춰야 해서 따로 그린다)
export function renderBackground(m: MapData, lib: Map<AssetRef, Asset>): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = m.w * TS;
  cv.height = m.h * TS;
  const c = cv.getContext('2d');
  if (!c) return cv;
  c.imageSmoothingEnabled = false;
  c.fillStyle = '#20243f';
  c.fillRect(0, 0, cv.width, cv.height);
  for (let y = 0; y < m.h; y++) {
    for (let x = 0; x < m.w; x++) {
      const ref = m.floor[y * m.w + x];
      const a = ref ? lib.get(ref) : undefined;
      if (a) c.drawImage(a.canvas, x * TS, y * TS);
    }
  }
  const wall = new Set(m.blocked);
  for (const i of m.blocked) {
    const x = i % m.w;
    const y = Math.floor(i / m.w);
    drawWall(c, x, y, !wall.has(i + m.w) && y + 1 < m.h);
  }
  return cv;
}

// 그릴 순서: 가구 아래쪽 끝(y + h)이 작은 것부터
export function sortedObjects(m: MapData, lib: Map<AssetRef, Asset>) {
  return m.objects
    .map((o) => ({ o, a: lib.get(o.ref) }))
    .filter((v): v is { o: MapObject; a: Asset } => !!v.a)
    .sort((p, q) => p.o.y + p.a.h - (q.o.y + q.a.h));
}

// 못 가는 칸: 벽 + 막힘 가구가 차지한 칸
export function collisionGrid(m: MapData, lib: Map<AssetRef, Asset>): Uint8Array {
  const g = new Uint8Array(m.w * m.h);
  for (const i of m.blocked) g[i] = 1;
  for (const { o, a } of sortedObjects(m, lib)) {
    if (!a.solid) continue;
    for (let dy = 0; dy < a.h; dy++) for (let dx = 0; dx < a.w; dx++) {
      const x = o.x + dx;
      const y = o.y + dy;
      if (x < m.w && y < m.h) g[y * m.w + x] = 1;
    }
  }
  return g;
}

// 칸 (x, y)를 덮고 있는 가구 번호 (없으면 -1)
export function objectAt(m: MapData, lib: Map<AssetRef, Asset>, x: number, y: number): number {
  for (let i = m.objects.length - 1; i >= 0; i--) {
    const o = m.objects[i];
    const a = lib.get(o.ref);
    const w = a?.w ?? 1;
    const h = a?.h ?? 1;
    if (x >= o.x && x < o.x + w && y >= o.y && y < o.y + h) return i;
  }
  return -1;
}
