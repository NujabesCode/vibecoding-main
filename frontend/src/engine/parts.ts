// 파츠(헤어/눈/상의/하의/소품)를 32x48 픽셀 레이어로 그려 주는 곳.
// 좌표는 (x, y) = (왼쪽에서 몇 칸, 위에서 몇 칸). 발바닥은 y=46.
import { blankLayer, DIRS, FH, FW, getPx, inBounds, type CharLayers, type Dir, type Layer, type LayerName } from './sprite';

export type HairStyle = 'bob' | 'part' | 'spiky' | 'long' | 'pony' | 'bun' | 'curly';
export type EyeStyle = 'round' | 'smile' | 'sparkle' | 'calm';
export type TopStyle = 'tee' | 'hoodie' | 'shirt';
export type BottomStyle = 'pants' | 'shorts' | 'skirt';
export type AccStyle = 'none' | 'glasses' | 'headphones' | 'beanie';

export interface Parts {
  hair: HairStyle;
  eyes: EyeStyle;
  top: TopStyle;
  bottom: BottomStyle;
  acc: AccStyle;
}

export const HAIRS: [HairStyle, string][] = [
  ['bob', '단정 머리'], ['part', '가르마'], ['spiky', '뻗친 머리'], ['long', '긴 생머리'],
  ['pony', '포니테일'], ['bun', '똥머리'], ['curly', '뽀글 머리'],
];
export const EYES: [EyeStyle, string][] = [['round', '동글 눈'], ['smile', '웃는 눈'], ['sparkle', '반짝 눈'], ['calm', '차분한 눈']];
export const TOPS: [TopStyle, string][] = [['tee', '티셔츠'], ['hoodie', '후드티'], ['shirt', '셔츠+넥타이']];
export const BOTTOMS: [BottomStyle, string][] = [['pants', '긴바지'], ['shorts', '반바지'], ['skirt', '치마']];
export const ACCS: [AccStyle, string][] = [['none', '없음'], ['glasses', '안경'], ['headphones', '헤드폰'], ['beanie', '비니']];

/* ---------- 그리기 도구 ---------- */
const sp = (L: Layer, x: number, y: number, v: string | null) => {
  if (inBounds(x, y)) L[y * FW + x] = v;
};
const gp = (L: Layer, x: number, y: number) => getPx(L, x, y);
const filled = (L: Layer, x: number, y: number) => !!gp(L, x, y);
function rect(L: Layer, x0: number, y0: number, x1: number, y1: number, v: string | null) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) sp(L, x, y, v);
}
// 모서리를 픽셀아트식으로 깎은 사각형. top/bot = 위/아래 줄마다 깎을 칸 수
function rr(L: Layer, x0: number, y0: number, x1: number, y1: number, top: number[], bot: number[], v: string) {
  for (let y = y0; y <= y1; y++) {
    const i = y - y0;
    const j = y1 - y;
    let k = 0;
    if (i < top.length) k = top[i];
    if (j < bot.length) k = Math.max(k, bot[j]);
    for (let x = x0 + k; x <= x1 - k; x++) sp(L, x, y, v);
  }
}
function pts(L: Layer, list: [number, number][], v: string) {
  list.forEach(([x, y]) => sp(L, x, y, v));
}
const sym = (a: number[]) => a.concat(a.slice().reverse());

// 재질 명암: 오른쪽/아래 가장자리 = 그림자, 왼쪽/위 가장자리 = 밝게
function shadeMat(L: Layer, m: string, o: { right2?: boolean; light?: boolean } = {}) {
  const src = L.slice();
  for (let y = 0; y < FH; y++) {
    for (let x = 0; x < FW; x++) {
      if (src[y * FW + x] !== m + '0') continue;
      const r = !filled(src, x + 1, y) || (!!o.right2 && !filled(src, x + 2, y));
      const b = !filled(src, x, y + 1);
      const l = !filled(src, x - 1, y);
      const t = !filled(src, x, y - 1);
      if (r || b) L[y * FW + x] = m + '1';
      else if (o.light !== false && (l || t)) L[y * FW + x] = m + '2';
    }
  }
}

