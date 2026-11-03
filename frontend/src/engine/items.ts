// 가구와 바닥 타일. 한 칸 = 32x32 픽셀. 가구는 1~2칸 x 1~2칸.
// 픽셀 값은 #rrggbb 색 (캐릭터와 달리 팔레트 코드가 아니다).
import { hexToRgb, mix } from './color';
import { decodeCells, encodeCells, type Cells } from './rle';

export const TS = 32;
export type ItemKind = 'floor' | 'object';

export interface ItemDraft {
  name: string;
  kind: ItemKind;
  w: number;
  h: number;
  solid: boolean;
  px: Cells;
}

export interface Item extends ItemDraft {
  id: number;
  ownerId: number;
  ownerName: string;
}

export const ITEM_COLORS = [
  '#2a2238', '#4a3f5c', '#7b7f90', '#c9cfdb', '#ffffff', '#f6efe2',
  '#4a2f1e', '#7a5232', '#a8713f', '#c99560', '#dcb98d', '#efd9b4',
  '#2e5c33', '#3f8a46', '#5fb05f', '#9bd47e', '#1d4f7a', '#3d7fd6',
  '#7fc6f2', '#7b7fff', '#b07bea', '#ff8fc2', '#ff6b5e', '#ffad4a', '#ffd84a', '#c96f4a',
];

/* ---------- 그리기 도구 ---------- */
class Painter {
  readonly px: Cells;
  constructor(readonly W: number, readonly H: number) {
    this.px = new Array(W * H).fill(null);
  }
  set(x: number, y: number, c: string | null) {
    if (x >= 0 && y >= 0 && x < this.W && y < this.H) this.px[y * this.W + x] = c;
  }
  rect(x0: number, y0: number, w: number, h: number, c: string) {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) this.set(x, y, c);
  }
  // 1px 테두리 있는 사각형
  box(x0: number, y0: number, w: number, h: number, fill: string, line: string) {
    this.rect(x0, y0, w, h, line);
    this.rect(x0 + 1, y0 + 1, w - 2, h - 2, fill);
  }
  disc(cx: number, cy: number, r: number, c: string) {
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) this.set(cx + x, cy + y, c);
  }
}

const hash = (x: number, y: number, s: number) => {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(s + 1, 982451653);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};

/* ---------- 템플릿 ---------- */
export interface Template {
  id: string;
  label: string;
  make: () => ItemDraft;
}

const floor = (name: string, paint: (p: Painter) => void): ItemDraft => {
  const p = new Painter(TS, TS);
  paint(p);
  return { name, kind: 'floor', w: 1, h: 1, solid: false, px: p.px };
};
const object = (name: string, w: number, h: number, solid: boolean, paint: (p: Painter) => void): ItemDraft => {
  const p = new Painter(w * TS, h * TS);
  paint(p);
  return { name, kind: 'object', w, h, solid, px: p.px };
};

export const FLOOR_TEMPLATES: Template[] = [
  {
    id: 'wood', label: '나무 마루', make: () => floor('나무 마루', (p) => {
      for (let r = 0; r < 4; r++) {
        p.rect(0, r * 8, TS, 8, r % 2 ? '#dcb98d' : '#d6b284');
        p.rect(0, r * 8 + 7, TS, 1, '#bf9566');
        p.rect(0, r * 8, TS, 1, '#e6c9a0');
        p.rect((r * 13 + 5) % TS, r * 8, 1, 7, '#c39b6c');
      }
    }),
  },
  {
    id: 'tile', label: '교실 타일', make: () => floor('교실 타일', (p) => {
      for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) {
        p.rect(x * 16, y * 16, 16, 16, (x + y) % 2 ? '#e3d6c1' : '#efe6d6');
        p.rect(x * 16, y * 16, 16, 1, '#f8f2e8');
      }
      p.rect(0, 15, TS, 1, '#cfc1aa'); p.rect(15, 0, 1, TS, '#cfc1aa'); p.rect(0, 31, TS, 1, '#cfc1aa'); p.rect(31, 0, 1, TS, '#cfc1aa');
    }),
  },
  {
    id: 'carpet', label: '보라 카펫', make: () => floor('보라 카펫', (p) => {
      p.rect(0, 0, TS, TS, '#8f86d8');
      for (let y = 2; y < TS; y += 8) for (let x = 2 + ((y / 8) % 2) * 4; x < TS; x += 8) { p.set(x, y, '#a9a1ea'); p.set(x + 1, y, '#a9a1ea'); }
    }),
  },
  {
    id: 'grass', label: '잔디', make: () => floor('잔디', (p) => {
      p.rect(0, 0, TS, TS, '#7cc163');
      for (let i = 0; i < 40; i++) {
        const x = Math.floor(hash(i, 1, 3) * TS);
        const y = Math.floor(hash(i, 2, 3) * (TS - 2));
        p.set(x, y, i % 2 ? '#6caf55' : '#94d47a');
        p.set(x, y + 1, i % 2 ? '#6caf55' : '#94d47a');
      }
      p.set(9, 22, '#fff6f0'); p.set(10, 21, '#fff6f0'); p.set(11, 22, '#fff6f0'); p.set(10, 23, '#fff6f0'); p.set(10, 22, '#ffcf4a');
    }),
  },
  {
    id: 'stone', label: '돌길', make: () => floor('돌길', (p) => {
      p.rect(0, 0, TS, TS, '#b8aa8f');
      [[1, 1, 14, 13], [17, 1, 14, 9], [1, 16, 9, 15], [12, 16, 19, 6], [17, 12, 14, 2], [12, 24, 19, 7]].forEach(([x, y, w, h]) => {
        p.box(x, y, w, h, '#ddd2bc', '#a59578');
        p.rect(x + 1, y + 1, w - 2, 1, '#ece4d2');
      });
    }),
  },
];

