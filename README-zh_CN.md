# API Pool Gateway / 动态API聚合网关

[English](README.md) | [中文](README-zh_CN.md)

一个动态API聚合网关平台。可将多个第三方API服务（压缩、数据转换、图像识别等）动态注册到统一网关中，通过一个API Key即可调用所有已注册服务，无需了解底层服务端点。服务可在不重启服务器的情况下动态添加或移除。

### 功能特性

- **动态服务注册** — 无需重启服务器，运行时添加/修改/移除API服务
- **统一API Key** — 一个密钥访问所有已注册服务
- **智能限流** — 按套餐等级可配置请求频率限制（每秒/每天）
- **计费系统** — 四个套餐等级：免费版、基础版、专业版、企业版
- **兑换码** — 生成和兑换额度充值码
- **审计日志** — 完整记录所有管理员操作和API调用
- **管理面板** — Web界面管理服务、用户、计费和系统监控
- **API调试工具** — 内置已注册服务的在线测试工具

### 截图预览

| 仪表盘 | 服务管理 | API测试 |
| :--- | :--- | :--- |
| ![Dashboard](image/image-1.png) | ![Services](image/image-2.png) | ![API Test](image/image-3.png) |

### 技术栈

| 层级     | 技术                                                |
| -------- | --------------------------------------------------- |
| 后端     | Node.js + Express 4                                 |
| 数据库   | nedb（嵌入式文件型NoSQL）                           |
| 前端     | Vue 3 + Vite + Element Plus + Pinia                 |
| 认证     | JWT (Bearer) + API Key                              |

### 快速开始（Docker 一键部署）

镜像自带预构建好的前端文件（在 `public/` 目录），无需编译步骤。

```bash
git clone https://github.com/jiuchai/Api-Pool-Gateway.git
cd Api-Pool-Gateway
cp .env.example .env          # 编辑 .env 设置你自己的配置

docker-compose up -d
# 打开 http://localhost:3002
```

所有环境变量自动从 `.env` 文件读取。

#### 修改前端后重新构建

改了前端代码，想让 Docker 重新编译前端：

```bash
BUILD_FRONTEND=true docker-compose up -d --build
```

#### 开发模式（热更新）

```bash
# 环境要求：Node.js >= 18, npm >= 9
npm install && cd frontend && npm install && cd ..
npm run dev:all
# 后端 → http://localhost:3002
# 前端开发服务器 → http://localhost:5174
```

#### 默认管理员账号

| 字段     | 值              |
| -------- | --------------- |
| 用户名   | admin           |
| 邮箱     | admin@pool.com  |
| 密码     | Admin@123456    |

> 部署到生产环境前，请在 `.env` 中修改这些值。

### 环境变量

| 变量            | 说明             | 默认值               |
| --------------- | ---------------- | -------------------- |
| `PORT`          | 服务器端口       | `3002`               |
| `JWT_SECRET`    | JWT签名密钥      | （必填）             |
| `ADMIN_USERNAME`| 管理员用户名     | `admin`              |
| `ADMIN_EMAIL`   | 管理员邮箱       | `admin@pool.com`     |
| `ADMIN_PASSWORD`| 管理员密码       | `Admin@123456`       |

### 项目结构

```
├── server.js           # 后端入口
├── config/             # 配置文件（端口、JWT、计费等级、限流）
├── database/           # nedb 数据库配置
├── middleware/          # 认证、日志、限流中间件
├── routes/             # Express 路由
│   ├── admin.js        # 管理面板API
│   ├── gateway.js      # 核心：动态服务代理
│   ├── auth.js         # 用户认证
│   ├── apikeys.js      # API Key管理
│   ├── billing.js      # 计费与套餐
│   ├── logs.js         # 调用日志
│   └── redeem.js       # 兑换码
├── services/           # 业务逻辑层
├── utils/              # 工具函数
├── frontend/           # Vue 3 前端
│   ├── src/
│   │   ├── views/      # 页面组件
│   │   ├── components/ # 通用组件
│   │   ├── stores/     # Pinia 状态管理
│   │   ├── router/     # Vue Router 路由
│   │   └── api/        # Axios 请求封装
│   └── package.json
├── image/              # 截图
├── skills.md           # AI Agent 技能文档
└── data/               # nedb 数据库文件（自动创建）
```

### AI Agent 集成

网关提供了工具发现和调用的 API，供 AI Agent 程序化调用已注册的服务。

#### Tools API

| 接口地址 | 方法 | 说明 |
| -------- | ------ | ----------- |
| `/api/gateway/tools` | GET | 获取所有可用工具（无需认证） |
| `/api/gateway/:slug/info` | GET | 获取指定工具的详细信息 |
| `/api/gateway/:slug` | POST | 调用工具（需要 API Key） |

#### 技能定义

完整 AI Agent 使用文档请参阅 [skills.md](skills.md)，包含使用方法、认证方式和 API schema。

### License

MIT

---

[English Documentation](README.md)
