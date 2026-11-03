# 실습 가이드 · 우리반 캠퍼스

> "유행 말고, 진짜 바이브코딩" 5부의 방식 그대로 — **짧게 만들고 → 문서로 정리시키고 → 끝까지 읽고 → 규칙을 깔고 → 쭉쭉 개발하고 → 문서를 갱신한다.**
> 결과물: 직접 그린 캐릭터로, 우리반이 만든 맵에서, 반 전체가 실시간으로 같이 걸어 다니는 게더타운 스타일 메타버스.

## 한눈에

| | |
|---|---|
| 스택 | 스프링부트 3.5 (Java 21) · 리액트 19 + Vite + TypeScript · MySQL 8.4 · WebSocket(STOMP) · Playwright |
| 분량 | 3일 × 8시간 (하루만 할 때는 Day 1 + 5d만) |
| 완성본 | 이 레포의 `main`. 단계마다 태그(`step-1-scout` … `step-7-deploy`)가 있어서 뒤처지면 바로 따라잡는다 |
| 테스트 | E2E 20개 + 단위 테스트 5개, 기능 하나 = E2E 통과 + 정적 분석 통과 = 커밋 하나 |
| 피날레 | 반 전체가 강사 맵에 동시 입장. 아침에 각자 그린 캐릭터들이 한 교실을 걸어 다닌다 |

## 시간표

| 날 | 시간 | 단계 | 태그 |
|---|---|---|---|
| Day 1 | 0:30 | 오프닝 · 완성본에 반 전체 입장 | `main` |
| | 2:00 | STEP 1 정찰 · 캐릭터 공방 + 저장 | `step-1-scout` |
| | 0:30 | 해킹 타임 · 옆 사람 캐릭터 덮어쓰기 | |
| | 0:40 | STEP 2 문서화 · ARCHITECTURE.md | `step-2-docs` |
| | 1:00 | STEP 3 정독 · 설계 리뷰 | `step-3-review` |
| | 1:30 | STEP 4 규칙 · CLAUDE.md, 스킬, 첫 E2E | `step-4-rules` |
| | 1:50 | 버퍼 · 따라잡기 · 내 캐릭터 꾸미기 | |
| Day 2 | 2:00 | STEP 5a 보안 · 토큰, 내 것만 저장 | `step-5a-secure` |
| | 3:00 | STEP 5b 가구 공방 | `step-5b-workshop` |
| | 3:00 | STEP 5c 맵 에디터 | `step-5c-map` |
| Day 3 | 3:30 | STEP 5d 실시간 메타버스 | `step-5d-world` |
| | 0:40 | STEP 6 문서 갱신 · 다시 읽기 | `step-6-docs` |
| | 2:30 | STEP 7 AWS 배포 | `step-7-deploy` |
| | 1:20 | 피날레 · 각자 맵에 놀러 가기, 회고 | |

---

## 수업 전에

### 학생 공지 (전날)

- **JDK 21**, **Node 22**, **Git**, **Docker Desktop**, **Claude Code**, IntelliJ 또는 VS Code
- 확인: `java -version` → 21, `node -v` → v22, `docker compose version`
- 노트북 디스크 10GB 이상 비워 오기 (Docker 이미지 + Gradle 캐시)

### 강사 준비

1. 이 레포를 받아 `main`에서 한 번 끝까지 돌려본다
   ```bash
   docker compose up -d
   cd backend && ./gradlew bootRun                # 터미널 1
   cd frontend && npm install && npm run dev      # 터미널 2
   cd e2e && npm install && npx playwright install chromium && npx playwright test   # 20 passed
   ```
2. 수업 와이파이에서 학생들이 강사 노트북으로 들어올 수 있는지 확인: `http://강사IP:5173` (Vite가 `host: true`로 열려 있다)
3. 오프닝용으로 강사 계정으로 캐릭터 하나, 맵 하나("우리반 교실")를 미리 만들어 둔다

### 체크포인트 쓰는 법 (뒤처진 학생용)

```bash
git clone <강사 레포> campus-ref
cd campus-ref
git switch -c catch-up step-5b-workshop      # 가구 공방까지 끝난 상태로
```

> **주의**: 태그를 **뒤로** 돌아갈 때는 DB도 비워야 한다. 새 마이그레이션(V3, V4)이 이미 들어간 DB에 옛날 코드를 켜면 Flyway가 멈춘다.
> `docker compose down -v && docker compose up -d`

---

