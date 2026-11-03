// 실시간 연결 (WebSocket + STOMP). 토큰을 CONNECT 헤더로 보내서 서버가 누구인지 알게 한다.
import { Client } from '@stomp/stompjs';

export interface PlayerView {
  id: number;
  nickname: string;
  x: number;
  y: number;
  face: 'down' | 'up' | 'left' | 'right';
  moving: boolean;
}

export type WorldEvent =
  | { type: 'join'; player: PlayerView }
  | { type: 'leave'; id: number }
  | { type: 'move'; id: number; x: number; y: number; face: PlayerView['face']; moving: boolean }
  | { type: 'chat'; id: number; text: string }
  | { type: 'emote'; id: number; emote: string };

export interface WorldConnection {
  move: (x: number, y: number, face: string, moving: boolean) => void;
  chat: (text: string) => void;
  emote: (emote: string) => void;
  close: () => void;
}

export function connectWorld(opts: {
  mapId: number;
  token: string;
  start: { x: number; y: number };
  onEvent: (e: WorldEvent) => void;
  onSnapshot: (players: PlayerView[]) => void;
  onStatus: (connected: boolean) => void;
}): WorldConnection {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  let last = { x: opts.start.x, y: opts.start.y, face: 'down', moving: false };
  const client = new Client({
    brokerURL: `${proto}://${location.host}/ws`,
    connectHeaders: { Authorization: `Bearer ${opts.token}` },
    reconnectDelay: 2000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    onConnect: () => {
      opts.onStatus(true);
      client.subscribe(`/topic/maps/${opts.mapId}`, (msg) => {
        try {
          opts.onEvent(JSON.parse(msg.body) as WorldEvent);
        } catch {
          // 이상한 메시지는 무시
        }
      });
      client.publish({ destination: `/app/maps/${opts.mapId}/join`, body: JSON.stringify(last) });
      const snap = client.subscribe(`/app/maps/${opts.mapId}/snapshot`, (msg) => {
        try {
          opts.onSnapshot(JSON.parse(msg.body) as PlayerView[]);
        } finally {
          snap.unsubscribe();
        }
      });
    },
    onWebSocketClose: () => opts.onStatus(false),
    onStompError: () => opts.onStatus(false),
  });
  client.activate();
  const send = (what: string, body: unknown) => {
    if (client.connected) client.publish({ destination: `/app/maps/${opts.mapId}/${what}`, body: JSON.stringify(body) });
  };
  return {
    move: (x, y, face, moving) => {
      last = { x, y, face, moving };
      send('move', last);
    },
    chat: (text) => send('chat', { text }),
    emote: (emote) => send('emote', { emote }),
    close: () => {
      void client.deactivate();
    },
  };
}
