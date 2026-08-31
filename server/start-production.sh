#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if [ ! -d node_modules ]; then
  echo "正在安装后端生产依赖，请稍候..."
  npm ci --omit=dev
fi

if [ ! -f .env ]; then
  echo "错误：未找到 server/.env，请先执行：cp .env.production.example .env"
  exit 1
fi

echo "正在生成与当前服务器匹配的 Prisma 数据库客户端..."
npx prisma generate

npm run start
