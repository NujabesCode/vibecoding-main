package com.woori.campus.item;

import com.fasterxml.jackson.databind.JsonNode;
import com.woori.campus.auth.CurrentPlayer;
import com.woori.campus.common.ApiException;
import com.woori.campus.common.JsonShape;
import com.woori.campus.player.Player;
import com.woori.campus.player.PlayerRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/items")
public class ItemController {

    // 64x64 픽셀을 RLE로 압축하면 보통 2~10KB
    static final int MAX_PIXELS_CHARS = 60_000;

    private final ItemRepository items;
    private final PlayerRepository players;

    public ItemController(ItemRepository items, PlayerRepository players) {
        this.items = items;
        this.players = players;
    }

    public record CreateItemRequest(
            @NotBlank(message = "이름을 입력해 주세요") @Size(max = 20, message = "이름은 20자까지예요") String name,
            @NotNull @Pattern(regexp = "floor|object", message = "종류가 올바르지 않아요") String kind,
            @Min(1) @Max(2) int width,
            @Min(1) @Max(2) int height,
            boolean solid,
            String pixels) {
    }

    public record ItemResponse(Long id, Long ownerId, String ownerName, String name, String kind,
                               int width, int height, boolean solid, String pixels) {
    }

    @GetMapping
    public List<ItemResponse> list() {
        List<Item> all = items.findAllByOrderByIdDesc();
        Map<Long, String> names = players.findAllById(all.stream().map(Item::getOwnerId).distinct().toList())
                .stream().collect(Collectors.toMap(Player::getId, Player::getNickname, (a, b) -> a));
        return all.stream().map(i -> toResponse(i, names::get)).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ItemResponse create(@CurrentPlayer Player me, @Valid @RequestBody CreateItemRequest req) {
        if ("floor".equals(req.kind()) && (req.width() != 1 || req.height() != 1)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "바닥 타일은 1x1만 돼요");
        }
        JsonNode node = JsonShape.check(req.pixels(), MAX_PIXELS_CHARS, "가구");
        if (!node.path("px").isTextual()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "가구 데이터에 px가 없어요");
        }
        boolean solid = "object".equals(req.kind()) && req.solid();
        Item saved = items.save(new Item(me.getId(), req.name().strip(), req.kind(),
                req.width(), req.height(), solid, req.pixels()));
        return toResponse(saved, id -> me.getNickname());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@CurrentPlayer Player me, @PathVariable Long id) {
        Item item = items.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "없는 가구예요"));
        if (!item.getOwnerId().equals(me.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "내가 만든 가구만 지울 수 있어요");
        }
        items.delete(item);
    }

    private static ItemResponse toResponse(Item i, Function<Long, String> ownerName) {
        return new ItemResponse(i.getId(), i.getOwnerId(), ownerName.apply(i.getOwnerId()), i.getName(), i.getKind(),
                i.getWidth(), i.getHeight(), i.isSolid(), i.getPixels());
    }
}
