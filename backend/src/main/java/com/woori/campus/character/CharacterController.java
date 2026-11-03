package com.woori.campus.character;

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

    @PutMapping("/{playerId}")
    @Transactional
    public CharacterResponse save(@PathVariable Long playerId, @RequestBody SaveRequest req) {
        CharacterDesign c = characters.findByPlayerId(playerId)
                .map(existing -> {
                    existing.changeDesign(req.design());
                    return existing;
                })
                .orElseGet(() -> characters.save(new CharacterDesign(playerId, req.design())));
        return CharacterResponse.of(c);
    }
}
