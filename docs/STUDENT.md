# 학생용 따라치기 시트 · 우리반 캠퍼스

선생님이 "**07번**" 하면 07번 줄을 친다. 번호는 3일 내내 이어진다.

## 시작 전

### 따라치기 규칙

1. 프롬프트는 **이 시트에서 복사해서 그대로** Claude Code에 붙여넣는다. 요약하거나 바꾸지 않는다.
2. AI가 쓴 코드는 선생님 화면과 글자가 다르다. 정상이다. 👀 표시에 적힌 것만 같으면 성공.
3. Claude가 "파일을 만들어도 될까요?", "이 명령을 실행해도 될까요?"라고 물으면 **Yes**. 같은 종류를 또 묻지 않게 하는 보기가 있으면 그걸 고른다.
4. Claude가 일하는 동안 다른 터미널에서 코드를 고치지 않는다.
5. 10분 넘게 막히면 손을 들고, 안 되면 맨 아래 **따라잡기**.

### 설치 확인 (수업 전날)

**`00`** 터미널(윈도우는 PowerShell)에서 하나씩

```bash
java -version
node -v
git --version
docker compose version
claude --version
```

👀 `java` → **21**, `node` → **v22**, 나머지는 버전이 나오면 OK. Docker Desktop은 켜 둔다. 디스크는 10GB 이상 비워 둔다.

### 스타터 키트

`starter/my-campus-starter.zip` 하나만 받는다 (이 저장소의 `starter` 폴더 → zip 파일 → Download). 들어 있는 건 세 가지다.

| 들어 있는 것 | 왜 주는가 |
|---|---|
| 빈 뼈대 (스프링 + 리액트 + MySQL + E2E 설정, 버전 고정) | 버전이 제각각이면 반 전체가 다른 에러를 만난다 |
| `frontend/src/engine/` 캐릭터 그림 엔진 | 픽셀아트 파츠는 선생님이 손으로 다듬은 것. 프롬프트로는 같은 그림이 안 나온다 |
| `reference/items.ts`, `deploy/` | 가구 그림 참고용(Day 2), 배포 설정(Day 3) |

나머지 기능은 전부 수업 시간에 Claude Code와 같이 만든다.

## Day 1 오전 · 켜기 + STEP 1 정찰

### 빈 폴더에서 켜기

**`01`** 작업 폴더 만들기

```bash
# 윈도우 (PowerShell)
mkdir C:\dev; cd C:\dev
# 맥
mkdir -p ~/dev && cd ~/dev
```

**`02`** 받은 스타터 압축 풀기 (다운로드 폴더에 받았다면)

```bash
# 윈도우
tar -xf $HOME\Downloads\my-campus-starter.zip
# 맥
unzip ~/Downloads/my-campus-starter.zip
```

👀 `dev` 안에 `my-campus` 폴더가 생긴다.

**`03`** 내 이름으로 git 시작 (이름·이메일은 본인 것)

```bash
cd my-campus
git config --global user.name "홍길동"
git config --global user.email "me@example.com"
git init
git add -A
git commit -m "스타터"
```

**`04`** MySQL 켜기 (터미널 ①, `my-campus` 폴더에서)

```bash
docker compose up -d
```

👀 `Container campus-mysql Started`

**`05`** 서버 켜기 (새 터미널 ②)

```bash
cd C:\dev\my-campus\backend      # 맥: cd ~/dev/my-campus/backend
.\gradlew bootRun                # 맥: ./gradlew bootRun
```

👀 처음에는 다운로드에 3~5분. 마지막에 `Started CampusApplication`. 위에 노란 `WARN` 두 줄(`Flyway upgrade recommended`, `No migrations found`)은 정상이다. 이 터미널은 계속 켜 둔다.

**`06`** 화면 켜기 (새 터미널 ③)

```bash
cd C:\dev\my-campus\frontend     # 맥: cd ~/dev/my-campus/frontend
npm install
npm run dev
```

👀 윈도우 방화벽 창이 뜨면 **허용**. 브라우저에서 `http://localhost:5173` → "우리반 캠퍼스 / 준비 완료!"

