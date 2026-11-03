-- 가구 공방에서 만든 가구/바닥 타일. 반 전체가 같이 쓰는 갤러리.
CREATE TABLE items (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    owner_id   BIGINT       NOT NULL,
    name       VARCHAR(20)  NOT NULL,
    kind       VARCHAR(10)  NOT NULL,
    width      INT          NOT NULL,
    height     INT          NOT NULL,
    solid      BOOLEAN      NOT NULL,
    pixels     LONGTEXT     NOT NULL,
    created_at DATETIME(6)  NOT NULL,
    CONSTRAINT fk_items_owner FOREIGN KEY (owner_id) REFERENCES players (id)
) DEFAULT CHARSET = utf8mb4;