/* ---------- 헤어 ---------- */
const SPIKES: [number, number][] = [[7, 1], [8, 0], [8, 1], [12, 1], [13, 0], [13, 1], [18, 0], [18, 1], [19, 1], [23, 1], [24, 1], [23, 0]];

function hairFront(H: Layer, st: HairStyle) {
  if (st === 'curly') {
    rr(H, 2, 1, 29, 12, [6, 3, 2, 1, 1], [], 'h0');
    const fr = sym([16, 17, 16, 15, 14, 15, 16, 15, 14, 13, 14, 15, 14]).slice(0, 26);
    for (let i = 0; i < 26; i++) for (let y = 13; y <= fr[i]; y++) sp(H, 3 + i, y, 'h0');
    rect(H, 1, 10, 4, 22, 'h0');
    rect(H, 27, 10, 30, 22, 'h0');
    pts(H, [[2, 23], [3, 23], [28, 23], [29, 23]], 'h0');
    return;
  }
  rr(H, 4, 2, 27, 12, [6, 4, 2, 1, 1, 1], [], 'h0');
  let fr: number[];
  switch (st) {
    case 'part': fr = [17, 16, 15, 15, 14, 14, 13, 13, 12, 12, 11, 10, 10, 11, 11, 12, 12, 13, 13, 14, 15, 15, 16, 17]; break;
    case 'spiky': fr = sym([15, 14, 12, 11, 12, 10, 11, 10, 9, 10, 9, 10]); break;
    case 'long': fr = sym([16, 15, 14, 14, 13, 13, 13, 12, 12, 12, 12, 12]); break;
    default: fr = sym([17, 16, 15, 14, 13, 14, 13, 12, 13, 12, 12, 13]);
  }
  for (let i = 0; i < 24; i++) for (let y = 13; y <= fr[i]; y++) sp(H, 4 + i, y, 'h0');
  if (st === 'bob') { rect(H, 3, 10, 5, 19, 'h0'); rect(H, 26, 10, 28, 19, 'h0'); pts(H, [[4, 20], [5, 20], [26, 20], [27, 20]], 'h0'); }
  if (st === 'part') { rect(H, 3, 10, 5, 18, 'h0'); rect(H, 26, 10, 28, 18, 'h0'); }
  if (st === 'spiky') { rect(H, 3, 9, 4, 15, 'h0'); rect(H, 27, 9, 28, 15, 'h0'); pts(H, SPIKES, 'h0'); }
  if (st === 'long') { rect(H, 2, 10, 5, 34, 'h0'); rect(H, 26, 10, 29, 34, 'h0'); pts(H, [[3, 35], [4, 35], [27, 35], [28, 35]], 'h0'); }
  if (st === 'pony' || st === 'bun') { rect(H, 3, 10, 5, 16, 'h0'); rect(H, 26, 10, 28, 16, 'h0'); }
  if (st === 'bun') { rr(H, 11, 0, 20, 4, [3, 1], [], 'h0'); rect(H, 12, 4, 19, 4, 'h1'); }
}

function hairBack(H: Layer, st: HairStyle) {
  if (st === 'curly') { rr(H, 2, 1, 29, 27, [6, 3, 2, 1, 1], [4, 2, 1], 'h0'); return; }
  const bottom: Record<HairStyle, number> = { bob: 24, part: 24, spiky: 22, long: 35, pony: 22, bun: 23, curly: 27 };
  const x0 = st === 'long' ? 2 : 4;
  const x1 = st === 'long' ? 29 : 27;
  rr(H, x0, 2, x1, bottom[st], [6, 4, 2, 1, 1, 1], st === 'long' ? [2, 1] : [3, 1, 1], 'h0');
  if (st === 'spiky') pts(H, SPIKES, 'h0');
  if (st === 'pony') { rr(H, 13, 20, 18, 35, [], [2, 1], 'h0'); rect(H, 13, 21, 18, 22, 'a0'); }
  if (st === 'bun') rr(H, 11, 0, 20, 4, [3, 1], [], 'h0');
}

