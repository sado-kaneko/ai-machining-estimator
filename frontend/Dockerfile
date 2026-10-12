# Stage 1: Build Angular Application
FROM node:22-alpine AS builder

WORKDIR /app

# 依存関係定義のコピーとインストール
COPY package*.json ./
RUN npm ci

# ソースコードのコピー
COPY . .

# 本番ビルド実行
RUN npm run build -- --configuration production

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Nginx設定の配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# ビルド成果物の配置
COPY --from=builder /app/dist/frontend/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
