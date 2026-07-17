# ============================================
# BUILD_FRONTEND=true  → Rebuild frontend from source
# default (false)      → Use pre-built files in public/
# ============================================

FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM node:18-alpine
WORKDIR /app

# Install git for update check
RUN apk add --no-cache git

# Backend production dependencies
COPY package.json package-lock.json* ./
RUN npm install --production

# Backend source
COPY server.js ./
COPY config/ ./config/
COPY database/ ./database/
COPY middleware/ ./middleware/
COPY routes/ ./routes/
COPY services/ ./services/
COPY utils/ ./utils/
COPY SKILL.md ./
# Git repo for update check
COPY .git/ ./.git/

# Frontend: copy both pre-built and freshly-built, choose at build time
COPY --from=frontend-builder /app/frontend/dist /tmp/frontend-dist
COPY public/ /tmp/public-prebuilt

ARG BUILD_FRONTEND=false
RUN if [ "$BUILD_FRONTEND" = "true" ]; then \
      echo ">>> Using freshly built frontend" && \
      rm -rf ./public && mkdir -p ./public && \
      cp -r /tmp/frontend-dist/* ./public/ ; \
    else \
      echo ">>> Using pre-built frontend from public/" && \
      mkdir -p ./public && \
      cp -r /tmp/public-prebuilt/* ./public/ ; \
    fi && \
    rm -rf /tmp/frontend-dist /tmp/public-prebuilt

RUN mkdir -p /app/downloads

EXPOSE 3000
CMD ["node", "server.js"]
