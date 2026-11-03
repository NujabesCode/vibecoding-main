-- 입장할 때 서버가 발급하는 비밀 토큰. 이 토큰으로 "요청한 사람이 누구인지" 확인한다.
ALTER TABLE players ADD COLUMN token VARCHAR(64) NULL;

-- 정찰 단계에서 이미 만들어진 플레이어에게도 토큰을 채워 준다 (로그인은 다시 해야 함)
UPDATE players SET token = CONCAT(REPLACE(UUID(), '-', ''), REPLACE(UUID(), '-', '')) WHERE token IS NULL;

ALTER TABLE players MODIFY token VARCHAR(64) NOT NULL;
ALTER TABLE players ADD CONSTRAINT uk_players_token UNIQUE (token);
