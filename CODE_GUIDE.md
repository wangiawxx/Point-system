# 台球会员积分系统代码维护说明

> 本文件以当前仓库源码为准，作为以后修改需求、排查问题和部署升级的参考。修改前先阅读本文件，再以实际源码验证；不要根据聊天历史或旧截图推断代码状态。

## 1. 项目概览

项目由两个独立部分组成：

- 根目录前端：Vue 3 + Vite + Vue Router，负责管理后台、大屏和手机会员端。
- `server/` 后端：NestJS + Prisma + SQLite，负责登录、用户、积分、PK 和排行榜接口。

前端开发端口通常由 Vite 自动选择，后端默认监听 `3000`，监听地址为 `0.0.0.0`。前端 API 地址来自 `VITE_API_BASE`；没有配置时使用当前页面主机的 `3000` 端口。

生产部署时，前端是静态文件，后端运行 `server/dist/main.js`。数据库文件是 `server/prisma/data/app.db`，当前是 SQLite 单实例部署，不能让多个后端进程同时写同一个数据库文件。

## 2. 目录和职责

### 前端

| 路径 | 职责 |
| --- | --- |
| `src/main.js` | 创建 Vue 应用、注册 Element Plus、加载全局样式 |
| `src/router/index.js` | 所有路由、登录守卫、管理员和会员权限入口 |
| `src/data/auth.js` | 管理员/会员登录、注册、退出、修改密码、本地 token |
| `src/data/store.js` | API 地址、请求头、用户列表、积分流水、排行榜请求和本地缓存 |
| `src/layouts/AdminLayout.vue` | 管理后台侧边栏和后台页面容器 |
| `src/views/DashboardView.vue` | 概览、积分趋势、今日流水、概览排行 |
| `src/views/UsersView.vue` | 用户管理、新增、修改、删除 |
| `src/views/PointsView.vue` | 积分录入和本月积分扣除 |
| `src/views/RankingView.vue` | 后台本月积分排行 |
| `src/views/PkView.vue` | 后台 PK 预约、结算和取消 |
| `src/views/ScreenTopFourView.vue` | 当前启用的大屏页面，前四名卡片和后续列表 |
| `src/views/ScreenView.vue` | 旧版大屏源码，当前路由未启用 |
| `src/views/ScreenStaticView.vue` | 旧版静态大屏源码，当前路由未启用 |
| `src/member-h5/MemberLoginView.vue` | 手机会员登录/注册 |
| `src/member-h5/MemberHomeView.vue` | 手机会员首页、本月积分和本月排行 |
| `src/member-h5/MemberPkView.vue` | 手机会员发起 PK、手机号尾号筛选对手 |
| `public/` | 大屏背景、奖杯、排名图片、PWA manifest 和 service worker |

### 后端

| 路径 | 职责 |
| --- | --- |
| `server/src/main.ts` | 启动 Nest、CORS、参数校验、监听端口 |
| `server/src/auth.controller.ts` | 管理员登录和管理员资料修改 |
| `server/src/member-auth.controller.ts` | 会员登录、注册、修改密码 |
| `server/src/users.controller.ts` | 用户列表、用户详情、增改删 |
| `server/src/points.controller.ts` | 手动积分增加/扣除、流水查询 |
| `server/src/ranking.controller.ts` | 本月排行、概览统计、历史趋势 |
| `server/src/pk.controller.ts` | PK 创建、查询、结算、取消 |
| `server/src/auth.guard.ts` | JWT 登录校验 |
| `server/src/roles.guard.ts` | `admin`/`member` 角色校验 |
| `server/prisma/schema.prisma` | 数据模型定义，仅在明确需要数据库结构变化时修改 |
| `server/prisma/data/app.db` | SQLite 业务数据，升级时必须备份 |

## 3. 当前路由

路由使用 `createWebHashHistory`，地址中会出现 `#`，这是当前部署方式的一部分。

### 管理员

- `/admin/login`：管理员登录
- `/admin/dashboard`：概览
- `/admin/users`：用户管理
- `/admin/points`：积分录入
- `/admin/ranking`：积分排行
- `/admin/pk`：PK 管理
- `/admin/profile`：管理员资料

### 大屏

- `/screen-top-four`：当前使用的大屏页面
- `/screen`、`/screen-static`：旧版路由目前已注释，不要误改成当前入口

