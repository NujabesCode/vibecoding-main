package com.woori.campus.character;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CharacterRepository extends JpaRepository<CharacterDesign, Long> {

    Optional<CharacterDesign> findByPlayerId(Long playerId);
}
