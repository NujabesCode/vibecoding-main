# 우리반 캠퍼스 · 구조 설명서

> 이 코드를 처음 보는 개발자를 위한 문서. 코드를 보고 작성했고, 기능이 바뀔 때마다 갱신한다.

## 변경 요약 (step-6, 정찰 버전 이후 바뀐 것)

- **보안**: 입장할 때 서버가 토큰을 발급한다(V2). 쓰기 API와 WebSocket 연결은 전부 토큰으로 "누구인지" 확인하고, 남의 것은 403.
- **가구 공방**: 템플릿 11종 + 도트 에디터 + 반 공용 갤러리(V3 `items`).
- **맵 에디터**: 바닥·가구·벽·시작 위치를 칠해서 맵을 만든다(V4 `maps`).
- **실시간 메타버스**: WebSocket(STOMP)로 입장·이동·채팅·이모트. 위치는 서버 메모리에만 있다.
- **테스트**: E2E 20개 + 단위 테스트 5개. E2E는 수업 DB와 분리된 `campus_e2e` DB, 8081/5174 포트에서 돈다.

## 한 줄 요약

브라우저에서 캐릭터·가구·맵을 직접 그려 스프링 서버(MySQL)에 저장하고, 그 맵에 반 친구들과 WebSocket으로 같이 들어가 걸어 다닌다.

## 폴더 구조와 핵심 파일

```
backend/                        스프링부트 3.5 (Java 21, Gradle)
  auth/                         토큰 → 플레이어 (@CurrentPlayer, CurrentPlayerResolver)
  common/                       ApiException, ErrorHandler(에러 모양 통일), JsonShape(JSON 크기·모양 검사)
  player/                       입장(토큰 발급), 목록, /me
  character/                    캐릭터 디자인 저장(내 것만)/조회
  item/                         가구 갤러리: 올리기, 목록, 내 것만 삭제
  map/                          맵: 만들기, 목록, 조회, 내 것만 수정
  world/                        WebSocket: 연결 인증, 접속자(Presence), 이동·채팅·이모트 방송
  resources/db/migration/       V1 플레이어·캐릭터, V2 토큰, V3 가구, V4 맵
frontend/                       리액트 19 + Vite + TypeScript
  src/engine/                   그림 엔진 (리액트를 import하지 않는 순수 함수)
    color.ts                    팔레트, 색조를 튼 그림자/하이라이트
    sprite.ts                   캐릭터 32x48 레이어 → 걷기 4프레임, 외곽선, 이마 그림자
    parts.ts                    헤어 7 · 눈 4 · 상의 3 · 하의 3 · 소품 3
    design.ts / rle.ts          디자인 ↔ JSON, 픽셀 압축(RLE)
    items.ts                    가구/바닥 템플릿, 가구 외곽선, 가구 ↔ JSON
    world.ts                    맵 데이터, 배경 그리기, 충돌 칸, 가구 그리는 순서
    classroom.ts                공방의 "미리 걸어보기" 교실
  src/pages/                    Entry · Lobby · Studio · Workshop · MapList · MapEditor · World
  src/components/               Walker · RoomPreview · PixelCanvas · ItemThumb
  src/api.ts                    HTTP 호출 (토큰 자동 첨부)
  src/ws.ts                     실시간 연결 (STOMP)
  src/session.ts                내 id·닉네임·토큰을 localStorage에
e2e/                            Playwright E2E (서버 8081 + 화면 5174 + DB campus_e2e)
docker-compose.yml              개발용 MySQL 8.4 (+ campus_e2e 자동 생성)
```

## API

| 메서드 | 주소 | 토큰 | 설명 |
|---|---|---|---|
| POST | /api/players | | 입장. `{id, nickname, token}` (토큰은 여기서만 나온다) |
| GET | /api/players · /api/players/me | · 필요 | 목록(토큰 없음) · 나 |
| GET | /api/characters · /api/characters/{playerId} | | 디자인 목록 · 한 명 |
| PUT | /api/characters/me | 필요 | 내 디자인 저장 (100KB, JSON 모양 검사) |
| GET · POST | /api/items | · 필요 | 가구 목록 · 올리기 (바닥은 1x1, 가구 1~2칸) |
| DELETE | /api/items/{id} | 필요 | 내 가구만 (남의 것 403) |
| GET · POST | /api/maps | · 필요 | 맵 목록 · 만들기 |
| GET · PUT | /api/maps/{id} | · 필요 | 조회 · 수정(내 맵만, 남의 것 403) |

에러는 항상 `{"message": "..."}` 한 가지 모양이다.

## 테이블

| 테이블 | 핵심 컬럼 | 비고 |
|---|---|---|
| players | nickname, token(유니크) | 토큰은 V2에서 추가 |
| characters | player_id(유니크), design(LONGTEXT JSON) | 한 사람 한 캐릭터 |
| items | owner_id, kind(floor/object), width, height, solid, pixels(JSON) | |
| maps | owner_id, name, data(JSON), updated_at | |

