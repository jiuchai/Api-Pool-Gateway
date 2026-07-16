# API Pool Gateway

[English](README.md) | [中文](README-zh_CN.md)

A dynamic API aggregation gateway platform. Register multiple third-party API services (compression, data conversion, image recognition, document processing, etc.) into a unified gateway and call them all through a single API Key — no need to know the underlying service endpoints. Services can be added or removed at runtime without restarting the server.

### Features

- **Dynamic Service Registration** — Add, update, or remove API services at runtime without server restart
- **Template & Script Forwarding** — Support JSON/Form-Data forwarding modes with Handlebars-style templates or custom JavaScript scripts
- **Unified API Key** — One key to access all registered services
- **Smart Rate Limiting** — Configurable rate limits per billing tier (requests/second and requests/day)
- **Built-in Billing** — Multi-tier plans: Free, Basic, Pro, Enterprise — with subscription stacking
- **Redeem Codes** — Generate and redeem codes for plan activation and quota top-ups
- **Full Audit Logging** — Complete audit trail for admin operations and every API call
- **Admin Panel** — Web UI for managing services, users, billing, monitoring, notices, and redeem codes
- **API Playground** — Built-in online testing tool for all registered services
- **AI Agent Ready** — Tool discovery and invocation endpoints for programmatic AI agent integration
- **Payment Integration** — Extensible payment flow with webhook callback support + built-in payment demo server

### Screenshots

| Dashboard | Services | Billing |
| :--- | :--- | :--- |
| ![Dashboard](image/image-1.png) | ![Services](image/image-2.png) | ![Billing](image/image-3.png) |

### Tech Stack

| Layer    | Technology                                     |
| -------- | ---------------------------------------------- |
| Backend  | Node.js + Express 4                            |
| Database | MongoDB (Mongoose)                             |
| Frontend | Vue 3 + Vite + Element Plus + Pinia + Chart.js |
| Auth     | JWT (Bearer) + API Key                         |

### Quick Start (Docker)

The image can use either pre-built frontend files in `public/` or build from source on startup.

```bash
git clone https://github.com/jiuchai/Api-Pool-Gateway.git
cd Api-Pool-Gateway
cp .env.example .env          # Edit .env with your settings

docker-compose up -d
# Open http://localhost:8080 (Nginx)
```

> The app is accessed through Nginx reverse proxy on port `8080` by default. Both the web UI and all API endpoints are served through this single port. MongoDB runs as a containerized service alongside the app.

All environment variables are read from the `.env` file automatically.

> To access upstream services running on the host machine (e.g., `127.0.0.1:1001`) from inside the Docker container, use `host.docker.internal` instead of `127.0.0.1`, e.g., `http://host.docker.internal:1001`. The `extra_hosts` is already configured in `docker-compose.yml`.

#### Rebuilding Frontend

If you modified the frontend and want to rebuild it inside Docker, set `BUILD_FRONTEND=true` in `.env` and rebuild:

```bash
BUILD_FRONTEND=true docker-compose up -d --build
```

#### Running the Payment Demo Server

```bash
# Starts a demo payment callback server on port 4000
npm run pay-server
```

| URL | Description |
| --- | ----------- |
| `http://localhost:4000/demo` | Payment demo page (set as `PAYMENT_URL` in Site Settings) |
| `http://localhost:4000/pay` | Order registration & callback endpoint (set as `PAYMENT_NOTIFY_URL`) |

> In Admin Panel → Services → Settings → Payment Config:
> - **Payment Page URL**: `http://localhost:4000/demo` (users are redirected here to pay)
> - **Payment Notify URL**: `http://localhost:4000/pay` (gateway pushes orders here, auto-registers + handles callbacks)
> - **Webhook Secret**: `my-pay-secret` (shared key for callback verification)

See `payserver-dome/` for the demo source code.

### Development (Hot-Reload)

```bash
# Prerequisites: Node.js >= 18, npm >= 9, MongoDB running locally
npm install && cd frontend && npm install && cd ..

# Start backend + frontend dev server concurrently
npm run dev:all
# Backend → http://localhost:3000
# Frontend dev server → http://localhost:5174
```

### Default Admin Account

| Field    | Value           |
| -------- | --------------- |
| Username | admin           |
| Email    | admin@pool.com  |
| Password | Admin@123456    |

> Change these values in `.env` before deploying to production.

### Environment Variables

