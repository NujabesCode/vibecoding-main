# 우리반 캠퍼스

내 캐릭터를 직접 그리고, 우리반이 만든 맵에서 같이 걸어 다니는 메타버스.
스프링부트 + 리액트 + MySQL.

## 실행

준비물: JDK 21, Node 20 이상, Docker Desktop

```bash
# 1. MySQL
docker compose up -d

# 2. 서버 (http://localhost:8080)
cd backend
./gradlew bootRun        # 윈도우는 gradlew.bat bootRun

# 3. 화면 (http://localhost:5173)
cd frontend
npm install
npm run dev
```
