package com.woori.campus.player;

import com.woori.campus.auth.CurrentPlayer;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
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

    public record CreatePlayerRequest(
            @NotBlank(message = "닉네임을 입력해 주세요")
            @Size(max = 12, message = "닉네임은 12자까지예요")
            String nickname) {
    }

    public record PlayerResponse(Long id, String nickname) {
        public static PlayerResponse of(Player p) {
            return new PlayerResponse(p.getId(), p.getNickname());
        }
    }

    // 토큰은 입장 응답에만 들어간다
    public record EnterResponse(Long id, String nickname, String token) {
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public EnterResponse create(@Valid @RequestBody CreatePlayerRequest req) {
        Player saved = players.save(new Player(req.nickname().strip()));
        return new EnterResponse(saved.getId(), saved.getNickname(), saved.getToken());
    }

    @GetMapping
    public List<PlayerResponse> list() {
        return players.findAll().stream().map(PlayerResponse::of).toList();
    }

    @GetMapping("/me")
    public PlayerResponse me(@CurrentPlayer Player me) {
        return PlayerResponse.of(me);
    }
}
