// 서버와 이야기하는 곳. 화면 코드에서는 fetch를 직접 쓰지 말고 여기 함수만 쓴다.
import { loadMe } from './session';

export interface PlayerDto {
  id: number;
  nickname: string;
}

export interface Me extends PlayerDto {
  token: string;
}

export interface CharacterDto {
  playerId: number;
  design: string;
}

export interface ItemDto {
  id: number;
  ownerId: number;
  ownerName: string;
  name: string;
  kind: string;
  width: number;
  height: number;
  solid: boolean;
  pixels: string;
}

export interface NewItem {
  name: string;
  kind: 'floor' | 'object';
  width: number;
  height: number;
  solid: boolean;
  pixels: string;
}

export interface MapSummaryDto {
  id: number;
  name: string;
  ownerId: number;
  ownerName: string;
  updatedAt: string;
}

export interface MapDetailDto {
  id: number;
  name: string;
  ownerId: number;
  data: string;
}

export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const me = loadMe();
  if (me) headers.Authorization = `Bearer ${me.token}`;
  const res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  if (!res.ok) {
    let message = `요청이 실패했어요 (${res.status})`;
    try {
      const err = (await res.json()) as { message?: string };
      if (err.message) message = err.message;
    } catch {
      // 본문이 JSON이 아니면 기본 메시지
    }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

async function getOrNull<T>(url: string): Promise<T | null> {
  try {
    return await request<T>('GET', url);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export const api = {
  createPlayer: (nickname: string) => request<Me>('POST', '/api/players', { nickname }),
  listPlayers: () => request<PlayerDto[]>('GET', '/api/players'),
  listCharacters: () => request<CharacterDto[]>('GET', '/api/characters'),
  getCharacter: (playerId: number) => getOrNull<CharacterDto>(`/api/characters/${playerId}`),
  saveMyCharacter: (design: string) => request<CharacterDto>('PUT', '/api/characters/me', { design }),
  listItems: () => request<ItemDto[]>('GET', '/api/items'),
  createItem: (item: NewItem) => request<ItemDto>('POST', '/api/items', item),
  deleteItem: (id: number) => request<void>('DELETE', `/api/items/${id}`),
  listMaps: () => request<MapSummaryDto[]>('GET', '/api/maps'),
  getMap: (id: number) => request<MapDetailDto>('GET', `/api/maps/${id}`),
  createMap: (name: string, data: string) => request<MapDetailDto>('POST', '/api/maps', { name, data }),
  updateMap: (id: number, name: string, data: string) => request<MapDetailDto>('PUT', `/api/maps/${id}`, { name, data }),
};
