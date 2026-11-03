package com.woori.campus.player;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;

@Entity
@Table(name = "players")
public class Player {

    private static final SecureRandom RANDOM = new SecureRandom();

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 20)
    private String nickname;

    // 추측할 수 없는 32바이트 난수. 응답으로는 입장할 때 딱 한 번만 내려준다.
    @Column(nullable = false, unique = true, length = 64)
    private String token;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    protected Player() {
    }

    public Player(String nickname) {
        this.nickname = nickname;
        this.token = newToken();
        this.createdAt = LocalDateTime.now();
    }

    private static String newToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public Long getId() {
        return id;
    }

    public String getNickname() {
        return nickname;
    }

    public String getToken() {
        return token;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
