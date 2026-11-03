package com.woori.campus.player;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/players")
public class PlayerController {

    private final PlayerRepository players;

    public PlayerController(PlayerRepository players) {
        this.players = players;
    }

    public record CreatePlayerRequest(String nickname) {
    }

    public record PlayerResponse(Long id, String nickname) {
        static PlayerResponse of(Player p) {
            return new PlayerResponse(p.getId(), p.getNickname());
        }
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PlayerResponse create(@RequestBody CreatePlayerRequest req) {
        Player saved = players.save(new Player(req.nickname()));
        return PlayerResponse.of(saved);
    }

    @GetMapping
    public List<PlayerResponse> list() {
        return players.findAll().stream().map(PlayerResponse::of).toList();
    }
}