## 오프닝 · 30분 · "오늘 이걸 만든다"

강사 노트북에서 `main`을 켜고 주소를 칠판에 쓴다. 학생 전원이 입장 → 캐릭터 대충 꾸미기 → 강사 맵 입장.

- 30명이 한 교실에서 동시에 걷고, 말풍선을 띄우고, 이모트를 날린다
- 강사가 책상 뒤로 걸어가면 가려지고, 앞으로 나오면 보인다 (가구와 캐릭터를 y순으로 그려서)
- 마지막에 한 줄: **"이걸 3일 동안 여러분 손으로 만듭니다. 대신 순서가 있어요."**

---

## STEP 1 · 정찰 · 2시간 · `step-1-scout`

**목표**: 문서 없이 핵심 기능 하나를 빠르게. 이 코드는 버릴 각오로 만든다. 목적은 제품이 아니라 정찰.

**강사 포인트**
- 시작 전에 브랜치부터: `git switch -c scout`
- 그림 엔진(`frontend/src/engine/`)은 강사 레포에서 **그대로 복사해 온다.** 픽셀아트 파츠는 손으로 튜닝한 거라 프롬프트로 똑같이 안 나온다. 우리가 만드는 건 그 엔진을 쓰는 **서비스**다.
  ```bash
  git -C campus-ref show step-1-scout:frontend/src/engine/  # 파일 목록 확인
  cp -r campus-ref/frontend/src/engine  my-campus/frontend/src/
  ```

**프롬프트 1 · 뼈대**
```text
스프링부트 3.5(Java 21, Gradle) + 리액트(Vite, TypeScript) + MySQL로 프로젝트 뼈대를 만들어줘.
- backend/ : web, data-jpa, validation, websocket, flyway(mysql), mysql 드라이버
  DB 주소·계정은 환경변수(DB_URL, DB_USERNAME, DB_PASSWORD)로, 기본값은 localhost:3306/campus, campus/campus
  ddl-auto는 validate, 테이블은 Flyway 마이그레이션으로만
- frontend/ : React 19 + TypeScript strict, /api 와 /ws 는 8080으로 프록시
- 루트에 docker-compose.yml (mysql:8.4, utf8mb4)
기술 선택은 이걸로 고정. 다 만들면 실행 방법을 README에 써줘.
```

**프롬프트 2 · 정찰 기능**
```text
frontend/src/engine/ 에 캐릭터 그림 엔진이 있어. (design.ts의 newDesign/serializeDesign/parseDesign, sprite.ts의 buildFrames)
이걸 써서 정찰 버전을 짧게 만들어줘. 디자인은 신경 쓰지 말고 돌아가는 것만.
1. 닉네임 입력 → POST /api/players → {id, nickname}을 localStorage에
2. 캐릭터 공방: 파츠 고르기 + 32x48 픽셀 에디터 + 4방향 걷기 미리보기 → 저장 버튼
   저장은 PUT /api/characters/{playerId} 로 design(JSON 문자열)을 통째로
3. 로비: 반 친구들 캐릭터가 제자리에서 걷는 카드 목록
기술 선택 이유를 마지막에 알려줘.
```

**완료**: 두 명이 입장해서 저장하면 로비에 둘 다 걷고 있다. → `git commit -m "정찰"`

---

## 해킹 타임 · 30분

정찰 버전은 일부러 막지 않았다. 옆자리랑 짝을 지어, 로비에서 개발자 도구(F12) → Console:

```js
// 1) 내 캐릭터를 짝꿍 캐릭터 자리에 덮어쓰기 (짝꿍 id는 로비 카드 순서로 짐작)
const mine = await (await fetch('/api/characters/' + JSON.parse(localStorage['campus.me']).id)).json();
await fetch('/api/characters/2', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ design: mine.design }),
});

// 2) 아예 깨뜨리기
await fetch('/api/characters/2', {
  method: 'PUT', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ design: '해킹' }),
});

// 3) 아무나 되기
localStorage['campus.me'] = JSON.stringify({ id: 2, nickname: '나는짝꿍' }); location.reload();
```

짝꿍 화면을 새로고침하면 캐릭터가 바뀌어 있다. **"버튼은 숨겼는데 서버는 안 막았다"** 슬라이드가 여기서 체감된다.
지금 고치지 않는다. STEP 2~3에서 문서로 찾게 한다.

---

## STEP 2 · 문서화 · 40분 · `step-2-docs`

