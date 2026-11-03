# 우리반 캠퍼스 · 작업 규칙

- 작업 전에 docs/ARCHITECTURE.md를 먼저 읽을 것
- 그림 엔진(frontend/src/engine)은 리액트를 import하지 않는 순수 함수로 유지
- DB 구조 변경은 반드시 새 Flyway 마이그레이션 파일로 (이미 있는 V 파일은 절대 수정 금지)
- 서버는 클라이언트를 믿지 않는다: 남의 데이터는 토큰으로 주인 확인, 입력은 크기·형식 검사
- 작업이 끝나면 docs/ARCHITECTURE.md도 같이 고칠 것
- "완료" = E2E 통과 + 정적 분석 통과 (frontend `npm run check`, backend `./gradlew build`)
- E2E가 실패하면 테스트를 고치지 말고 코드를 고칠 것
