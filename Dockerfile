# =============================================================================
# Stage 1: Builder - compila o frontend com Node.js
# =============================================================================
FROM node:20-slim AS builder

WORKDIR /app

# Instala dependências primeiro (cache eficiente)
COPY package*.json ./
RUN npm ci --prefer-offline

# Copia o código-fonte e gera o build de produção
COPY . .
RUN npm run build

# =============================================================================
# Stage 2: Production - serve arquivos estáticos com Nginx
# =============================================================================
FROM nginx:alpine AS production

# Copia os arquivos compilados do stage anterior
COPY --from=builder /app/dist /usr/share/nginx/html

# Copia a configuração customizada do Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost/index.html || exit 1

CMD ["nginx", "-g", "daemon off;"]