### 手机会员

- `/member/login`：会员登录/注册
- `/member`：会员首页
- `/member/pk/create`：发起 PK
- `/pk/create`：兼容旧地址，重定向到手机 PK 页面

路由守卫要求：访问 `/admin/*` 必须存在管理员 token；访问 `/member/*` 必须存在会员 token。修改页面时要保持这两套登录状态分开，管理员使用 `cue-admin`，会员使用 `cue-member`。

## 4. 数据库模型和不可混淆的字段

主要业务表：

- `User`：用户资料和累计余额。`points` 是历史累计余额字段，不等于本月排行积分。
- `PointRecord`：每次积分变化流水。`amount` 可正可负，`before`/`after` 记录累计余额变化前后，`createdAt` 决定该流水属于哪个月份。
- `PkMatch`：PK 预约及结算记录，关联挑战者、对手和获胜者。
- `Admin`：管理员账号。

不要把 `User.points` 直接用于本月排行、概览本月总量或会员首页。本月积分必须根据当前中国时区月份查询 `PointRecord.amount` 汇总。

新增用户时表单中的初始 `points` 写入 `User.points`，但不会自动创建本月流水；如果业务要求初始积分计入本月，必须同时创建一条 `PointRecord`，不能只改余额字段。

## 5. 积分月份规则

当前月份按 `Asia/Shanghai` 计算，不按服务器系统时区直接截取。月份范围是：

```text
[中国时区当月 1 日 00:00, 下月 1 日 00:00)
```

当前实现的口径如下：

| 功能 | 数据来源 | 是否本月 |
| --- | --- | --- |
| `/ranking` | 正常用户的 `PointRecord.amount` 汇总 | 是 |
| `/users?period=month` | 正常用户的 `PointRecord.amount` 汇总 | 是 |
| `/ranking/statistics` 的 `totalPoints` | 正常用户本月流水汇总 | 是 |
| 手机会员登录返回 `points` | 该会员本月流水汇总 | 是 |
| 手机会员首页/PK 对手列表 | `/ranking` | 是 |
| 手动扣分 | 校验本月汇总不能扣成负数 | 是 |
| PK 结算失败方校验 | 校验失败方本月汇总是否足够 | 是 |
| `/ranking/trend` | 指定周/月/年的流水净变化 | 否，保留历史趋势 |
| `User.points` | 历史累计余额 | 否 |

每个月排行会自动从当月第一条流水重新计算，不需要清空数据库，也不能重置 `User.points`。历史月份流水只用于趋势和审计，不应被删除。

## 6. 积分写入流程

手动录入调用 `POST /points`，请求需要管理员 token：

```json
{
  "userId": 1,
  "amount": 100,
  "note": "手动积分录入",
  "operationId": "唯一操作编号"
}
```

后端会在事务中：

1. 根据 `operationId` 防止重复写入。
2. 汇总用户本月流水，计算本月变动后的值。
3. 扣分时禁止本月积分低于 0。
4. 更新 `User.points` 累计余额。
5. 写入 `PointRecord`，返回 `monthlyPoints`。

前端 `addPoints` 会把当前用户的显示值更新为 `monthlyPoints`，所以这里的 `user.points` 在已加载本月列表时代表显示口径，不要误以为它改变了数据库累计字段的含义。

## 7. PK 规则

手机会员通过 `POST /pk` 创建预约，后台通过 `PATCH /pk/:id/settle` 结算。结算时：

- 失败方必须有足够的本月积分。
- 失败方写入负流水，胜方写入正流水。
- `User.points` 仍同步更新为累计余额。
- `PkMatch` 记录保留，不能通过删除用户来删除 PK 历史。

手机号尾号搜索只在手机端前端筛选已经加载的本月排行列表。修改这个功能时不要在输入 1 位或 2 位数字时自动打开选择框；当前需求是输入完整 4 位尾号并且有匹配结果后再打开列表。

## 8. 删除用户和重新注册

`DELETE /users/:id` 的行为取决于用户是否有 PK 记录：

- 有 PK 记录：软删除，只把 `status` 改为 `已删除`，保留用户、PK 和积分流水。
- 没有 PK 记录：物理删除用户；由于 `PointRecord` 关系设置了级联删除，对应流水也会被删除。

所有正常用户列表、排行榜、积分流水查询都应过滤 `status = 已删除`。大屏、后台排行、概览排行也必须过滤删除用户。

