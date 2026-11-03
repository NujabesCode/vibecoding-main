import { useEffect, useState } from 'react';
import { api, type MapSummaryDto, type Me } from '../api';

export default function MapList({ me, onBack, onEdit, onNew, onEnter }: {
  me: Me;
  onBack: () => void;
  onEdit: (id: number) => void;
  onNew: () => void;
  onEnter?: (id: number) => void;
}) {
  const [maps, setMaps] = useState<MapSummaryDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    api.listMaps().then((m) => alive && setMaps(m)).catch(() => alive && setError('맵 목록을 불러오지 못했어요'));
    return () => {
      alive = false;
    };
  }, []);
  return (
    <div className="wrap">
      <header className="top">
        <div className="brand">
          <button className="btn ghost" type="button" onClick={onBack}>← 로비</button>
          <div>
            <h1>우리반 <span>맵</span></h1>
            <p>직접 만든 맵에 반 친구들과 같이 들어가요</p>
          </div>
        </div>
        <div className="top-actions">
          <button className="btn primary" type="button" onClick={onNew} data-testid="new-map">새 맵 만들기</button>
        </div>
      </header>
      <section className="card">
        <h2>맵 목록 {maps ? `· ${maps.length}개` : ''}</h2>
        {error && <div className="error">{error}</div>}
        {maps && maps.length === 0 && <p className="dim">아직 맵이 없어요. 첫 맵을 만들어 보세요!</p>}
        <div className="map-list" data-testid="map-list">
          {maps?.map((m) => (
            <div key={m.id} className="map-row" data-testid={`map-${m.id}`}>
              <div>
                <b>{m.name}</b>
                <span>{m.ownerName} · {new Date(m.updatedAt).toLocaleString('ko-KR')}</span>
              </div>
              <div className="row-actions">
                {onEnter && <button className="btn primary" type="button" onClick={() => onEnter(m.id)} data-testid={`enter-map-${m.id}`}>입장</button>}
                <button className="btn" type="button" onClick={() => onEdit(m.id)}>{m.ownerId === me.id ? '고치기' : '구경하기'}</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
