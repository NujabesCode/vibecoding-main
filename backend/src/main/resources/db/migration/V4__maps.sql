-- 맵 에디터로 만든 맵. 바닥/가구/벽/시작 위치를 JSON 하나로 저장한다.
CREATE TABLE maps (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    owner_id   BIGINT       NOT NULL,
    name       VARCHAR(30)  NOT NULL,
    data       LONGTEXT     NOT NULL,
    updated_at DATETIME(6)  NOT NULL,
    CONSTRAINT fk_maps_owner FOREIGN KEY (owner_id) REFERENCES players (id)
) DEFAULT CHARSET = utf8mb4;
