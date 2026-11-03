package com.woori.campus.common;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;

/**
 * 클라이언트가 보낸 JSON 문자열을 저장하기 전에 최소한의 모양을 검사한다.
 * 크기 제한 → JSON 파싱 → 필수 키 확인 순서.
 */
public final class JsonShape {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private JsonShape() {
    }

    public static JsonNode check(String raw, int maxChars, String what, String... requiredObjectKeys) {
        if (raw == null || raw.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, what + " 데이터가 비어 있어요");
        }
        if (raw.length() > maxChars) {
            throw new ApiException(HttpStatus.BAD_REQUEST, what + " 데이터가 너무 커요");
        }
        JsonNode node;
        try {
            node = MAPPER.readTree(raw);
        } catch (JsonProcessingException e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, what + " 데이터 형식이 올바르지 않아요");
        }
        if (node == null || !node.isObject() || node.path("v").asInt() != 1) {
            throw new ApiException(HttpStatus.BAD_REQUEST, what + " 데이터 형식이 올바르지 않아요");
        }
        for (String key : requiredObjectKeys) {
            if (!node.path(key).isObject() && !node.path(key).isArray()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, what + " 데이터에 " + key + "가 없어요");
            }
        }
        return node;
    }
}