export const OBJECT_TEMPLATES: Template[] = [
  {
    id: 'desk', label: '노트북 책상', make: () => object('노트북 책상', 2, 1, true, (p) => {
      p.box(3, 12, 58, 12, '#c08a55', '#5a3a22');
      p.rect(4, 13, 56, 2, '#d8a46b');
      p.box(3, 23, 58, 5, '#9a6a40', '#5a3a22');
      p.rect(5, 28, 3, 3, '#5a3a22'); p.rect(56, 28, 3, 3, '#5a3a22');
      p.box(22, 2, 20, 13, '#2b3448', '#3a3f52');
      p.rect(25, 5, 12, 1, '#7ee0b0'); p.rect(25, 7, 8, 1, '#ffcf4a'); p.rect(25, 9, 10, 1, '#8ab8ff');
      p.box(19, 14, 26, 4, '#c9d0dc', '#8a92a6');
      p.box(48, 9, 6, 6, '#fffaf0', '#b9b0a0'); p.rect(49, 10, 4, 2, '#8a5a3c');
    }),
  },
  {
    id: 'chair', label: '의자', make: () => object('의자', 1, 1, false, (p) => {
      p.box(8, 3, 16, 14, '#3d4a63', '#232b3b');
      p.rect(9, 4, 14, 2, '#566684');
      p.box(6, 16, 20, 8, '#4a5a78', '#232b3b');
      p.rect(7, 17, 18, 2, '#62739a');
      p.rect(15, 24, 2, 5, '#2b2f3a');
      p.rect(9, 28, 14, 2, '#2b2f3a');
    }),
  },
  {
    id: 'plant', label: '화분', make: () => object('화분', 1, 1, true, (p) => {
      p.box(9, 19, 14, 11, '#c96f4a', '#7a3d24');
      p.rect(10, 20, 12, 2, '#e08a63');
      p.disc(16, 11, 7, '#2e5c33'); p.disc(16, 11, 6, '#3f8a46');
      p.disc(10, 15, 5, '#2e5c33'); p.disc(10, 15, 4, '#4fa056');
      p.disc(22, 15, 5, '#2e5c33'); p.disc(22, 15, 4, '#4fa056');
      p.disc(15, 7, 3, '#62b765'); p.set(13, 6, '#9bd47e'); p.set(14, 5, '#9bd47e');
    }),
  },
  {
    id: 'sofa', label: '소파', make: () => object('소파', 2, 1, true, (p) => {
      p.box(4, 6, 56, 13, '#d9604f', '#7a2e25');
      p.rect(5, 7, 54, 2, '#ef7d6b');
      p.box(2, 14, 60, 14, '#e8735f', '#7a2e25');
      p.box(2, 12, 9, 16, '#d9604f', '#7a2e25');
      p.box(53, 12, 9, 16, '#d9604f', '#7a2e25');
      p.box(11, 16, 21, 8, '#f08a76', '#b4493b'); p.box(32, 16, 21, 8, '#f08a76', '#b4493b');
      p.rect(6, 28, 3, 2, '#5a3a22'); p.rect(55, 28, 3, 2, '#5a3a22');
    }),
  },
  {
    id: 'shelf', label: '책장', make: () => object('책장', 1, 2, true, (p) => {
      p.box(2, 4, 28, 58, '#8a5a3c', '#4a2f1e');
      const books = ['#ff6b5e', '#4d8dff', '#ffd84a', '#5fd18b', '#b07bea', '#ff8fc2', '#3fc1c9'];
      for (let r = 0; r < 4; r++) {
        const y = 8 + r * 13;
        p.rect(3, y + 10, 26, 2, '#5e3b25');
        for (let i = 0; i < 6; i++) {
          const h = 7 + ((i * 7 + r) % 3);
          p.rect(5 + i * 4, y + 10 - h, 3, h, books[(i + r * 2) % 7]);
          p.set(5 + i * 4, y + 10 - h, '#ffffff');
        }
      }
    }),
  },
  {
    id: 'board', label: '칠판', make: () => object('칠판', 2, 1, true, (p) => {
      p.box(2, 2, 60, 24, '#2f5a4a', '#4a3424');
      p.rect(8, 8, 22, 2, '#dfe9e4'); p.rect(8, 13, 30, 2, '#dfe9e4'); p.rect(8, 18, 16, 2, '#dfe9e4');
      [[48, 9], [49, 8], [50, 8], [51, 9], [52, 8], [53, 8], [54, 9], [54, 10], [53, 11], [52, 12], [51, 13], [50, 12], [49, 11], [48, 10]].forEach(([x, y]) => p.set(x, y, '#ffcf4a'));
      p.rect(4, 26, 56, 3, '#8a6a4a'); p.rect(44, 24, 6, 2, '#f4f4f4');
    }),
  },
];