**목표**: 기획서가 아니라 현실을 기록한 문서. 지금 코드가 실제로 어떻게 생겼는지.

**프롬프트**
```text
이 코드를 처음 보는 개발자에게 설명하는 문서를 docs/ARCHITECTURE.md로 써줘.
· 폴더 구조와 핵심 파일별 역할
· 데이터가 흐르는 순서 (입장 → 공방 → 저장 → 로비)
· 캐릭터 그림이 어떻게 만들어지는지 (레이어, 물감 코드, 걷기 프레임)
· 네가 내린 결정과 그 이유 (표로)
· 임시방편으로 때운 곳, 확실하지 않은 곳은 "찜찜한 곳"으로 따로
```

**강사 포인트**: 마지막 줄이 핵심. AI가 스스로 불안했던 곳을 자백한다. 참고용 예시는 `step-2-docs` 태그의 `docs/ARCHITECTURE.md` — "아무나 남의 캐릭터를 덮어쓸 수 있다"가 1번으로 나온다.

---

## STEP 3 · 정독 · 1시간 · `step-3-review`

**목표**: 코드는 한 줄도 안 읽는다. 문서를 처음부터 끝까지 읽고, 읽은 걸로 설계 리뷰를 한다.

**진행**
1. 20분: 각자 ARCHITECTURE.md를 끝까지 읽기. "어?" 하는 줄에 형광펜
2. 20분: 짝과 비교. 아래 질문에 문서만 보고 답하기
   - 서버는 저장 요청을 보낸 사람이 누구인지 어떻게 아는가?
   - 디자인 JSON이 1GB면 어떻게 되는가?
   - 색만 바꿨는데 직접 그린 부분까지 바뀌는 이유는?
   - 메타버스 화면에서 이 엔진을 그대로 쓸 수 있는가?
3. 20분: `docs/REVIEW.md`에 "고칠 것 우선순위" 표 쓰기 (예시: `step-3-review` 태그)

**강사 포인트**: "상상 속 설계가 아니라 이미 존재하는 실물을 검토한다." 해킹 타임에서 당한 구멍이 문서에 그대로 적혀 있는 걸 확인시킨다.

---

## STEP 4 · 규칙 · 1시간 30분 · `step-4-rules`

**목표**: 흐름을 본 뒤에야 규칙을 쓴다. CLAUDE.md는 다섯 줄로 시작, 스킬은 이 프로젝트에서 나온 것 2~3개만.

**CLAUDE.md** (그대로 써도 된다)
```markdown
# 우리반 캠퍼스 · 작업 규칙
- 작업 전에 docs/ARCHITECTURE.md를 먼저 읽을 것
- 그림 엔진(frontend/src/engine)은 리액트를 import하지 않는 순수 함수로 유지
- DB 구조 변경은 반드시 새 Flyway 마이그레이션 파일로 (이미 있는 V 파일은 절대 수정 금지)
- 서버는 클라이언트를 믿지 않는다: 남의 데이터는 토큰으로 주인 확인, 입력은 크기·형식 검사
- 작업이 끝나면 docs/ARCHITECTURE.md도 같이 고칠 것
- "완료" = E2E 통과 + 정적 분석 통과 (frontend `npm run check`, backend `./gradlew build`)
- E2E가 실패하면 테스트를 고치지 말고 코드를 고칠 것
```

**스킬 3개**: `.claude/skills/add-feature`, `write-e2e`, `update-docs` (레포 참고)

**프롬프트 · 정적 분석**
```text
정적 분석을 세팅해줘.
- frontend: ESLint(typescript-eslint, react-hooks) + tsc --noEmit. npm run check 하나로 둘 다
- backend: javac -Xlint:all -Werror (경고도 실패로)
세팅하고 지금 코드에서 나오는 문제를 전부 고쳐서 통과시켜줘.
```

**프롬프트 · 첫 E2E**
```text
e2e/ 폴더에 Playwright로 E2E를 세팅해줘. 테스트 전에 서버와 화면을 자동으로 띄우게 (webServer).
시나리오:
1. 닉네임으로 입장 → 긴 생머리 고르기 → 저장 → 로비 친구 목록에 내 이름 카드가 보인다
2. 에디터 (2,40) 칸에 펜으로 한 점 찍고 저장 → 새로고침 → 서버에 저장된 디자인에 그 점이 있다
만들고 직접 돌려서 통과하는 것까지 보여줘. 통과 안 하면 테스트를 고치지 말고 코드를 고쳐.
```

