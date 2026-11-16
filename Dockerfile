# SEMA ALERTA Web — imagem de produção (AMBIENTE DEMONSTRATIVO — DADOS FICTÍCIOS)
# Nenhum segredo nesta imagem: variáveis VITE_* são públicas no bundle.

# ---------- Stage 1: build ----------
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
# Na imagem a API é sempre a real (mocks MSW só em desenvolvimento).
ENV VITE_USE_MOCKS=false
RUN npm run build

# ---------- Stage 2: runtime ----------
FROM nginxinc/nginx-unprivileged:alpine AS runtime

# Destino do proxy /api (serviço "api" do compose) e DNS usado para resolvê-lo.
# O entrypoint oficial aplica envsubst em /etc/nginx/templates/*.template.
ENV API_UPSTREAM=http://api:8080 \
    NGINX_RESOLVER=127.0.0.11

COPY --chown=101:101 nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build --chown=101:101 /app/dist /usr/share/nginx/html

# Usuário não-root (uid 101) herdado da imagem nginx-unprivileged.
USER 101
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
