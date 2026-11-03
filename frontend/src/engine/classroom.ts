// 캐릭터 공방 오른쪽의 "미리 걸어보기" 교실 배경. 16px 타일, 12 x 10칸.
export const RW = 12;
export const RH = 10;
export const T = 16;

export interface Block {
  x: number;
  y: number;
  w: number;
  h: number;
}

const px = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, col: string) => {
  c.fillStyle = col;
  c.fillRect(x, y, w, h);
};
const obox = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, line: string) => {
  px(c, x, y, w, h, line);
  px(c, x + 1, y + 1, w - 2, h - 2, fill);
};

export function buildClassroom(): { canvas: HTMLCanvasElement; blocks: Block[] } {
  const canvas = document.createElement('canvas');
  canvas.width = RW * T;
  canvas.height = RH * T;
  const blocks: Block[] = [];
  const c = canvas.getContext('2d');
  if (!c) return { canvas, blocks };
  // 마루
  for (let y = 4 * T; y < RH * T; y += 8) {
    const row = y / 8;
    px(c, 0, y, RW * T, 8, row % 2 ? '#dcb98d' : '#d6b284');
    px(c, 0, y + 7, RW * T, 1, '#bf9566');
    for (let x = (row * 37) % 48; x < RW * T; x += 48) px(c, x, y, 1, 7, '#c39b6c');
    px(c, 0, y, RW * T, 1, 'rgba(255,255,255,.12)');
  }
  // 벽
  px(c, 0, 0, RW * T, 4 * T, '#efe4d3');
  for (let x = 0; x < RW * T; x += 8) px(c, x, 6, 1, 4 * T - 10, '#e6d8c3');
  px(c, 0, 0, RW * T, 5, '#4b3f5c');
  px(c, 0, 5, RW * T, 1, '#6b5e7d');
  px(c, 0, 4 * T - 6, RW * T, 6, '#a8794f');
  px(c, 0, 4 * T - 6, RW * T, 1, '#c4935f');
  px(c, 0, 4 * T, RW * T, 2, 'rgba(60,40,30,.18)');
  // 창문
  for (const [x, y] of [[6, 12], [146, 12]]) {
    obox(c, x, y, 40, 30, '#bde5f4', '#6b4e36');
    px(c, x + 19, y + 1, 2, 28, '#6b4e36');
    px(c, x + 1, y + 14, 38, 2, '#6b4e36');
    px(c, x + 4, y + 4, 6, 2, '#fff');
    px(c, x + 4, y + 6, 3, 2, '#fff');
    px(c, x - 2, y + 30, 44, 3, '#8a6a4a');
  }
  // 칠판
  {
    const x = 52;
    const y = 12;
    obox(c, x, y, 88, 38, '#2f5a4a', '#4a3424');
    px(c, x + 10, y + 10, 30, 2, '#dfe9e4');
    px(c, x + 10, y + 16, 44, 2, '#dfe9e4');
    px(c, x + 10, y + 22, 24, 2, '#dfe9e4');
    const heart = [[66, 12], [67, 11], [68, 11], [69, 12], [70, 11], [71, 11], [72, 12], [72, 13], [71, 14], [70, 15], [69, 16], [68, 15], [67, 14], [66, 13]];
    for (const [a, b] of heart) px(c, x + a - 8, y + b, 1, 1, '#ffcf4a');
    px(c, x + 4, y + 38, 80, 3, '#8a6a4a');
    px(c, x + 62, y + 35, 8, 3, '#f4f4f4');
  }
  // 러그
  {
    const x = 2 * T;
    const y = 6 * T + 8;
    const w = 8 * T;
    const h = 3 * T;
    px(c, x, y, w, h, '#7d73c9');
    px(c, x + 2, y + 2, w - 4, h - 4, '#f1e6cf');
    px(c, x + 4, y + 4, w - 8, h - 8, '#8f86d8');
    for (let i = 0; i < w - 12; i += 8) px(c, x + 6 + i, y + 6, 4, h - 12, 'rgba(255,255,255,.08)');
  }
  // 책상 + 노트북
  for (const [x, y] of [[4, 5 * T], [10 * T, 5 * T]]) {
    px(c, x + 2, y + 20, 28, 4, 'rgba(0,0,0,.18)');
    obox(c, x, y + 4, 28, 18, '#b98552', '#5a3a22');
    px(c, x + 1, y + 5, 26, 3, '#cf9b65');
    px(c, x + 3, y + 21, 3, 5, '#5a3a22');
    px(c, x + 22, y + 21, 3, 5, '#5a3a22');
    obox(c, x + 8, y - 4, 14, 10, '#2b3448', '#3a3f52');
    px(c, x + 10, y - 2, 8, 1, '#7ee0b0');
    px(c, x + 10, y, 5, 1, '#ffcf4a');
    px(c, x + 6, y + 6, 18, 3, '#c9d0dc');
    blocks.push({ x, y: y + 4, w: 28, h: 22 });
  }
  // 화분
  for (const [x, y] of [[0, 8 * T], [11 * T, 8 * T]]) {
    px(c, x + 3, y + 26, 12, 3, 'rgba(0,0,0,.18)');
    obox(c, x + 3, y + 16, 12, 12, '#c96f4a', '#7a3d24');
    px(c, x + 4, y + 17, 10, 2, '#e08a63');
    for (const [cx, cy, r, col] of [[9, 8, 7, '#3f8a46'], [5, 11, 5, '#4fa056'], [13, 11, 5, '#4fa056'], [9, 4, 4, '#62b765']] as const) {
      c.fillStyle = '#2e5c33';
      c.beginPath();
      c.arc(x + cx, y + cy, r + 1, 0, 7);
      c.fill();
      c.fillStyle = col;
      c.beginPath();
      c.arc(x + cx, y + cy, r, 0, 7);
      c.fill();
    }
    blocks.push({ x, y: y + 14, w: 16, h: 16 });
  }
  // 교탁
  {
    const x = 4 * T + 8;
    const y = 4 * T + 4;
    px(c, x + 2, y + 18, 44, 4, 'rgba(0,0,0,.18)');
    obox(c, x, y, 48, 20, '#9a6a40', '#4a2f1e');
    px(c, x + 1, y + 1, 46, 3, '#b8834f');
    obox(c, x + 6, y - 6, 12, 8, '#fffaf0', '#b9b0a0');
    px(c, x + 30, y - 4, 8, 6, '#ff8f6b');
    blocks.push({ x, y, w: 48, h: 22 });
  }
  blocks.push({ x: 0, y: 0, w: RW * T, h: 4 * T + 2 });
  return { canvas, blocks };
}

export function isFree(blocks: Block[], x: number, y: number): boolean {
  if (x < 7 || y < 4 * T + 8 || x > RW * T - 7 || y > RH * T - 3) return false;
  for (const b of blocks) if (x > b.x - 5 && x < b.x + b.w + 5 && y > b.y && y < b.y + b.h + 3) return false;
  return true;
}