**완료**: `npx playwright test` → 2 passed

---

## STEP 5 · 쭉쭉 개발

여기서부터는 속도전. 기능 하나씩, **E2E 통과 + 정적 분석 통과 = 커밋 하나**.
학생은 `/add-feature` 스킬로 시작하게 한다.

### 5a · 보안 · 2시간 · `step-5a-secure`

```text
/add-feature
docs/REVIEW.md의 "고칠 것" 1~4번을 처리해줘.
- 입장할 때 서버가 추측 불가능한 토큰을 발급 (SecureRandom 32바이트, base64url). 토큰 컬럼은 V2 마이그레이션으로 추가
- 토큰은 입장 응답에만. 목록 API에는 절대 안 나오게
- Authorization: Bearer 토큰 → @CurrentPlayer 파라미터로 받는 리졸버. 없거나 틀리면 401
- 저장은 PUT /api/characters/me 로만. 주소에 남의 id를 넣는 방법 자체를 없앤다
- 디자인 100KB 제한 + JSON 필수 키 검사, 닉네임 1~12자. 실패는 400, 에러 모양은 {"message"}로 통일
E2E에 해킹 타임에서 한 공격을 그대로 넣어서 전부 막히는지 확인해줘.
```

**강사 포인트**
- 해킹 타임 스크립트를 다시 돌려 본다 → 405/401. 박수 나오는 구간
- V1을 고치지 않고 V2를 새로 만드는 이유: 이미 수업 DB에 V1이 들어가 있다
- 검사 로직(JsonShape)에만 단위 테스트를 붙인다 — "숫자 하나 틀리면 사고"인 곳만

### 5b · 가구 공방 · 3시간 · `step-5b-workshop`

```text
/add-feature
가구 공방을 만들어줘.
- 가구/바닥 타일 = 32x32 칸 x (1~2) x (1~2). 픽셀은 #rrggbb, RLE로 압축해서 JSON 저장
- 템플릿: 가구 6종(노트북 책상 2x1, 의자, 화분, 소파 2x1, 책장 1x2, 칠판 2x1), 바닥 5종(나무, 타일, 카펫, 잔디, 돌길)
- 가구는 외곽선을 자동으로 붙이고, 바닥은 안 붙인다 (이어 붙여야 하니까)
- 갤러리에 올리기(POST /api/items), 목록, 내 것만 지우기(남의 것 403). 테이블은 V3
- 미리보기: 바닥 위에 가구 + 내 캐릭터를 세워서
```

**강사 포인트**: 그림 엔진(`items.ts`)도 리액트 밖 순수 함수로 — CLAUDE.md 2번 규칙이 실제로 지켜지는지 diff에서 확인.
가구 템플릿 픽셀은 손으로 튜닝한 거라, 시간이 모자라면 `git show step-5b-workshop:frontend/src/engine/items.ts` 로 가져와도 된다. 5c의 `world.ts`도 마찬가지.

### 5c · 맵 에디터 · 3시간 · `step-5c-map`

```text
/add-feature
맵 에디터를 만들어줘.
- 맵 = 24x16칸. 바닥(칸마다 에셋 주소), 가구 목록({x, y, ref}), 벽(칸 번호 목록), 시작 위치
- 에셋 주소: 't:desk' = 기본 템플릿, 'i:12' = 갤러리 12번
- 도구: 가구 놓기(겹치면 치우고), 바닥 칠하기(드래그), 벽 세우기, 지우개, 시작 위치, 전체 칠하기, 되돌리기
- 벽은 아래가 비어 있으면 "벽 면"(크림색+걸레받이), 아니면 "벽 위"로 그린다
- 맵 목록, 내 맵만 수정(남의 것 403), 서버는 크기(8~40), 칸 수, 시작 위치가 맵 안인지 검사. 테이블은 V4
- 그리기/충돌 계산은 engine/world.ts에 (메타버스에서 그대로 쓸 거라서)
```

### 5d · 실시간 메타버스 · 3시간 30분 · `step-5d-world`

**먼저 계획부터** (5부 습관 02)
```text
/plan
맵에 반 친구들이 같이 들어가서 걷는 실시간 기능을 붙일 거야. 아직 코드 쓰지 말고 계획부터.
- WebSocket + STOMP. 연결할 때 토큰으로 인증
- 보내기: join, move, chat, emote / 받기: 맵별 토픽 방송 / 처음 들어오면 지금 있는 사람 목록
- 위치는 DB 말고 서버 메모리
어떤 파일을 어떤 순서로 바꿀지, 내가 정해야 할 건 질문으로 남겨.
```

