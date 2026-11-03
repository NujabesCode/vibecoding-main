---
name: write-e2e
description: 우리반 캠퍼스의 E2E 테스트(Playwright)를 새로 쓰거나 고칠 때 사용
---

- 위치: `e2e/tests/<기능>.spec.ts`. 공통 동작은 `e2e/tests/helpers.ts` (`enter`, `uniqueName`, `myId`)
- 테스트 이름은 한국어 문장으로, 사용자가 겪는 일을 그대로: `'남의 맵은 저장할 수 없다'`
- 닉네임은 항상 `uniqueName()`으로. 테스트끼리 데이터가 섞이지 않게
- 요소는 `getByTestId` 우선, 그다음 `getByRole`. CSS 클래스로 찾지 않는다
- 기다릴 때 `waitForTimeout` 금지. `expect(...).toBeVisible()`처럼 조건으로 기다린다
- 보안 규칙은 화면이 아니라 `page.request`로 API를 직접 때려서 확인한다 (403/401이 와야 통과)
- 실시간 기능은 `browser.newContext()`로 사람 두 명을 만들어서 서로 보이는지 확인한다
- 실패하면 테스트를 고치지 말고 코드를 고친다
- 실행: `cd e2e && npx playwright test` (서버·화면은 자동으로 켜진다, MySQL은 미리 켜 둘 것)
