package com.woori.campus.world;

import java.security.Principal;

/** WebSocket 연결 하나 = 플레이어 한 명. 이름은 플레이어 id 문자열. */
public record PlayerPrincipal(Long id, String nickname) implements Principal {

    @Override
    public String getName() {
        return String.valueOf(id);
    }
}
