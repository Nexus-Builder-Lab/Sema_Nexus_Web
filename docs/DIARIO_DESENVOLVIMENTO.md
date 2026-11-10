# SEMA NEXUS Web — Diário de desenvolvimento

> Registro cronológico de tudo o que foi feito, decidido e testado neste repositório. Uma entrada por Issue concluída (incluída no próprio PR). Resultados de teste são sempre os **reais** da execução.
> Erros que o autopilot não conseguiu corrigir ficam em `C:\SEMANEXUS\autopilot\RELATORIO_ERROS.md` e nas Issues com a label `autopilot-falhou`.

## Modelo de entrada

```
## AAAA-MM-DD HH:MM — GH-<n> · <título curto>
- **PR:** #<pr> · **Status:** mesclado | aguardando dependência | falhou
- **Executado por:** autopilot (sessão Web) | <pessoa>
- **O que foi feito:** ...
- **Decisões técnicas:** ...
- **Arquivos principais:** ...
- **Testes:** comando → resultado real (ex.: `npm test` → 12 testes, 0 falhas)
- **API real ou mocks:** validado contra a API real via Docker | somente mocks (motivo)
- **Pendências / observações para as próximas Issues:** ...
```

---

## 2026-11-10 — Planejamento e organização do repositório
- **Executado por:** Claude Code, com aprovação do proprietário.
- **O que foi feito:** 19 Issues (12 P0, 6 P1, 1 P2) com títulos `[SEMA_NEXUS_WEB][MÓDULO]`, dependências nativas inclusive para a API; CLAUDE.md, templates, CI (nome do branch, lint/testes/build, imagem Docker) e guardrails do Claude Code.
- **Decisões técnicas:** Vite + React 18 em JavaScript; Bootstrap 5; Chart.js; Leaflet com malha IBGE local (offline); mocks MSW a partir do OpenAPI exportado pela API.
- **Observação de ambiente:** a porta 8080 do host está ocupada por outro serviço; a API local roda em 18080.

## 2026-11-10 11:40 — GH-1 · Esqueleto Vite + React + Bootstrap + Router + Axios
- **PR:** (preenchido no PR) · **Status:** em validação
- **Executado por:** autopilot (sessão Web)
- **O que foi feito:** projeto Vite + React 18 em JavaScript; dependências Bootstrap 5.3 (Sass), React Router 6, Axios, Chart.js 4 + react-chartjs-2, Leaflet 1.9 + react-leaflet 4; estrutura `src/{api,mocks,auth,layout,components,pages/{core,intelligence,flux,docia},styles,utils}`; página inicial provisória com a faixa "AMBIENTE DEMONSTRATIVO — DADOS FICTÍCIOS" e página 404; ESLint 9 (flat config) + Prettier; Vitest + Testing Library + jsdom; scripts `dev`, `build`, `preview`, `lint`, `test`, `test:watch`, `format`, `format:check`; README atualizado.
- **Decisões técnicas:** proxy `/api` do Vite lê `VITE_API_PROXY_TARGET` (padrão `http://localhost:8080`, conforme a Issue; nesta máquina usar 18080). react-leaflet fixado na v4 (a v5 exige React 19). ESLint fixado na v9 (`@eslint/js` 10 exige ESLint 10, incompatível com `eslint-plugin-react`). Avisos de depreciação do Sass vindos do Bootstrap silenciados no `vite.config.js`. `.github` e `.claude` fora do Prettier para não reformatar templates existentes.
- **Arquivos principais:** `package.json`, `vite.config.js`, `eslint.config.js`, `.prettierrc.json`, `index.html`, `src/main.jsx`, `src/App.jsx`, `src/pages/core/*`, `src/styles/theme.scss`, `src/setupTests.js`, `src/App.test.jsx`, `README.md`.
- **Testes:** `npm run lint` → 0 problemas; `npm test` → 1 arquivo, 2 testes, 0 falhas; `npm run build` → OK (vite 8.3.7); `prettier --check .` → OK; `npm run dev` → `GET /` 200 com título "SEMA NEXUS".
- **API real ou mocks:** não se aplica (sem integração nesta Issue). Docker não se aplica: ainda não há Dockerfile (Issue #2) nem compose na `main` da API.
- **Pendências / observações para as próximas Issues:** `npm audit --omit=dev` aponta 2 vulnerabilidades moderadas no `react-router` 6.x (correção só na v7, fora da stack aprovada) — avaliar com o proprietário. Tokens visuais do protótipo ficam para a Issue #3; MSW para a Issue #4.

## 2026-11-10 13:55 — GH-2 · Dockerfile multi-stage, .dockerignore e proxy /api (Nginx)
- **PR:** (preenchido no PR) · **Status:** em validação
- **Executado por:** autopilot (sessão Web)
- **O que foi feito:** `Dockerfile` multi-stage (`node:22-alpine` → `nginxinc/nginx-unprivileged:alpine`), `nginx/default.conf.template` com fallback SPA, proxy `/api/` → `${API_UPSTREAM}`, `/healthz`, cache longo em `/assets/` e cabeçalhos básicos de segurança; `HEALTHCHECK`; `.dockerignore`; teste `src/dockerConfig.test.js`; README.
- **Decisões técnicas:** envsubst via `/etc/nginx/templates` do entrypoint oficial (sem script próprio). `proxy_pass` com variável + `resolver ${NGINX_RESOLVER}` (padrão `127.0.0.11`): o Nginx não falha ao subir se a API ainda não resolver e acompanha reinícios do container da API. `client_max_body_size 25m` para os uploads do DocIA (ajustar se a API definir outro limite). `VITE_USE_MOCKS=false` fixo no build da imagem.
- **Arquivos principais:** `Dockerfile`, `nginx/default.conf.template`, `.dockerignore`, `src/dockerConfig.test.js`, `README.md`.
- **Testes:** `docker build .` → OK (Docker 29.7.2). Container de teste em rede isolada com stub `api` (busybox httpd): `GET /` → 200; `GET /flux/demandas` → 200 com `index.html`; `GET /api/auth/config` → 200 com o JSON do stub (proxy OK); `GET /healthz` → `ok`; status `healthy`; `id` → `uid=101(nginx)`; nenhum segredo no histórico da imagem nem nos arquivos (único match de "SECRET" é o interno `__SECRET_INTERNALS_…` do React). `npm ci` → OK; `npm run lint` → 0 problemas; `npm test` → 2 arquivos, 6 testes, 0 falhas; `npm run build` → OK; `prettier --check .` → OK.
- **API real ou mocks:** proxy validado contra stub; o `docker-compose.yml` ainda não existe na `main` da API (Issue API#8), então a subida completa fica para lá.
- **Pendências / observações para as próximas Issues:** API#8 deve usar `build: ../Sema_Nexus_Web`, porta `${WEB_PORT:-3000}:8080` e `depends_on: api (service_healthy)`.
