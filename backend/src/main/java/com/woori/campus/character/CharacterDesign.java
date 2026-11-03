package com.woori.campus.character;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "characters")
public class CharacterDesign {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "player_id", nullable = false, unique = true)
    private Long playerId;

    @Lob
    @Column(nullable = false, columnDefinition = "LONGTEXT")
    private String design;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected CharacterDesign() {
    }

    public CharacterDesign(Long playerId, String design) {
        this.playerId = playerId;
        this.design = design;
        this.updatedAt = LocalDateTime.now();
    }

    public void changeDesign(String design) {
        this.design = design;
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public Long getPlayerId() {
        return playerId;
    }

    public String getDesign() {
        return design;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
