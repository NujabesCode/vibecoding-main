# AWS 배포 · EC2 + RDS + 무료 도메인 + HTTPS

목표: `https://우리반.duckdns.org` 로 전 세계 어디서나 접속. 비용은 프리티어 크레딧 안에서 해결.

```
브라우저 ──HTTPS──▶ EC2 (Nginx) ──┬─ /           → /opt/campus/web (리액트 빌드)
                                  ├─ /api/*      → 스프링 8080
                                  └─ /ws         → 스프링 8080 (WebSocket)
                                                     │
                                                     ▼
                                                RDS MySQL 8.4
```

## 0. 돈 새는 함정 먼저

- **ALB(로드밸런서), NAT Gateway는 만들지 않는다.** 각각 월 2~3만 원씩 나간다. EC2 한 대 + Nginx면 충분하다.
- 첫날 **AWS Budgets**로 월 10달러 알림을 건다 (프리티어 크레딧 미션이기도 하다).
- 수업이 끝나면 RDS는 스냅샷 찍고 삭제, EC2는 중지.

## 1. RDS (MySQL)

1. RDS → 데이터베이스 생성 → **MySQL 8.4**, 템플릿 **프리 티어**, 인스턴스 `db.t4g.micro` (또는 `db.t3.micro`)
2. 마스터 사용자 `admin`, 비밀번호는 메모장에 (나중에 `campus.env`에 넣는다)
3. **퍼블릭 액세스: 아니요.** EC2에서만 접속한다
4. 만들고 나서 엔드포인트 주소를 복사해 둔다
5. 처음 한 번 DB를 만든다 (EC2에 접속해서):
   ```bash
   sudo apt install -y mysql-client
   mysql -h 엔드포인트 -u admin -p -e "CREATE DATABASE campus CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
   ```
   테이블은 안 만들어도 된다. 스프링이 켜질 때 Flyway가 V1~V4를 알아서 만든다.

## 2. EC2

1. EC2 → 인스턴스 시작 → **Ubuntu 24.04**, `t3.micro`(프리티어), 키 페어 새로 만들기(`campus-key.pem`)
2. 보안 그룹 인바운드: **22(내 IP만), 80, 443**
3. RDS 보안 그룹 인바운드에 **3306, 소스 = EC2 보안 그룹** 추가
4. 접속해서 설치:
   ```bash
   ssh -i campus-key.pem ubuntu@EC2_퍼블릭_IP
   sudo apt update && sudo apt install -y openjdk-21-jre-headless nginx
   sudo mkdir -p /opt/campus/web && sudo chown -R ubuntu:ubuntu /opt/campus
   ```

## 3. 무료 도메인 (DuckDNS)

1. duckdns.org 에 로그인 → 원하는 이름(예: `woori-8gi`) 추가 → **current ip**에 EC2 퍼블릭 IP 입력
2. 이제 `woori-8gi.duckdns.org` 가 EC2를 가리킨다
3. EC2를 껐다 켜면 IP가 바뀐다. 바뀌지 않게 하려면 **탄력적 IP**를 붙인다 (인스턴스에 붙어 있는 동안 1개는 프리티어. 단, 안 쓰고 놔두면 요금이 나온다)

## 4. 서버 설정 파일 올리기

이 폴더(`deploy/`)의 파일들을 EC2에 복사한다.

```bash
scp -i campus-key.pem deploy/nginx-campus.conf deploy/campus.service deploy/campus.env.example ubuntu@도메인:/opt/campus/
ssh -i campus-key.pem ubuntu@도메인
```

EC2 안에서:

```bash
cd /opt/campus
mv campus.env.example campus.env && nano campus.env      # RDS 주소, 비밀번호 채우기
chmod 600 campus.env                                     # 나만 읽게

sed -i 's/YOUR_DOMAIN/woori-8gi/' nginx-campus.conf      # 내 도메인으로
sudo mv nginx-campus.conf /etc/nginx/sites-available/campus
sudo ln -s /etc/nginx/sites-available/campus /etc/nginx/sites-enabled/campus
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

sudo mv campus.service /etc/systemd/system/campus.service
sudo systemctl daemon-reload && sudo systemctl enable campus
```

## 5. 첫 배포

내 컴퓨터(프로젝트 루트)에서:

```bash
./deploy/deploy.sh ubuntu@woori-8gi.duckdns.org ~/campus-key.pem
```

화면 빌드 → 서버 빌드 → 복사 → 재시작까지 한 번에 하고, 마지막에 `배포 성공`이 나오면 끝.
안 되면 EC2에서 로그를 본다: `journalctl -u campus -n 100`

## 6. HTTPS (Let's Encrypt, 무료)

메타버스는 HTTPS가 아니어도 돌아가지만, 주소창 경고가 없어야 서비스 같다. 그리고 나중에 카메라·마이크를 붙이려면 HTTPS가 필수다.

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d woori-8gi.duckdns.org
```

certbot이 Nginx 설정에 443을 추가하고, 인증서 자동 갱신까지 걸어 준다. 이제 `https://woori-8gi.duckdns.org` 로 접속.
화면 코드는 `https:` 이면 자동으로 `wss://` 로 WebSocket을 연결한다 (`src/ws.ts`).

## 7. 배포 전 30초 보안 점검

- [ ] `campus.env`가 GitHub에 안 올라갔나? (`git ls-files | grep env` 결과가 비어 있어야 함)
- [ ] RDS 퍼블릭 액세스가 꺼져 있나?
- [ ] EC2 22번 포트가 "내 IP"로만 열려 있나?
- [ ] 다른 사람 토큰 없이 `PUT /api/characters/me` 하면 401이 나오나?

## 자주 막히는 곳

| 증상 | 원인 |
|---|---|
| 하얀 화면 | `/opt/campus/web`에 index.html이 없다 → deploy.sh 다시 |
| 502 Bad Gateway | 스프링이 안 켜졌다 → `journalctl -u campus -n 100` (대부분 campus.env의 DB 주소/비밀번호) |
| 메타버스에서 "연결 중…"만 계속 | Nginx `/ws`에 Upgrade 헤더 설정이 빠졌다 |
| `Communications link failure` | RDS 보안 그룹에 EC2 보안 그룹 3306이 안 열렸다 |
