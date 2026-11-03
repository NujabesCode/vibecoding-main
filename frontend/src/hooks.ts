import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
import { parseItem, type Item } from './engine/items';

// 반 전체 가구 갤러리. reload()로 다시 불러온다.
export function useItems() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    try {
      const list = await api.listItems();
      setItems(list.map(parseItem).filter((x): x is Item => x !== null));
      setError(null);
    } catch {
      setError('가구 목록을 불러오지 못했어요');
    }
  }, []);
  useEffect(() => {
    let alive = true;
    api
      .listItems()
      .then((list) => alive && setItems(list.map(parseItem).filter((x): x is Item => x !== null)))
      .catch(() => alive && setError('가구 목록을 불러오지 못했어요'));
    return () => {
      alive = false;
    };
  }, []);
  return { items, error, reload };
}
