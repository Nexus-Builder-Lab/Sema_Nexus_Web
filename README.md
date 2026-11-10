# SEMA NEXUS — Web

Frontend do **SEMA NEXUS**, plataforma **demonstrativa** de inteligência ambiental, gestão de demandas de fiscalização e gestão documental no contexto de **Mato Grosso**.

> ⚠️ **AMBIENTE DEMONSTRATIVO — DADOS FICTÍCIOS.** Sem integração com sistemas da SEMA-MT ou outros sistemas institucionais.

Backend, Docker Compose e documentação geral: [Sema_Nexus_API](https://github.com/Nexus-Builder-Lab/Sema_Nexus_API) (ver `docs/`).

## Situação

| Item | Status |
|---|---|
| CI, templates, CLAUDE.md | **Implementado** (10/11/2026) |
| Esqueleto Vite + React, ESLint, Prettier, Vitest (Issue #1) | **Implementado** (10/11/2026) |
| Dockerfile multi-stage + Nginx (proxy `/api`, fallback SPA) (Issue #2) | **Implementado** (10/11/2026) |
| Tema visual, layout (sidebar, topbar, trilha, faixa demonstrativa) e componentes reutilizáveis (Issue #3) | **Implementado** (10/11/2026) |
| Cliente Axios, mocks MSW do contrato OpenAPI, login, `ProtectedRoute` e `RequireRole` (Issue #4) | **Implementado** (10/11/2026) |
| Telas do Flux, Intelligence (dashboards e mapa) | **Planejado** — Sprint 2 |
| Telas do DocIA, integração final, testes | **Planejado** — Sprint 3 |

Acompanhamento: [GitHub Project — SEMA NEXUS — Desenvolvimento](https://github.com/orgs/Nexus-Builder-Lab/projects/1)

## Tecnologias

React 18 (JavaScript) · Vite · Bootstrap 5 · React Router · Axios · Chart.js · Leaflet · MSW · Vitest · Testing Library · ESLint · Prettier · Nginx · Docker

## Executar localmente

Requisitos: Node.js 20.19+ (o CI usa Node 22).

```bash
npm ci
npm run dev                         # http://localhost:5173 — /api vai para VITE_API_PROXY_TARGET
```

O proxy `/api` do Vite usa `VITE_API_PROXY_TARGET` (padrão `http://localhost:8080`). Para mudar, copie `.env.example` para `.env.local` e ajuste — por exemplo, `VITE_API_PROXY_TARGET=http://localhost:18080` quando a porta 8080 da máquina estiver ocupada. O frontend sempre chama a API por `/api` relativo.

Sem a API rodando, use os mocks (MSW) gerados do contrato OpenAPI (**Implementado**, Issue #4):
```bash
# .env.local
VITE_USE_MOCKS=true
```

Com os mocks ligados, o login `admin@admin.com` / `12345678` funciona sem API (o mesmo usuário de teste da demonstração). Os handlers são gerados em tempo de execução de `src/mocks/openapi.json`, cópia do artefato `openapi` do job **Exportar contrato OpenAPI** do CI da API; para atualizar o contrato, baixe o artefato (`gh run download <run> -R Nexus-Builder-Lab/Sema_Nexus_API -n openapi`) e substitua o arquivo. Respostas específicas (login, fixtures) ficam em `src/mocks/handlers.js`. Os mocks **não entram** no build de produção (a Docker usa `VITE_USE_MOCKS=false`) e os mesmos handlers rodam nos testes (`src/mocks/server.js`).

Autenticação: o token JWT fica em memória e em `sessionStorage` (nunca `localStorage`); um `401` em sessão autenticada encerra a sessão e leva ao login; o aviso com o usuário de teste só aparece quando `GET /api/auth/config` devolve `demo: true`. Telas restritas por perfil usam `<RequireRole roles={[...]}>` — é só conveniência de interface, a autorização é da API.

Scripts:

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento (Vite) |
| `npm run build` | Build de produção em `dist/` |
| `npm run preview` | Serve o build localmente |
| `npm run lint` | ESLint (flat config) |
| `npm test` | Vitest + Testing Library (`vitest run`, sem modo watch) |
| `npm run format` / `format:check` | Prettier |

Estrutura:

```
src/
  api/ mocks/ auth/ layout/ components/ utils/ test/
  pages/{core,intelligence,flux,docia}/
  styles/theme.scss      # Bootstrap 5.3 via Sass
```

## Executar via Docker (ambiente completo)

> **Implementado:** imagem do Web (Issue #2). **Planejado:** o `docker-compose.yml` fica na API (Issue API#8) e ainda não está mesclado; os passos abaixo descrevem o uso previsto.

### Imagem do Web

- `Dockerfile` multi-stage: `node:22-alpine` (`npm ci` + `npm run build`) → `nginxinc/nginx-unprivileged:alpine` (usuário não-root, uid 101).
- Escuta na porta **8080** do container (o compose mapeia para **3000** no host). `HEALTHCHECK` em `GET /healthz`.
- `nginx/default.conf.template`: fallback SPA (`try_files $uri $uri/ /index.html`) e proxy `location /api/` → `${API_UPSTREAM}`.
- Variáveis de runtime (aplicadas por `envsubst` no entrypoint oficial): `API_UPSTREAM` (padrão `http://api:8080`) e `NGINX_RESOLVER` (padrão `127.0.0.11`, DNS do Docker). O host da API é resolvido por requisição, então o Nginx sobe mesmo antes da API.
- Nenhum segredo na imagem; `.dockerignore` exclui `node_modules`, `dist`, `.git` e `.env*`.

Build isolado: `docker build -t sema-nexus-web .` · teste rápido: `docker run --rm -p 3000:8080 sema-nexus-web` (sem a API, `/api` responde 502).

O `docker-compose.yml` fica no repositório da API; clone os dois lado a lado:

```bash
git clone https://github.com/Nexus-Builder-Lab/Sema_Nexus_API.git
git clone https://github.com/Nexus-Builder-Lab/Sema_Nexus_Web.git
cd Sema_Nexus_API
cp .env.example .env              # Windows: Copy-Item .env.example .env
docker compose up -d --build
```

Acesse http://localhost:3000. Login de teste (**somente demonstração**): `admin@admin.com` / `12345678`.
O Nginx da imagem serve o build e faz proxy de `/api` para o serviço `api`. Detalhes: [Sema_Nexus_API/docs/DOCKER.md](https://github.com/Nexus-Builder-Lab/Sema_Nexus_API/blob/main/docs/DOCKER.md).

## Interface e componentes

Tema em `src/styles/theme.scss`: tokens do protótipo (verde institucional, cinzas, cores de estado) aplicados às variáveis do Bootstrap 5.3.

- **Layout** (`src/layout/`): `AppLayout` (envolve todas as rotas) com `Sidebar` recolhível — painel deslizante abaixo de 992 px —, `Topbar`, `Breadcrumbs` e `DemoBanner` fixo "AMBIENTE DEMONSTRATIVO — DADOS FICTÍCIOS". Menu em `src/layout/navigation.js`.
- **Componentes** (`src/components/`): `DataTable` (ordenação local ou no servidor + `Pagination` 0-based), `FilterBar`, `EmptyState`, `Loading`, `ErrorState`, `ConfirmDialog`, `ToastProvider`/`useToast`, `StatusBadge` (7 status da demanda), `PriorityBadge`, `KpiCard`, `ChartCard`, `PageHeader`, `Icon` (SVG inline, sem biblioteca).
- Rótulos e cores de status/prioridade: `src/utils/catalogos.js` (valores de `Sema_Nexus_API/docs/DATABASE.md`).
- Responsivo em 375, 768 e 1366 px sem rolagem horizontal; foco visível, link "Pular para o conteúdo" e `aria-*` nos controles.

## Mapa sem internet

A camada base do mapa usa a malha oficial de municípios do **IBGE** (GeoJSON local em `public/geo/`). Os tiles do OpenStreetMap são opcionais e ficam desligados por padrão.

## Histórico e autopilot

- [docs/DIARIO_DESENVOLVIMENTO.md](docs/DIARIO_DESENVOLVIMENTO.md): o que foi feito, decidido e testado em cada Issue.
- Desenvolvimento autônomo (`/next-issue`): [Sema_Nexus_API/docs/AUTOPILOT.md](https://github.com/Nexus-Builder-Lab/Sema_Nexus_API/blob/main/docs/AUTOPILOT.md).

## Contribuição

Toda mudança parte de uma Issue **deste** repositório. Branch `feature/GH-<n>`, commits `GH-<n>: ...`, PR com `Closes #<n>`. Ver [CLAUDE.md](CLAUDE.md) e [Sema_Nexus_API/docs/DEVELOPMENT.md](https://github.com/Nexus-Builder-Lab/Sema_Nexus_API/blob/main/docs/DEVELOPMENT.md).
