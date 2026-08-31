# 台球会员积分系统部署说明

部署包结构：

- `frontend/`：前端静态文件，交给 Nginx 提供访问。
- `server/`：NestJS 后端、Prisma 数据库迁移和初始 SQLite 数据库。
- `server/prisma/data/app.db`：当前业务数据库。升级前务必备份。

## 一、服务器要求

- 建议 Linux 服务器，当前单店版本 4 核 4G 可用。
- 安装 Node.js 22 LTS、Nginx。
- 当前使用 SQLite，后端只能运行一个实例，不能多开多个 Node 后端共用同一个数据库文件。

## 二、上传与配置

1. 将 `cue-plus-deploy.zip` 上传到服务器，例如 `/opt/`。
2. 解压后目录为 `/opt/cue-plus`。
3. 进入后端目录：`cd /opt/cue-plus/server`。
4. 将 `.env.production.example` 复制为 `.env`：

```bash
cp .env.production.example .env
```

5. 编辑 `.env`，必须修改以下两项为仅负责人知道的随机长字符串：

```text
JWT_SECRET="替换为随机长字符串"
ADMIN_PROFILE_VERIFICATION_CODE="替换为管理员修改资料验证字符串"
```

6. 安装后端运行依赖并启动（不能直接执行 `node dist/main.js`）：

```bash
npm ci --omit=dev
npx prisma generate
npm run start
```

也可以使用部署包内的一键脚本：

```bash
./start-production.sh
```

Windows 服务器执行：

```powershell
.\start-production.ps1
```

首次启动必须先把 `.env.production.example` 复制为 `.env`。如果直接执行 `node dist/main.js`，由于依赖尚未安装或未生成 Prisma Client，会出现 `Cannot find module 'reflect-metadata'` 或 `@prisma/client did not initialize yet`。

建议使用 PM2 或 systemd 守护后端进程，避免服务器重启后服务停止。

## 三、Nginx 配置

将域名替换为实际域名，前端目录替换为实际解压路径。`/api/` 会转发到本机后端 `3000` 端口，外网不需要直接开放 3000 端口。

```nginx
server {
  listen 80;
  server_name 你的域名;

  root /opt/cue-plus/frontend;
  index index.html;

  location /api/ {
    proxy_pass http://127.0.0.1:3000/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

配置 HTTPS 时保留同样的 `/api/` 转发规则。前端生产环境已使用 `/api` 请求后端，不会产生 HTTPS 混合内容问题。

## 四、升级步骤

1. 停止后端服务。
2. 备份 `server/prisma/data/app.db` 到服务器外的安全位置。
3. 替换程序文件，但保留服务器上的 `.env` 和 `app.db`。
4. 进入 `server/` 执行：

```bash
npm ci --omit=dev
npx prisma generate
npm run start
```

如果升级包包含数据库迁移，先安装完整依赖并执行迁移：

```bash
npm ci --omit=dev
npx prisma migrate deploy
npx prisma generate
```

然后再重启后端服务。

## 五、数据备份

每日至少备份一次 `server/prisma/data/app.db`。备份前优先停止后端服务，避免复制过程中正好有积分写入。数据库文件是目前最重要的业务数据。