/* ---------- 그리기 / 저장 ---------- */
const INK = '#170c26';

// 가구는 외곽선을 자동으로 붙인다 (바닥 타일은 이어 붙여야 하니까 안 붙인다)
export function finishPixels(d: ItemDraft): Cells {
  if (d.kind === 'floor') return d.px;
  const W = d.w * TS;
  const H = d.h * TS;
  const src = d.px;
  const out = src.slice();
  const at = (x: number, y: number) => (x >= 0 && y >= 0 && x < W && y < H ? src[y * W + x] : null);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (src[y * W + x]) continue;
      const n = at(x, y - 1) ?? at(x - 1, y) ?? at(x + 1, y) ?? at(x, y + 1);
      if (n) out[y * W + x] = mix(n, INK, 0.7);
    }
  }
  return out;
}

export function itemCanvas(d: ItemDraft, finish = true): HTMLCanvasElement {
  const W = d.w * TS;
  const H = d.h * TS;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const c = cv.getContext('2d');
  if (!c) return cv;
  const px = finish ? finishPixels(d) : d.px;
  const img = c.createImageData(W, H);
  for (let i = 0; i < px.length; i++) {
    const v = px[i];
    if (!v) continue;
    const [r, g, b] = hexToRgb(v);
    img.data[i * 4] = r;
    img.data[i * 4 + 1] = g;
    img.data[i * 4 + 2] = b;
    img.data[i * 4 + 3] = 255;
  }
  c.putImageData(img, 0, 0);
  return cv;
}

export const serializePixels = (px: Cells) => JSON.stringify({ v: 1, px: encodeCells(px) });

const HEX = /^#[0-9a-f]{6}$/;

export function parseItem(raw: {
  id: number; ownerId: number; ownerName: string; name: string; kind: string; width: number; height: number; solid: boolean; pixels: string;
}): Item | null {
  try {
    if ((raw.kind !== 'floor' && raw.kind !== 'object') || ![1, 2].includes(raw.width) || ![1, 2].includes(raw.height)) return null;
    const o = JSON.parse(raw.pixels) as { v?: number; px?: string };
    if (o.v !== 1 || typeof o.px !== 'string') return null;
    const px = decodeCells(o.px, raw.width * TS * raw.height * TS);
    if (px.some((v) => v !== null && !HEX.test(v))) return null;
    return { id: raw.id, ownerId: raw.ownerId, ownerName: raw.ownerName ?? '?', name: raw.name, kind: raw.kind, w: raw.width, h: raw.height, solid: raw.solid, px };
  } catch {
    return null;
  }
}
