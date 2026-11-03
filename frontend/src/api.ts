// 서버와 이야기하는 곳. 화면 코드에서는 fetch를 직접 쓰지 말고 여기 함수만 쓴다.

export interface PlayerDto {
  id: number;
  nickname: string;
}

export interface CharacterDto {
  playerId: number;
  design: string;
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${method} ${url} 실패 (${res.status})`);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  createPlayer: (nickname: string) => request<PlayerDto>('POST', '/api/players', { nickname }),
  listPlayers: () => request<PlayerDto[]>('GET', '/api/players'),
  listCharacters: () => request<CharacterDto[]>('GET', '/api/characters'),
  async getCharacter(playerId: number): Promise<CharacterDto | null> {
    const res = await fetch(`/api/characters/${playerId}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`캐릭터 불러오기 실패 (${res.status})`);
    return (await res.json()) as CharacterDto;
  },
  saveCharacter: (playerId: number, design: string) =>
    request<CharacterDto>('PUT', `/api/characters/${playerId}`, { design }),
};
