package com.woori.campus.item;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "items")
public class Item {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "owner_id", nullable = false)
    private Long ownerId;

    @Column(nullable = false, length = 20)
    private String name;

    /** floor = 바닥 타일, object = 가구 */
    @Column(nullable = false, length = 10)
    private String kind;

    /** 타일 칸 수 (1~2) */
    @Column(nullable = false)
    private int width;

    @Column(nullable = false)
    private int height;

    /** true면 캐릭터가 지나갈 수 없다 */
    @Column(nullable = false)
    private boolean solid;

    @Lob
    @Column(nullable = false, columnDefinition = "LONGTEXT")
    private String pixels;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    protected Item() {
    }

    public Item(Long ownerId, String name, String kind, int width, int height, boolean solid, String pixels) {
        this.ownerId = ownerId;
        this.name = name;
        this.kind = kind;
        this.width = width;
        this.height = height;
        this.solid = solid;
        this.pixels = pixels;
        this.createdAt = LocalDateTime.now();
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

    public String getKind() {
        return kind;
    }

    public int getWidth() {
        return width;
    }

    public int getHeight() {
        return height;
    }

    public boolean isSolid() {
        return solid;
    }

    public String getPixels() {
        return pixels;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
