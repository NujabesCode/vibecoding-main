import { useMemo } from 'react';
import { itemCanvas, TS, type ItemDraft } from '../engine/items';

// 가구 한 개를 이미지로 그린다. scale 배 크기 (도트가 안 뭉개지게 pixelated)
export default function ItemThumb({ item, scale = 2, finish = true }: { item: ItemDraft; scale?: number; finish?: boolean }) {
  const url = useMemo(() => itemCanvas(item, finish).toDataURL(), [item, finish]);
  return <img src={url} alt={item.name} className="pixel" width={item.w * TS * scale} height={item.h * TS * scale} />;
}