function hairSide(H: Layer, st: HairStyle) {
  if (st === 'curly') {
    rr(H, 5, 1, 29, 12, [6, 3, 2, 1, 1], [], 'h0');
    rect(H, 16, 13, 29, 24, 'h0');
    rr(H, 17, 24, 28, 26, [], [2, 1], 'h0');
    pts(H, [[5, 13], [6, 13], [7, 13], [8, 13], [5, 14], [6, 14], [7, 14], [6, 15]], 'h0');
    return;
  }
  rr(H, 6, 2, 27, 12, [6, 4, 2, 1, 1, 1], [], 'h0');
  const fr = st === 'spiky' ? [14, 13, 12, 12, 11, 11, 10] : [16, 15, 15, 14, 14, 13, 13];
  for (let i = 0; i < 7; i++) for (let y = 13; y <= fr[i]; y++) sp(H, 6 + i, y, 'h0');
  const backBottom: Record<HairStyle, number> = { bob: 23, part: 22, spiky: 19, long: 34, pony: 19, bun: 20, curly: 26 };
  rr(H, 17, 13, 27, backBottom[st], [], [3, 1, 1], 'h0');
  rect(H, 18, 13, 27, 13, 'h0');
  if (st === 'long') rr(H, 16, 13, 28, 34, [], [2, 1], 'h0');
  if (st === 'spiky') pts(H, [[10, 1], [11, 0], [11, 1], [16, 1], [17, 0], [17, 1], [22, 1], [23, 1], [23, 0], [26, 2], [27, 1]], 'h0');
  if (st === 'pony') { rr(H, 25, 7, 29, 12, [1], [], 'h0'); rr(H, 26, 12, 30, 30, [], [2, 1], 'h0'); rect(H, 25, 9, 26, 11, 'a0'); }
  if (st === 'bun') { rr(H, 19, 0, 26, 5, [2, 1], [1], 'h0'); rect(H, 20, 5, 25, 5, 'h1'); }
}

function shadeHair(H: Layer, dir: Dir, st: HairStyle) {
  const src = H.slice();
  for (let y = 0; y < FH; y++) {
    for (let x = 0; x < FW; x++) {
      if (src[y * FW + x] !== 'h0') continue;
      if (!filled(src, x, y + 1)) {
        sp(H, x, y, 'h1');
        if (y > 12 && gp(src, x, y - 1) === 'h0') sp(H, x, y - 1, 'h1');
        continue;
      }
      if (!filled(src, x + 1, y) || !filled(src, x + 2, y)) sp(H, x, y, 'h1');
      else if (!filled(src, x, y - 1) || !filled(src, x - 1, y)) sp(H, x, y, 'h2');
    }
  }
  // 머릿결
  if (st === 'curly') {
    for (let y = 0; y < FH; y++) {
      for (let x = 0; x < FW; x++) {
        if (gp(H, x, y) !== 'h0') continue;
        const k = (x * 3 + y * 5) % 7;
        if (k === 0) sp(H, x, y, 'h1');
        else if (k === 3 && y < 10 && x < 18) sp(H, x, y, 'h2');
      }
    }
  } else {
    const xs = dir === 'side' ? [10, 14, 20, 24] : dir === 'up' ? [9, 15, 21] : [8, 12, 16, 20, 24];
    const y0 = dir === 'up' ? 11 : 8;
    xs.forEach((x, j) => {
      for (let y = y0; y < FH; y++) {
        if (dir === 'up' && (y + j * 2) % 6 === 0) continue;
        if (gp(H, x, y) === 'h0' && filled(H, x, y + 2)) sp(H, x, y, 'h1');
      }
    });
  }
  // 빛 반사 띠
  const band: [number, number][] =
    dir === 'side'
      ? [[9, 5], [10, 5], [11, 5], [12, 5], [13, 5], [10, 6], [11, 6], [12, 6], [14, 4], [15, 4], [16, 4]]
      : [[8, 5], [9, 5], [10, 5], [11, 5], [12, 5], [9, 6], [10, 6], [11, 6], [13, 4], [14, 4], [15, 4], [16, 4], [19, 4], [20, 5]];
  band.forEach(([x, y]) => {
    if (filled(H, x, y) && gp(H, x, y) !== 'a0') sp(H, x, y, 'h2');
  });
  // 머리끝 가장 어둡게
  for (let y = 0; y < FH; y++) {
    for (let x = 0; x < FW; x++) {
      if (gp(H, x, y) === 'h1' && !filled(H, x, y + 1) && !filled(H, x + 1, y)) sp(H, x, y, 'h3');
    }
  }
}

