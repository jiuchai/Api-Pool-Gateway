# API Pool Gateway / 动态API聚合网关

[English](README.md) | [中文](README-zh_CN.md)

一个动态API聚合网关平台。可将多个第三方API服务（压缩、数据转换、图片识别、文档处理等）动态注册到统一网关中，通过一个API Key即可调用所有已注册服务，无需了解底层服务端点。服务可在不重启服务器的情况下动态添加或移除。

### 功能特性

- **动态服务注册** — 无需重启服务器，运行时添加/修改/移除API服务
- **模板与脚本转发** — 支持 JSON/Form-Data 转发模式，可使用 Handlebars 风格模板或自定义 JS 脚本
- **统一API Key** — 一个密钥访问所有已注册服务
- **智能限流** — 按套餐等级可配置请求频率限制（每秒/每天）
- **内置计费系统** — 免费版、基础版、专业版、企业版多级套餐，支持叠加订阅
- **兑换码** — 生成和兑换套餐激活码
- **全链路审计日志** — 完整记录管理员操作与每次API调用
- **管理面板** — Web界面管理服务、用户、计费、系统监控、公告、兑换码等
- **API调试工具** — 内置已注册服务的在线测试工具
- **AI Agent 集成** — 提供服务发现与调用接口，便于智能体程序化集成
- **支付集成** — 可扩展支付流程，支持 webhook 回调，内置支付演示服务

### 截图预览

| 仪表盘 | 服务管理 | 计费管理 |
| :--- | :--- | :--- |
| ![Dashboard](image/image-1.png) | ![Services](image/image-2.png) | ![Billing](image/image-3.png) |

### 技术栈

| 层级     | 技术                                             |
| -------- | ------------------------------------------------ |
| 后端     | Node.js + Express 4                              |
| 数据库   | MongoDB (Mongoose)                               |
| 前端     | Vue 3 + Vite + Element Plus + Pinia + Chart.js   |
| 认证     | JWT (Bearer) + API Key                           |

### 快速开始（Docker 一键部署）

镜像可使用 `public/` 目录中的预构建前端，也可在启动时从源码编译。

```bash
git clone https://github.com/jiuchai/Api-Pool-Gateway.git
cd Api-Pool-Gateway
cp .env.example .env          # 编辑 .env 设置你自己的配置

docker-compose up -d
# 打开 http://localhost:8080（通过 Nginx）
```

> 默认通过 Nginx 反向代理访问，端口为 `8080`。Web 界面和所有 API 端点统一通过此端口提供服务。MongoDB 作为容器化服务与应用一同运行。

所有环境变量自动从 `.env` 文件读取。

> Docker 容器内如需访问宿主机上运行的 upstream 服务（例如 `127.0.0.1:1001`），请使用 `host.docker.internal` 替代 `127.0.0.1`，例如 `http://host.docker.internal:1001`。已在 `docker-compose.yml` 中配置 `extra_hosts`。

#### 修改前端后重新构建

改了前端代码，想在 Docker 重新编译前端，在 `.env` 中设置 `BUILD_FRONTEND=true` 然后重建：

```bash
BUILD_FRONTEND=true docker-compose up -d --build
```

#### 运行支付演示服务

```bash
# 启动支付回调演示服务，端口 4000
npm run pay-server
```

| URL | 说明 |
| --- | ---- |
| `http://localhost:4000/demo` | 支付演示页面（配置为站点设置中的支付页面地址） |
| `http://localhost:4000/pay` | 订单注册与回调接口（配置为支付通知地址） |

> 在管理后台 → 服务管理 → 设置 → 支付配置中：
> - **支付页面地址**：`http://localhost:4000/demo`（用户点击购买后跳转到此页面支付）
> - **支付通知地址**：`http://localhost:4000/pay`（创建订单时网关推送至此，自动注册 + 处理回调）
> - **支付回调密钥**：`my-pay-secret`（回调验证密钥）

详见 `payserver-dome/` 目录下的演示源码。

### 开发模式（热更新）

```bash
# 环境要求：Node.js >= 18, npm >= 9, 本地运行 MongoDB
npm install && cd frontend && npm install && cd ..

# 同时启动后端 + 前端开发服务器
npm run dev:all
# 后端 → http://localhost:3000
# 前端开发服务器 → http://localhost:5174
```

### 默认管理员账号

| 字段     | 值              |
| -------- | --------------- |
| 用户名   | admin           |
| 邮箱     | admin@pool.com  |
| 密码     | Admin@123456    |

> 部署到生产环境前，请在 `.env` 中修改这些值。

### 环境变量

