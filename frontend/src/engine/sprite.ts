// 캐릭터 한 장(32x48)을 레이어로 나눠 들고 있다가, 레이어를 조금씩 움직여 걷기 프레임을 만든다.
import { hexToRgb, mix, resolveColor, type Pal } from './color';

export const FW = 32;
export const FH = 48;
export const N = FW * FH;

export type Dir = 'down' | 'up' | 'side';
export type Face = 'down' | 'left' | 'right' | 'up';
export const DIRS: Dir[] = ['down', 'up', 'side'];
export const FACES: Face[] = ['down', 'left', 'right', 'up'];

export type LayerName = 'acc' | 'hair' | 'face' | 'head' | 'arm1' | 'arm2' | 'body' | 'leg1' | 'leg2';
export const LAYERS: LayerName[] = ['acc', 'hair', 'face', 'head', 'arm1', 'arm2', 'body', 'leg1', 'leg2'];

export type Layer = (string | null)[];
export type DirLayers = Record<LayerName, Layer>;
export type CharLayers = Record<Dir, DirLayers>;

export const ORDER: Record<Dir, LayerName[]> = {
  down: ['leg1', 'leg2', 'body', 'arm1', 'arm2', 'head', 'face', 'hair', 'acc'],
  up: ['leg1', 'leg2', 'body', 'arm1', 'arm2', 'head', 'face', 'hair', 'acc'],
  side: ['arm2', 'leg2', 'leg1', 'body', 'head', 'face', 'hair', 'acc', 'arm1'],
};

export const blankLayer = (): Layer => new Array<string | null>(N).fill(null);
export const inBounds = (x: number, y: number) => x >= 0 && y >= 0 && x < FW && y < FH;
export const getPx = <T>(L: (T | null)[], x: number, y: number): T | null => (inBounds(x, y) ? L[y * FW + x] : null);

const UPPER: LayerName[] = ['body', 'head', 'face', 'hair', 'acc', 'arm1', 'arm2'];

// 걷기 4프레임: 0=서기, 1=왼발, 2=서기, 3=오른발. 위쪽 몸은 통통 튀고, 다리는 번갈아, 팔은 반대로 흔든다.
export function frameOffset(dir: Dir, frame: number, layer: LayerName): [number, number] {
  if (frame % 2 === 0) return [0, 0];
  const a = frame === 1 ? 1 : -1;
  let dx = 0;
  let dy = 0;
  if (UPPER.includes(layer)) dy -= 1;
  if (dir === 'side') {
    if (layer === 'leg1') dx -= 2 * a;
    if (layer === 'leg2') dx += 2 * a;
    if (layer === 'arm1') dx += a;
    if (layer === 'arm2') dx -= a;
  } else {
    if (layer === 'leg1' && a === 1) dy -= 1;
    if (layer === 'leg2' && a === -1) dy -= 1;
    if (layer === 'arm1') dy += a;
    if (layer === 'arm2') dy -= a;
  }
  return [dx, dy];
}

const INK = '#170c26';

// 레이어를 합치고, 마무리로 이마 그림자 + 외곽선을 자동으로 넣는다.
export function compose(ch: CharLayers, pal: Pal, dir: Dir, frame: number, finish: boolean): (string | null)[] {
  const out: (string | null)[] = new Array(N).fill(null);
  const tag: (LayerName | null)[] = new Array(N).fill(null);
  for (const ln of ORDER[dir]) {
    const L = ch[dir][ln];
    const [dx, dy] = frameOffset(dir, frame, ln);
    for (let i = 0; i < N; i++) {
      const v = L[i];
      if (!v) continue;
      const x = (i % FW) + dx;
      const y = Math.floor(i / FW) + dy;
      if (!inBounds(x, y)) continue;
      out[y * FW + x] = resolveColor(v, pal);
      tag[y * FW + x] = ln;
    }
  }
  if (!finish) return out;

  // 앞머리 아래 피부에 그림자
  for (let y = 1; y < FH; y++) {
    for (let x = 0; x < FW; x++) {
      const k = y * FW + x;
      const above = tag[k - FW];
      const cur = out[k];
      if (tag[k] === 'head' && cur && (above === 'hair' || above === 'acc')) {
        out[k] = mix(cur, pal.s3, 0.55);
        const below = out[k + FW];
        if (y + 1 < FH && tag[k + FW] === 'head' && below) out[k + FW] = mix(below, pal.s1, 0.5);
      }
    }
  }

  // 외곽선: 바깥쪽 빈 칸에 이웃 색을 어둡게 섞어서. 빛은 왼쪽 위에서 온다.
  const o = out.slice();
  for (let y = 0; y < FH; y++) {
    for (let x = 0; x < FW; x++) {
      if (out[y * FW + x]) continue;
      const up = getPx(out, x, y - 1);
      const lf = getPx(out, x - 1, y);
      const rt = getPx(out, x + 1, y);
      const dn = getPx(out, x, y + 1);
      if (up) o[y * FW + x] = mix(up, INK, 0.72);
      else if (lf) o[y * FW + x] = mix(lf, INK, 0.66);
      else if (rt) o[y * FW + x] = mix(rt, INK, 0.6);
      else if (dn) o[y * FW + x] = mix(dn, INK, 0.55);
    }
  }
  // 머리카락과 얼굴 사이 안쪽 선
  for (let y = 0; y < FH - 1; y++) {
    for (let x = 0; x < FW; x++) {
      const k = y * FW + x;
      const v = o[k];
      if (tag[k] === 'hair' && tag[k + FW] === 'head' && v) o[k] = mix(v, INK, 0.35);
    }
  }
  return o;
}

export function pixelsToCanvas(arr: (string | null)[], flip = false): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = FW;
  cv.height = FH;
  const c = cv.getContext('2d');
  if (!c) return cv;
  const img = c.createImageData(FW, FH);
  for (let y = 0; y < FH; y++) {
    for (let x = 0; x < FW; x++) {
      const v = arr[y * FW + (flip ? FW - 1 - x : x)];
      if (!v) continue;
      const [r, g, b] = hexToRgb(v);
      const k = (y * FW + x) * 4;
      img.data[k] = r;
      img.data[k + 1] = g;
      img.data[k + 2] = b;
      img.data[k + 3] = 255;
    }
  }
  c.putImageData(img, 0, 0);
  return cv;
}

export type Frames = Record<Face, HTMLCanvasElement[]>;

// 4방향 x 4프레임. 오른쪽은 옆모습을 뒤집어서 만든다.
export function buildFrames(ch: CharLayers, pal: Pal): Frames {
  const f: Frames = { down: [], left: [], right: [], up: [] };
  for (let i = 0; i < 4; i++) {
    f.down.push(pixelsToCanvas(compose(ch, pal, 'down', i, true)));
    f.up.push(pixelsToCanvas(compose(ch, pal, 'up', i, true)));
    const side = compose(ch, pal, 'side', i, true);
    f.left.push(pixelsToCanvas(side, false));
    f.right.push(pixelsToCanvas(side, true));
  }
  return f;
}

// 128x192 스프라이트 시트: 줄마다 앞/왼/오/뒤, 칸마다 프레임 0~3
export function drawSheet(ctx: CanvasRenderingContext2D, frames: Frames) {
  ctx.clearRect(0, 0, FW * 4, FH * 4);
  FACES.forEach((face, row) => frames[face].forEach((f, i) => ctx.drawImage(f, i * FW, row * FH)));
}
