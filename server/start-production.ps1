$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

if (-not (Test-Path node_modules)) {
  Write-Host '正在安装后端生产依赖，请稍候...'
  npm ci --omit=dev
}

if (-not (Test-Path .env)) {
  Write-Host '错误：未找到 server/.env，请先复制 .env.production.example 为 .env'
  exit 1
}

Write-Host '正在生成与当前服务器匹配的 Prisma 数据库客户端...'
npx prisma generate

npm run start