| 变量             | 说明                                | 默认值                          |
| ---------------- | ----------------------------------- | ------------------------------ |
| `PORT`           | 应用内部端口                        | `3000`                         |
| `JWT_SECRET`     | JWT签名密钥                         | （必填）                        |
| `ADMIN_USERNAME` | 管理员用户名                        | `admin`                        |
| `ADMIN_EMAIL`    | 管理员邮箱                          | `admin@pool.com`               |
| `ADMIN_PASSWORD` | 管理员密码                          | `Admin@123456`                 |
| `NGINX_PORT`     | Nginx 对外端口（Web + API）         | `8080`                         |
| `BUILD_FRONTEND` | 在 Docker 中从源码重新构建前端      | `false`                        |
| `MONGO_URI`      | MongoDB 连接地址（留空则用 Docker 内置 mongo） | `mongodb://mongo:27017/pool-gateway` |

### 项目结构

```
├── server.js              # 后端入口
├── package.json
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── config/                # 配置文件（端口、JWT、套餐等级、限流）
│   ├── index.js
│   ├── default-services.json
│   ├── cleverutils-services.json
│   └── gotenberg-services.json
├── database/              # MongoDB 连接配置
│   ├── index.js
│   └── mongo.js
├── middleware/             # 认证、日志、限流中间件
├── routes/                # Express 路由
│   ├── admin.js           # 管理面板API
│   ├── gateway.js         # 核心：动态服务代理
│   ├── auth.js            # 用户认证
│   ├── apikeys.js         # API Key管理
│   ├── billing.js         # 计费与套餐
│   ├── logs.js            # 调用日志
│   ├── redeem.js          # 兑换码
│   └── skills.js          # AI Agent 工具发现
├── services/              # 业务逻辑层
│   ├── billingService.js
│   ├── gatewayService.js
│   ├── noticeService.js
│   ├── redeemService.js
│   ├── settingsService.js
│   ├── tierService.js
│   └── userService.js
├── utils/                 # 工具函数
├── nginx/                 # Nginx 反向代理配置
│   └── default.conf
├── payserver-dome/        # 支付回调演示服务
│   ├── server.js
│   └── index.html
├── public/                # 预构建前端文件（Docker 使用）
├── frontend/              # Vue 3 前端源码
│   └── src/
│       ├── views/         # 页面组件（20个视图）
│       │   └── admin/     # 管理后台页面（8个视图）
│       ├── components/    # 通用组件
│       ├── stores/        # Pinia 状态管理
│       ├── router/        # Vue Router 路由
│       └── api/           # Axios 请求封装
├── image/                 # 截图
├── SKILL.md               # AI Agent 技能文档
├── ROADMAP.md             # 改进建议与路线图
└── data/                  # 应用数据（自动创建）
```

### API 概览

#### 用户端接口（需 JWT）

| 接口地址 | 方法 | 说明 |
| -------- | ---- | ---- |
| `/api/auth/register` | POST | 用户注册 |
| `/api/auth/login` | POST | 用户登录 |
| `/api/billing/tiers` | GET | 获取可用套餐列表 |
| `/api/billing/subscriptions` | GET | 获取当前订阅 |
| `/api/billing/subscribe` | POST | 订阅套餐 |
| `/api/billing/usage` | GET | 获取当前用量统计 |
| `/api/redeem` | POST | 兑换码兑换 |
| `/api/apikeys` | GET/POST | 管理 API Key |
| `/api/logs` | GET | 查看调用日志 |
| `/api/services` | GET | 查看可用服务列表 |

#### 管理端接口（需 JWT + 管理员角色）

| 接口地址 | 方法 | 说明 |
| -------- | ---- | ---- |
| `/api/admin/services` | GET/POST | 管理服务 |
| `/api/admin/services/export` | GET | 导出所有服务 |
| `/api/admin/services/import` | POST | 导入服务包 |
| `/api/admin/users` | GET | 用户管理 |
| `/api/admin/billing/stats` | GET | 计费统计 |
| `/api/admin/payment-orders` | GET | 查看支付订单 |
| `/api/admin/tiers` | GET/PUT | 套餐配置管理 |
| `/api/admin/monitor` | GET | 系统监控 |
| `/api/admin/redeem-codes` | GET/POST | 兑换码管理 |
| `/api/admin/notices` | GET/POST/PUT/DELETE | 公告管理 |
| `/api/admin/settings` | GET/PUT | 站点与支付设置 |

### AI Agent 集成

网关提供了工具发现和调用的 API，供 AI Agent 程序化调用已注册的服务。

#### Tools API

| 接口地址 | 方法 | 说明 |
| -------- | ---- | ---- |
| `/api/gateway/tools` | GET | 获取所有可用工具（无需认证） |
| `/api/gateway/:slug/info` | GET | 获取指定工具的详细信息 |
| `/api/gateway/:slug` | POST | 调用工具（需要 API Key） |

完整 AI Agent 使用文档请参阅 [SKILL.md](SKILL.md)。

### License

MIT

---

[English Documentation](README.md)