### STEP 1 · 정찰 (버릴 각오로 빠르게)

**`07`** 정찰 브랜치 + Claude Code 켜기 (새 터미널 ④, `my-campus` 폴더에서)

```bash
cd C:\dev\my-campus               # 맥: cd ~/dev/my-campus
git switch -c scout
claude
```

👀 처음이면 "이 폴더를 믿을까요?" → **Yes**.

**`08`** 프롬프트 · 정찰 기능

```text
이 프로젝트는 스프링부트 3.5(Java 21) + 리액트 19(Vite, TypeScript) + MySQL 뼈대만 있는 상태야.
버전과 설정 파일(build.gradle, settings.gradle, package.json, tsconfig.json, vite.config.ts, eslint.config.js, docker-compose.yml, e2e/playwright.config.ts)은 바꾸지 마.

frontend/src/engine/ 에 캐릭터 그림 엔진이 있어. (design.ts의 newDesign/serializeDesign/parseDesign, sprite.ts의 buildFrames)
엔진 파일은 고치지 말고 가져다 쓰기만 해.
이걸 써서 정찰 버전을 짧게 만들어줘. 디자인은 신경 쓰지 말고 돌아가는 것만.
1. 닉네임 입력 → POST /api/players → {id, nickname}을 localStorage에
2. 캐릭터 공방: 파츠 고르기 + 32x48 픽셀 에디터 + 4방향 걷기 미리보기 → 저장 버튼
   저장은 PUT /api/characters/{playerId} 로 design(JSON 문자열)을 통째로
3. 로비: 반 친구들 캐릭터가 제자리에서 걷는 카드 목록
테이블은 backend/src/main/resources/db/migration/V1__init.sql (Flyway)로만 만들어.
끝나면 기술 선택 이유와, 서버·화면을 다시 켜야 하는지 알려줘.
```

👀 Claude가 10~20분 동안 파일을 만든다. 끝날 때까지 기다린다.

**`09`** 서버 다시 켜기 (터미널 ②에서 `Ctrl + C` 후)

```bash
.\gradlew bootRun                # 맥: ./gradlew bootRun
```

👀 `Migrating schema ... to version "1 - init"` 그리고 `Started CampusApplication`. 화면(③)은 자동으로 새로고침된다.

**`10`** 눈으로 확인

1. `http://localhost:5173` → 닉네임 입장 → 공방에서 머리 바꾸고 몇 칸 칠하기 → 저장
2. 시크릿 창(`Ctrl + Shift + N`)으로 다른 닉네임 입장 → 저장

👀 로비에 두 캐릭터가 제자리에서 걷고 있다. 안 되면 Claude에게 보이는 그대로 말한다: `저장 누르면 빨간 글씨로 "…"가 떠. 고쳐줘`

**`11`** 커밋 (Claude 입력창에 `!`로 시작하면 명령이 바로 실행된다. 앞으로 커밋은 전부 이렇게)

```bash
! git add -A && git commit -m "정찰: 캐릭터 공방 + 저장"
```

## Day 1 오후 · 문서화 → 정독 → 규칙

### STEP 2 · 문서화

**`12`** 프롬프트

```text
이 코드를 처음 보는 개발자에게 설명하는 문서를 docs/ARCHITECTURE.md로 써줘.
· 폴더 구조와 핵심 파일별 역할
· 데이터가 흐르는 순서 (입장 → 공방 → 저장 → 로비)
· 캐릭터 그림이 어떻게 만들어지는지 (레이어, 물감 코드, 걷기 프레임)
· 네가 내린 결정과 그 이유 (표로)
· 임시방편으로 때운 곳, 확실하지 않은 곳은 "찜찜한 곳"으로 따로
```

👀 `docs/ARCHITECTURE.md`가 생기고, "찜찜한 곳"에 남의 캐릭터를 덮어쓸 수 있다는 내용이 있다. 없으면 `13`.

**`13`** (찜찜한 곳에 덮어쓰기 구멍이 없을 때만)