function makeHair(dir: Dir, st: HairStyle): Layer {
  const H = blankLayer();
  if (dir === 'down') hairFront(H, st);
  else if (dir === 'up') hairBack(H, st);
  else hairSide(H, st);
  shadeHair(H, dir, st);
  return H;
}

/* ---------- 머리 / 얼굴 ---------- */
function makeHead(dir: Dir): Layer {
  const L = blankLayer();
  if (dir === 'side') {
    rr(L, 7, 6, 26, 25, [5, 3, 2, 1, 1], [4, 2, 1, 1], 's0');
    pts(L, [[6, 17], [6, 18], [5, 18]], 's0');
    shadeMat(L, 's', { light: false });
    rect(L, 16, 15, 17, 18, 's1');
    pts(L, [[16, 16], [16, 17]], 's3');
    rect(L, 9, 24, 22, 25, 's1');
  } else {
    rr(L, 5, 6, 26, 25, [5, 3, 2, 1, 1], [4, 2, 1, 1], 's0');
    rect(L, 4, 15, 4, 17, 's0');
    rect(L, 27, 15, 27, 17, 's1');
    shadeMat(L, 's', { light: false });
    rect(L, 8, 24, 23, 24, 's1');
    rect(L, 10, 25, 21, 25, 's1');
  }
  return L;
}

function makeFace(dir: Dir, st: EyeStyle): Layer {
  const F = blankLayer();
  if (dir === 'up') return F;
  if (dir === 'side') {
    if (st === 'round') { rect(F, 9, 15, 10, 18, 'e'); sp(F, 9, 16, 'w'); }
    if (st === 'smile') pts(F, [[8, 17], [9, 16], [10, 16], [11, 17]], 'e');
    if (st === 'sparkle') { rect(F, 8, 15, 10, 18, 'e'); sp(F, 9, 14, 'e'); sp(F, 8, 15, 'w'); sp(F, 10, 17, 'w'); }
    if (st === 'calm') { rect(F, 8, 17, 10, 17, 'e'); sp(F, 8, 16, 'e'); }
    pts(F, [[9, 13], [10, 13]], 'h3');
    pts(F, [[11, 20], [12, 20]], 'p');
    pts(F, [[7, 22], [8, 22]], 'm');
    return F;
  }
  const eye = (x: number) => {
    if (st === 'round') { rect(F, x, 15, x + 1, 18, 'e'); sp(F, x, 16, 'w'); }
    if (st === 'smile') pts(F, [[x - 1, 17], [x, 16], [x + 1, 16], [x + 2, 17]], 'e');
    if (st === 'sparkle') { rect(F, x - 1, 15, x + 1, 18, 'e'); sp(F, x, 14, 'e'); sp(F, x - 1, 15, 'w'); sp(F, x + 1, 17, 'w'); }
    if (st === 'calm') { rect(F, x - 1, 17, x + 1, 17, 'e'); sp(F, x - 1, 16, 'e'); }
  };
  eye(10);
  eye(20);
  pts(F, [[9, 13], [10, 13], [11, 13], [20, 13], [21, 13], [22, 13]], 'h3');
  pts(F, [[7, 20], [8, 20], [23, 20], [24, 20]], 'p');
  if (st === 'smile' || st === 'sparkle') pts(F, [[14, 21], [15, 22], [16, 22], [17, 21]], 'm');
  else pts(F, [[15, 22], [16, 22]], 'm');
  return F;
}

