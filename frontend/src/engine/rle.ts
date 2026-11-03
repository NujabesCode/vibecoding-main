// 같은 값이 연속되면 "개수*값"으로 줄여 쓰는 압축 (Run-Length Encoding). 빈 칸은 값 없이 "12*".
export type Cells = (string | null)[];

export function encodeCells(cells: Cells): string {
  const out: string[] = [];
  let i = 0;
  while (i < cells.length) {
    const v = cells[i];
    let n = 1;
    while (i + n < cells.length && cells[i + n] === v) n++;
    out.push(n + '*' + (v ?? ''));
    i += n;
  }
  return out.join(',');
}

export function decodeCells(s: string, size: number): Cells {
  const cells: Cells = [];
  for (const tok of s.split(',')) {
    const star = tok.indexOf('*');
    const n = Number(tok.slice(0, star));
    const v = tok.slice(star + 1) || null;
    if (star < 1 || !Number.isInteger(n) || n < 1 || cells.length + n > size) throw new Error('bad cells');
    for (let k = 0; k < n; k++) cells.push(v);
  }
  if (cells.length !== size) throw new Error('bad cells length');
  return cells;
}
