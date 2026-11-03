package com.woori.campus.common;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

// 단위 테스트는 "틀리면 사고"인 검사 로직에만 붙인다
class JsonShapeTest {

    private static final String OK = "{\"v\":1,\"parts\":{},\"palette\":{},\"layers\":{}}";

    @Test
    void 올바른_모양은_통과한다() {
        assertDoesNotThrow(() -> JsonShape.check(OK, 1000, "캐릭터", "parts", "palette", "layers"));
    }

    @Test
    void 너무_크면_400() {
        ApiException e = assertThrows(ApiException.class,
                () -> JsonShape.check(OK, 10, "캐릭터", "parts"));
        assertEquals(HttpStatus.BAD_REQUEST, e.getStatus());
    }

    @Test
    void 깨진_JSON은_400() {
        assertThrows(ApiException.class, () -> JsonShape.check("{v:1", 1000, "캐릭터"));
    }

    @Test
    void 필수_키가_없으면_400() {
        assertThrows(ApiException.class,
                () -> JsonShape.check("{\"v\":1,\"parts\":{}}", 1000, "캐릭터", "parts", "layers"));
    }

    @Test
    void 버전이_다르면_400() {
        assertThrows(ApiException.class,
                () -> JsonShape.check("{\"v\":2,\"parts\":{}}", 1000, "캐릭터", "parts"));
    }
}
