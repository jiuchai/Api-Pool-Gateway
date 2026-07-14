# API Pool Gateway

A dynamic API aggregation gateway platform. Register multiple third-party API services (compression, data conversion, image recognition, etc.) into a unified gateway and call them through a single API Key — no need to know the underlying service endpoints. Services can be added or removed without restarting the server.

### Features

- **Dynamic Service Registration** — Add, update, or remove API services at runtime without server restart
- **Unified API Key** — One key to access all registered services
- **Smart Rate Limiting** — Configurable rate limits per billing tier (requests/second and requests/day)
- **Billing System** — Four tiers: Free, Basic, Pro, Enterprise
- **Redeem Codes** — Generate and redeem codes for quota top-ups
- **Audit Logging** — Full audit trail for all admin operations and API calls
- **Admin Panel** — Web UI for managing services, users, billing, and monitoring
- **API Playground** — Built-in testing tool for registered services

### Screenshots

| Dashboard | Services Management | API Test |
| :--- | :--- | :--- |
| ![Dashboard](image/image-1.png) | ![Services](image/image-2.png) | ![API Test](image/image-3.png) |

### Tech Stack

| Layer    | Technology                                          |
| -------- | --------------------------------------------------- |
| Backend  | Node.js + Express 4                                 |
| Database | nedb (embedded file-based NoSQL)                    |
| Frontend | Vue 3 + Vite + Element Plus + Pinia                 |
| Auth     | JWT (Bearer) + API Key                              |

### Quick Start

#### Prerequisites

- Node.js >= 18
- npm >= 9

#### Installation

```bash
# Clone the repository
git clone https://github.com/jiuchai/Api-Pool-Gateway.git
cd Api-Pool-Gateway

# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..

# Configure environment variables
cp .env.example .env
# Edit .env with your own settings
```

#### Running in Development

```bash
# Run both backend and frontend concurrently
npm run dev:all

# Or run them separately:
npm run dev        # Backend on http://localhost:3002
npm run frontend   # Frontend on http://localhost:5174
```

#### Running in Production

```bash
# Build the frontend
cd frontend && npm run build && cd ..

# Copy built frontend to public directory
cp -r frontend/dist/* public/

# Start the server
npm start
```

The application will be available at `http://localhost:3002`.

#### Default Admin Account

| Field    | Value           |
| -------- | --------------- |
| Username | admin           |
| Email    | admin@pool.com  |
| Password | Admin@123456    |

> Change these values in `.env` before deploying to production.

### Docker

```bash
# Edit .env with your settings, then:
docker-compose up -d --build

# Open http://localhost:3002
```

All environment variables are read from the `.env` file automatically.

### Environment Variables

| Variable        | Description            | Default              |
| --------------- | ---------------------- | -------------------- |
| `PORT`          | Server port            | `3002`               |
| `JWT_SECRET`    | JWT signing secret     | (required)           |
| `ADMIN_USERNAME`| Admin account username | `admin`              |
| `ADMIN_EMAIL`   | Admin account email    | `admin@pool.com`     |
| `ADMIN_PASSWORD`| Admin account password | `Admin@123456`       |

### Project Structure

```
├── server.js           # Backend entry point
├── config/             # Configuration (port, JWT, billing tiers, rate limits)
├── database/           # nedb database setup
├── middleware/          # Auth, logger, rate limiter
├── routes/             # Express route handlers
│   ├── admin.js        # Admin panel API
│   ├── gateway.js      # Core: dynamic service proxy
│   ├── auth.js         # Authentication
│   ├── apikeys.js      # API key management
│   ├── billing.js      # Billing & plans
│   ├── logs.js         # Call logs
│   └── redeem.js       # Redeem codes
├── services/           # Business logic layer
├── utils/              # Utility functions
├── frontend/           # Vue 3 frontend
│   ├── src/
│   │   ├── views/      # Page components
│   │   ├── components/ # Shared components
│   │   ├── stores/     # Pinia stores
│   │   ├── router/     # Vue Router
│   │   └── api/        # Axios client
│   └── package.json
├── image/              # Screenshots
└── data/               # nedb database files (auto-created)
```

### License

MIT

---

[中文文档](README-zh_CN.md)