/* ---------- 몸 ---------- */
function makeBody(dir: Dir, top: TopStyle, bottom: BottomStyle): Layer {
  const B = blankLayer();
  if (dir === 'side') {
    rect(B, 14, 26, 18, 27, 's1');
    if (top === 'hoodie') rr(B, 17, 24, 23, 29, [2, 1], [1], 't1');
    rr(B, 11, 27, 21, 36, [2, 1], [], 't0');
    shadeMat(B, 't', { right2: true });
    if (top === 'tee') { pts(B, [[12, 27], [13, 27], [13, 28]], 't2'); sp(B, 14, 27, 's1'); }
    if (top === 'hoodie') { pts(B, [[12, 29], [12, 30], [12, 31]], 'w'); rect(B, 12, 33, 15, 33, 't1'); }
    if (top === 'shirt') { pts(B, [[11, 27], [12, 27], [12, 28], [13, 28]], 'w'); rect(B, 11, 29, 11, 34, 'a0'); sp(B, 11, 35, 'a1'); }
    if (bottom === 'skirt') {
      rr(B, 10, 37, 22, 42, [1], [], 'b0');
      for (let x = 12; x <= 21; x += 3) rect(B, x, 39, x, 42, 'b1');
      rect(B, 10, 42, 22, 42, 'b1');
    } else {
      rect(B, 11, 37, 21, 38, 'b0');
      rect(B, 11, 37, 21, 37, 'b1');
    }
    return B;
  }
  rect(B, 13, 26, 18, 27, 's1');
  if (top === 'hoodie') rr(B, 9, 25, 22, 29, [3, 1], [], 't1');
  rr(B, 9, 27, 22, 36, [2, 1], [], 't0');
  shadeMat(B, 't', { right2: true });
  if (dir === 'down') {
    if (top === 'tee') {
      rect(B, 13, 27, 18, 27, 's1');
      pts(B, [[14, 28], [15, 28], [16, 28], [17, 28], [15, 29], [16, 29]], 's1');
      pts(B, [[12, 27], [13, 28], [19, 27], [18, 28], [14, 29], [17, 29]], 't2');
      rect(B, 11, 31, 12, 32, 'a0');
      sp(B, 11, 31, 'a2');
    }
    if (top === 'hoodie') {
      rect(B, 13, 27, 18, 28, 's1');
      pts(B, [[14, 29], [17, 29], [14, 30], [17, 30], [14, 31], [17, 31]], 'w');
      rect(B, 12, 33, 19, 33, 't1');
      rect(B, 12, 34, 12, 35, 't1');
      rect(B, 19, 34, 19, 35, 't1');
    }
    if (top === 'shirt') {
      rect(B, 13, 27, 18, 27, 's1');
      pts(B, [[12, 27], [13, 28], [14, 28], [19, 27], [18, 28], [17, 28], [12, 28], [19, 28]], 'w');
      rect(B, 15, 28, 16, 33, 'a0');
      rect(B, 14, 34, 17, 34, 'a0');
      rect(B, 15, 35, 16, 35, 'a0');
      pts(B, [[16, 29], [16, 31], [16, 33], [17, 34]], 'a1');
    }
  } else if (top === 'hoodie') {
    rr(B, 10, 24, 21, 29, [3, 1], [2, 1], 't1');
    rect(B, 11, 25, 20, 27, 't3');
  }
  if (bottom === 'skirt') {
    rr(B, 8, 37, 23, 42, [1], [], 'b0');
    for (let x = 10; x <= 22; x += 3) rect(B, x, 39, x, 42, 'b1');
    rect(B, 8, 42, 23, 42, 'b1');
    rect(B, 9, 37, 22, 37, 'b1');
  } else {
    rect(B, 10, 37, 21, 38, 'b0');
    rect(B, 10, 37, 21, 37, 'b1');
    if (dir === 'down') sp(B, 15, 38, 'b1');
  }
  return B;
}

function makeArm(dir: Dir, which: 1 | 2, top: TopStyle): Layer {
  const A = blankLayer();
  const end = top === 'tee' ? 31 : 34;
  if (dir === 'side') {
    if (which === 1) {
      rr(A, 14, 28, 17, end, [1], [], 't0');
      rect(A, 17, 28, 17, end, 't1');
      rect(A, 14, 28, 14, end, 't2');
      rect(A, 14, end, 17, end, 't1');
      if (top === 'tee') rect(A, 15, 32, 16, 34, 's0');
      rr(A, 14, 35, 16, 37, [], [1], 's0');
      sp(A, 16, 36, 's1');
      sp(A, 15, 37, 's1');
    } else {
      rect(A, 18, 28, 20, end, 't1');
      rr(A, 18, 35, 20, 36, [], [1], 's1');
      if (top === 'tee') rect(A, 19, 32, 20, 34, 's1');
    }
    return A;
  }
  const x0 = which === 1 ? 6 : 23;
  const x1 = x0 + 2;
  rr(A, x0, 28, x1, end, [1], [], 't0');
  if (which === 1) rect(A, x0, 29, x0, end, 't2');
  else rect(A, x1, 29, x1, end, 't1');
  rect(A, x0, end, x1, end, top === 'shirt' ? 'w' : 't1');
  if (top === 'tee') rect(A, x0 + (which === 1 ? 1 : 0), 32, x1 - (which === 1 ? 0 : 1), 34, 's0');
  rr(A, x0, 35, x1, 37, [], [1], 's0');
  sp(A, which === 1 ? x1 : x0, 36, 's1');
  sp(A, x0 + 1, 37, 's1');
  return A;
}