```text
다른 사람이 내 캐릭터를 덮어쓸 수 있어? 코드를 확인해보고 그렇다면 찜찜한 곳에 추가해줘.
```

**`14`** 커밋

```bash
! git add -A && git commit -m "문서화: ARCHITECTURE.md"
```

### STEP 3 · 정독 (코드는 한 줄도 안 본다)

**`15`** `docs/ARCHITECTURE.md`를 IDE에서 열고 끝까지 읽는다. 짝과 문서만 보고 답한다.

- 서버는 저장 요청을 보낸 사람이 누구인지 어떻게 아는가?
- 디자인 JSON이 1GB면 어떻게 되는가?
- 색만 바꿨는데 직접 그린 부분까지 바뀌는 이유는?
- 메타버스 화면에서 이 엔진을 그대로 쓸 수 있는가?

**`16`** `docs/REVIEW.md` 파일을 만들고 **직접** 쓴다. 틀은 이걸 복사해서 채운다.

```markdown
# 설계 리뷰

## 고칠 것 (중요한 순서)
| 순위 | 문제 | 왜 위험한가 | 어떻게 고칠까 |
|---|---|---|---|
| 1 | 아무나 남의 캐릭터를 덮어쓸 수 있다 | 주소의 id만 바꾸면 남의 캐릭터가 바뀐다 | 입장할 때 토큰 발급, 내 것만 저장 |
| 2 | | | |
| 3 | | | |
| 4 | | | |
```

**`17`** 커밋

```bash
! git add -A && git commit -m "정독: 설계 리뷰"
```

### STEP 4 · 규칙 (CLAUDE.md + 스킬 + 첫 E2E)

**`18`** 프롬프트 · CLAUDE.md

```text
프로젝트 루트에 CLAUDE.md를 아래 내용 그대로 만들어줘.

# 우리반 캠퍼스 · 작업 규칙
- 작업 전에 docs/ARCHITECTURE.md를 먼저 읽을 것
- 그림 엔진(frontend/src/engine)은 리액트를 import하지 않는 순수 함수로 유지
- DB 구조 변경은 반드시 새 Flyway 마이그레이션 파일로 (이미 있는 V 파일은 절대 수정 금지)
- 서버는 클라이언트를 믿지 않는다: 남의 데이터는 토큰으로 주인 확인, 입력은 크기·형식 검사
- 작업이 끝나면 docs/ARCHITECTURE.md도 같이 고칠 것
- "완료" = E2E 통과 + 정적 분석 통과 (frontend `npm run check`, backend `./gradlew build`)
- E2E가 실패하면 테스트를 고치지 말고 코드를 고칠 것
```

**`19`** 프롬프트 · 스킬 3개