## 실시간 (WebSocket + STOMP)

- 연결: `/ws`, CONNECT 헤더 `Authorization: Bearer 토큰`. 틀리면 연결 거절.
- 보내기: `/app/maps/{id}/join` · `move` · `chat` · `emote`
- 받기: `/topic/maps/{id}` 에 `{type: join|leave|move|chat|emote, ...}`
- 처음 들어오면 `/app/maps/{id}/snapshot`을 한 번 구독해서 지금 있는 사람 목록을 받는다.
- 서버 제한: 이동은 40ms에 한 번, 채팅은 400ms에 한 번·80자, 이모트는 정해진 6개만.
- 화면은 이동을 0.1초마다(바뀌었을 때만) 보내고, 남의 위치는 부드럽게 따라간다.

## 데이터가 흐르는 순서

1. **입장**: 닉네임 → `POST /api/players` → `{id, nickname, token}`을 localStorage에
2. **공방**: 파츠 고르기 + 직접 그리기는 전부 브라우저 메모리. `저장하기` → `PUT /api/characters/me`
3. **가구 공방**: 템플릿 → 그리기 → `POST /api/items` → 반 갤러리
4. **맵 에디터**: 기본 템플릿(`t:desk`) + 갤러리 가구(`i:12`)로 칠하기 → `POST/PUT /api/maps`
5. **메타버스**: 맵 JSON + 가구 목록으로 배경·충돌 칸을 만들고, WebSocket으로 사람들 위치를 주고받는다

## 그림 엔진 핵심

- 캐릭터 픽셀 값은 색이 아니라 **물감 코드**(`h0` 머리 기본, `t1` 상의 그림자…). 팔레트만 바꿔도 직접 그린 부분까지 바뀐다.
- 걷기 애니메이션은 그리지 않는다. `frameOffset()`이 레이어를 1~2픽셀 옮겨서 4프레임을 만든다.
- 가구 픽셀 값은 그냥 `#rrggbb`. 가구만 외곽선을 자동으로 붙이고 바닥 타일은 안 붙인다(이어 붙여야 해서).
- 메타버스는 가구와 캐릭터를 "아래쪽 끝 y"로 정렬해서 그린다. 그래서 책상 뒤로 가면 가려진다.

## 내가 내린 결정과 이유

| 결정 | 이유 |
|---|---|
| 디자인·가구·맵을 JSON 한 덩어리로 저장 | 구조가 아직 자주 바뀐다. 대신 서버가 크기와 필수 키는 검사 |
| 토큰은 비밀번호 대신 입장 때 발급 | 수업용이라 회원가입은 과하다. 추측 불가능한 32바이트 난수면 충분 |
| 위치는 DB가 아니라 서버 메모리 | 초당 수십 번 바뀌고, 서버를 껐다 켜면 사라져도 되는 정보 |
| 그림 엔진을 리액트 밖에 | 공방·맵 에디터·메타버스가 같은 코드를 쓴다 |
| E2E 전용 DB와 포트 | 테스트가 만든 "내 의자" 같은 데이터가 수업 갤러리에 섞이던 문제 해결 |

## 찜찜한 곳

1. ~~아무나 남의 캐릭터를 덮어쓸 수 있다~~ → 토큰 + `PUT /api/characters/me`로 해결 (E2E: security.spec)
2. ~~로그인이 없다~~ → 입장 토큰으로 해결. 단, 토큰을 잃어버리면(브라우저 데이터 삭제) 그 캐릭터로 다시 못 들어간다
3. ~~디자인 크기 제한이 없다~~ → 100KB 제한
4. ~~서버가 디자인 내용을 검사하지 않는다~~ → JSON 모양 검사. 단, 픽셀 하나하나까지는 안 본다(화면의 `parseDesign`이 한 번 더 거른다)
5. ~~닉네임 검사가 없다~~ → 1~12자
6. **목록 API가 전부를 한 번에 준다.** `GET /api/characters`, `GET /api/items`. 30명 수업에선 괜찮지만 수백 명이면 페이지 나누기가 필요하다
7. ~~테스트가 하나도 없다~~ → E2E 20개
8. **이동은 서버가 벽을 검사하지 않는다.** 맵 범위만 자른다. 개발자 도구로 좌표를 보내면 벽을 뚫을 수 있다(순간이동 해킹)
9. **접속자 목록이 서버 한 대의 메모리에 있다.** 서버를 두 대로 늘리면 서로 안 보인다. 늘리려면 Redis 같은 공용 저장소가 필요하다
10. **가구를 지우면 그 가구를 쓴 맵에 구멍이 난다.** 맵은 가구 번호만 기억한다. 지금은 조용히 안 그리고 넘어간다
11. **토큰이 localStorage에 있다.** 화면에 XSS 구멍이 생기면 토큰을 훔쳐갈 수 있다. 리액트가 글자를 자동으로 이스케이프해서 지금은 괜찮다
12. **HTTP API에는 요청 횟수 제한이 없다.** 누가 가구를 1초에 100개 올려도 막지 않는다