function makeLeg(dir: Dir, which: 1 | 2, bottom: BottomStyle): Layer {
  const L = blankLayer();
  if (dir === 'side') {
    const front = which === 1;
    const x0 = front ? 12 : 16;
    const x1 = x0 + 3;
    const m = front ? 'b0' : 'b1';
    if (bottom === 'pants') {
      rect(L, x0, 38, x1, 43, m);
      if (front) { rect(L, x1, 38, x1, 43, 'b1'); rect(L, x0, 43, x1, 43, 'b1'); }
    }
    if (bottom === 'shorts') {
      rect(L, x0, 38, x1, 40, m);
      rect(L, x0 + 1, 41, x1 - 1, 43, front ? 's0' : 's1');
      if (front) rect(L, x0, 40, x1, 40, 'b1');
    }
    if (bottom === 'skirt') rect(L, x0 + 1, 42, x1 - 1, 43, front ? 's0' : 's1');
    if (front) {
      rect(L, 11, 44, 15, 44, 'o0');
      rect(L, 9, 45, 15, 45, 'o0');
      rect(L, 9, 46, 15, 46, 'o3');
      sp(L, 10, 45, 'o2');
      sp(L, 11, 44, 'o2');
    } else {
      rect(L, 15, 44, 19, 44, 'o1');
      rect(L, 14, 45, 19, 46, 'o1');
      rect(L, 14, 46, 19, 46, 'o3');
    }
    return L;
  }
  const x0 = which === 1 ? 11 : 17;
  const x1 = x0 + 3;
  const inner = which === 1 ? x1 : x0;
  if (bottom === 'pants') { rect(L, x0, 38, x1, 43, 'b0'); rect(L, inner, 38, inner, 43, 'b1'); rect(L, x0, 43, x1, 43, 'b1'); }
  if (bottom === 'shorts') {
    rect(L, x0, 38, x1, 40, 'b0');
    rect(L, x0, 40, x1, 40, 'b1');
    rect(L, x0 + (which === 1 ? 1 : 0), 41, x1 - (which === 1 ? 0 : 1), 43, 's0');
    sp(L, inner, 42, 's1');
  }
  if (bottom === 'skirt') rect(L, x0 + (which === 1 ? 1 : 0), 42, x1 - (which === 1 ? 0 : 1), 43, 's0');
  const sx0 = which === 1 ? 10 : 17;
  const sx1 = sx0 + 4;
  rect(L, sx0 + 1, 44, sx1 - (which === 1 ? 0 : 1), 44, 'o0');
  rect(L, sx0, 45, sx1, 45, 'o0');
  rect(L, sx0, 46, sx1, 46, 'o3');
  sp(L, sx0 + 1, 44, 'o2');
  sp(L, which === 1 ? sx0 + 1 : sx1 - 1, 45, 'o1');
  return L;
}