```text
.claude/skills/ 아래에 스킬 3개를 아래 내용 그대로 만들어줘. 각각 <이름>/SKILL.md 파일이고, --- 사이는 파일 맨 위 frontmatter야.

[add-feature/SKILL.md]
---
name: add-feature
description: 우리반 캠퍼스에 새 기능(화면, API, 테이블)을 추가할 때 사용
---
1. docs/ARCHITECTURE.md를 읽고, 이 기능이 어느 폴더에 들어갈지 먼저 말한다
2. 서버
   - 패키지는 기능 이름으로: com.woori.campus.<기능> (Entity, Repository, Controller 한 폴더에)
   - 테이블이 필요하면 backend/src/main/resources/db/migration/V<다음번호>__<설명>.sql 새로 만든다
   - 쓰기 API는 토큰으로 주인을 확인한다. 남의 것이면 403
   - 요청 DTO는 record + Bean Validation(@NotBlank, @Size)
3. 화면
   - 서버 호출은 frontend/src/api.ts에만 추가한다
   - 그림 계산은 frontend/src/engine/에 순수 함수로, 화면은 frontend/src/pages/에
   - 테스트에서 잡을 버튼·입력에는 data-testid를 단다
4. e2e/tests/<기능>.spec.ts에 사용자 시나리오를 E2E로 쓴다 (write-e2e 스킬)
5. 확인: cd frontend && npm run check, cd backend && ./gradlew build, cd e2e && npx playwright test
6. 전부 통과하면 update-docs 스킬로 문서를 고치고 커밋 하나

[write-e2e/SKILL.md]
---
name: write-e2e
description: 우리반 캠퍼스의 E2E 테스트(Playwright)를 새로 쓰거나 고칠 때 사용
---
- 위치: e2e/tests/<기능>.spec.ts. 공통 동작(입장, 중복 없는 닉네임)은 e2e/tests/helpers.ts
- 테스트 이름은 한국어 문장으로, 사용자가 겪는 일을 그대로
- 닉네임은 항상 중복 없게. 테스트끼리 데이터가 섞이지 않게
- 요소는 getByTestId 우선, 그다음 getByRole. CSS 클래스로 찾지 않는다
- 기다릴 때 waitForTimeout 금지. expect(...).toBeVisible()처럼 조건으로 기다린다
- 보안 규칙은 화면이 아니라 page.request로 API를 직접 때려서 확인한다 (403/401이 와야 통과)
- 실시간 기능은 browser.newContext()로 사람 두 명을 만들어서 서로 보이는지 확인한다
- 실패하면 테스트를 고치지 말고 코드를 고친다

[update-docs/SKILL.md]
---
name: update-docs
description: 기능을 끝낸 뒤 docs/ARCHITECTURE.md를 지금 코드에 맞게 갱신할 때 사용
---
1. git log로 지난 문서 갱신 이후 커밋을 본다
2. docs/ARCHITECTURE.md 맨 위 "변경 요약"에 이번에 바뀐 것을 3~6줄로 적는다
3. 폴더 구조, 데이터 흐름, API 목록, 테이블 목록을 코드와 맞춘다. 없는 걸 쓰지 않는다
4. "찜찜한 곳"에서 해결된 건 지우지 말고 취소선 + 어떻게 해결했는지 한 줄
5. 새로 생긴 찜찜한 곳이 있으면 솔직하게 추가한다
```

**`20`** Claude Code 다시 켜기 (스킬을 읽게)

```text
/exit
```

```bash
claude
```

👀 입력창에 `/add`까지 치면 `/add-feature`가 목록에 뜬다.

**`21`** 프롬프트 · 정적 분석

```text
정적 분석을 세팅해줘.
- frontend: 이미 있는 npm run check(tsc + ESLint)를 쓴다
- backend: build.gradle에 이미 javac -Xlint:all -Werror가 있다 (경고도 실패)
둘 다 돌려보고 지금 코드에서 나오는 문제를 전부 고쳐서 통과시켜줘. 설정을 느슨하게 바꾸지 말고 코드를 고쳐.
```

👀 Claude가 `npm run check`와 `gradlew build`를 돌리고 둘 다 통과했다고 말한다.

**`22`** 프롬프트 · 첫 E2E

```text
e2e/ 폴더에 Playwright 설정(playwright.config.ts, package.json)은 이미 있어.
테스트할 때 서버 8081 + 화면 5174 + DB campus_e2e를 자동으로 띄운다. 설정은 바꾸지 말고 테스트만 만들어줘.
- e2e/tests/helpers.ts: 중복 없는 닉네임 만들기, 입장하기
- e2e/tests/character.spec.ts:
  1. 닉네임으로 입장 → 긴 생머리 고르기 → 저장 → 로비 친구 목록에 내 이름 카드가 보인다
  2. 에디터 (2,40) 칸에 펜으로 한 점 찍고 저장 → 새로고침 → 서버에 저장된 디자인에 그 점이 있다
화면에 필요한 data-testid는 달아도 돼.
cd e2e && npm install && npx playwright install chromium 하고, 직접 돌려서 통과하는 것까지 보여줘.
통과 안 하면 테스트를 고치지 말고 코드를 고쳐.
```

**`23`** 내 눈으로 한 번 더

```bash
! (cd e2e && npx playwright test)
```

