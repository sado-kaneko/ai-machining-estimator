# Stage 1: Build TypeScript Backend
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# 依存関係定義のコピーとインストール
COPY package*.json ./
RUN npm ci

# ソースコードのコピーとビルド
COPY . .
RUN npm run build

# 本番用依存関係のみを残す
RUN npm prune --omit=dev

# Stage 2: Production Runner
FROM node:22-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production

# ビルド成果物と本番用node_modulesの配置
COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# アップロードディレクトリ作成用
RUN mkdir -p /app/storage/drawings

EXPOSE 3100

CMD ["node", "dist/server.js"]
