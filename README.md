# SEMA ALERTA — Web

Frontend do **SEMA ALERTA**, plataforma **demonstrativa** de inteligência ambiental, gestão de demandas de fiscalização e gestão documental no contexto de **Mato Grosso**.

> ⚠️ **AMBIENTE DEMONSTRATIVO — DADOS FICTÍCIOS.** Sem integração com sistemas da SEMA-MT ou outros sistemas institucionais.

Backend, Docker Compose e documentação geral: [Sema_Nexus_API](https://github.com/Nexus-Builder-Lab/Sema_Nexus_API) (ver `docs/`).

## Situação

Matriz conferida contra o código e **validada em execução contra a API real** (Docker Compose, mocks desligados) no
par Web `03494762` + API `caa0da6` (mais o diff local das melhorias do relatório técnico, ainda sem commit) em
20/11/2026 — evidências em [Sema_Nexus_API/docs/VALIDACAO_INTEGRADA.md](https://github.com/Nexus-Builder-Lab/Sema_Nexus_API/blob/main/docs/VALIDACAO_INTEGRADA.md).
As marcações antigas "com mocks / aguarda API" deixaram de valer: todas as telas abaixo usam a API real; os mocks MSW
ficam só para desenvolvimento sem API e para os testes.

| Capacidade | Status |
|---|---|
| Base: Vite + React, tema e layout (sidebar, topbar, trilha, faixa "AMBIENTE DEMONSTRATIVO"), componentes, Dockerfile + Nginx (proxy `/api`, fallback SPA), CI | **Implementado** |
| Sessão e acesso: cliente Axios, JWT em memória + `sessionStorage`, login e cartões de demonstração, `ProtectedRoute`/`RequireRole`, 401 encerra a sessão | **Implementado** — 401 e 403 validados no navegador contra a API real |
| Flux: listagem/filtros/paginação, cadastro e edição, detalhes e linha do tempo, triagem com o Agente de Triagem ("Aplicar sugestão" só preenche), distribuição, execução, fiscalização, conclusão/devolução, Fluxo de atividades (kanban), Controle de prazos, Produtividade, Painel de fiscalização | **Implementado** |
| Intelligence: Início, Dashboard ambiental, Inteligência ambiental (mapa de MT offline, concentração por município, camada INPE identificada, satélite Esri opcional), Análise de indicadores, Relatórios | **Implementado** |
| DocIA: biblioteca (busca textual e filtros), upload com progresso, detalhes/download, vínculo à demanda, análise documental e comparação (regras, sem IA), Assistente DocIA com modo, passos, citações e **selo de aderência textual explicado** | **Implementado** |
| Painel do sistema (`/sistema/painel`, só ADMIN) e administração de usuários, setores e equipes | **Implementado** |
| Contrato dos mocks (`src/mocks/openapi.json`) igual ao OpenAPI real | **Implementado** — atualizado em 20/11/2026 (a cópia anterior não tinha 23 dos 61 caminhos); conferido pela skill `validar-integracao-sema` da API |
| Teste ponta a ponta no navegador contra a API real | **Parcial** — roteiro Playwright executado localmente (ver evidências); não roda no CI |
| Busca semântica ou híbrida | **Planejado** — só após comparar com a busca textual |

Acompanhamento: [GitHub Project — SEMA ALERTA — Desenvolvimento](https://github.com/orgs/Nexus-Builder-Lab/projects/1)

## Tecnologias

React 18 (JavaScript) · Vite · Bootstrap 5 · React Router · Axios · Chart.js · Leaflet · MSW · Vitest · Testing Library · ESLint · Prettier · Nginx · Docker

## Executar localmente

Requisitos: Node.js 20.19+ (o CI usa Node 22).

```bash
npm ci
npm run dev                         # http://127.0.0.1:5173 — /api vai para VITE_API_PROXY_TARGET
```

O proxy `/api` do Vite usa `VITE_API_PROXY_TARGET` (padrão `http://127.0.0.1:8080`). Para mudar, copie `.env.example` para `.env.local` e ajuste — por exemplo, `VITE_API_PROXY_TARGET=http://127.0.0.1:18080` quando a porta 8080 da máquina estiver ocupada. O frontend sempre chama a API por `/api` relativo.

> **Use `127.0.0.1`, não `localhost`.** Em alguns Windows, `localhost` resolve para IPv6 (`::1`) e cai em outro serviço que usa as mesmas portas. O servidor do Vite escuta em `127.0.0.1` (`vite.config.js`).

Sem a API rodando, use os mocks (MSW) gerados do contrato OpenAPI (**Implementado**, Issue #4):
```bash
# .env.local
VITE_USE_MOCKS=true
```

Com os mocks ligados, o login `admin@admin.com` / `12345678` funciona sem API (o mesmo usuário de teste da demonstração). Os handlers são gerados em tempo de execução de `src/mocks/openapi.json`, cópia do artefato `openapi` do job **Exportar contrato OpenAPI** do CI da API; para atualizar o contrato, baixe o artefato (`gh run download <run> -R Nexus-Builder-Lab/Sema_Nexus_API -n openapi`) e substitua o arquivo. Respostas específicas (login, fixtures) ficam em `src/mocks/handlers.js`; catálogos, equipes e demandas têm fixtures fictícias em `src/mocks/fixtures/` (store em memória com filtros, ordenação, paginação, cadastro, edição e validação 400 por campo — os testes a restauram a cada caso com `resetDemandasMock()`). Os mocks **não entram** no build de produção (a Docker usa `VITE_USE_MOCKS=false`) e os mesmos handlers rodam nos testes (`src/mocks/server.js`).

Autenticação: o token JWT fica em memória e em `sessionStorage` (nunca `localStorage`); um `401` em sessão autenticada encerra a sessão e leva ao login; os cartões "Modo demonstração" do login (`POST /api/auth/demo/{perfil}`, sem senha no Web) só aparecem quando `GET /api/auth/config` devolve `demo: true` e `perfisDemo`. Telas restritas por perfil usam `<RequireRole roles={[...]}>` — é só conveniência de interface, a autorização é da API.

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

> **Implementado:** imagem do Web (Issue #2) e `docker-compose.yml` na API (Issue API#8, mesclado); login validado contra a API real via Compose (Issue #4).

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

Acesse http://127.0.0.1:3000 (porta `WEB_PORT` do `.env` da API; não use `localhost`). Login de teste (**somente demonstração**): `admin@admin.com` / `12345678`.
O Nginx da imagem serve o build e faz proxy de `/api` para o serviço `api`. Detalhes: [Sema_Nexus_API/docs/DOCKER.md](https://github.com/Nexus-Builder-Lab/Sema_Nexus_API/blob/main/docs/DOCKER.md).

## Interface e componentes

Tema em `src/styles/theme.scss`: tokens do protótipo (verde institucional, cinzas, cores de estado) aplicados às variáveis do Bootstrap 5.3.

- **Layout** (`src/layout/`): `AppLayout` (envolve todas as rotas) com `Sidebar` recolhível — painel deslizante abaixo de 992 px —, `Topbar`, `Breadcrumbs` e `DemoBanner` fixo "AMBIENTE DEMONSTRATIVO — DADOS FICTÍCIOS". Menu em `src/layout/navigation.js`.
- **Componentes** (`src/components/`): `DataTable` (ordenação local ou no servidor + `Pagination` 0-based), `FilterBar`, `EmptyState`, `Loading`, `ErrorState`, `ConfirmDialog`, `ToastProvider`/`useToast`, `StatusBadge` (7 status da demanda), `PriorityBadge`, `KpiCard`, `ChartCard`, `PageHeader`, `Icon` (SVG inline, sem biblioteca).
- Rótulos e cores de status/prioridade: `src/utils/catalogos.js` (valores de `Sema_Nexus_API/docs/DATABASE.md`).
- Responsivo em 375, 768 e 1366 px sem rolagem horizontal; foco visível, link "Pular para o conteúdo" e `aria-*` nos controles.

## Flux — demandas (Issue #5)

- **Rotas:** `/flux/demandas` (todos os perfis), `/flux/demandas/nova` e `/flux/demandas/:id/editar` (somente ADMIN, GESTOR e ANALISTA — `RequireRole`; CONSULTA e FISCAL não veem "Nova demanda" nem "Editar"). Perfis em `src/auth/perfis.js`. Detalhes (`/flux/demandas/:id`, Issue #6): linha do tempo, Iniciar triagem, Concluir triagem, Solicitar complementação e Distribuir aparecem só quando o status e o perfil permitem (triagem: ADMIN/GESTOR/ANALISTA; distribuição: ADMIN/GESTOR); `409` da API é exibido no modal. Execução (Issue #7): Iniciar execução (Distribuída), Registrar atividade e Registrar fiscalização (Em andamento) para ADMIN/GESTOR ou o FISCAL designado; Concluir demanda e Devolver (Aguardando conclusão) só para ADMIN/GESTOR; seção "Fiscalização" com o aviso "Não gera auto de infração nem substitui sistemas oficiais."
- **Listagem** (`DemandasListPage`): pesquisa por número/título, filtros de município, categoria, prioridade, status, equipe/fiscal responsável e período; **filtros, página e ordenação ficam na URL** (compartilháveis e com botão Voltar); a API faz paginação e ordenação (`sort=campo,asc|desc`). Badge "Atrasada" vem do campo derivado `atrasada` da API. O filtro de equipe/fiscal só aparece se `GET /api/equipes` responder (ADMIN/GESTOR; os demais recebem 403).
- **Formulário** (`DemandaFormPage`): validação de usabilidade em `validarDemanda.js` espelhando `DemandaRequest` da API (título 5–200, descrição ≤ 4000, município de MT do catálogo, coordenadas dentro do retângulo de MT com vírgula ou ponto, área afetada `areaHa` e polígono `areaGeometria` dentro de MT com desenho interativo no Leaflet ou importação `.geojson` que preenche área em ha e centroide, edição com `removerArea` e `prazoSugerido`, data de recebimento não futura, prazo sugerido ≥ recebimento); erros `400` do backend (`errors[].campo`) são exibidos no campo correspondente, `403`/`409` viram toast. Após salvar, toast com o número `DEM-AAAA/NNNN` e abertura dos detalhes (`/flux/demandas/:id`).
- **Alerta INPE → Demanda (Issue #147):** no painel de detalhes da seleção em `/intelligence/inteligencia-ambiental`, perfis ADMIN, GESTOR e ANALISTA veem "Criar Demanda de Monitoramento" ao selecionar um alerta DETER ou foco de calor do INPE, abrindo `/flux/demandas/nova` pré-preenchida (origem `MONITORAMENTO`, município, localização, área e polígono via `location.state`, sempre exigindo revisão e confirmação humana).

## Mapa sem internet

A camada base do mapa usa a malha oficial de municípios do **IBGE** (GeoJSON local em `public/geo/`). Os tiles do OpenStreetMap são opcionais e ficam desligados por padrão.

- Rota `/intelligence/inteligencia-ambiental` (`src/pages/intelligence/`): `MapaMT` (Leaflet + `LayersControl`), `MapFilters`, `MapLegend`. Pontos de `GET /api/intelligence/mapa` (cor por categoria, popup com link para a demanda); filtros de município, bioma, categoria e período.
- Camadas: malha IBGE (base, `public/geo/mt-uf.geojson` e `mt-municipios.geojson`, copiadas do protótipo), "Demandas (fictícias)" (ligada) e "Tiles OpenStreetMap" (desligada; exige internet). A camada "Focos de calor — INPE" (Issue #22) entra como mais um `LayersControl.Overlay` passado como `children` de `MapaMT`.
- Os marcadores são `CircleMarker` (sem imagens de ícone externas), então nada depende da rede.
- **Visão de satélite (opcional, Web#107):** botão ao lado do OpenStreetMap (exclusivos, ambos desligados por padrão e exigem internet). Imagens Esri World Imagery pelo proxy `/tiles/esri/{z}/{y}/{x}` do Nginx, que acrescenta a API Key do ArcGIS Location Platform **só no servidor** (variável do `.env` da API, repassada pelo compose — ver `Sema_Nexus_API/docs/DOCKER.md`). Sem chave, o botão fica desabilitado. Atribuição "Powered by Esri" sempre visível; imagens não são armazenadas localmente. Uso em produção por um órgão exige a licença do próprio órgão.

## Histórico e autopilot

- [docs/DIARIO_DESENVOLVIMENTO.md](docs/DIARIO_DESENVOLVIMENTO.md): o que foi feito, decidido e testado em cada Issue.
- Desenvolvimento autônomo (`/next-issue`): [Sema_Nexus_API/docs/AUTOPILOT.md](https://github.com/Nexus-Builder-Lab/Sema_Nexus_API/blob/main/docs/AUTOPILOT.md).

## Contribuição

Toda mudança parte de uma Issue **deste** repositório. Branch `feature/GH-<n>`, commits `GH-<n>: ...`, PR com `Closes #<n>`. Ver [CLAUDE.md](CLAUDE.md) e [Sema_Nexus_API/docs/DEVELOPMENT.md](https://github.com/Nexus-Builder-Lab/Sema_Nexus_API/blob/main/docs/DEVELOPMENT.md).