👀 처음에는 서버를 새로 띄우느라 1~2분. 마지막 줄 `2 passed`. 켜 둔 개발 서버(②③)는 그대로 둬도 안 섞인다. `failed`가 하나라도 있으면 Claude에게 `E2E가 실패해. 테스트는 그대로 두고 코드를 고쳐줘`.

**`24`** 커밋

```bash
! git add -A && git commit -m "규칙: CLAUDE.md, 스킬, 정적 분석, 첫 E2E"
```

## Day 2 · 쭉쭉 개발 (기능 하나 = E2E 통과 + 정적 분석 통과 = 커밋 하나)

오늘은 모든 프롬프트가 `/add-feature`로 시작한다. 기능마다 순서는 똑같다: **프롬프트 → 서버 다시 켜기 → 눈으로 확인 → 커밋**.

### 5a · 보안

**`25`** 프롬프트

```text
/add-feature
docs/REVIEW.md의 "고칠 것" 1~4번을 처리해줘.
- 입장할 때 서버가 추측 불가능한 토큰을 발급 (SecureRandom 32바이트, base64url). 토큰 컬럼은 V2 마이그레이션으로 추가
- 토큰은 입장 응답에만. 목록 API에는 절대 안 나오게
- Authorization: Bearer 토큰 → @CurrentPlayer 파라미터로 받는 리졸버. 없거나 틀리면 401
- 저장은 PUT /api/characters/me 로만. 주소에 남의 id를 넣는 방법 자체를 없앤다
- 디자인 100KB 제한 + JSON 필수 키 검사, 닉네임 1~12자. 실패는 400, 에러 모양은 {"message"}로 통일
E2E로 남의 캐릭터 덮어쓰기, 토큰 없이 저장, 이상한 디자인 저장이 전부 막히는지 확인해줘.
```

👀 Claude가 끝에 E2E 전부 passed, `npm run check`와 `gradlew build` 통과를 보여 준다.

**`26`** 서버 다시 켜기 (②에서 `Ctrl + C` 후)

```bash
.\gradlew bootRun                # 맥: ./gradlew bootRun
```

👀 `Migrating schema ... to version "2 ..."`

**`27`** 브라우저에서 확인. 예전에 입장한 브라우저는 토큰이 없으니 `F12` → Console에서 한 번 비운다.

```js
localStorage.clear(); location.reload();
```

👀 다시 입장 → 저장 잘 됨. 시크릿 창의 두 번째 사람도 다시 입장해서 저장된다.

**`28`** 커밋

```bash
! git add -A && git commit -m "보안: 입장 토큰, 내 것만 저장, 입력 검사"
```

### 5b · 가구 공방

**`29`** 프롬프트

```text
/add-feature
가구 공방을 만들어줘.
- 가구/바닥 타일 = 32x32 칸 x (1~2) x (1~2). 픽셀은 #rrggbb, RLE로 압축해서 JSON 저장
- 템플릿: 가구 6종(노트북 책상 2x1, 의자, 화분, 소파 2x1, 책장 1x2, 칠판 2x1), 바닥 5종(나무, 타일, 카펫, 잔디, 돌길)
  템플릿 그림은 reference/items.ts에 있는 걸 그대로 옮겨서 써. 코드 구조는 우리 프로젝트에 맞추고
- 가구는 외곽선을 자동으로 붙이고, 바닥은 안 붙인다 (이어 붙여야 하니까)
- 갤러리에 올리기(POST /api/items), 목록, 내 것만 지우기(남의 것 403). 테이블은 V3
- 미리보기: 바닥 위에 가구 + 내 캐릭터를 세워서
- 로비에 "가구 공방" 버튼
```

**`30`** 서버 다시 켜기 (`26`과 같음)

👀 `version "3 ..."`

**`31`** 브라우저에서 확인

👀 로비 → 가구 공방 → 의자 템플릿을 고르고 색을 바꿔 올리기 → 짝꿍 갤러리에도 내 의자가 보인다. 짝꿍에게는 내 의자에 지우기 버튼이 없다.

**`32`** 커밋

