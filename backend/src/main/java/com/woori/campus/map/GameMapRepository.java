package com.woori.campus.map;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GameMapRepository extends JpaRepository<GameMap, Long> {

    List<GameMap> findAllByOrderByUpdatedAtDesc();
}
