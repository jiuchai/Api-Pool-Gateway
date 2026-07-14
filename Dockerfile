# ============================================
# Stage 1: Build frontend
# ============================================
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Install frontend dependencies
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install

# Copy frontend source and build
COPY frontend/ ./
RUN npm run build

# ============================================
# Stage 2: Production image
# ============================================
FROM node:18-alpine

WORKDIR /app

# Install backend production dependencies only
COPY package.json package-lock.json* ./
RUN npm install --production

# Copy backend source code
COPY server.js ./
COPY config/ ./config/
COPY database/ ./database/
COPY middleware/ ./middleware/
COPY routes/ ./routes/
COPY services/ ./services/
COPY utils/ ./utils/

# Copy built frontend from stage 1 into public directory
COPY --from=frontend-builder /app/frontend/dist ./public

# Create data directory for nedb persistence
RUN mkdir -p /app/data

EXPOSE 3002

CMD ["node", "server.js"]
