// 이 브라우저에서 누구로 들어왔는지 기억한다.
import type { PlayerDto } from './api';

const KEY = 'campus.me';

export function loadMe(): PlayerDto | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as PlayerDto;
    return typeof v.id === 'number' && typeof v.nickname === 'string' ? v : null;
  } catch {
    return null;
  }
}

export function saveMe(me: PlayerDto): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(me));
  } catch {
    // 저장 못 해도 이번 접속 동안은 메모리로 쓴다
  }
}

export function clearMe(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // 무시
  }
}
