# 우리반 캠퍼스

직접 그린 캐릭터로, 우리반이 만든 맵에서, 반 전체가 실시간으로 같이 걸어 다니는 게더타운 스타일 메타버스.
스프링부트 3.5 + 리액트 19 + MySQL 8.4 + WebSocket(STOMP).

- **캐릭터 공방**: 파츠(헤어 7 · 눈 4 · 상의 3 · 하의 3 · 소품 3) + 32x48 도트 에디터, 걷기 애니메이션·외곽선·명암 자동
- **가구 공방**: 템플릿 11종 + 도트 에디터, 반 공용 갤러리
- **맵 에디터**: 바닥·가구·벽·시작 위치
- **메타버스**: 실시간 이동·근접 말풍선·이모트, 클릭하면 길 찾아 걷기

## 수업 자료

| 누가 | 무엇 | 파일 |
|---|---|---|
| 학생 | 따라치기 시트 (번호 `00`~`57`, 빈 폴더부터 배포까지) | [docs/STUDENT.md](docs/STUDENT.md) |
| 학생 | 스타터 키트 (첫날 이것 하나만 받는다) | [starter/my-campus-starter.zip](starter/my-campus-starter.zip) |
| 강사 | 진행 가이드 · 시간표 · 강사 포인트 | [docs/WORKSHOP.md](docs/WORKSHOP.md) |
| 모두 | 구조 설명서 | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| 모두 | AWS 배포 | [deploy/DEPLOY.md](deploy/DEPLOY.md) |

이 저장소의 `main`은 완성본이고, 단계마다 태그가 있어서 뒤처진 학생은 태그로 따라잡는다 (아래 표).

## 실행

준비물: JDK 21, Node 22, Docker Desktop

```bash
# 1. MySQL (처음 한 번)
docker compose up -d

# 2. 서버 → http://localhost:8080
cd backend
./gradlew bootRun          # 윈도우: gradlew.bat bootRun

# 3. 화면 → http://localhost:5173  (같은 와이파이면 http://내IP:5173 으로 학생들도 접속)
cd frontend
npm install
npm run dev
```

## 확인 ("완료"의 정의)

```bash
cd frontend && npm run check          # ESLint + TypeScript
cd backend && ./gradlew build         # javac -Werror + 단위 테스트
cd e2e && npm install && npx playwright install chromium && npx playwright test
# E2E는 서버(8081)·화면(5174)·DB(campus_e2e)를 따로 띄워서 돈다. 개발 서버를 켜 둔 채로 돌려도 된다.
```

## 단계별 체크포인트

태그와 같은 이름의 브랜치로도 올려 두었다 (GitHub에서는 브랜치로 보인다). 따라잡기: `git switch -c mine origin/step-5b-workshop`

| 태그 | 내용 |
|---|---|
| `step-1-scout` | 정찰: 캐릭터 공방 + 저장 (보안 구멍 일부러 남김) |
| `step-2-docs` | ARCHITECTURE.md (찜찜한 곳 포함) |
| `step-3-review` | 정독 메모 · 설계 리뷰 |
| `step-4-rules` | CLAUDE.md · 스킬 3개 · 정적 분석 · 첫 E2E |
| `step-5a-secure` | 입장 토큰, 내 것만 저장, 입력 검사 |
| `step-5b-workshop` | 가구 공방 |
| `step-5c-map` | 맵 에디터 |
| `step-5d-world` | 실시간 메타버스 |
| `step-6-docs` | 문서 갱신 · E2E 전용 DB 분리 |
| `step-7-deploy` | AWS 배포 파일 · CI |

태그를 뒤로 돌아갈 때는 DB도 비운다: `docker compose down -v && docker compose up -d`