```bash
! git add -A && git commit -m "가구 공방: 템플릿, 도트 에디터, 반 갤러리"
```

### 5c · 맵 에디터

**`33`** 프롬프트

```text
/add-feature
맵 에디터를 만들어줘.
- 맵 = 24x16칸. 바닥(칸마다 에셋 주소), 가구 목록({x, y, ref}), 벽(칸 번호 목록), 시작 위치
- 에셋 주소: 't:desk' = 기본 템플릿, 'i:12' = 갤러리 12번
- 도구: 가구 놓기(겹치면 치우고), 바닥 칠하기(드래그), 벽 세우기, 지우개, 시작 위치, 전체 칠하기, 되돌리기
- 벽은 아래가 비어 있으면 "벽 면"(크림색+걸레받이), 아니면 "벽 위"로 그린다
- 맵 목록, 내 맵만 수정(남의 것 403), 서버는 크기(8~40), 칸 수, 시작 위치가 맵 안인지 검사. 테이블은 V4
- 그리기/충돌 계산은 engine/world.ts에 (메타버스에서 그대로 쓸 거라서)
- 로비에 "맵" 버튼
```

**`34`** 서버 다시 켜기 (`26`과 같음)

👀 `version "4 ..."`

**`35`** 브라우저에서 확인

👀 로비 → 맵 → 새 맵 "우리반 교실" → 바닥 칠하고, 벽 세우고, 책상·의자(내가 만든 것도) 놓고 저장 → 새로고침해도 그대로 있다.

**`36`** 커밋

```bash
! git add -A && git commit -m "맵 에디터: 바닥·가구·벽·시작 위치, 내 맵만 수정"
```

## Day 3 · 실시간 메타버스 → 문서 갱신 → 배포

### 5d · 실시간 메타버스 (계획 먼저)

**`37`** Claude 입력창에서 `Shift + Tab`을 눌러 **plan mode**로 바꾼다.

👀 입력창 아래에 `plan mode on`. 안 보이면 한 번 더 누른다.

**`38`** 프롬프트 · 계획

```text
맵에 반 친구들이 같이 들어가서 걷는 실시간 기능을 붙일 거야. 아직 코드 쓰지 말고 계획부터.
- WebSocket + STOMP(@stomp/stompjs는 이미 설치돼 있어). 연결할 때 토큰으로 인증, 토큰 없으면 연결 거절
- 보내기: join, move, chat, emote / 받기: 맵별 토픽 방송 / 처음 들어오면 지금 있는 사람 목록
- 위치는 DB 말고 서버 메모리
- 서버: 이동은 40ms에 한 번, 채팅 400ms에 한 번·80자, 이모트는 6개만. 연결이 끊기면 목록에서 빼고 leave 방송
- 화면: 맵 목록에서 "들어가기". 캐릭터와 가구를 "아래쪽 끝 y" 순서로 그려서 책상 뒤로 가면 가려지게
  방향키/WASD로 걷기, 벽·가구는 못 지나감. 바닥을 클릭하면 길 찾기(BFS)로 걸어가게
  이동은 0.1초마다 바뀌었을 때만 보내고, 남의 위치는 부드럽게 따라가게
  말풍선은 8칸 안에 있는 사람 것만 보이고 멀수록 흐리게. 오른쪽에 접속자 목록과 채팅창
- E2E는 브라우저 두 개로: 서로 보이는지, 움직이면 위치가 바뀌는지, 채팅이 보이는지, 나가면 사라지는지
  토큰 없이 WebSocket CONNECT 하면 거절되는지도
어떤 파일을 어떤 순서로 바꿀지, 내가 정해야 할 건 질문으로 남겨.
```

👀 Claude가 코드 대신 계획을 보여 준다. **끝까지 읽는다.** 질문이 있으면 답한다. 모르겠으면 `네가 추천하는 대로 해줘`.

**`39`** 계획이 마음에 들면 진행 보기에서 **Yes**를 고른다. 자동 수락(auto-accept) 보기가 있으면 그걸.

👀 20~30분. 끝에 E2E 전부 passed + 정적 분석 통과.

