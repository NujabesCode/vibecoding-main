#!/usr/bin/env bash
# 내 컴퓨터에서 빌드 → EC2로 복사 → 재시작. (윈도우는 Git Bash에서 실행)
# 사용법: ./deploy/deploy.sh ubuntu@YOUR_DOMAIN.duckdns.org ~/.ssh/campus-key.pem
set -euo pipefail
HOST="${1:?사용법: deploy.sh ubuntu@주소 키파일.pem}"
KEY="${2:?키 파일(.pem) 경로를 넣어 주세요}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "1/4 화면 빌드"
(cd "$ROOT/frontend" && npm ci && npm run build)

echo "2/4 서버 빌드 (테스트 포함)"
(cd "$ROOT/backend" && ./gradlew clean bootJar)
JAR="$(ls "$ROOT"/backend/build/libs/*.jar | grep -v plain | head -n 1)"

echo "3/4 EC2로 복사"
scp -i "$KEY" "$JAR" "$HOST:/opt/campus/app.jar.new"
ssh -i "$KEY" "$HOST" "rm -rf /opt/campus/web.new && mkdir -p /opt/campus/web.new"
scp -i "$KEY" -r "$ROOT"/frontend/dist/* "$HOST:/opt/campus/web.new/"

echo "4/4 교체하고 재시작"
ssh -i "$KEY" "$HOST" 'set -e
  mv /opt/campus/app.jar.new /opt/campus/app.jar
  rm -rf /opt/campus/web && mv /opt/campus/web.new /opt/campus/web
  sudo systemctl restart campus
  sleep 8
  curl -fsS http://127.0.0.1:8080/api/players > /dev/null && echo "배포 성공"'
