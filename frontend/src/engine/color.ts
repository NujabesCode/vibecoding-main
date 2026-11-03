// 색 계산 도구. 픽셀아트 명암은 "어둡게"가 아니라 "색조를 틀어서" 만든다.
// 그림자는 보라/파랑 쪽으로, 하이라이트는 노랑 쪽으로.

const rgbCache = new Map<string, [number, number, number]>();

export function hexToRgb(hex: string): [number, number, number] {
  let v = rgbCache.get(hex);
  if (!v) {
    const n = parseInt(hex.slice(1), 16);
    v = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    rgbCache.set(hex, v);
  }
  return v;
}

export function toHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0'))
      .join('')
  );
}

export function mix(a: string, b: string, t: number): string {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return toHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}

function toHsl(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  let h = 0;
  let s = 0;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}

function fromHsl(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(1, s));
  l = Math.max(0, Math.min(1, l));
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let rgb: [number, number, number];
  if (h < 60) rgb = [c, x, 0];
  else if (h < 120) rgb = [x, c, 0];
  else if (h < 180) rgb = [0, c, x];
  else if (h < 240) rgb = [0, x, c];
  else if (h < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  return toHex((rgb[0] + m) * 255, (rgb[1] + m) * 255, (rgb[2] + m) * 255);
}

function hueToward(h: number, target: number, amt: number): number {
  const d = ((target - h + 540) % 360) - 180;
  return h + d * amt;
}

export interface Ramp {
  deep: string;
  shadow: string;
  base: string;
  light: string;
}

export function ramp(hex: string): Ramp {
  const [h, s, l] = toHsl(hex);
  const gray = s < 0.12;
  return {
    deep: fromHsl(gray ? h : hueToward(h, 255, 0.28), gray ? s : Math.min(1, s + 0.08), l - 0.3),
    shadow: fromHsl(gray ? h : hueToward(h, 250, 0.14), gray ? s : Math.min(1, s + 0.05), l - 0.14),
    base: hex,
    light: fromHsl(gray ? h : hueToward(h, 55, 0.12), s, Math.min(0.96, l + 0.11)),
  };
}

export const SKIN = ['#ffe1cc', '#f9cfae', '#efbd95', '#d9a077', '#b67a54', '#8a583b'];
export const HAIR = ['#2c2433', '#553529', '#8a5634', '#d9a35b', '#f1d27e', '#ebe6de', '#c84a5d', '#ff94bd', '#5c6cdb', '#3ba78c'];
export const TOP = ['#ff6b5e', '#ffad4a', '#ffd84a', '#5fd18b', '#3fc1c9', '#4d8dff', '#7b7fff', '#b07bea', '#ff8fc2', '#f4f4f8', '#3b4166', '#2f2f36'];
export const BOTTOM = ['#2f3a5a', '#3d5a8a', '#5a4636', '#24262f', '#7b7f90', '#8f6bb0', '#3f6b4f', '#cdb58c'];
export const SHOES = ['#2a2a33', '#f2f2f7', '#d0453a', '#7a5434', '#3d5a8a', '#ffcf4a'];
export const ACCENT = ['#ff5f6d', '#ffcf4a', '#3fdcaa', '#4d8dff', '#b07bea', '#2a2a33'];

export interface PaletteSel {
  skin: number;
  hair: number;
  top: number;
  bottom: number;
  shoes: number;
  accent: number;
}

export type Pal = Record<string, string>;

const pickAt = (list: string[], i: number) => list[Math.max(0, Math.min(list.length - 1, i | 0))];

// 물감 코드 → 실제 색. s=피부 h=머리 t=상의 b=하의 o=신발 a=포인트, 0=기본 1=그림자 2=밝게 3=가장 어둡게
export function buildPal(p: PaletteSel): Pal {
  const R: Record<string, Ramp> = {
    s: ramp(pickAt(SKIN, p.skin)),
    h: ramp(pickAt(HAIR, p.hair)),
    t: ramp(pickAt(TOP, p.top)),
    b: ramp(pickAt(BOTTOM, p.bottom)),
    o: ramp(pickAt(SHOES, p.shoes)),
    a: ramp(pickAt(ACCENT, p.accent)),
  };
  const out: Pal = {};
  for (const k of Object.keys(R)) {
    out[k + '0'] = R[k].base;
    out[k + '1'] = R[k].shadow;
    out[k + '2'] = R[k].light;
    out[k + '3'] = R[k].deep;
  }
  out.e = '#241a33';
  out.w = '#ffffff';
  out.p = mix(R.s.base, '#ff6f8a', 0.45);
  out.m = mix(R.s.deep, '#b03a4f', 0.5);
  out.k = '#2a2238';
  out.g = '#cfeaff';
  return out;
}

export function resolveColor(code: string, pal: Pal): string {
  return code[0] === '#' ? code : pal[code] ?? '#ff00ff';
}
