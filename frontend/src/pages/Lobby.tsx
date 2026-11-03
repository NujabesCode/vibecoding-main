import { useEffect, useState } from 'react';
import { api, type PlayerDto } from '../api';
import Walker from '../components/Walker';
import { parseDesign, type Design } from '../engine/design';

interface Friend {
  id: number;
  nickname: string;
  design: Design | null;
}

export default function Lobby({ me, onStudio, onWorkshop, onLogout }: { me: PlayerDto; onStudio: () => void; onWorkshop: () => void; onLogout: () => void }) {
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([api.listPlayers(), api.listCharacters()])
      .then(([players, chars]) => {
        if (!alive) return;
        const byId = new Map(chars.map((c) => [c.playerId, c.design]));
        setFriends(
          players.map((p) => {
            const raw = byId.get(p.id);
            return { id: p.id, nickname: p.nickname, design: raw ? parseDesign(raw) : null };
          }),
        );
      })
      .catch(() => alive && setError('친구 목록을 불러오지 못했어요'));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="wrap">
      <header className="top">
        <div className="brand">
          <div>
            <h1>우리반 <span>캠퍼스</span></h1>
            <p>{me.nickname}님, 반가워요</p>
          </div>
        </div>
        <div className="top-actions">
          <button className="btn primary" type="button" onClick={onStudio} data-testid="go-studio">내 캐릭터 꾸미기</button>
          <button className="btn" type="button" onClick={onWorkshop} data-testid="go-workshop">가구 공방</button>
          <button className="btn ghost" type="button" onClick={onLogout}>나가기</button>
        </div>
      </header>
      <section className="card">
        <h2>우리반 친구들 {friends ? `· ${friends.filter((f) => f.design).length}명 완성` : ''}</h2>
        {error && <div className="error">{error}</div>}
        {!friends && !error && <p className="dim">불러오는 중…</p>}
        {friends && friends.length === 0 && <p className="dim">아직 아무도 없어요. 첫 번째로 캐릭터를 만들어 보세요!</p>}
        <div className="friends" data-testid="friends">
          {friends?.map((f) => (
            <div className={'friend' + (f.id === me.id ? ' me' : '')} key={f.id} data-testid={`friend-${f.id}`}>
              {f.design ? <Walker design={f.design} scale={2} /> : <div className="friend-empty">아직<br />만드는 중</div>}
              <span>{f.nickname}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