**`40`** 서버 다시 켜기 (`26`과 같음)

**`41`** 브라우저 두 개가 알아서 돌아다니는 걸 구경한다

```bash
! (cd e2e && npx playwright test --headed)
```

👀 창 여러 개가 뜨고 닫힌다. 마지막 줄에 `failed`가 없다. `ws proxy error: ECONNRESET`가 보여도 **실패 아님** (창을 닫을 때 나는 소음).

**`42`** 진짜로 같이 들어가 보기

1. 내 IP 확인: 새 터미널에서 `ipconfig` (윈도우, IPv4 주소) / `ipconfig getifaddr en0` (맥)
2. 내 브라우저에서 맵 → "우리반 교실" 들어가기
3. 짝꿍은 `http://내IP:5173`으로 입장 → 같은 맵 들어가기

👀 서로의 캐릭터가 보이고, 걸으면 상대 화면에서도 움직이고, 채팅하면 머리 위에 말풍선이 뜬다. 책상 뒤로 가면 가려진다.

**`43`** 커밋

```bash
! git add -A && git commit -m "실시간 메타버스: 입장·이동·채팅·이모트"
```

### STEP 6 · 문서 갱신

**`44`** 프롬프트

```text
/update-docs
지난 문서 갱신 이후 커밋들을 보고 docs/ARCHITECTURE.md를 지금 코드에 맞게 고쳐줘.
바뀐 부분은 맨 위 "변경 요약"에 따로. API 표, 테이블 표, 실시간 프로토콜을 넣고,
찜찜한 곳은 해결된 건 취소선 + 어떻게 해결했는지, 새로 생긴 건 솔직하게 추가해줘.
```

**`45`** 문서를 처음부터 끝까지 다시 읽는다.

👀 "찜찜한 곳" 1번(덮어쓰기)에 취소선이 있다. 새로 생긴 것 중에 "서버가 이동할 때 벽을 검사하지 않는다" 같은 항목이 있다. 없으면 `서버가 이동할 때 벽을 검사해?`라고 물어본다.

**`46`** 커밋

```bash
! git add -A && git commit -m "문서 갱신: ARCHITECTURE.md"
```

### STEP 7 · AWS 배포

내 프로젝트의 `deploy/DEPLOY.md`를 IDE에 열어 둔다. 아래 괄호 안 번호는 그 문서의 절 번호다.

**`47`** 시작 전 꼭 (0절)

- [ ] AWS Budgets에 월 10달러 알림을 걸었다
- [ ] ALB(로드밸런서), NAT Gateway는 만들지 않는다

**`48`** RDS MySQL 만들기 (1절). 퍼블릭 액세스 **아니요**, 비밀번호는 메모장에.

**`49`** EC2 만들기 + Java·Nginx 설치 (2절). 키 파일 `campus-key.pem`은 `my-campus` 폴더 **밖** (예: 다운로드 폴더)에 둔다.

**`50`** DuckDNS 무료 도메인 (3절)

**`51`** 서버 설정 파일 올리기 (4절)

**`52`** 배포 (5절). Claude 입력창에서 (주소와 키 경로는 내 것으로):

```bash
! ./deploy/deploy.sh ubuntu@내도메인.duckdns.org ~/Downloads/campus-key.pem
```

👀 마지막 줄 `배포 성공`. `http://내도메인.duckdns.org`에서 입장해 본다.

**`53`** HTTPS (6절, EC2 안에서 certbot)

👀 `https://내도메인.duckdns.org`에 자물쇠가 보이고, 메타버스도 그대로 돈다.

**`54`** 배포 후 보안 점검 (7절)

- [ ] `git ls-files | grep env` 결과에 `campus.env.example`만 나온다
- [ ] RDS 퍼블릭 액세스가 꺼져 있다
- [ ] EC2 22번 포트가 "내 IP"로만 열려 있다
- [ ] 토큰 없이 `PUT /api/characters/me` 하면 401이 나온다

**`55`** 커밋

```bash
! git add -A && git commit -m "배포"
```

