package com.woori.campus.world;

import com.woori.campus.map.GameMapRepository;
import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.annotation.SubscribeMapping;
import org.springframework.stereotype.Controller;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@Controller
public class WorldController {

    static final double MAX_COORD = 40 * 32;
    static final long MOVE_INTERVAL_MS = 40;
    static final long CHAT_INTERVAL_MS = 400;
    static final int MAX_CHAT = 80;
    static final Set<String> FACES = Set.of("down", "up", "left", "right");
    static final Set<String> EMOTES = Set.of("👋", "👏", "❤️", "😂", "🔥", "🎉");

    private final Presence presence;
    private final SimpMessagingTemplate broker;
    private final GameMapRepository maps;

    public WorldController(Presence presence, SimpMessagingTemplate broker, GameMapRepository maps) {
        this.presence = presence;
        this.broker = broker;
        this.maps = maps;
    }

    public record Pos(double x, double y, String face, boolean moving) {
    }

    public record Chat(String text) {
    }

    public record Emote(String emote) {
    }

    private static PlayerPrincipal me(Principal p) {
        return (PlayerPrincipal) p;
    }

    private static double clamp(double v) {
        if (Double.isNaN(v)) {
            return 0;
        }
        return Math.max(0, Math.min(MAX_COORD, v));
    }

    private void broadcast(Long mapId, Map<String, Object> event) {
        broker.convertAndSend("/topic/maps/" + mapId, event);
    }

    @MessageMapping("/maps/{mapId}/join")
    public void join(@DestinationVariable Long mapId, @Payload Pos pos, Principal principal, SimpMessageHeaderAccessor headers) {
        if (!maps.existsById(mapId)) {
            return;
        }
        PlayerPrincipal p = me(principal);
        List<Presence.State> moved = presence.join(mapId, p.id(), p.nickname(), headers.getSessionId(), clamp(pos.x()), clamp(pos.y()));
        moved.forEach(s -> broadcast(s.mapId, Map.of("type", "leave", "id", s.id)));
        presence.find(mapId, p.id()).ifPresent(s -> broadcast(mapId, Map.of("type", "join", "player", s.view())));
    }

    // 구독하는 순간 지금 맵에 있는 사람 목록을 한 번 돌려준다
    @SubscribeMapping("/maps/{mapId}/snapshot")
    public List<Presence.PlayerView> snapshot(@DestinationVariable Long mapId) {
        return presence.in(mapId).stream().map(Presence.State::view).toList();
    }

    @MessageMapping("/maps/{mapId}/move")
    public void move(@DestinationVariable Long mapId, @Payload Pos pos, Principal principal) {
        presence.find(mapId, me(principal).id()).ifPresent(s -> {
            long now = System.currentTimeMillis();
            if (now - s.lastMove < MOVE_INTERVAL_MS) {
                return;
            }
            s.lastMove = now;
            s.x = clamp(pos.x());
            s.y = clamp(pos.y());
            s.face = FACES.contains(pos.face()) ? pos.face() : "down";
            s.moving = pos.moving();
            broadcast(mapId, Map.of("type", "move", "id", s.id, "x", s.x, "y", s.y, "face", s.face, "moving", s.moving));
        });
    }

    @MessageMapping("/maps/{mapId}/chat")
    public void chat(@DestinationVariable Long mapId, @Payload Chat chat, Principal principal) {
        String text = chat.text() == null ? "" : chat.text().strip();
        if (text.isEmpty()) {
            return;
        }
        String safe = text.length() > MAX_CHAT ? text.substring(0, MAX_CHAT) : text;
        presence.find(mapId, me(principal).id()).ifPresent(s -> {
            long now = System.currentTimeMillis();
            if (now - s.lastChat < CHAT_INTERVAL_MS) {
                return;
            }
            s.lastChat = now;
            broadcast(mapId, Map.of("type", "chat", "id", s.id, "text", safe));
        });
    }

    @MessageMapping("/maps/{mapId}/emote")
    public void emote(@DestinationVariable Long mapId, @Payload Emote emote, Principal principal) {
        if (emote.emote() == null || !EMOTES.contains(emote.emote())) {
            return;
        }
        presence.find(mapId, me(principal).id())
                .ifPresent(s -> broadcast(mapId, Map.of("type", "emote", "id", s.id, "emote", emote.emote())));
    }

    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        presence.leave(event.getSessionId())
                .ifPresent(s -> broadcast(s.mapId, Map.of("type", "leave", "id", s.id)));
    }
}