/* ---------- 소품 ---------- */
function makeAcc(dir: Dir, acc: AccStyle): Layer {
  const A = blankLayer();
  if (acc === 'glasses' && dir !== 'up') {
    if (dir === 'side') {
      rect(A, 7, 14, 12, 14, 'k'); rect(A, 7, 19, 12, 19, 'k'); rect(A, 7, 14, 7, 19, 'k'); rect(A, 12, 14, 12, 19, 'k');
      rect(A, 13, 15, 17, 15, 'k');
      pts(A, [[8, 15], [9, 15]], 'g');
    } else {
      [7, 18].forEach((x) => {
        rect(A, x, 14, x + 6, 14, 'k'); rect(A, x, 19, x + 6, 19, 'k'); rect(A, x, 14, x, 19, 'k'); rect(A, x + 6, 14, x + 6, 19, 'k');
        pts(A, [[x + 1, 15], [x + 2, 15]], 'g');
      });
      rect(A, 14, 15, 17, 15, 'k');
      pts(A, [[5, 15], [6, 15], [25, 15], [26, 15]], 'k');
    }
  }
  if (acc === 'headphones') {
    if (dir === 'side') {
      pts(A, [[12, 2], [13, 1], [14, 1], [15, 0], [16, 0], [17, 0], [18, 0], [19, 1], [20, 1], [21, 2]], 'k');
      rect(A, 22, 3, 22, 12, 'k');
      rr(A, 18, 12, 23, 20, [1], [1], 'a0');
      rect(A, 22, 13, 23, 19, 'a1');
      rect(A, 18, 13, 18, 19, 'a2');
    } else {
      rect(A, 8, 1, 23, 1, 'k');
      pts(A, [[6, 2], [7, 2], [24, 2], [25, 2], [5, 3], [26, 3], [4, 4], [27, 4]], 'k');
      rect(A, 3, 5, 3, 12, 'k');
      rect(A, 28, 5, 28, 12, 'k');
      rr(A, 1, 12, 5, 20, [1], [1], 'a0');
      rr(A, 26, 12, 30, 20, [1], [1], 'a0');
      rect(A, 1, 13, 1, 19, 'a2');
      rect(A, 30, 13, 30, 19, 'a1');
      rect(A, 26, 13, 26, 19, 'a1');
    }
  }
  if (acc === 'beanie') {
    const x0 = dir === 'side' ? 5 : 3;
    rr(A, x0, 1, 28, 10, [6, 3, 2, 1], [], 'a0');
    rect(A, x0, 9, 28, 11, 'a1');
    for (let x = x0 + 1; x <= 27; x += 2) rect(A, x, 9, x, 11, 'a3');
    rect(A, 14, 0, 17, 0, 'w');
    if (dir !== 'side') pts(A, [[8, 4], [9, 4], [10, 3], [11, 3]], 'a2');
  }
  return A;
}

/* ---------- 조립 ---------- */
function makeLayer(dir: Dir, layer: LayerName, p: Parts): Layer {
  switch (layer) {
    case 'hair': return makeHair(dir, p.hair);
    case 'face': return makeFace(dir, p.eyes);
    case 'head': return makeHead(dir);
    case 'body': return makeBody(dir, p.top, p.bottom);
    case 'arm1': return makeArm(dir, 1, p.top);
    case 'arm2': return makeArm(dir, 2, p.top);
    case 'leg1': return makeLeg(dir, 1, p.bottom);
    case 'leg2': return makeLeg(dir, 2, p.bottom);
    case 'acc': return makeAcc(dir, p.acc);
  }
}

export const PART_LAYERS: Record<keyof Parts, LayerName[]> = {
  hair: ['hair'],
  eyes: ['face'],
  top: ['body', 'arm1', 'arm2'],
  bottom: ['body', 'leg1', 'leg2'],
  acc: ['acc'],
};

export function buildLayers(p: Parts): CharLayers {
  const make = (dir: Dir) => ({
    acc: makeLayer(dir, 'acc', p), hair: makeLayer(dir, 'hair', p), face: makeLayer(dir, 'face', p),
    head: makeLayer(dir, 'head', p), arm1: makeLayer(dir, 'arm1', p), arm2: makeLayer(dir, 'arm2', p),
    body: makeLayer(dir, 'body', p), leg1: makeLayer(dir, 'leg1', p), leg2: makeLayer(dir, 'leg2', p),
  });
  return { down: make('down'), up: make('up'), side: make('side') };
}

// 파츠 하나만 바꿀 때: 해당 레이어만 새로 깔고 나머지(직접 그린 것)는 그대로 둔다
export function replacePart(ch: CharLayers, p: Parts, key: keyof Parts): void {
  for (const dir of DIRS) for (const l of PART_LAYERS[key]) ch[dir][l] = makeLayer(dir, l, p);
}
