import { useState } from 'react';
import { api, type PlayerDto } from '../api';

export default function Entry({ onEnter }: { onEnter: (me: PlayerDto) => void }) {
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = nickname.trim();
    if (!name) {
      setError('닉네임을 입력해 주세요');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      onEnter(await api.createPlayer(name));
    } catch {
      setError('입장하지 못했어요. 서버가 켜져 있는지 확인해 주세요');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="entry">
      <form className="card entry-card" onSubmit={submit}>
        <h1>우리반 <span>캠퍼스</span></h1>
        <p>내 캐릭터를 직접 만들고, 우리반이 만든 맵에서 같이 걸어 다녀요.</p>
        <label htmlFor="nickname">닉네임</label>
        <input id="nickname" data-testid="nickname" maxLength={12} value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="예: 김민준" autoFocus />
        {error && <div className="error" role="alert">{error}</div>}
        <button className="btn primary big" type="submit" disabled={busy} data-testid="enter">
          {busy ? '입장 중…' : '입장하기'}
        </button>
      </form>
    </div>
  );
}
