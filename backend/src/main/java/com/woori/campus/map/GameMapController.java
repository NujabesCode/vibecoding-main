package com.woori.campus.map;

import com.fasterxml.jackson.databind.JsonNode;
import com.woori.campus.auth.CurrentPlayer;
import com.woori.campus.common.ApiException;
import com.woori.campus.common.JsonShape;
import com.woori.campus.player.Player;
import com.woori.campus.player.PlayerRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/maps")
public class GameMapController {

    static final int MAX_DATA_CHARS = 200_000;
    static final int MIN_SIZE = 8;
    static final int MAX_SIZE = 40;

    private final GameMapRepository maps;
    private final PlayerRepository players;

    public GameMapController(GameMapRepository maps, PlayerRepository players) {
        this.maps = maps;
        this.players = players;
    }

    public record SaveMapRequest(
            @NotBlank(message = "맵 이름을 입력해 주세요") @Size(max = 30, message = "맵 이름은 30자까지예요") String name,
            String data) {
    }

    public record MapSummary(Long id, String name, Long ownerId, String ownerName, LocalDateTime updatedAt) {
    }

    public record MapDetail(Long id, String name, Long ownerId, String data) {
        static MapDetail of(GameMap m) {
            return new MapDetail(m.getId(), m.getName(), m.getOwnerId(), m.getData());
        }
    }

    @GetMapping
    public List<MapSummary> list() {
        List<GameMap> all = maps.findAllByOrderByUpdatedAtDesc();
        Map<Long, String> names = players.findAllById(all.stream().map(GameMap::getOwnerId).distinct().toList())
                .stream().collect(Collectors.toMap(Player::getId, Player::getNickname, (a, b) -> a));
        return all.stream()
                .map(m -> new MapSummary(m.getId(), m.getName(), m.getOwnerId(), names.get(m.getOwnerId()), m.getUpdatedAt()))
                .toList();
    }

    @GetMapping("/{id}")
    public MapDetail get(@PathVariable Long id) {
        return MapDetail.of(find(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MapDetail create(@CurrentPlayer Player me, @Valid @RequestBody SaveMapRequest req) {
        checkData(req.data());
        return MapDetail.of(maps.save(new GameMap(me.getId(), req.name().strip(), req.data())));
    }

    @PutMapping("/{id}")
    @Transactional
    public MapDetail update(@CurrentPlayer Player me, @PathVariable Long id, @Valid @RequestBody SaveMapRequest req) {
        GameMap m = find(id);
        if (!m.getOwnerId().equals(me.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "내가 만든 맵만 고칠 수 있어요");
        }
        checkData(req.data());
        m.update(req.name().strip(), req.data());
        return MapDetail.of(m);
    }

    private GameMap find(Long id) {
        return maps.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "없는 맵이에요"));
    }

    // 모양 검사: 크기, 칸 수, 시작 위치가 맵 안에 있는지
    static void checkData(String raw) {
        JsonNode n = JsonShape.check(raw, MAX_DATA_CHARS, "맵", "floor", "objects", "blocked", "spawn");
        int w = n.path("w").asInt(-1);
        int h = n.path("h").asInt(-1);
        if (w < MIN_SIZE || h < MIN_SIZE || w > MAX_SIZE || h > MAX_SIZE) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "맵 크기가 올바르지 않아요");
        }
        if (n.path("floor").size() != w * h) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "바닥 칸 수가 맵 크기와 달라요");
        }
        int sx = n.path("spawn").path("x").asInt(-1);
        int sy = n.path("spawn").path("y").asInt(-1);
        if (sx < 0 || sy < 0 || sx >= w || sy >= h) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "시작 위치가 맵 밖이에요");
        }
    }
}