**그다음 구현**
```text
계획대로 진행해줘. 추가 조건:
- 서버: 이동은 40ms에 한 번, 채팅 400ms에 한 번·80자, 이모트는 6개만. 연결이 끊기면 목록에서 빼고 leave 방송
- 화면: 캐릭터와 가구를 "아래쪽 끝 y" 순서로 그려서 책상 뒤로 가면 가려지게
  이동은 0.1초마다 바뀌었을 때만 보내고, 남의 위치는 부드럽게 따라가게
  말풍선은 8칸 안에 있는 사람 것만 보이고 멀수록 흐리게
  바닥을 클릭하면 길 찾기(BFS)로 걸어가게
- E2E는 브라우저 두 개로: 서로 보이는지, 움직이면 위치가 바뀌는지, 채팅이 보이는지, 나가면 사라지는지
  토큰 없이 WebSocket CONNECT 하면 거절되는지도
```

**강사 포인트**: E2E에서 브라우저 두 개가 동시에 뜨는 걸 headed 모드로 보여준다: `npx playwright test tests/world.spec.ts --headed`

---

## STEP 6 · 문서 갱신 · 40분 · `step-6-docs`

```text
/update-docs
지난 문서 갱신 이후 커밋들을 보고 docs/ARCHITECTURE.md를 지금 코드에 맞게 고쳐줘.
바뀐 부분은 맨 위 "변경 요약"에 따로. API 표, 테이블 표, 실시간 프로토콜을 넣고,
찜찜한 곳은 해결된 건 취소선 + 어떻게 해결했는지, 새로 생긴 건 솔직하게 추가해줘.
```

**정독 2회차 질문**: 새로 생긴 찜찜한 곳 중에 "순간이동 해킹"(서버가 벽을 검사 안 함)을 직접 해본다. 개발자 도구에서 STOMP로 좌표를 보내면 벽을 뚫는다. → 숙제: 서버에서 맵 충돌 칸을 검사하게 고치기.

이 단계에서 "테스트 데이터가 수업 갤러리에 섞인다"도 고친다: E2E를 전용 DB(`campus_e2e`)와 포트(8081/5174)로 분리.

---

## STEP 7 · AWS 배포 · 2시간 30분 · `step-7-deploy`

`deploy/DEPLOY.md`를 같이 따라 한다. EC2 1대 + RDS + DuckDNS(무료 도메인) + Let's Encrypt(무료 HTTPS).

- 시작 전에 **돈 새는 함정**(ALB, NAT Gateway, 놔둔 탄력적 IP)과 **AWS Budgets 알림**부터
- 배포 전 30초 보안 점검 (env 파일, RDS 퍼블릭 액세스, 22번 포트, 토큰 없이 401)
- 일부러 `campus.env`의 DB 비밀번호를 하나 틀려 본다 → 502 → `journalctl -u campus` 로 원인 찾기

---

## 피날레 · 1시간 20분

1. 각자 배포한 주소를 채팅방에 올린다
2. 돌아가면서 친구 메타버스에 놀러 간다 (맵 구경 → 말풍선 인사 → 이모트)
3. 회고 한 줄씩: "AI가 틀렸던 순간" 하나, "문서를 읽다가 발견한 것" 하나

---

## 자주 막히는 곳

| 증상 | 해결 |
|---|---|
| `Communications link failure` | MySQL이 안 켜졌다 → `docker compose up -d`, `docker ps` |
| `Flyway ... migration not resolved locally` | 태그를 뒤로 돌아갔다 → `docker compose down -v && docker compose up -d` |
| `Port 8080 already in use` | 이미 켜 둔 서버가 있다. 윈도우: `netstat -ano \| findstr 8080` → 작업 관리자에서 종료 |
| E2E에서 `Executable doesn't exist` | `npx playwright install chromium` |
| 윈도우에서 `./gradlew` 안 됨 | `gradlew.bat bootRun` (Playwright 설정은 자동으로 구분한다) |
| 메타버스가 "연결 중…"만 | 서버가 꺼져 있거나, 입장 후 서버 DB를 비워서 토큰이 사라졌다 → 로비에서 나가기 → 다시 입장 |
| 학생 폰/노트북에서 강사 주소가 안 열림 | 같은 와이파이인지, 윈도우 방화벽이 Node(5173)를 막는지 확인 |
