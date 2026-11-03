// 캐릭터 디자인 = 파츠 + 색 + (직접 그린 것까지 포함한) 레이어 픽셀.
// 서버에는 이 JSON 한 덩어리만 저장한다. 픽셀은 같은 값이 연속되면 "개수*값"으로 압축(RLE)한다.
import { ACCENT, BOTTOM, HAIR, SHOES, SKIN, TOP, type PaletteSel } from './color';
import { ACCS, BOTTOMS, buildLayers, EYES, HAIRS, TOPS, type Parts } from './parts';
import { decodeCells, encodeCells } from './rle';
import { DIRS, LAYERS, N, type CharLayers, type Layer } from './sprite';

export interface Design {
  v: 1;
  parts: Parts;
  palette: PaletteSel;
  layers: CharLayers;
}

type Encoded = { v: 1; parts: Parts; palette: PaletteSel; layers: Record<string, Record<string, string>> };

export const encodeLayer = (L: Layer): string => encodeCells(L);
export const decodeLayer = (s: string): Layer => decodeCells(s, N);

export function serializeDesign(d: Design): string {
  const layers: Encoded['layers'] = {};
  for (const dir of DIRS) {
    layers[dir] = {};
    for (const l of LAYERS) layers[dir][l] = encodeLayer(d.layers[dir][l]);
  }
  const enc: Encoded = { v: 1, parts: d.parts, palette: d.palette, layers };
  return JSON.stringify(enc);
}

const VALID = {
  hair: HAIRS.map((h) => h[0]) as string[],
  eyes: EYES.map((h) => h[0]) as string[],
  top: TOPS.map((h) => h[0]) as string[],
  bottom: BOTTOMS.map((h) => h[0]) as string[],
  acc: ACCS.map((h) => h[0]) as string[],
};
const PAL_LEN: Record<keyof PaletteSel, number> = {
  skin: SKIN.length, hair: HAIR.length, top: TOP.length, bottom: BOTTOM.length, shoes: SHOES.length, accent: ACCENT.length,
};

// 서버에서 온 값은 믿지 않는다: 이상하면 null
export function parseDesign(json: string): Design | null {
  try {
    const o = JSON.parse(json) as Partial<Encoded>;
    if (!o || o.v !== 1 || !o.parts || !o.palette || !o.layers) return null;
    for (const k of Object.keys(VALID) as (keyof typeof VALID)[]) {
      if (!VALID[k].includes(String(o.parts[k]))) return null;
    }
    for (const k of Object.keys(PAL_LEN) as (keyof PaletteSel)[]) {
      const v = o.palette[k];
      if (!Number.isInteger(v) || v < 0 || v >= PAL_LEN[k]) return null;
    }
    const layers = buildLayers(o.parts);
    for (const dir of DIRS) {
      for (const l of LAYERS) {
        const s = o.layers[dir]?.[l];
        if (typeof s !== 'string') return null;
        layers[dir][l] = decodeLayer(s);
      }
    }
    return { v: 1, parts: o.parts, palette: o.palette, layers };
  } catch {
    return null;
  }
}

export const DEFAULT_PARTS: Parts = { hair: 'bob', eyes: 'round', top: 'tee', bottom: 'pants', acc: 'none' };
export const DEFAULT_PALETTE: PaletteSel = { skin: 1, hair: 1, top: 5, bottom: 0, shoes: 0, accent: 0 };

export function newDesign(parts: Parts = DEFAULT_PARTS, palette: PaletteSel = DEFAULT_PALETTE): Design {
  return { v: 1, parts: { ...parts }, palette: { ...palette }, layers: buildLayers(parts) };
}

const rnd = (n: number) => Math.floor(Math.random() * n);

export function randomDesign(): Design {
  const parts: Parts = {
    hair: HAIRS[rnd(HAIRS.length)][0],
    eyes: EYES[rnd(EYES.length)][0],
    top: TOPS[rnd(TOPS.length)][0],
    bottom: BOTTOMS[rnd(BOTTOMS.length)][0],
    acc: Math.random() < 0.55 ? 'none' : ACCS[1 + rnd(ACCS.length - 1)][0],
  };
  const palette: PaletteSel = {
    skin: rnd(SKIN.length), hair: rnd(HAIR.length), top: rnd(TOP.length),
    bottom: rnd(BOTTOM.length), shoes: rnd(SHOES.length), accent: rnd(ACCENT.length),
  };
  return newDesign(parts, palette);
}

export function cloneDesign(d: Design): Design {
  const layers = {} as CharLayers;
  for (const dir of DIRS) {
    layers[dir] = {} as CharLayers[typeof dir];
    for (const l of LAYERS) layers[dir][l] = d.layers[dir][l].slice();
  }
  return { v: 1, parts: { ...d.parts }, palette: { ...d.palette }, layers };
}
