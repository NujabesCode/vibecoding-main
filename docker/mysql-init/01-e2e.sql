-- E2E 테스트 전용 DB. 수업용 데이터(campus)와 섞이지 않게 따로 쓴다.
CREATE DATABASE IF NOT EXISTS campus_e2e CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON campus_e2e.* TO 'campus'@'%';
FLUSH PRIVILEGES;
