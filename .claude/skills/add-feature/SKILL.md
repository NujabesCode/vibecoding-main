---
name: add-feature
description: 우리반 캠퍼스에 새 기능(화면, API, 테이블)을 추가할 때 사용
---

1. docs/ARCHITECTURE.md를 읽고, 이 기능이 어느 폴더에 들어갈지 먼저 말한다
2. 서버
   - 패키지는 기능 이름으로: `com.woori.campus.<기능>` (Entity, Repository, Controller 한 폴더에)
   - 테이블이 필요하면 `backend/src/main/resources/db/migration/V<다음번호>__<설명>.sql` 새로 만든다
   - 쓰기 API는 `@CurrentPlayer`로 주인을 확인한다. 남의 것이면 403
   - 요청 DTO는 record + Bean Validation(`@NotBlank`, `@Size`)
3. 화면
   - 서버 호출은 `frontend/src/api.ts`에만 추가한다
   - 그림 계산은 `frontend/src/engine/`에 순수 함수로, 화면은 `frontend/src/pages/`에
   - 테스트에서 잡을 버튼·입력에는 `data-testid`를 단다
4. `e2e/tests/<기능>.spec.ts`에 사용자 시나리오를 E2E로 쓴다 (write-e2e 스킬)
5. 확인: `cd frontend && npm run check`, `cd backend && ./gradlew build`, `cd e2e && npx playwright test`
6. 전부 통과하면 update-docs 스킬로 문서를 고치고 커밋 하나
