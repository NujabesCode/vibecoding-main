import { useEffect, useMemo, useRef } from 'react';
import { buildPal } from '../engine/color';
import type { Design } from '../engine/design';
import { buildFrames, FH, FW, type Face } from '../engine/sprite';

// 디자인 하나를 받아 제자리에서 걷는 캐릭터를 그린다.
export default function Walker({ design, face = 'down', scale = 3, walking = true }: {
  design: Design;
  face?: Face;
  scale?: number;
  walking?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const frames = useMemo(() => buildFrames(design.layers, buildPal(design.palette)), [design]);
  useEffect(() => {
    let raf = 0;
    const tick = (now: number) => {
      const c = ref.current?.getContext('2d');
      if (c) {
        const i = walking ? Math.floor(now / 125) % 4 : 0;
        c.clearRect(0, 0, FW, FH);
        c.drawImage(frames[face][i], 0, 0);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [frames, face, walking]);
  return <canvas ref={ref} width={FW} height={FH} className="pixel" style={{ width: FW * scale, height: FH * scale }} />;
}
