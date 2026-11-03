// 이 브라우저에서 누구로 들어왔는지 기억한다. 토큰은 서버가 "나"를 알아보는 열쇠.
import type { Me } from './api';

const KEY = 'campus.me';

export function loadMe(): Me | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Me;
    // 토큰 없는 옛날(정찰 단계) 기록은 버리고 다시 입장하게 한다
    return typeof v.id === 'number' && typeof v.nickname === 'string' && typeof v.token === 'string' ? v : null;
  } catch {
    return null;
  }
}

export function saveMe(me: Me): void {
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
