# SEMA NEXUS — Web

Frontend do **SEMA NEXUS**, plataforma **demonstrativa** de inteligência ambiental, gestão de demandas de fiscalização e gestão documental no contexto de **Mato Grosso**.

> ⚠️ **AMBIENTE DEMONSTRATIVO — DADOS FICTÍCIOS.** Sem integração com sistemas da SEMA-MT ou outros sistemas institucionais.

Backend, Docker Compose e documentação geral: [Sema_Nexus_API](https://github.com/Nexus-Builder-Lab/Sema_Nexus_API) (ver `docs/`).

## Situação

| Item | Status |
|---|---|
| CI, templates, CLAUDE.md | **Implementado** (10/11/2026) |
| Projeto React, layout, login, Dockerfile | **Planejado** — Sprint 1 (Issues #1–#4) |
| Telas do Flux, Intelligence (dashboards e mapa) | **Planejado** — Sprint 2 |
| Telas do DocIA, integração final, testes | **Planejado** — Sprint 3 |

Acompanhamento: [GitHub Project — SEMA NEXUS — Desenvolvimento](https://github.com/orgs/Nexus-Builder-Lab/projects/1)

## Tecnologias

React 18 (JavaScript) · Vite · Bootstrap 5 · React Router · Axios · Chart.js · Leaflet · MSW · Vitest · Testing Library · ESLint · Prettier · Nginx · Docker

## Executar localmente (após a Issue #1)

```bash
npm ci
npm run dev                         # http://localhost:5173 — /api vai para http://localhost:8080
```

Sem a API rodando, use os mocks gerados do contrato OpenAPI (Issue #4):
```bash
# .env.local
VITE_USE_MOCKS=true
```

Qualidade:
```bash
npm run lint
npm test
npm run build
```

## Executar via Docker (ambiente completo)

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

## Mapa sem internet

A camada base do mapa usa a malha oficial de municípios do **IBGE** (GeoJSON local em `public/geo/`). Os tiles do OpenStreetMap são opcionais e ficam desligados por padrão.

## Histórico e autopilot

- [docs/DIARIO_DESENVOLVIMENTO.md](docs/DIARIO_DESENVOLVIMENTO.md): o que foi feito, decidido e testado em cada Issue.
- Desenvolvimento autônomo (`/next-issue`): [Sema_Nexus_API/docs/AUTOPILOT.md](https://github.com/Nexus-Builder-Lab/Sema_Nexus_API/blob/main/docs/AUTOPILOT.md).

## Contribuição

Toda mudança parte de uma Issue **deste** repositório. Branch `feature/GH-<n>`, commits `GH-<n>: ...`, PR com `Closes #<n>`. Ver [CLAUDE.md](CLAUDE.md) e [Sema_Nexus_API/docs/DEVELOPMENT.md](https://github.com/Nexus-Builder-Lab/Sema_Nexus_API/blob/main/docs/DEVELOPMENT.md).
