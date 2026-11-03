package com.woori.campus.world;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

/**
 * 지금 누가 어느 맵의 어디에 있는지. DB가 아니라 서버 메모리에만 있다 (껐다 켜면 사라져도 되는 정보).
 */
@Component
public class Presence {

    public static final class State {
        final Long id;
        final String nickname;
        final Long mapId;
        final String sessionId;
        volatile double x;
        volatile double y;
        volatile String face = "down";
        volatile boolean moving;
        volatile long lastMove;
        volatile long lastChat;

        State(Long id, String nickname, Long mapId, String sessionId, double x, double y) {
            this.id = id;
            this.nickname = nickname;
            this.mapId = mapId;
            this.sessionId = sessionId;
            this.x = x;
            this.y = y;
        }

        public PlayerView view() {
            return new PlayerView(id, nickname, x, y, face, moving);
        }
    }

    public record PlayerView(Long id, String nickname, double x, double y, String face, boolean moving) {
    }

    // mapId -> (playerId -> 상태)
    private final Map<Long, Map<Long, State>> maps = new ConcurrentHashMap<>();
    // sessionId -> 상태 (연결이 끊기면 정리하려고)
    private final Map<String, State> bySession = new ConcurrentHashMap<>();

    /** 들어오기. 다른 맵이나 다른 탭에 있던 같은 사람은 먼저 내보낸다. 내보낸 기록을 돌려준다. */
    public synchronized List<State> join(Long mapId, Long playerId, String nickname, String sessionId, double x, double y) {
        List<State> removed = maps.values().stream()
                .map(m -> m.remove(playerId))
                .filter(s -> s != null)
                .toList();
        removed.forEach(s -> bySession.remove(s.sessionId));
        State s = new State(playerId, nickname, mapId, sessionId, x, y);
        maps.computeIfAbsent(mapId, k -> new ConcurrentHashMap<>()).put(playerId, s);
        bySession.put(sessionId, s);
        return removed;
    }

    public Optional<State> find(Long mapId, Long playerId) {
        return Optional.ofNullable(maps.getOrDefault(mapId, Map.of()).get(playerId));
    }

    public Collection<State> in(Long mapId) {
        return maps.getOrDefault(mapId, Map.of()).values();
    }

    /** 연결이 끊긴 세션의 플레이어를 내보낸다. */
    public synchronized Optional<State> leave(String sessionId) {
        State s = bySession.remove(sessionId);
        if (s == null) {
            return Optional.empty();
        }
        Map<Long, State> m = maps.get(s.mapId);
        if (m != null) {
            m.remove(s.id, s);
        }
        return Optional.of(s);
    }
}