已删除用户重新注册同一个手机号时，注册逻辑会先把旧用户手机号改成 `deleted:<id>:<oldPhone>`，然后新建一个正常用户，从而保留旧用户的 PK/流水历史并释放手机号唯一约束。不要直接复用旧用户 ID，也不要删除旧用户历史。

## 9. 大屏维护规则

当前入口只有 `/screen-top-four`，对应 `ScreenTopFourView.vue`。页面请求 `loadAllRankings(16)`，显示当前本月排行数据：前四名卡片，后续名次列表。

修改大屏时注意：

- 只改表格区域时，必须保留页面外层背景、标题、装饰、底部说明和实时刷新逻辑。
- 前四名布局主要由 `top-four-screen`、`top-four-cards`、`top-four-card` 等样式控制；后续列表不要误改成累计积分。
- 大屏的实时更新通过页面定时请求排行榜实现，不要删除定时器或请求取消逻辑。
- `ScreenView.vue` 和 `ScreenStaticView.vue` 是旧版页面，除非明确要求恢复旧版，否则不要把它们重新接入路由。

## 10. 概览和趋势的区别

概览页的“本月积分总量”和右侧排行是本月口径；“积分趋势”仍然读取 `/ranking/trend`，按流水的净变化显示本周、本月或全年历史数据。

因此修改本月排行查询时，不要把趋势接口改成只返回当前排行，也不要把历史流水删除。趋势中的负数表示扣分或 PK 结算造成的净减少。

## 11. API 清单

所有受保护接口都需要：

```http
Authorization: Bearer <token>
```

主要接口：

| 方法 | 地址 | 权限 | 用途 |
| --- | --- | --- | --- |
| `POST` | `/auth/login` | 无 | 管理员登录 |
| `POST` | `/member/auth/login` | 无 | 会员登录，返回本月积分 |
| `POST` | `/member/auth/register` | 无 | 会员注册 |
| `GET` | `/users` | admin | 用户列表，`period=month` 返回本月积分 |
| `POST` | `/users` | admin | 新增用户 |
| `PATCH` | `/users/:id` | admin | 修改用户 |
| `DELETE` | `/users/:id` | admin | 删除/软删除用户 |
| `POST` | `/points` | admin | 增加或扣除积分 |
| `GET` | `/points/records` | admin | 流水列表 |
| `GET` | `/ranking` | 已登录调用方 | 本月排行榜 |
| `GET` | `/ranking/statistics` | admin | 本月总量和用户数 |
| `GET` | `/ranking/trend?range=week\|month\|year` | admin | 历史趋势 |
| `GET` | `/pk` | admin/member | PK 列表 |
| `POST` | `/pk` | member | 发起 PK |
| `PATCH` | `/pk/:id/settle` | admin | 结算 PK |
| `PATCH` | `/pk/:id/cancel` | admin | 取消未结算 PK |

## 12. 修改前检查清单

1. 先确认修改的是当前入口和当前组件，不要依据旧页面文件名判断。
2. 涉及积分时明确写出：本月汇总还是累计余额，数据来源是 `PointRecord` 还是 `User.points`。
3. 涉及删除用户时检查 PK、流水、手机号唯一约束和所有列表过滤。
4. 涉及大屏时保留背景、装饰、刷新和底部区域，不要只替换模板表格。
5. 涉及手机端时同时检查登录缓存回退值、排行榜失败时的显示和 PK 对手列表。
6. 不需要改表结构时，不修改 `schema.prisma`，不执行 Prisma migration。
7. 前端修改后执行根目录 `npm run build`。
8. 后端修改后停止正在运行的后端进程，再在 `server/` 执行 `npm run build`，更新 `server/dist`。
9. 部署前备份 `server/prisma/data/app.db`，保留服务器上的 `.env`。

## 13. 常用命令

前端开发和构建：

```bash
npm install
npm run dev
npm run build
```

后端开发和构建：

```bash
cd server
npm install
npm run start:dev
npm run build
npm start
```

后端仅做类型检查：

```bash
cd server
npx tsc --noEmit --incremental false -p tsconfig.json
```

生产升级时保留 `.env` 和数据库文件；只有明确包含数据库迁移时才执行 `prisma migrate deploy`。本轮本月积分改造没有修改表结构，也没有新增迁移。

