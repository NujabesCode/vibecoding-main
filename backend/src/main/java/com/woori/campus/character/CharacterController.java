package com.woori.campus.character;

import com.woori.campus.auth.CurrentPlayer;
import com.woori.campus.common.JsonShape;
import com.woori.campus.player.Player;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/characters")
public class CharacterController {

    // 3방향 x 9레이어를 RLE로 압축하면 보통 5~20KB. 넉넉하게 100KB까지만 받는다.
    static final int MAX_DESIGN_CHARS = 100_000;

    private final CharacterRepository characters;

    public CharacterController(CharacterRepository characters) {
        this.characters = characters;
    }

    public record SaveRequest(String design) {
    }

    public record CharacterResponse(Long playerId, String design) {
        static CharacterResponse of(CharacterDesign c) {
            return new CharacterResponse(c.getPlayerId(), c.getDesign());
        }
    }

    @GetMapping
    public List<CharacterResponse> list() {
        return characters.findAll().stream().map(CharacterResponse::of).toList();
    }

    @GetMapping("/{playerId}")
    public ResponseEntity<CharacterResponse> get(@PathVariable Long playerId) {
        return characters.findByPlayerId(playerId)
                .map(c -> ResponseEntity.ok(CharacterResponse.of(c)))
                .orElse(ResponseEntity.notFound().build());
    }

    // 저장은 "내 것"만. 주소에 남의 id를 넣는 방법 자체가 없다.
    @PutMapping("/me")
    @Transactional
    public CharacterResponse saveMine(@CurrentPlayer Player me, @RequestBody SaveRequest req) {
        JsonShape.check(req.design(), MAX_DESIGN_CHARS, "캐릭터", "parts", "palette", "layers");
        CharacterDesign c = characters.findByPlayerId(me.getId())
                .map(existing -> {
                    existing.changeDesign(req.design());
                    return existing;
                })
                .orElseGet(() -> characters.save(new CharacterDesign(me.getId(), req.design())));
        return CharacterResponse.of(c);
    }
}
