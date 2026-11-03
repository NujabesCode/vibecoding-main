CREATE TABLE players (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    nickname   VARCHAR(20)  NOT NULL,
    created_at DATETIME(6)  NOT NULL
) DEFAULT CHARSET = utf8mb4;

CREATE TABLE characters (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    player_id  BIGINT       NOT NULL,
    design     LONGTEXT     NOT NULL,
    updated_at DATETIME(6)  NOT NULL,
    CONSTRAINT uk_characters_player UNIQUE (player_id),
    CONSTRAINT fk_characters_player FOREIGN KEY (player_id) REFERENCES players (id)
) DEFAULT CHARSET = utf8mb4;