| Variable         | Description                                  | Default                          |
| ---------------- | -------------------------------------------- | -------------------------------- |
| `PORT`           | App internal port                            | `3000`                           |
| `JWT_SECRET`     | JWT signing secret                           | *(required)*                     |
| `ADMIN_USERNAME` | Admin account username                       | `admin`                          |
| `ADMIN_EMAIL`    | Admin account email                          | `admin@pool.com`                 |
| `ADMIN_PASSWORD` | Admin account password                       | `Admin@123456`                   |
| `NGINX_PORT`     | Nginx public port (web UI + API)             | `8080`                           |
| `BUILD_FRONTEND` | Rebuild frontend from source in Docker       | `false`                          |
| `MONGO_URI`      | MongoDB connection URI (leave empty for Docker mongo) | `mongodb://mongo:27017/pool-gateway` |

### Project Structure

```
├── server.js              # Backend entry point
├── package.json
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── config/                # Configuration (port, JWT, tiers, rate limits)
│   ├── index.js
│   ├── default-services.json
│   ├── cleverutils-services.json
│   └── gotenberg-services.json
├── database/              # MongoDB connection setup
│   ├── index.js
│   └── mongo.js
├── middleware/             # Auth, logger, rate limiter
├── routes/                # Express route handlers
│   ├── admin.js           # Admin panel API
│   ├── gateway.js         # Core: dynamic service proxy
│   ├── auth.js            # Authentication
│   ├── apikeys.js         # API key management
│   ├── billing.js         # Billing & plans
│   ├── logs.js            # Call logs
│   ├── redeem.js          # Redeem codes
│   └── skills.js          # AI Agent tool discovery
├── services/              # Business logic layer
│   ├── billingService.js
│   ├── gatewayService.js
│   ├── noticeService.js
│   ├── redeemService.js
│   ├── settingsService.js
│   ├── tierService.js
│   └── userService.js
├── utils/                 # Utility functions
├── nginx/                 # Nginx reverse proxy config
│   └── default.conf
├── payserver-dome/        # Payment callback demo server
│   ├── server.js
│   └── index.html
├── public/                # Pre-built frontend (for Docker)
├── frontend/              # Vue 3 frontend source
│   └── src/
│       ├── views/         # Page components (20 views)
│       │   └── admin/     # Admin pages (8 views)
│       ├── components/    # Shared components
│       ├── stores/        # Pinia stores
│       ├── router/        # Vue Router
│       └── api/           # Axios client
├── image/                 # Screenshots
├── SKILL.md               # AI Agent skill documentation
├── ROADMAP.md             # Improvement suggestions & roadmap
└── data/                  # Application data (auto-created)
```

### API Overview

#### User Endpoints (require JWT)

| Endpoint | Method | Description |
| -------- | ------ | ----------- |
| `/api/auth/register` | POST | Register new user |
| `/api/auth/login` | POST | Login |
| `/api/billing/tiers` | GET | List available plans |
| `/api/billing/subscriptions` | GET | Get current subscriptions |
| `/api/billing/subscribe` | POST | Subscribe to a plan |
| `/api/billing/usage` | GET | Get current usage stats |
| `/api/redeem` | POST | Redeem a code |
| `/api/apikeys` | GET/POST | Manage API keys |
| `/api/logs` | GET | View call logs |
| `/api/services` | GET | List available services |

#### Admin Endpoints (require JWT + admin role)

| Endpoint | Method | Description |
| -------- | ------ | ----------- |
| `/api/admin/services` | GET/POST | Manage services |
| `/api/admin/services/export` | GET | Export all services |
| `/api/admin/services/import` | POST | Import service bundle |
| `/api/admin/users` | GET | List/manage users |
| `/api/admin/billing/stats` | GET | Billing statistics |
| `/api/admin/payment-orders` | GET | View payment orders |
| `/api/admin/tiers` | GET/PUT | Manage plan tiers |
| `/api/admin/monitor` | GET | System monitoring |
| `/api/admin/redeem-codes` | GET/POST | Manage redeem codes |
| `/api/admin/notices` | GET/POST/PUT/DELETE | Manage system notices |
| `/api/admin/settings` | GET/PUT | Site & payment settings |

### AI Agent Integration

The gateway provides tool discovery and invocation endpoints for AI agents to programmatically call registered services.

#### Tools API

| Endpoint | Method | Description |
| -------- | ------ | ----------- |
| `/api/gateway/tools` | GET | List all available tools (no auth) |
| `/api/gateway/:slug/info` | GET | Get tool details |
| `/api/gateway/:slug` | POST | Call a tool (requires API Key) |

See [SKILL.md](SKILL.md) for complete AI agent usage documentation.

### License

MIT

---

[中文文档](README-zh_CN.md)