### 피날레

**`56`** 내 주소를 반 채팅방에 올리고, 친구 메타버스에 놀러 간다 (맵 구경 → 말풍선 인사 → 이모트).

**`57`** 회고 한 줄씩: "AI가 틀렸던 순간" 하나, "문서를 읽다가 발견한 것" 하나.

## 막히면

| 증상 | 해결 |
|---|---|
| `Communications link failure` | MySQL이 안 켜졌다 → Docker Desktop 켜고 `04` 다시 |
| `Port 8080 (또는 5173) already in use` | 서버가 이미 켜져 있다. 다른 터미널을 찾아 `Ctrl + C`. 못 찾으면 윈도우: `netstat -ano \| findstr 8080` → 작업 관리자에서 그 PID 종료 |
| `Validate failed: Migrations have failed validation` | 이미 적용된 V 파일을 AI가 고쳤다 → Claude에게 `이미 있는 V 파일은 되돌리고 새 V 파일로 다시 해줘`. 급하면 `docker compose down -v` → `docker compose up -d` (DB가 비워진다) |
| `.\gradlew` 가 안 됨 (윈도우) | PowerShell인지 확인. cmd라면 `gradlew bootRun` |
| E2E에서 `Executable doesn't exist` | `! (cd e2e && npx playwright install chromium)` |
| E2E가 `failed` | 테스트를 고치지 말고 Claude에게 `E2E가 실패해. 테스트는 그대로 두고 코드를 고쳐줘` |
| 화면이 하얗거나 빨간 에러 | `F12` → Console의 빨간 글자를 복사해서 Claude에게 그대로 붙여넣고 `이 에러 고쳐줘` |
| 메타버스가 "연결 중…"만 | 서버를 안 다시 켰거나(`40`) 토큰이 없다 → Console에 `localStorage.clear(); location.reload();` 후 다시 입장 |
| 짝꿍 주소가 안 열림 | 같은 와이파이인지, 윈도우 방화벽에서 Node.js를 허용했는지 |
| AI가 엉뚱한 방향으로 갔다 | `! git restore . && git clean -fd` 로 마지막 커밋으로 되돌리고 같은 프롬프트를 다시 |
| `deploy.sh`에서 `UNPROTECTED PRIVATE KEY FILE` (윈도우) | PowerShell에서 `icacls $HOME\Downloads\campus-key.pem /inheritance:r /grant:r "$($env:USERNAME):R"` |
| 배포 후 502 | EC2에서 `journalctl -u campus -n 100` (대부분 `campus.env`의 DB 주소·비밀번호) |

### 따라잡기 (15분 넘게 못 풀었을 때)

선생님 완성본(이 저장소)에는 단계마다 태그가 있다. 내 폴더는 그대로 두고 선생님 코드로 갈아탄다.

```bash
cd C:\dev                                  # 맥: cd ~/dev
git clone https://github.com/NujabesCode/woori-campus.git catch-up
cd catch-up
git switch -c mine step-5b-workshop        # 지금 해야 하는 단계가 끝난 태그로
docker compose down -v                     # 내 DB는 내 코드 기준이라 비운다
docker compose up -d
```

원래 폴더에서 켜 둔 서버(②)와 화면(③)은 `Ctrl + C`로 끄고, `05`, `06`처럼 서버와 화면을 켜고, `catch-up` 폴더에서 `claude`를 열어 다음 번호부터 같이 친다.

| 태그 | 여기까지 끝난 상태 | 다음 번호 |
|---|---|---|
| `step-1-scout` | 정찰 | `12` |
| `step-2-docs` | 문서화 | `15` |
| `step-3-review` | 정독 | `18` |
| `step-4-rules` | 규칙 + 첫 E2E | `25` |
| `step-5a-secure` | 보안 | `29` |
| `step-5b-workshop` | 가구 공방 | `33` |
| `step-5c-map` | 맵 에디터 | `37` |
| `step-5d-world` | 실시간 메타버스 | `44` |
| `step-6-docs` | 문서 갱신 | `47` |
