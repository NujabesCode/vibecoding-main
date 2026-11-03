package com.woori.campus.map;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "maps")
public class GameMap {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "owner_id", nullable = false)
    private Long ownerId;

    @Column(nullable = false, length = 30)
    private String name;

    @Lob
    @Column(nullable = false, columnDefinition = "LONGTEXT")
    private String data;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected GameMap() {
    }

    public GameMap(Long ownerId, String name, String data) {
        this.ownerId = ownerId;
        this.name = name;
        this.data = data;
        this.updatedAt = LocalDateTime.now();
    }

    public void update(String name, String data) {
        this.name = name;
        this.data = data;
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public Long getOwnerId() {
        return ownerId;
    }

    public String getName() {
        return name;
    }

    public String getData() {
        return data;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
