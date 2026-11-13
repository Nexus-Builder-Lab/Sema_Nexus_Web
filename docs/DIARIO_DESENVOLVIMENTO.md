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

## 2026-11-10 13:20 — GH-3 · Tema visual, layout com faixa demonstrativa e componentes reutilizáveis
- **PR:** (preenchido no PR) · **Status:** em validação
- **Executado por:** autopilot (sessão Web)
- **O que foi feito:** `theme.scss` com os tokens de `assets/css/global.css` do protótipo aplicados às variáveis do Bootstrap (primária `#166534`, cinzas, cores de estado, fonte 14 px, raios e sombras); layout `AppLayout` + `Sidebar` (Core, Intelligence, Flux, DocIA, Administração; recolhível no desktop, painel deslizante com backdrop e Esc abaixo de 992 px) + `Topbar` (menu, trilha, sino desabilitado "em breve", usuário/sair por props) + `Breadcrumbs` + `DemoBanner` + rodapé; componentes `DataTable`, `Pagination`, `FilterBar`, `EmptyState`, `Loading`, `ErrorState`, `ConfirmDialog`, `Toasts`, `StatusBadge`, `PriorityBadge`, `KpiCard`, `ChartCard`, `PageHeader`, `Icon`; página inicial e 404 dentro do layout.
- **Decisões técnicas:** status e prioridades seguem a API (`PENDENTE` … `FINALIZADA`; `BAIXA` … `URGENTE`), não os do protótipo; cores distintas por status e o texto sempre acompanha a cor. Ícones em SVG inline (sem lucide, para não adicionar dependência). `ConfirmDialog` sem o JS do Bootstrap: foco inicial em "Cancelar", Tab preso no diálogo, Esc fecha, foco volta ao gatilho. `DataTable` ordena localmente ou, com `onSortChange`, apenas emite a ordenação (servidor). Superfícies brancas (`$body-bg: #fff`) com fundo cinza só no `<body>`, porque o Bootstrap 5.3 usa `$body-bg` em cards e modais. Preferência "menu recolhido" em `sessionStorage` (interface, não dado de negócio). Sidebar fechada no celular fica `visibility: hidden` para sair da ordem de Tab. `user`/`onLogout` do `Topbar` serão ligados ao `AuthContext` na Issue #4.
- **Arquivos principais:** `src/styles/theme.scss`, `src/layout/*`, `src/components/*`, `src/utils/catalogos.js`, `src/App.jsx`, `src/pages/core/*`, testes `src/App.test.jsx`, `src/components/{DataTable,ConfirmDialog,StatusBadge,components}.test.jsx`, `README.md`.
- **Testes:** `npm ci` → OK; `npm run lint` → 0 problemas; `npm test` → 6 arquivos, 54 testes, 0 falhas; `npm run build` → OK; `prettier --check .` → OK. Responsividade medida no Chrome headless (CDP) sobre `vite preview`, em `/` e `/flux/demandas`: 375, 768 e 1366 px com `scrollWidth == clientWidth` (sem rolagem horizontal), inclusive com o menu do celular aberto; faixa demonstrativa visível em todas.
- **API real ou mocks:** não se aplica (sem chamadas à API). Docker Compose ainda não existe na `main` da API (API#8); a imagem é validada pelo job de build Docker do CI.
- **Pendências / observações para as próximas Issues:** rotas do menu ainda sem tela caem na 404 dentro do layout até as Issues dos módulos. Badge "Atrasada" (derivado do prazo) fica para a listagem de demandas (#5).

## 2026-11-10 18:45 — GH-4 · Cliente Axios, mocks MSW do contrato OpenAPI e login com rotas protegidas
- **PR:** (preenchido no PR) · **Status:** em validação
- **Executado por:** autopilot (sessão Web)
- **O que foi feito:** `src/api/httpClient.js` (Axios, `baseURL=/api`, injeta `Authorization: Bearer`, 401 em sessão autenticada aciona o tratador de logout; 401 do login/config não conta como sessão expirada) e `authApi.js`; `src/auth/` com `sessionStore` (token em memória + `sessionStorage`, nada em `localStorage`), `AuthProvider`/`useAuth`, `ProtectedRoute` (guarda a rota pedida) e `RequireRole` (tela "Acesso negado"); `LoginPage` (validação, loading, erros 400/401/403/rede, aviso com o usuário de teste só se `GET /api/auth/config` indicar `demo: true`, aviso "sessão expirou", campos sem pré-preenchimento); `AuthenticatedLayout` liga nome/perfil/Sair ao `Topbar`; mocks MSW em `src/mocks/` (handlers gerados em tempo de execução do `openapi.json` do CI da API + handlers de auth), ativados por `VITE_USE_MOCKS=true` e usados também nos testes (`server.js`).
- **Decisões técnicas:** `src/mocks/openapi.json` é cópia do artefato `openapi` do CI da API (run da `main` em c6e0b36); o gerador responde cada operação com a resposta 2xx preenchida pelos `example`/tipos do schema, exigindo Bearer nas rotas protegidas. O contrato **não** declara 2xx para `POST /auth/login` e para 3 `GET /demandas/{id}…` — esses handlers foram escritos à mão (aberta a Issue **API#45**). O bloco de mocks é eliminado do build de produção (`VITE_USE_MOCKS` é constante no build; verificado: 0 ocorrências de `msw` em `dist/assets`). `public/mockServiceWorker.js` fica fora do ESLint/Prettier (arquivo gerado pelo `msw init`). Credencial de teste existe nos mocks (para o login funcionar sem API) e nos testes; não é pré-preenchida. `setupTests` sobe o MSW com `onUnhandledRequest: 'error'`. `BrowserRouter` com `future` flags do v7 para silenciar avisos do React Router.
- **Arquivos principais:** `src/api/{httpClient,authApi}.js`, `src/auth/*`, `src/pages/core/{LoginPage,ForbiddenPage,validarLogin}`, `src/layout/AuthenticatedLayout.jsx`, `src/mocks/*`, `src/App.jsx`, `src/main.jsx`, `src/setupTests.js`, `src/test/auth.js`, testes `src/auth/auth.test.jsx`, `src/api/httpClient.test.js`, `src/mocks/contrato.test.js`, `README.md`.
- **Testes:** `npm run lint` → 0 problemas; `npm test` → 9 arquivos, 85 testes, 0 falhas; `npm run build` → OK; `prettier --check .` → OK. Chrome headless (CDP) com `VITE_USE_MOCKS=true`: 16/16 verificações (rota protegida → login, aviso demo, erro de credencial, login volta à rota pedida, usuário na topbar, token só em `sessionStorage`, sem rolagem horizontal em 375/768/1366 px logado e no login, logout limpa a sessão); console sem erros.
- **API real ou mocks:** validado contra a **API real via Docker Compose** (compose da `main` da API, exportado para pasta temporária com projeto isolado `semanexus-web4-check`, portas 18082/3001/11522, segredos gerados localmente; lock do Docker respeitado): oracle/api/web `healthy`; via Nginx do Web: `GET /api/auth/config` → `{"demo":true}`; login `admin@admin.com` → 200 com `token`, `expiresIn=28800` e perfil ADMIN; senha errada → 401; corpo vazio → 400; `/auth/me` sem token e com token inválido → 401; catálogo com token → 200; logout OK. Mesmo fluxo de navegador (Chrome headless) contra a imagem do Web + API real: 16/16 verificações e **nenhum erro/aviso no console**. `docker compose down` sem `-v`.
- **Pendências / observações para as próximas Issues:** o projeto Compose isolado deixou os volumes `semanexus-web4-check_oradata` e `_uploads` (não removidos: apagar volume exige autorização). O caminho `localhost` do Git Bash não alcança as portas publicadas nesta máquina — usar `127.0.0.1`. Fixtures ricas por tela (demandas, documentos, dashboard) devem ser acrescentadas em `src/mocks/handlers.js` pelas Issues #5–#10; os exemplos gerados são mínimos (1 item). Quando API#45 for corrigida, os handlers manuais de `semRespostaNoContrato`/login podem ser removidos após atualizar `openapi.json`.

## 2026-11-11 11:18 — GH-8 · Home e dashboard ambiental (Intelligence) contra mocks MSW
- **PR:** (a preencher pelo orquestrador) · **Status:** aguardando dependência (Nexus-Builder-Lab/Sema_Nexus_API#17)
- **Executado por:** autopilot (sessão Web)
- **O que foi feito:** Home (`HomePage`); dashboard ambiental (`IntelligenceDashboardPage`) com filtros de período e indicadores, `IndicatorChart` (Chart.js), `KpiCard` e `DemoSeal` (selo "AMBIENTE DEMONSTRATIVO — DADOS FICTÍCIOS"); clientes `intelligenceApi.js` e `catalogosApi.js`; hook `useCarregar` para os estados de carregamento, sucesso, erro e vazio; fixtures MSW em `src/mocks/fixtures/` (`intelligence.js`, `catalogos.js`), com handlers em `src/mocks/handlers.js`.
- **Decisões técnicas:** dados de Intelligence vêm sempre da API (`/api`); enquanto a API não existe, os mocks MSW entregam as respostas. Validação de período em `validarFiltros.js` apenas para usabilidade; quem decide é a API. Paleta de gráficos centralizada em `src/utils/paleta.js` e formatação de datas em `src/utils/datas.js`. Todo conteúdo fictício leva o selo demonstrativo (`DemoSeal`). Ajustes de tokens em `src/styles/theme.scss`.
- **Arquivos principais:** `src/pages/core/HomePage.jsx`, `src/pages/intelligence/IntelligenceDashboardPage.jsx`, `src/pages/intelligence/validarFiltros.js`, `src/components/{IndicatorChart,KpiCard,DemoSeal}.jsx`, `src/api/{intelligenceApi,catalogosApi}.js`, `src/hooks/useCarregar.js`, `src/mocks/fixtures/{intelligence,catalogos}.js`, `src/mocks/handlers.js`, `src/utils/{paleta,datas}.js`, `src/styles/theme.scss`, testes `src/pages/core/HomePage.test.jsx`, `src/pages/intelligence/IntelligenceDashboardPage.test.jsx`, `src/components/IndicatorChart.test.jsx`.
- **Testes:** `npm run lint` → ok (0 problemas); `npm test` → 12 arquivos, 103 testes, 0 falhas; `npm run build` → ok em 1,95 s. Testes de referência: `IntelligenceDashboardPage.test.jsx`, `HomePage.test.jsx`, `IndicatorChart.test.jsx`.
- **Docker:** não validado. A subida via Docker Compose contra a API real depende da Issue API#17, ainda aberta.
- **API real ou mocks:** somente mocks MSW (contrato `openapi.json`). Validação contra a API real pendente (API#17).
- **Agentes que atuaram:** validador-qa (APROVADO), revisor-codigo (APROVADO), revisor-ui-acessibilidade (APROVADO), documentador (esta entrada). Demais agentes do fluxo não informados nesta execução.
- **Pendências / observações para as próximas Issues:**
  - Tooltip do `KpiCard` disponível só por hover e `title`; sem acesso por foco ou toque.
  - Selects dos catálogos sem estado visual de erro.
  - `aria-describedby` do seletor de período ainda ausente.
  - Alvo de toque do botão de informação com cerca de 18 px (abaixo do recomendado).
  - Rótulo "Em andamento" versus "Em fiscalização": alinhar com o contrato da API.
  - Validar contra a API real e subir via Docker Compose quando API#17 for mesclada.
- **Retentativa (critério "finalizar demanda altera o dashboard"):** os handlers MSW de `/api/dashboard` e `/api/intelligence/*` agora calculam tudo a cada chamada sobre o mesmo estado em memória das demandas do Flux (`listarTodasDemandasMock` em `fixtures/demandas.js`), como a API (#17); concluir/cadastrar uma demanda muda KPIs e gráficos na consulta seguinte. A Home e o dashboard buscam os dados a cada montagem (`useCarregar`, sem cache). Prova: `src/pages/intelligence/DashboardFluxIntegracao.test.jsx` ("ao finalizar uma demanda no Flux, os números do dashboard mudam"). Também: `listarBiomas` com definição única (`catalogosApi.js`); atalho DocIA da Home vira cartão "Planejado" sem link; `ErrorState` único na Home; código IBGE de Poconé nos mocks = 5106505 (confere com `public/geo/mt-municipios.geojson`; 5106752 é Pontes e Lacerda). Testes: a confirmar pelo validador (afetados rodados: 11 arquivos, 98 testes, 0 falhas; lint ok).

## 2026-11-11 11:30 — GH-9 · Aba Inteligência ambiental: mapa de MT com Leaflet, filtros e legenda (offline)
- **PR:** (preenchido no PR) · **Status:** em validação (aguarda API#17 para o merge)
- **Executado por:** autopilot (sessão Web, Sonnet 5.5)
- **O que foi feito:** rota `/intelligence/inteligencia-ambiental` com `InteligenciaAmbientalPage`, `MapaMT` (react-leaflet, `LayersControl`: malha IBGE local como base, "Demandas (fictícias)" ligada, tiles OSM desligados), `MapFilters` (município, bioma, categoria, período; aplicados em "Filtrar", "Limpar" restaura), `MapLegend` (cores por categoria, aviso de localização aproximada, fonte IBGE), estados de carregamento/erro (com nova tentativa)/vazio; `src/api/intelligenceApi.js` e `catalogosApi.js`; malha copiada do protótipo para `public/geo/mt-uf.geojson` e `mt-municipios.geojson` (com `id` e `nome`); fixtures e handlers MSW de catálogos e do mapa com filtros reais.
- **Decisões técnicas:** `CircleMarker` em vez de `Marker` (evita os PNGs do Leaflet, que quebram com bundler e exigiriam rede/ativos extras). Cada camada controlada do `LayersControl` precisa de **um** filho-camada: os marcadores ficam num `LayerGroup`, senão cada marcador vira uma entrada no controle. A camada INPE (#22) entra via `children` de `MapaMT`. Cores e rótulos de categoria em `mapaConfig.js`. Carregamento derivado de uma chave de consulta (sem `setState` síncrono em efeito, regra do ESLint). Município/bioma dos filtros vêm de `/api/catalogos/*`; se falharem, o mapa continua funcionando.
- **Arquivos principais:** `src/pages/intelligence/*`, `src/api/{intelligenceApi,catalogosApi}.js`, `src/mocks/{handlers.js,fixtures/intelligence.js}`, `public/geo/*`, `src/App.jsx`, `src/styles/theme.scss`, `README.md`.
- **Testes:** `npm run lint` → 0 problemas; `npm test` → 10 arquivos, 93 testes, 0 falhas (8 novos: menu/título/faixa, malha local + fonte IBGE, marcadores e popup com link, controle de camadas, filtros enviados à API e atualização/limpeza, período + município, vazio, erro com retentativa); `npm run build` → OK. Docker: imagem do Web construída e executada isoladamente (porta 18199): `/geo/mt-uf.geojson` → 200 (11154 B), `/geo/mt-municipios.geojson` → 200 (175313 B), rota `/intelligence/inteligencia-ambiental` → 200 (fallback SPA); container e imagem removidos.
- **API real ou mocks:** desenvolvido contra mocks MSW. `GET /api/intelligence/mapa` ainda responde 501 na API (Issue API#17), então a validação contra a API real e o teste com a rede desligada num navegador ficam pendentes; os arquivos do mapa são todos locais (sem requisição externa, exceto a camada OSM opcional).
- **Pendências / observações para as próximas Issues:** merge só após fechar API#17 (label `aguardando-dependencia`). Conferir no mapa real a precisão das cores e o desempenho com muitos pontos. `.geojson` é servido pelo Nginx como `application/octet-stream` (funciona com `fetch().json()`); adicionar o mime type é opcional.

## 2026-11-10 19:00 — GH-5 · Telas de listagem e de cadastro/edição de demanda
- **PR:** (preenchido no PR) · **Status:** em validação — aguardando a API#11 (`aguardando-dependencia`)
- **Executado por:** autopilot (sessão Web, Sonnet 5.5)
- **O que foi feito:** `/flux/demandas` (`DemandasListPage`): `DataTable` com número (link), título, município, categoria, prioridade, status e prazo com badge "Atrasada"; pesquisa por número/título; filtros de município, categoria, prioridade, status, equipe/fiscal e período; filtros, página e ordenação refletidos na URL e processados pela API; estados de carregamento, vazio (com e sem filtro) e erro com "Tentar novamente"; "Nova demanda"/"Editar" só para ADMIN, GESTOR e ANALISTA. `/flux/demandas/nova` e `/flux/demandas/:id/editar` (`DemandaFormPage`): todos os campos da especificação, município com busca (datalist) restrito ao catálogo de MT, coordenadas opcionais validadas, validação espelhando `DemandaRequest`, erros 400 do backend no campo correto (com foco no primeiro inválido), toast com o número após salvar e navegação aos detalhes; edição bloqueada fora de PENDENTE/EM_TRIAGEM; rotas protegidas por `RequireRole`. Módulos `demandasApi`/`catalogosApi`, hook `useCarregar`, fixtures MSW de catálogos/equipes/demandas (store em memória).
- **Decisões técnicas:** estado dos filtros na URL (`useSearchParams`), com rascunho local aplicado ao "Filtrar" e reiniciado por `key` quando a URL muda (Voltar/Limpar). Ordenação no servidor via `DataTable` controlado (`sort=campo,dir`; padrão `numero,desc`). "Responsável" = equipe + fiscal (o fiscal carrega os membros da equipe escolhida); como `/api/equipes` é só ADMIN/GESTOR, o 403 apenas esconde esses filtros. Rótulos de categoria e opções dos selects vêm dos catálogos da API, não de listas fixas. Município: `<input list>` + `<datalist>` (acessível, sem biblioteca) com resolução do nome para o código IBGE ao enviar. Handlers manuais de demandas ficam antes dos gerados do contrato (que respondem só 1 item com exemplos). O teste de login que usava `/flux/demandas` como "rota ainda sem tela" passou a usar uma rota inexistente.
- **Arquivos principais:** `src/pages/flux/{DemandasListPage,DemandaFormPage,validarDemanda,catalogosFlux}`, `src/api/{demandasApi,catalogosApi}.js`, `src/hooks/useCarregar.js`, `src/auth/perfis.js`, `src/utils/datas.js`, `src/mocks/fixtures/{catalogos,demandas}.js`, `src/mocks/handlers.js`, `src/App.jsx`, testes `src/pages/flux/*.test.*`, `README.md`.
- **Testes:** `npm run lint` → 0 problemas; `npm test` → 12 arquivos, 121 testes, 0 falhas (36 novos: validação, listagem — carregamento, colunas, paginação, pesquisa, filtros na URL, Limpar, equipe/fiscal, 403 de equipes, ordenação, vazio, erro + retry, perfis — e formulário — campos, validação com foco, coordenadas/município, cadastro com corpo enviado e toast, lista com a nova demanda, 400 por campo, 403, CONSULTA bloqueado, catálogo com erro, edição, bloqueio por status, 409, 404); `npm run build` → OK; `prettier --check .` → OK.
- **API real ou mocks:** **somente mocks MSW do contrato**. A API#11 (endpoints de demanda) ainda responde 501, então "Paginação e filtros funcionam com a API real" e a subida completa via Docker Compose com demandas **não foram comprovadas** e ficam pendentes até a API#11 fechar. Divergência de contrato aberta: **API#47** (`DemandaDetalhe` sem `prazoSugerido`).
- **Pendências / observações para as próximas Issues:** após a API#11, revalidar a listagem (paginação, filtros, ordenação por `sort`) e o cadastro/edição contra a API real e confirmar os nomes de campo dos erros 400; atualizar `openapi.json` e remover fixtures se necessário. Os detalhes da demanda (`/flux/demandas/:id`, Issue #6) ainda caem na 404 dentro do layout; o toast e a navegação pós-cadastro já apontam para essa rota.

## 2026-11-11 11:55 — GH-5 · Revalidação contra a API real (API#11 fechada) e ajustes
- **PR:** #29 · **Status:** validado contra a API real
- **Executado por:** autopilot (sessão Web, Sonnet 5.5)
- **O que foi feito:** com a API#11 mesclada, branch atualizado com a `main`, revalidação local e subida via Docker Compose (compose da `main` da API exportado para pasta temporária `autopilot/tmp-compose-gh5`, porque o checkout da API estava em uso por outra sessão). Dois ajustes: (1) o mock MSW comparava `dataRecebimento` com a data fixa `2026-11-10` e passou a rejeitar "hoje" — agora usa `hojeISO()`; os 2 testes de cadastro falhavam desde 11/11; (2) a API real exige **latitude e longitude juntas** (400 "Informe latitude e longitude juntas.", campo `longitude`), regra que o formulário e o mock não tinham — espelhada em `validarDemanda` e no mock, com teste novo.
- **Decisões técnicas:** a divergência foi corrigida no Web (validação para usabilidade); a decisão continua no backend. API#47 (`prazoSugerido` em `DemandaDetalhe`) segue aberta e não bloqueia: o detalhe real não traz o campo, a edição apenas o deixa vazio.
- **Arquivos principais:** `src/mocks/fixtures/demandas.js`, `src/pages/flux/validarDemanda.js` (+ testes), `README.md`.
- **Testes:** `npm ci` → OK; `npm run lint` → 0 problemas; `npm test` → 12 arquivos, 122 testes, 0 falhas; `npm run build` → OK; `prettier --check` → OK. Docker: oracle/api/web `healthy`; via `http://127.0.0.1:3000/api` (Nginx do Web): login 200; `GET /demandas` paginado 200; `POST` 201 (DEM-2026/0002); `POST` inválido 400 com `errors[{campo,mensagem}]`; `GET /demandas/{id}` 200; `PUT` 200; filtros `q`/`prioridade`/`municipioId`, `page`/`size`/`sort` 200; catálogos e equipes 200. `docker compose down` (sem `-v`).
- **API real ou mocks:** validado contra a API real (contrato e erros 400); a interface em si foi testada com MSW — não houve teste manual no navegador contra a API real.
- **Pendências / observações:** criada 1 demanda fictícia (DEM-2026/0002) no volume Oracle do projeto Compose `sema-nexus`. Mensagens 400 da API real vêm em inglês para campos não customizados (`must not be blank`); o Web já exibe a do backend no campo correto.

## 2026-11-11 — GH-6 · Detalhes da demanda com histórico, triagem e distribuição
- **PR:** (preenchido no PR) · **Status:** em validação — depende da API#12 (triagem/distribuição) para o fluxo com a API real
- **Executado por:** autopilot (sessão Web, Sonnet 5.5)
- **O que foi feito:** `/flux/demandas/:id` (`DemandaDetailPage`): dados completos, situação (com "Atrasada"), prioridade, prazo, equipe, fiscal, observações, área de documentos (só contagem; listagem na Issue #10) e linha do tempo (`Timeline`) do histórico. Ações contextuais por status e perfil (`acoesDisponiveis` em `auth/perfis.js`): Iniciar triagem (com confirmação), Concluir triagem e Solicitar complementação (`TriagemModal`), Distribuir (`DistribuicaoModal`: equipe → só os fiscais ativos da equipe escolhida, prazo >= hoje, observações). Após cada ação a demanda e o histórico são recarregados, com toast; erros 400 vão ao campo e 409/403 aparecem no modal ou em toast. Componente `Modal` genérico; mocks MSW stateful (histórico, triagem, distribuição, 409 por status).
- **Decisões técnicas:** botões escondidos são só conveniência (a API autoriza). Recarga mantém os dados na tela (sem piscar). O handler manual de `/historico` substituiu o gerado do contrato.
- **Arquivos principais:** `src/pages/flux/{DemandaDetailPage,TriagemModal,DistribuicaoModal}.jsx`, `src/components/{Timeline,Modal}.jsx`, `src/api/demandasApi.js`, `src/auth/perfis.js`, `src/mocks/{handlers.js,fixtures/demandas.js}`, `src/App.jsx`, teste `src/pages/flux/DemandaDetailPage.test.jsx`, `README.md`.
- **Testes:** afetados (pages/flux, mocks, components, App) → 102 passaram; lint → 0 problemas. Suíte completa, build e Docker: a confirmar pelo validador.
- **API real ou mocks:** somente mocks MSW até a API#12 fechar; "Fluxo Pendente → Distribuída com a API real" fica pendente.

## 2026-11-11 — GH-7 · Acompanhamento, registro de fiscalização e conclusão na tela da demanda
- **PR:** (preenchido no PR) · **Status:** em validação
- **Executado por:** autopilot (sessão Web, Sonnet 5.5)
- **O que foi feito:** na tela de detalhes, ações por status e perfil: Iniciar execução (confirmação), Registrar atividade (`AtividadeForm`), Registrar fiscalização (`FiscalizacaoModal`: data, atividades, resultado, evidências fictícias, recomendações, aviso "Não gera auto de infração nem substitui sistemas oficiais."), Concluir e Devolver (`ConclusaoModal`). Nova seção "Fiscalização" com o registro (e resultado final quando Finalizada). `demandasApi` ganhou `/inicio`, `/atividades`, `/fiscalizacao`, `/conclusao`, `/devolucao`; mocks MSW stateful com validação e 409 por status.
- **Decisões técnicas:** `FormularioModal` genérico (campos declarativos, validação local, 400 por campo, 403/409 no modal) reaproveitado pelos três componentes. `acoesDisponiveis(status, usuario, demanda)`: execução para ADMIN/GESTOR ou FISCAL cujo id é o da demanda (conveniência; a API autoriza); concluir/devolver só ADMIN/GESTOR. Fiscal não designado não vê as ações.
- **Arquivos principais:** `src/pages/flux/{DemandaDetailPage,FormularioModal,FiscalizacaoModal,ConclusaoModal,AtividadeForm}.jsx`, `src/api/demandasApi.js`, `src/auth/perfis.js`, `src/mocks/{handlers.js,fixtures/demandas.js}`, testes `src/pages/flux/DemandaExecucao.test.jsx`, `README.md`.
- **Testes:** afetados (`src/pages/flux`) → 5 arquivos, 57 testes, 0 falhas; lint → 0 problemas. Suíte completa, build e Docker (fluxo Distribuída → Finalizada com a API real): a confirmar pelo validador.
- **API real ou mocks:** testes com mocks MSW do contrato (API#13 já fechada); validação contra a API real pendente.

## 2026-11-11 — GH-10 · DocIA: biblioteca, upload, detalhes, download e vínculo à demanda
- **PR:** (preenchido no PR) · **Status:** em validação
- **Executado por:** autopilot (sessão Web, Sonnet 5.5)
- **O que foi feito:** `/docia/documentos` (`DocumentosPage`: busca textual em título, descrição, palavras-chave e conteúdo, com aviso de que é textual; filtros categoria, tipo, data e município), `/docia/documentos/novo` (`DocumentoFormPage`: validação de extensão/tamanho no cliente, barra de progresso, mensagens para 413/415), `/docia/documentos/:id` (`DocumentoDetailPage`: metadados, demandas vinculadas, texto extraído colapsável, download autenticado) e `DemandaDocumentos` nos detalhes da demanda (listar, vincular por busca, desvincular com confirmação, upload já vinculado). `documentosApi.js`, rotas e permissões em `perfis.js`.
- **Decisões técnicas:** download via Axios com Blob (precisa do token). Nos testes, o corpo multipart é lido como texto porque o `File` do jsdom não é aceito pelo parser do undici (o nome do arquivo chega como "blob" no teste).
- **Arquivos principais:** `src/pages/docia/*`, `src/api/documentosApi.js`, `src/pages/flux/DemandaDetailPage.jsx`, `src/App.jsx`, `src/auth/perfis.js`, `README.md`.
- **Testes:** afetados (`src/pages/docia`, `flux`, `App`, `auth`) passaram; lint 0 problemas. Suíte completa, build e Docker: a confirmar pelo validador.
- **API real ou mocks:** somente mocks MSW; validação contra a API real (API#15/#16) pendente.

## 2026-11-11 — GH-12 · Testes de componentes e fluxos principais
- **PR:** (preenchido no PR) · **Status:** em validação
- **Executado por:** autopilot (sessão Web, Sonnet 5.5)
- **O que foi feito:** auditoria dos 6 fluxos da Issue (login sucesso/erro, rota protegida, cadastro de demanda, triagem/distribuição, upload de documento, filtros da listagem): todos já tinham testes unitários por tela (`auth.test`, `DemandaFormPage.test`, `DemandaDetailPage.test`, `DocumentoFormPage.test`, `DemandasListPage.test`). Acrescentado `src/fluxosCriticos.test.jsx`, jornada integrada pelo App real e MSW que costura os fluxos. Sem testes pulados; o CI já roda `npm test`.
- **Arquivos principais:** `src/fluxosCriticos.test.jsx`, este diário.
- **Testes:** `fluxosCriticos.test.jsx` → 2 passaram; lint 0 problemas. Suíte completa, build e CI: a confirmar pelo validador.
- **API real ou mocks:** MSW.

## 2026-11-11 — GH-17 · Indicadores explicados e painel de fiscalização do Flux
- **PR:** (preenchido no PR) · **Status:** em validação
- **Executado por:** autopilot (sessão Web, Sonnet 5.5)
- **O que foi feito:** `/intelligence/indicadores` (`IndicadoresPage`): demandas recebidas, tempo médio simulado, % de conclusão, evolução por período, volume por categoria e distribuição territorial, cada um com descrição e "Como é calculado". `/flux/painel` (`PainelFiscalizacaoPage`): contadores por status (inclui atrasadas) e gráficos por situação, período, município, categoria e equipe, reaproveitando `ChartCard`. Itens no menu; selo demonstrativo em todos os painéis; hook `useIndicador`.
- **Decisões técnicas:** % de conclusão = finalizadas ÷ recebidas, calculado no cliente a partir de `/intelligence/resumo`. A API não expõe tempo médio nem indicador por equipe: o tempo médio aparece como "indisponível (pendência de contrato)" e o gráfico por equipe agrupa as primeiras 200 demandas de `/api/demandas` (avisa quando parcial). Sugerida Issue na API para esses dois indicadores.
- **Arquivos principais:** `src/pages/intelligence/IndicadoresPage.jsx`, `src/pages/flux/PainelFiscalizacaoPage.jsx`, `src/hooks/useIndicador.js`, `src/App.jsx`, `src/layout/navigation.js`, testes das duas páginas.
- **Testes:** afetados (2 páginas novas, App, layout) passaram; lint 0 problemas. Suíte completa, build e Docker: a confirmar pelo validador.
- **API real ou mocks:** somente mocks MSW; validação contra a API real pendente.

## 2026-11-11 — GH-16 · Assistente DocIA com referências e modo identificado
- **PR:** (preenchido no PR) · **Status:** em validação
- **Executado por:** autopilot (sessão Web, Sonnet 5.5)
- **O que foi feito:** `/docia/assistente` (`AssistentePage`): chat com sugestões de perguntas, campo limitado a 500 caracteres, estados de envio/erro; cada resposta exibe o `modo` devolvido pela API em destaque e as referências (título com link para o documento + trecho). Resposta "Não há informação suficiente" aparece como tal, sem referências. Item "Assistente" no menu DocIA.
- **Decisões técnicas:** o modo vem sempre da API (a tela nunca afirma IA real); contrato conforme `POST /api/docia/perguntas` da API (#27); o `openapi.json` local ainda não contém o endpoint, então os testes usam handlers MSW próprios.
- **Arquivos principais:** `src/pages/docia/AssistentePage.jsx`, `src/api/assistenteApi.js`, `src/App.jsx`, `src/layout/navigation.js`, `src/pages/docia/Assistente.test.jsx`.
- **Testes:** afetados (Assistente.test, App.test) → 15 passaram; lint 0 problemas. Suíte completa, build e Docker: a confirmar pelo validador.
- **API real ou mocks:** somente mocks MSW; validação contra a API real pendente.
## 2026-11-11 — GH-22 · Camada de satélite do INPE no mapa de Inteligência ambiental
- **PR:** (preenchido no PR) · **Status:** em validação
- **Executado por:** autopilot (sessão Web, Sonnet 5.5)
- **O que foi feito:** no mapa de `/intelligence/inteligencia-ambiental`, camadas "Focos de calor — INPE (dados públicos)" e "Alertas de desmatamento — DETER (dados públicos)" (só se `metadados` trouxer DETER) no `LayersControl`, desligadas por padrão; círculos pequenos laranja/roxos sem contorno (distintos das demandas); popup com data/hora UTC, satélite, município, bioma e fonte; legenda/atribuição com data de `atualizadoEm` só com a camada ligada; painel "Referência por satélite (INPE)" (total + top 5); filtros de período do satélite no painel de filtros; modo agregado (coroplético com a malha IBGE local) acima de 3.000 pontos ou por chave manual.
- **Decisões técnicas:** `por-municipio` só filtra por período, então município/bioma são aplicados no cliente ao resumo; pontos pedidos com `limite=3000` e só com a camada ligada. Sem `preferCanvas` (quebra a contagem de marcadores SVG nos testes jsdom); com ≤3.000 `circleMarker` e agregado acima disso. `openapi.json` local ainda não tem `/referencia/*`: mocks MSW escritos à mão conforme `ReferenciaDto` da API (amostra fixa de 8 focos e 2 alertas DETER).
- **Arquivos principais:** `src/pages/intelligence/{SatelliteLayer,SatelliteLegend,SatelliteSidePanel}.jsx`, `useReferenciaSatelite.js`, `useGeoJson.js`, `InteligenciaAmbientalPage.jsx`, `MapFilters.jsx`, `src/api/intelligenceApi.js`, `src/mocks/fixtures/intelligence.js`, `CamadaInpe.test.jsx`.
- **Testes:** `src/pages/intelligence` + `src/mocks` → 34 passaram; lint 0 problemas. Suíte completa, build, rede desligada e Docker contra a API real: a confirmar pelo validador.
- **API real ou mocks:** somente mocks MSW; validação contra a API real pendente.
## 2026-11-12 — GH-15 · Tela de comparação documental
- **PR:** (preenchido no PR) · **Status:** em validação
- **Executado por:** autopilot (sessão Web, Sonnet 5.5)
- **O que foi feito:** `/docia/comparacao` (`ComparacaoPage`): seleção de dois documentos (bloqueia o mesmo documento), metadados lado a lado com Igual/Diferente, diff por linhas (`DiffView`, fonte monoespaçada, cor + sinal + rótulo acessível), trechos semelhantes, termos exclusivos e similaridade como informação secundária. Aviso fixo de comparação determinística (não é IA). Erros da API (ex.: documento sem texto extraído) exibidos via `detail` do ProblemDetail. Item "Comparação" no menu DocIA.
- **Decisões técnicas:** contrato conforme `ComparacaoResponse` da API (#26); aviso de texto truncado quando `truncado=true`.
- **Arquivos principais:** `src/pages/docia/ComparacaoPage.jsx`, `src/components/DiffView.jsx`, `src/api/comparacaoApi.js`, `src/App.jsx`, `src/layout/navigation.js`, `src/pages/docia/Comparacao.test.jsx`.
- **Testes:** afetados (Comparacao.test, App.test, layout) passaram; lint 0 problemas. Suíte completa, build e Docker: a confirmar pelo validador.
- **API real ou mocks:** somente mocks MSW; validação contra a API real pendente.

## 2026-11-12 — GH-13 · Gestão de usuários, setores e equipes
- **PR:** (preenchido no PR) · **Status:** em validação
- **Executado por:** autopilot (sessão Web, Sonnet 5.5)
- **O que foi feito:** `/admin/usuarios` (listagem paginada, pesquisa por nome/e-mail, filtro por perfil e situação, cadastro, edição, ativar/desativar com confirmação, equipe) e `/admin/estrutura` (setores e equipes: cadastro, edição, membros e responsável). Rotas só para ADMIN (`RequireRole`) e itens do menu Administração visíveis apenas ao ADMIN; senha validada com 8 a 72 caracteres (obrigatória no cadastro, opcional na edição). Menu: `/admin/equipes` virou `/admin/estrutura`.
- **Decisões técnicas:** a API não guarda equipe no usuário; o campo "Equipe" do formulário grava a associação via `PUT /api/equipes/{id}/membros` depois de salvar (aviso se essa segunda chamada falhar). Erros 400 por campo e 409 (e-mail/sigla duplicados, último ADMIN) exibidos a partir do ProblemDetail. Contrato conforme `docs/API.md` da API (#24); o `openapi.json` local ainda não tem esses endpoints, então os mocks MSW (`src/mocks/fixtures/admin.js`, store em memória) foram escritos à mão a partir do doc.
- **Arquivos principais:** `src/pages/core/admin/*`, `src/api/adminApi.js`, `src/mocks/fixtures/admin.js`, `src/App.jsx`, `src/layout/{navigation.js,Sidebar.jsx}`, `src/auth/perfis.js`.
- **Testes:** afetados (Admin.test, App, auth, layout, flux) → 102 passaram; lint 0 problemas. Suíte completa, build e Docker: a confirmar pelo validador.
- **API real ou mocks:** somente mocks MSW; validação contra a API real pendente.

## 2026-11-12 — GH-18 · Relatórios com filtros e exportação CSV/PDF
- **PR:** (preenchido no PR) · **Status:** em validação
- **Executado por:** autopilot (sessão Web, Sonnet 5.5)
- **O que foi feito:** `/intelligence/relatorios` (`RelatoriosPage`): filtros período, município, bioma, categoria e status (na URL, validação de período), tabela paginada com estados de carregamento/vazio/erro, botão "Baixar CSV" (`GET /api/relatorios/demandas.csv` com os mesmos filtros e token, download via Blob) e "Salvar como PDF" (`window.print()`). `src/styles/print.css` (`@media print`): esconde menu, topbar, filtros e botões, A4 paisagem, cabeçalho "AMBIENTE DEMONSTRATIVO — DADOS FICTÍCIOS" com resumo dos filtros. Item "Relatórios" no menu e rota restrita a ADMIN/GESTOR/ANALISTA/CONSULTA (FISCAL → 403 na API).
- **Decisões técnicas:** contrato conforme `docs/API.md` da API (#28); o `openapi.json` local ainda não contém `/relatorios`, então os mocks MSW (`src/mocks/fixtures/relatorios.js`) foram escritos à mão seguindo o contrato documentado. PDF é só impressão do navegador (sem biblioteca).
- **Arquivos principais:** `src/pages/intelligence/RelatoriosPage.jsx`, `src/api/relatoriosApi.js`, `src/styles/print.css`, `src/mocks/fixtures/relatorios.js`, `src/App.jsx`, `src/layout/navigation.js`, `src/auth/perfis.js`, `RelatoriosPage.test.jsx`.
- **Testes:** afetados (RelatoriosPage.test, App, layout, mocks) passaram; lint 0 problemas. Suíte completa, build e Docker: a confirmar pelo validador.
- **API real ou mocks:** somente mocks MSW; validação contra a API real pendente.

## 2026-11-11 — GH-11 · Integração final com a API real e revisão visual (parcial)
- **PR:** (preenchido no PR) · **Status:** parcial — roteiro Docker com a API real e revisão em 375/768/1366 px pendentes
- **Executado por:** autopilot (sessão Web, Sonnet 5.5)
- **O que foi feito:** trilha de navegação (`Breadcrumbs`) agora cobre rotas aninhadas (Nova demanda, Detalhes, Editar, Novo documento) via `subCrumb` em `layout/navigation.js`. A faixa demonstrativa já vem do layout em todas as telas autenticadas.
- **Limitação:** não havia API com credenciais demonstrativas (a API local em 18080 respondeu `demo:false`) nem navegador automatizado nesta sessão; o roteiro completo no Docker, o console limpo e a revisão em 3 larguras não foram executados e não são declarados como feitos.
- **Testes:** afetados (`src/layout`, `src/App.test.jsx`) passaram; lint a reconfirmar. Suíte completa, build e Docker: a confirmar pelo validador.
- **Atualização 12/11/2026 (revisão visual pelo Chrome, autorizada pelo proprietário):** roteiro no Docker com a API real após `demo-reset`: login com o usuário de teste, 13 telas (Início, Dashboard ambiental, Inteligência ambiental/mapa, Indicadores, Relatórios, Demandas, Detalhes da demanda, Painel de fiscalização, Documentos, Assistente, Comparação, Usuários, Setores e equipes) sem erros de console e sem alertas de erro, faixa demonstrativa presente. Em 375 e 768 px, Demandas, Usuários e Setores e equipes geravam rolagem horizontal da página: elementos `position: absolute` (`.visually-hidden`) dentro de `.table-responsive` escapavam do recorte. Correção: `.table-responsive { position: relative; }` em `theme.scss`. Depois: 13/13 telas sem rolagem horizontal em 375, 768 e 1366 px. `npm test` → 223 passaram; lint e build OK.

## 2026-11-12 — GH-14 · Central de notificações e consulta de auditoria
- **PR:** (preenchido no PR) · **Status:** em validação
- **Executado por:** autopilot (sessão Web, Sonnet 5.5)
- **O que foi feito:** `NotificationBell` na topbar (substitui o botão desabilitado): contador de não lidas (`GET /api/notificacoes/nao-lidas/contagem`, atualizado ao abrir, após marcar leitura e a cada 60 s), painel com as 10 últimas (`GET /api/notificacoes`), "Marcar como lida" (`PATCH /api/notificacoes/{id}/lida`) e link "Ver demanda"; estados de carregamento/vazio/erro. `/admin/auditoria` (`AuditoriaPage`): tabela paginada de `GET /api/auditoria` com filtros período (de/até, validado), usuário, ação e entidade; rota e item de menu só para ADMIN (a API também responde 403 aos demais).
- **Decisões técnicas:** contrato conforme controllers da API (#25, #14); o `openapi.json` local ainda não contém esses endpoints, então os mocks MSW (`src/mocks/fixtures/notificacoes.js`, store em memória) foram escritos à mão. Notificações em polling simples, sem WebSocket.
- **Arquivos principais:** `src/layout/NotificationBell.jsx`, `src/layout/Topbar.jsx`, `src/pages/core/admin/AuditoriaPage.jsx`, `src/api/notificacoesApi.js`, `src/mocks/fixtures/notificacoes.js`, `src/App.jsx`, `src/layout/navigation.js`, `Notificacoes.test.jsx`.
- **Testes:** afetados (Notificacoes.test, Admin.test, App, layout, HomePage) → 36 passaram; lint 0 problemas. Suíte completa, build e Docker: a confirmar pelo validador.
- **API real ou mocks:** somente mocks MSW; validação contra a API real pendente.

## 2026-11-12 09:20 — GH-53 · Tela de login igual ao protótipo, com a logo SEMA NEXUS
- **PR:** a definir · **Status:** aguardando validação
- **Executado por:** autopilot (sessão Web)
- **O que foi feito:** `LoginPage` em layout dividido (painel verde com logo, título, descrição, 3 módulos e contorno de MT a partir de `public/geo/mt-uf.geojson`; formulário "Acesso ao sistema" à direita); seção "Modo demonstração" com cartões por perfil (`perfisDemo` de `GET /api/auth/config` quando `demo: true`; clique em `POST /api/auth/demo/{perfil}` via `loginDemo`, sem senha no Web); aviso demonstrativo no rodapé do formulário; componente `Logo` (usado também na `Sidebar`); em telas estreitas o painel verde vira cabeçalho compacto. Removido o aviso com e-mail de teste. Textos neutros (sem "Governo de Mato Grosso" nem "credenciais institucionais"). Dependência `lucide-react` adicionada (aprovada).
- **Decisões técnicas:** o `openapi.json` local ainda não traz `/auth/demo` nem `perfisDemo`; handlers MSW escritos à mão (a atualizar com o contrato). `server.js` de teste serve uma malha mínima para o contorno.
- **Arquivos principais:** `src/pages/core/{LoginPage,ContornoMT}.jsx`, `src/components/Logo.jsx`, `src/layout/Sidebar.jsx`, `src/auth/AuthProvider.jsx`, `src/api/authApi.js`, `src/styles/theme.scss`, `src/mocks/{handlers,server}.js`, `src/auth/auth.test.jsx`.
- **Testes:** afetados (auth, mocks, layout, components, pages/core, intelligence, App) → 141 passaram; lint 0 problemas. Suíte completa, build, Docker (profile demo) e rolagem em 375/768/1366 px: a confirmar pelo validador.

## 2026-11-12 — GH-54 · Estrutura visual igual ao protótipo (sidebar, topbar, cabeçalho e KPIs)
- **PR:** a definir · **Status:** aguardando validação
- **Executado por:** autopilot (sessão Web, Sonnet 5.5)
- **O que foi feito:** `Icon` passou a usar ícones Lucide (importados individualmente, mesma API; todas as telas herdam). Sidebar: seções "Visão geral", SEMA Intelligence/Flux/DocIA com subtítulos, badge vermelho de atrasadas no Painel de fiscalização (`GET /api/intelligence/resumo`, falha silenciosa). Topbar: casa na trilha, campo de pesquisa (leva à Central de demandas com `?q=`, busca textual), sino, avatar com iniciais, nome, perfil por extenso e menu do usuário com "Sair". `PageHeader` com eyebrow e ícone do módulo (mapa `MODULES` em `navigation.js`); `KpiCard` com ícone em chip colorido por variante, prop `icon` e rodapé (`hint`); faixa demonstrativa em amarelo do protótipo.
- **Decisões:** não há pesquisa global na API, então a pesquisa do topo filtra demandas. Textos neutros mantidos ("Ambiente demonstrativo"). Itens do protótipo fora do escopo (Produtividade, Configurações, NEXUS AI) não foram criados. Como `PageHeader`/`KpiCard` já eram usados em todas as telas, não houve mudança por página.
- **Arquivos principais:** `src/components/{Icon,KpiCard,PageHeader}.jsx`, `src/layout/{Sidebar,Topbar,Breadcrumbs,navigation}`, `src/styles/theme.scss`, testes em `App.test.jsx`, `components.test.jsx`, `auth.test.jsx` (logout agora pelo menu do usuário).
- **Testes:** suíte rodada uma vez durante o desenvolvimento: 237/239; as 2 falhas (`DemandaExecucao`, `Documentos`) são timeouts sob carga e passaram isoladas (17/17). Lint 0 problemas. Build, suíte completa, Docker e rolagem em 375/768/1366 px: a confirmar pelo validador.

## 2026-11-12 — GH-55 · Painel Inteligência ambiental igual ao protótipo
- **PR:** a definir · **Status:** aguardando validação
- **Executado por:** autopilot (sessão Web, Sonnet 5.5)
- **O que foi feito:** cabeçalho com "Exportar CSV" (gerado no navegador a partir de `por-municipio`) e alerta de dados fictícios; filtros ganharam Situação e chips de período (30 dias, 90 dias, 6 meses, 12 meses, Estiagem jul–out); 6 KPIs (`/resumo`); cartão "Mapa de Mato Grosso" com alternância Ocorrências (marcadores mantidos) / Concentração por município (coroplético com os parâmetros de `PARIDADE_PROTOTIPO.md`: escala de 6 cores, classe `min(5, ceil(n/max*5))`, contorno `#9CA3AF` 0,6, `fillOpacity` 0,85, tooltip sticky com nome, total e bioma, destaque no hover, clique filtra, legenda "até X"); botões de tela cheia e de fundo OpenStreetMap (desligado por padrão, substitui a opção do controle de camadas); contorno do estado por cima; ranking "Regiões com maior concentração" (top 10, clique filtra); gráficos de evolução, categoria e bioma e tabela "Indicadores por município". Camada INPE (#22) preservada.
- **Decisões:** clique no mapa/ranking aplica o filtro de município imediatamente (sem "Filtrar"); chips também. O ranking mostra bioma e região do catálogo de municípios. Nos testes, `react-chartjs-2` é simulado (jsdom não tem canvas).
- **Arquivos principais:** `src/pages/intelligence/{InteligenciaAmbientalPage,MapaMT,MapFilters,ConcentracaoLayer,ConcentracaoLegenda,RankingMunicipios,PainelIndicadores}.jsx`, `concentracao.js`, `src/components/Icon.jsx`, `src/styles/theme.scss`, testes `ConcentracaoPainel.test.jsx`, `InteligenciaAmbientalPage.test.jsx`, `CamadaInpe.test.jsx`.
- **Testes:** afetados (pages/intelligence, components, layout) → 89 passaram; lint 0 problemas. Suíte completa, build, Docker contra a API real e rolagem em 375/768/1366 px: a confirmar pelo validador.

## 2026-11-12 — GH-56 · Dashboard executivo (Início) igual ao protótipo
- **PR:** a definir · **Status:** aguardando validação
- **Executado por:** autopilot (sessão Web, Sonnet 5.5)
- **O que foi feito:** `HomePage` reescrita: saudação por horário ("Bom dia, <nome>") com data, ações "Relatórios" e "Nova demanda" (visíveis conforme o perfil; a API autoriza), 8 KPIs (total, em andamento, concluídas, atrasadas, documentos, georreferenciadas, municípios atendidos, fiscalizações registradas), gráficos de evolução mensal (barras recebidas x concluídas + linha de taxa de conclusão), donut por situação, municípios com mais demandas e demandas ativas por setor (no prazo x vencidas), e listas "Demandas que exigem atenção" (prazos vencidos/próximos) e "Atividades recentes". Atalhos antigos removidos. `IndicatorChart` ganhou `stacked`, linha em eixo direito e títulos de eixo. Novo `src/api/fluxApi.js` (prazos e produtividade, API#84).
- **Decisões:** sem ocorrências ambientais no domínio, a linha do gráfico mensal é a taxa de conclusão; "atividades no período" virou "fiscalizações registradas". Cada bloco carrega seu endpoint e mostra seus estados (carregando/erro/vazio). Fontes: `/dashboard`, `/intelligence/{serie-mensal,por-municipio,mapa}`, `/flux/prazos(/resumo)`, `/flux/produtividade`; mocks MSW escritos à mão (contrato local ainda sem prazos/produtividade).
- **Arquivos principais:** `src/pages/core/HomePage.jsx`, `src/api/fluxApi.js`, `src/components/{IndicatorChart,Icon,ChartCard}.jsx`, `src/mocks/fixtures/intelligence.js`, `src/styles/theme.scss`, testes `HomePage.test.jsx`, `App.test.jsx`.
- **Testes:** afetados (pages/core, components, layout, App) → passaram; lint 0 problemas. Suíte completa, build, Docker contra a API real e rolagem em 375/768/1366 px: a confirmar pelo validador.

## 2026-11-12 — GH-57 · Análise de indicadores igual ao protótipo
- **O que foi feito:** `/intelligence/indicadores` virou "Análise de indicadores" (menu renomeado): seletor de indicador, De/Até (padrão: últimos 365 dias), tipo de gráfico (automático, barras, linhas, rosca) e "Comparar com o período anterior de mesma duração" (indicadores não mensais, série cinza "(período anterior)"); gráfico com selo demonstrativo, painel "Leitura dos dados" (estatística simples, sem IA: maior valor, total, média mensal, taxa de resolução, variação, concentração das 3 maiores) e tabela "Dados do gráfico" com total; "Baixar gráfico (PNG)" (`toBase64Image`) e "Exportar dados (CSV)" (`;`, BOM, vírgula decimal) com aviso por toast. Estados de carregamento, vazio, erro e período inválido.
- **Decisões técnicas:** indicadores limitados ao que a API entrega (`serie-mensal`, `por-municipio` top 15, `por-categoria`, `por-situacao`, `por-bioma`, com `de`/`ate`); ocorrências, tempo médio e produtividade por setor do protótipo não existem na API. O filtro Setor aparece desabilitado com a nota "pendência de contrato" (API não filtra por setor): sugerida Issue na API. `IndicatorChart` ganhou `chartRef`; ícones `image`, `download`, `lightbulb`, `table` em `Icon`. Lógica pura em `analiseIndicadores.js`.
- **Arquivos principais:** `src/pages/intelligence/{IndicadoresPage.jsx,analiseIndicadores.js}`, `src/components/{IndicatorChart,Icon}.jsx`, `src/layout/navigation.js`, teste `IndicadoresPage.test.jsx`.
- **Testes:** afetados (IndicadoresPage, components, layout: 52) → passaram; lint 0 problemas. Suíte completa, build, Docker contra a API real e rolagem em 375/768/1366 px: a confirmar pelo validador.

## 2026-11-12 — GH-58 · Relatórios gerenciais igual ao protótipo
- **PR:** a definir · **Status:** aguardando validação
- **Executado por:** autopilot (sessão Web, Sonnet 5.5)
- **O que foi feito:** `/intelligence/relatorios` virou "Relatórios gerenciais" (menu renomeado): seletor "Tipo de informação" (demandas do período, prazos, produtividade, documentos), De/Até e Setor; folha de relatório com cabeçalho (marca, "SEMA NEXUS · Relatório gerencial — ambiente demonstrativo", período, setor, emissão e emissor), KPIs, tabelas de apoio, tabela principal e rodapé com selo de dados fictícios. "Exportar CSV" e "Exportar PDF" (impressão, `print.css` com a folha sem sombra e cores preservadas). Sem "Secretaria de Estado…" como emissor.
- **Decisões:** demandas usam `/relatorios/demandas` (tabela paginada + KPIs/distribuição por categoria sobre as 100 mais recentes, com aviso quando excede); prazos usam `/flux/prazos` e `/resumo`; produtividade usa `/flux/produtividade`; documentos usam `/documentos`. CSV de demandas continua vindo da API; os demais são gerados no navegador (BOM, `;`, aviso na linha 1, proteção de fórmula). Setor só vale para produtividade (a API não filtra os demais por setor); a lista de setores vem de `porSetorSituacao` (sem depender de `/api/setores`, restrito a ADMIN). Sem período padrão (vazio = todo o período); "ocorrências ambientais" do protótipo ficou fora (não há no domínio). Filtros município/bioma/categoria/status mantidos só para demandas.
- **Arquivos principais:** `src/pages/intelligence/RelatoriosPage.jsx`, `src/pages/intelligence/relatorios/{RelatorioFolha.jsx,modelos.js}`, `src/api/relatoriosApi.js`, `src/styles/print.css`, `src/layout/navigation.js`, testes `RelatoriosPage.test.jsx` e `relatorios/modelos.test.js`.
- **Testes:** afetados (RelatoriosPage, modelos, fluxosCriticos: 19) → passaram; lint 0 problemas. Suíte completa, build, Docker contra a API real e rolagem em 375/768/1366 px: a confirmar pelo validador.

## 2026-11-12 — GH-59 · Central de demandas igual ao protótipo
- **Executado por:** autopilot (sessão Web, Sonnet 5.5)
- **O que foi feito:** `/flux/demandas` virou "Central de demandas": ações "Exportar CSV" (perfis com acesso a relatórios; usa `/api/relatorios/demandas.csv` com os filtros ativos) e "Nova demanda"; 6 KPIs por situação (total, abertas, em triagem, em andamento, finalizadas, vencidas) via `/api/intelligence/resumo` e `por-situacao`; filtros em linha (rótulos acessíveis ocultos); tabela com número monoespaçado, demanda + "categoria · município/MT", equipe, responsável, badges, prazo ("No prazo (N dias)" / "Vencida há N dias"), abertura e ações em ícones (ver/editar).
- **Decisões:** sem ação de excluir (a API não tem endpoint); "Concluída" no prazo de finalizadas (a API não informa se foi no prazo); setor do protótipo substituído por equipe, conforme o domínio. KPIs mostram "—" se a API negar.
- **Arquivos principais:** `src/pages/flux/DemandasListPage.jsx` (+ teste), `src/components/{FilterBar,Icon}.jsx`, `src/utils/datas.js`, `src/styles/theme.scss`.
- **Testes:** afetados (pages/flux, components, App, fluxosCriticos: 76) passaram; lint 0 problemas. Suíte completa, build, Docker contra a API real e rolagem em 375/768/1366 px: a confirmar pelo validador.

## 2026-11-12 — GH-19 · Fluxo de atividades (Kanban) igual ao protótipo
- **Executado por:** autopilot (sessão Web, Sonnet 5.5)
- **O que foi feito:** nova tela `/flux/kanban` (menu SEMA Flux > "Fluxo de atividades") com 7 colunas pelos status do SEMA NEXUS, contador por coluna, cartões (número, prioridade, título, equipe, município, prazo, iniciais do responsável; borda por prioridade) ordenados por prioridade, filtros (pesquisa, equipe, prioridade, ocultar finalizadas há mais de 30 dias) e estados de carregamento/vazio/erro. Arrastar e soltar (HTML5) e menu "Mover para" (toque) só para transições válidas (`kanbanTransicoes.js`, filtradas por `acoesDisponiveis`); destino inválido mostra aviso e não chama a API. Cada movimentação abre o mesmo formulário/confirmação da tela de detalhes (triagem, complementação, distribuição, início de execução, fiscalização, conclusão/devolução); a API continua autorizando (403/409 viram aviso).
- **Decisões:** setor do protótipo substituído por equipe (a API de demandas não expõe setor e `/equipes` é restrito a ADMIN/GESTOR); carrega as 100 demandas mais recentes com aviso se houver mais; "Cancelada" não existe nos 7 status.
- **Arquivos principais:** `src/pages/flux/{KanbanPage.jsx,kanbanTransicoes.js}` (+ testes), `src/App.jsx`, `src/layout/navigation.js`, `src/components/Icon.jsx`, `src/styles/theme.scss`.
- **Testes:** afetados (Kanban, kanbanTransicoes, layout: 13) passaram; lint 0 problemas. Suíte completa, build, Docker contra a API real e rolagem em 375/768/1366 px: a confirmar pelo validador.

## 2026-11-12 — GH-60 · Controle de prazos igual ao protótipo
- **Executado por:** autopilot (sessão Web, Sonnet 5.5)
- **O que foi feito:** nova tela `/flux/prazos` (menu SEMA Flux > "Controle de prazos"): alerta de vencidas (ou aviso de sucesso), 4 KPIs (vencidas, próximas, dentro do prazo, concluídas) a partir de `/api/flux/prazos/resumo` e abas com contagem e lista por estado (`/api/flux/prazos?estado=`), com caixa de dias de atraso em destaque, link para a demanda, prioridade e status; selo demonstrativo e estados de carregamento/vazio/erro.
- **Decisões:** equipe/fiscal/município no lugar de setor/servidor (domínio do SEMA NEXUS); janela de alerta fixa em 5 dias no texto (padrão da API; sem parâmetro administrativo no Web); lista limitada a 100 itens por aba.
- **Arquivos principais:** `src/pages/flux/PrazosPage.jsx` (+ teste), `src/App.jsx`, `src/layout/navigation.js`, `src/styles/theme.scss`.
- **Testes:** afetados (PrazosPage, layout, App: 5 + 15) passaram; lint 0 problemas. Suíte completa, build, Docker contra a API real e rolagem em 375/768/1366 px: a confirmar pelo validador.

## 2026-11-12 — GH-61 · Indicadores de produtividade igual ao protótipo
- **Executado por:** autopilot (sessão Web, Sonnet 5.5)
- **O que foi feito:** nova tela `/flux/produtividade` (menu SEMA Flux > "Produtividade") com `/api/flux/produtividade`: filtros de período (3/6/12 meses, enviados como `de`/`ate`) e setor, 6 KPIs, gráficos "Demandas por setor e situação" (barras empilhadas), "Tempo médio de conclusão por setor" (horizontal) e histórico recebidas × concluídas, tabela por responsável com barra de conclusão e "Exportar CSV" (separador `;`, vírgula decimal). Selo demonstrativo e estados de carregamento/vazio/erro.
- **Decisões:** a API entrega concluídas/ativas/atrasadas por setor (não os 7 status), então a pilha usa Concluídas, Ativas no prazo e Atrasadas; servidor vira responsável (fiscal); o filtro de setor só aparece se `/api/setores` responder (ADMIN/GESTOR; demais perfis recebem 403 e usam a tela sem o filtro).
- **Arquivos principais:** `src/pages/flux/ProdutividadePage.jsx` (+ teste), `src/App.jsx`, `src/layout/navigation.js`, `src/mocks/fixtures/intelligence.js`.
- **Testes:** afetados (ProdutividadePage, layout, App: 20) passaram; lint 0 problemas. Suíte completa, build, Docker contra a API real (#84 ainda aberta) e rolagem em 375/768/1366 px: a confirmar pelo validador.

## 2026-11-12 — GH-62 · Setores e equipes em cartões igual ao protótipo
- **Executado por:** autopilot (sessão Web, Sonnet 5.5)
- **O que foi feito:** `/admin/estrutura` com abas Setores / Equipes / Usuários (com contagem). Setores viram cartões (ícone, sigla, nome, responsável, iniciais dos membros, "N servidores", badges de demandas ativas e vencidas, Editar e Desativar/Reativar); Equipes mantém a tabela com Membros/Editar; Usuários aponta para a tela de usuários. Sem "Unidades organizacionais".
- **Decisões:** a API de setor não traz responsável nem membros: responsável = responsável da primeira equipe do setor; membros = usuários com `setorId`; contagens vêm de `/api/flux/produtividade` (`porSetorSituacao`) e são omitidas se o perfil não puder consultá-las. Desativar usa `PUT /api/setores/{id}`. Divergência de contrato (responsável/contagens no setor) pode virar Issue na API. "Responsável" do setor é **heurística** (responsável da primeira equipe com responsável), não um dado do setor. Correção do revisor: Desativar setor pede confirmação (`ConfirmDialog`); Reativar segue direto.
- **Arquivos principais:** `src/pages/core/admin/EstruturaPage.jsx`, `Admin.test.jsx`, `src/styles/theme.scss`.
- **Testes:** afetados (pages/core/admin: 17) passaram; lint 0 erros. Suíte completa, build, Docker contra a API real e rolagem em 375/768/1366 px: a confirmar pelo validador (VISUAL PENDENTE (lote)).

## 2026-11-12 — GH-63 · Gestão documental igual ao protótipo
- `DocumentosPage`: título "Gestão documental", botão "Cadastrar documento", chips por categoria com contagem (calculada sobre até 200 documentos da API), tabela com ícone, título/subtítulo, categoria, município, data/responsável, tamanho e ação.
- Processo, setor e demandas vinculadas não existem na listagem da API (`DocumentoResumo`); não foram inventados. Ações editar/excluir do protótipo não implementadas (sem endpoint).
- Testes: Documentos.test e fluxosCriticos ajustados; afetados passaram (25), lint sem erros. Suíte completa/build/Docker: a confirmar pelo validador.

## 2026-11-12 — GH-64 · Análise documental igual ao protótipo
- **Executado por:** autopilot (sessão Web, Sonnet 5.5)
- **O que foi feito:** nova tela `/docia/analise` (menu SEMA DocIA > "Análise documental"): lista de documentos com filtro à esquerda e, à direita, análise do `textoExtraido` retornado por `GET /api/documentos/{id}`: resumo extrativo (3 frases), termos frequentes, verificações/possíveis inconsistências, entidades (datas, processos, números de documento/autos/demandas, municípios de MT, áreas, valores, percentuais/vazões, coordenadas, prazos), campos "Rótulo: valor", texto com marcações e "Exportar análise" (.txt). Aviso "Análise automatizada por regras — sem uso de inteligência artificial". Tudo no cliente (`analiseEngine.js`, portado de `docia-engine.js`).
- **Decisões:** municípios de MT vêm de `public/geo/mt-municipios.geojson` (offline). A API não tem "processo" cadastral nem município das demandas na referência do documento: as verificações usam município do cadastro, demandas vinculadas (DEM-AAAA/NNNN), data do documento, UF fora de MT e datas futuras. Marcações renderizadas como elementos React (sem HTML injetado). Termos frequentes aparecem sem acento (normalização do protótipo).
- **Arquivos principais:** `src/pages/docia/AnaliseDocumentalPage.jsx`, `analiseEngine.js` (+ testes), `src/App.jsx`, `src/layout/navigation.js`, `src/styles/theme.scss`, `src/mocks/server.js`.
- **Testes:** afetados (engine, página, layout, App: 26) passaram; lint 0 erros. Suíte completa, build, Docker contra a API real (documentos do seed) e rolagem em 375/768/1366 px: a confirmar pelo validador (VISUAL PENDENTE (lote)).

## 2026-11-12 — GH-65 · Comparação documental igual ao protótipo
- **Executado por:** autopilot (sessão Web, Sonnet 5.5)
- **O que foi feito:** `/docia/comparacao` refeita no estilo do protótipo: seletores Documento A/B com botão de inverter (comparação automática, padrão = dois primeiros documentos), 4 KPIs (similaridade textual, campos coincidentes, divergentes, presentes em apenas um), tabela "Comparação de campos" com células coloridas e selo Coincidente/Divergente/Presente em um só, e "Diferenças textuais" com legenda e filtro "apenas linhas diferentes". Mantidos trechos semelhantes e termos exclusivos da API.
- **Decisões:** continua consumindo `POST /api/documentos/comparacao` (metadados, diff, similaridade). Campos "Rótulo: valor" vêm do `textoExtraido` de `GET /api/documentos/{id}` (cliente, `comparacaoCampos.js`). Quadro "Informações extraídas" do protótipo não incluído (fora do escopo da Issue). Ícones `percent`/`slash` adicionados ao `Icon`.
- **Arquivos principais:** `ComparacaoPage.jsx`, `comparacaoCampos.js`, `Comparacao.test.jsx`, `src/components/Icon.jsx`, `src/styles/theme.scss`.
- **Testes:** afetados (Comparacao + components: 47) passaram; lint 0 erros. Suíte completa, build, Docker contra API real e rolagem 375/768/1366 px: a confirmar pelo validador (VISUAL PENDENTE (lote)).

## 2026-11-12 — GH-66 · Assistente DocIA no visual do NEXUS AI
- **Executado por:** autopilot (sessão Web, Sonnet 5.5)
- **O que foi feito:** `/docia/assistente` com banner roxo "Modo demonstração", cabeçalho com "Limpar conversa", chat em bolhas (avatar, saudação com primeiro nome, selo do modo em cada resposta, referências com link) e painel lateral com "Sugestões de perguntas" e "Histórico" (perguntas da sessão, em memória, reenviáveis). Nome da tela continua "Assistente DocIA".
- **Decisões:** continua usando `POST /api/docia/perguntas`; sugestões limitadas ao que a API responde (documentos). Sem dados de negócio em storage. Ícones `trash`, `history`, `flask`, `sparkles`, `send` adicionados ao `Icon`.
- **Arquivos principais:** `AssistentePage.jsx`, `Assistente.test.jsx`, `Icon.jsx`, `theme.scss`.
- **Testes:** afetados (Assistente + components: 46) passaram; lint 0 erros. Suíte completa, build, Docker contra API real e rolagem 375/768/1366 px: a confirmar pelo validador (VISUAL PENDENTE (lote)).

## 2026-11-12 — GH-67 · Área administrativa igual ao protótipo
- **Executado por:** autopilot (sessão Web, Sonnet 5.5)
- **O que foi feito:** página única `/admin` ("Área administrativa") com cabeçalho, aviso "Controle de acesso demonstrativo" e abas Usuários, Setores e equipes, Perfis e permissões (matriz somente leitura dos 5 perfis) e Histórico de atividades (auditoria com filtros). Menu lateral com um único item; somente ADMIN. Sem "Configurações" nem "Dados e backup".
- **Decisões:** as telas existentes foram reaproveitadas com a prop `embedded` (sem cabeçalho próprio); abas são rotas (`/admin`, `/admin/estrutura`, `/admin/perfis`, `/admin/auditoria`; `/admin/usuarios` redireciona). A matriz deriva de `src/auth/perfis.js` (a API autoriza).
- **Arquivos principais:** `AdminPage.jsx`, `PerfisPermissoes.jsx`, `UsuariosPage.jsx`, `EstruturaPage.jsx`, `AuditoriaPage.jsx`, `App.jsx`, `navigation.js`, `Admin.test.jsx`.
- **Testes:** afetados (admin + App + layout: 35 antes dos ajustes finais) passaram; lint 0 erros. Suíte completa, build, Docker contra API real e rolagem 375/768/1366 px: a confirmar pelo validador (VISUAL PENDENTE (lote)).

## 2026-11-12 — GH-68 · Pesquisa global (Ctrl+K) igual ao protótipo
- **Executado por:** autopilot (sessão Web, Sonnet 5.5)
- **O que foi feito:** `GlobalSearch` na topbar (substitui o campo que levava à Central de demandas): atalho Ctrl+K/Cmd+K, dica "Ctrl K", painel com resultados agrupados (Demandas, Documentos, Usuários), mínimo de 2 caracteres, debounce, setas/Enter/Esc, estados de busca/vazio/erro por grupo.
- **Decisões:** usa `GET /demandas`, `/documentos` e `/usuarios` com `q` (usuários só para ADMIN; a API segue autorizando). Ocorrências e setores do protótipo ficaram fora (sem endpoint de listagem com `q` previsto na Issue). Campo oculto no mobile, como antes.
- **Arquivos principais:** `GlobalSearch.jsx`, `GlobalSearch.test.jsx`, `Topbar.jsx`, `theme.scss`.
- **Testes:** afetados (layout + App + fluxosCriticos: 19) passaram; lint 0 erros. Suíte completa, build, Docker contra API real e rolagem 375/768/1366 px: a confirmar pelo validador (VISUAL PENDENTE (lote)).

## GH-90 — Filtro de bioma restringe os municípios (12/11/2026)
- Novo `src/pages/intelligence/filtroBioma.js` (`municipiosDoBioma`, `aplicarBioma`): ao escolher o bioma, o seletor de municípios mostra só os do bioma (campo `bioma` do catálogo) e o município incompatível é limpo.
- Aplicado em Inteligência ambiental (`MapFilters`), Dashboard ambiental e Relatórios gerenciais (tipo demandas). Análise de indicadores não tem filtro de bioma/município.
- Testes: `filtroBioma.test.js`; `src/pages/intelligence` rodou local (61 ok); suíte completa e build a confirmar pelo validador.

## GH-89 — Fluxo de atividades mostra finalizadas e carrega todas as demandas (12/11/2026)
- `antigaFinalizada` (novo `src/pages/flux/kanbanDados.js`) usa `concluidaEm` com fallback para `atualizadoEm`; sem data de conclusão a demanda finalizada aparece. `carregarTodasDemandas` pagina (size 200) até esgotar; removido o aviso das "100 mais recentes". Mock de listagem passou a expor `concluidaEm`/`atualizadoEm`.
- Dependência: API#89 (campos `concluidaEm`/`atualizadoEm` no resumo da listagem e size máximo). Sem eles, finalizadas sem data aparecem (comportamento seguro).
- Testes: `kanbanDados.test.js` e `KanbanPage.test.jsx` (11 ok); suíte completa e build a confirmar pelo validador.

## GH-91 — Filtro de setor em Análise de indicadores e Relatórios gerenciais (12/11/2026)
- `IndicadoresPage`: seletor "Setor" habilitado (lista de `/api/setores`), envia `setorId` aos 5 indicadores (inclusive no período de comparação); nota "Filtro por setor indisponível" removida.
- `RelatoriosPage`: filtro de setor ativo em demandas (JSON e CSV) e produtividade, e no resumo/folha. Lista de setores vinda de `/api/setores`.
- Revisão: documentos (`DocumentoResumo`) e prazos (`PrazoItem`, só nome da equipe) não têm campo de setor na API, e `/flux/prazos/resumo` não filtra. O filtro fica desabilitado nesses tipos, com nota, sem enviar `setorId` e sem "Setor:" no resumo. Pendência de contrato: expor `setorId` em documentos e prazos na API (a abrir como Issue na API, se aprovada).
- Correção correlata: `modelos.js` renderizava `municipio`/`responsavel` (objetos `{id,nome}`) no relatório de documentos; agora usa `nome`.
- Testes: `IndicadoresPage.test.jsx` e `RelatoriosPage.test.jsx` (23 ok); lint 0 erros. Suíte completa, build e Docker: a confirmar pelo validador.

## GH-92 — Fontes do sistema +2 px (12/11/2026)
- `theme.scss`: `$font-size-base` 14 -> 16 px; cada `font-size` em px/rem somado de 2 px, com piso de 12,5 px (hierarquia preservada; títulos e KPIs sobem igualmente). `print.css` (telas de impressão em rem) ajustado; regras em `pt` mantidas.
- `IndicatorChart`: fonte 16 px em ticks, legenda, tooltip e títulos de eixo. Leaflet: popup/tooltip 14 px e atribuição 12,5 px.
- Testes: lint e testes afetados rodados localmente; suíte completa, build e verificação visual em 375/768/1366 px a confirmar pelo validador.

## GH-99 — Rótulos curtos de setor nos gráficos e selo demonstrativo (12/11/2026)
- `utils/rotulos.js` (`rotuloCurtoSetor`): "Núcleo Regional de Fiscalização — Sinop (fictício)" -> "NR Sinop". `IndicatorChart` ganhou `rotulosCompletos` (nome completo no tooltip e na tabela acessível; eixo sem rotação).
- Aplicado em "Demandas ativas por setor" (Início) e nos gráficos por setor de Produtividade. Indicadores e Relatórios não têm gráfico com nome de setor (filtro apenas); tabelas mantêm o nome completo.
- `.nx-demo-seal` com 13 px (>= 12,5 px).
- Testes: `rotulos.test.js` + afetados de core/flux (116 ok); lint 0 erros. Suíte completa, build e verificação visual a confirmar pelo validador.

## 2026-11-12 · GH-101 · README: acessar por 127.0.0.1
- **Status:** mesclado pela sessão principal (pedido do proprietário)
- **O que foi feito:** instruções trocam `localhost` por `127.0.0.1` (no Windows do proprietário `localhost` resolve para IPv6 e cai em outro serviço).
- **Arquivos principais:** `README.md`, `vite.config.js` (`server.host` e proxy em 127.0.0.1), `.env.example`.
- **Testes:** CI do PR.

## 2026-11-12 · GH-103 · Mapa branco ao desligar o fundo OpenStreetMap
- **Status:** corrigido pela sessão principal (bug relatado pelo proprietário)
- **Causa:** o preenchimento da UF é recriado (key por `fundoOnline`) e, no `overlayPane`, entrava por último, acima de municípios, demandas e focos INPE.
- **O que foi feito:** preenchimento da UF num `Pane` próprio (`nx-fundo-uf`, z-index 350: acima dos tiles, abaixo do overlayPane).
- **Arquivos principais:** `MapaMT.jsx`, `InteligenciaAmbientalPage.test.jsx` (teste de regressão).
- **Testes:** testes do mapa (23, 0 falhas, local); CI do PR.

## 2026-11-12 · GH-105 · Nome do município ao passar o mouse no mapa
- **Status:** feito pela sessão principal (pedido do proprietário)
- **O que foi feito:** no modo Ocorrências a malha municipal ficou interativa, com tooltip `sticky` com o nome (estilo `.mun-tip`) e destaque do contorno; o modo Concentração mantém o tooltip próprio (nome, total, bioma). Classe `nx-malha-municipio` separa a malha dos marcadores.
- **Arquivos principais:** `MapaMT.jsx`, `InteligenciaAmbientalPage.test.jsx`, `CamadaInpe.test.jsx`.
- **Testes:** pasta intelligence (66, 0 falhas, local); CI do PR.

## 2026-11-12 · GH-107 · Visão de satélite (Esri World Imagery) opcional no mapa
- **Status:** feito pela sessão principal (pedido do proprietário; chave criada por ele no ArcGIS Location Platform)
- **O que foi feito:** fundo do mapa com três estados (nenhum/OpenStreetMap/satélite); proxy Nginx `/tiles/esri/{z}/{y}/{x}` com a chave só no servidor (capturas nomeadas, pois o `if` com regex sobrescreve `$1..$3`; `error_log crit` na rota); `/tiles/esri/status` habilita o botão; malha com contorno claro sobre o satélite; atribuição Esri. `dockerConfig.test.js` passou a aceitar só a referência à variável e ganhou teste de que nenhum valor de chave está no Nginx/Dockerfile.
- **Arquivos principais:** `nginx/default.conf.template`, `MapaMT.jsx`, `InteligenciaAmbientalPage.jsx`, `Icon.jsx`, testes, README.
- **Testes:** suíte completa 317/317, build ok; Docker com a chave real: status 204, tiles 200 image/jpeg, chave ausente de logs/HTML/bundle, navegador sem chamadas diretas à Esri.

## 2026-11-12 · GH-109 · Marcadores não clicáveis após ligar a visão de satélite
- **Status:** corrigido pela sessão principal (bug relatado pelo proprietário)
- **Causa:** a malha municipal (interativa desde a #105) é recriada ao trocar o fundo (#107) e entrava por último no `overlayPane`, acima dos marcadores, capturando os cliques. O coroplético agregado do INPE também cobria os marcadores de demanda.
- **O que foi feito:** panes fixos abaixo do `overlayPane` (400): fundo UF 350, malha 360, concentração 370, áreas INPE 380 (`PANE_INPE_AREAS` em `mapaConfig.js`). Handler MSW `HEAD /tiles/esri/status` (404) para os testes/dev.
- **Arquivos principais:** `MapaMT.jsx`, `SatelliteLayer.jsx`, `mapaConfig.js`, `mocks/handlers.js`, `InteligenciaAmbientalPage.test.jsx`.
- **Testes:** 318/318; Docker + Chrome: com INPE ligado e satélite on/off, nenhum marcador coberto por malha/INPE/concentração; clique real abriu o popup da demanda.

## 2026-11-12 · GH-111 · Fontes de volta ao tamanho original
- **Status:** feito pela sessão principal (pedido do proprietário: o aumento da #92 foi pedido com o navegador em zoom 60%)
- **O que foi feito:** revert das mudanças de fonte da #92 (`theme.scss`, `IndicatorChart.jsx`, `print.css`) e remoção do `font-size` mínimo do selo `.nx-demo-seal` (#99); rótulos curtos dos núcleos (#99) mantidos.
- **Testes:** suíte completa e build; CI do PR.

## 2026-11-12 · GH-113 · Número do contador do menu centralizado
- **Status:** corrigido pela sessão principal (relatado pelo proprietário com print)
- **Causa:** o grid centralizava a caixa de linha (line-height 1,5 + margens da fonte), não os algarismos, que ficavam acima do centro.
- **O que foi feito:** `.nx-nav-badge` com `inline-flex`, `line-height: 1`, `text-box: trim-both cap alphabetic` e algarismos tabulares.
- **Testes:** suíte 318/318 e build; comparação ampliada no Chrome (antes acima do centro, depois centralizado).

## 2026-11-13 · GH-115 · Skills do Claude Code (Web)
- **Status:** feito pela sessão principal (pedido do proprietário)
- **O que foi feito:** skills `revisao-visual-mapa` (roteiro no Chrome + regra dos panes), `paridade-prototipo`, `verificar-seguranca` (frontend/Nginx/imagem) e `integrar-camada-externa` (padrão Esri/INPE) em `.claude/skills/`; referência no `CLAUDE.md`. As skills da API e a tabela geral estão em `Sema_Nexus_API/docs/AGENTES.md` (API#104).
- **Apoio:** `verificar-seguranca/verificar-diff.mjs` (mesmo script da API; compara com os segredos do `.env` da API sem exibi-los).
- **Testes:** `verificar-diff.mjs` neste branch e contra `v0.1.0-demo` (0 achados); CI do PR.

## 2026-11-13 · GH-119 · Barra de rolagem do menu lateral escondida
- **Status:** corrigido pela sessão principal (pedido do proprietário)
- **O que foi feito:** `.nx-sidebar nav` com `scrollbar-width: none` e `::-webkit-scrollbar { display: none }`, mantendo a rolagem (roda do mouse, toque, teclado) quando os itens não cabem; `overflow-x: hidden`.
- **Testes:** lint, suíte e build; conferido no Chrome.

## 2026-11-13 · GH-117 · Agente de Triagem no modal de triagem
- **Status:** feito pela sessão principal (MVP de agentes aprovado pelo proprietário; API#107)
- **O que foi feito:** `AgenteTriagemCard` no `TriagemModal`: botão "Sugerir com o agente", estado de carregamento ("consultando a demanda, demandas semelhantes e os dados do INPE"), card com decisão, categoria, prioridade, núcleo, justificativa, possíveis duplicatas (links), avisos e "Como o agente chegou à sugestão" (evidências); selo do motor sempre visível (IA local · modelo / Claude · modelo / Regras locais); "Aplicar sugestão" só preenche o formulário (a pessoa revisa e confirma); decisão divergente → aviso e só a justificativa. `sugerirTriagem` com timeout de 120 s; MSW `POST /api/demandas/:id/triagem/sugestao`.
- **Testes:** `AgenteTriagem.test.jsx` (4); suíte 322/322; lint e build.

## 2026-11-13 · GH-118 · Assistente DocIA mostra o agente, o modelo e os passos
- **Status:** feito pela sessão principal (MVP de agentes aprovado pelo proprietário; API#108)
- **O que foi feito:** página do Assistente consulta `GET /api/agentes/status`: com IA, aviso "Agente DocIA com IA local (modelo) — busca e lê os documentos… sem custo e sem enviar dados para fora do servidor"; sem IA, o aviso de modo demonstração de antes. Cada resposta do agente traz o selo "IA local · modelo" e "Como o agente chegou à resposta" (passos); carregamento "O agente está buscando e lendo os documentos…"; `perguntar` com timeout de 120 s; MSW `GET /api/agentes/status` (demonstrativo).
- **Observação:** `src/mocks/openapi.json` está desatualizado desde a Web#4 (faltam 22 endpoints); não atualizado aqui para não mudar o comportamento dos mocks fora do escopo.
- **Testes:** `Assistente.test.jsx` (6); suíte, lint e build.

## 2026-11-13 · GH-123 · Painel do sistema (só ADMIN)
- **Status:** feito pela sessão principal (pedido e aprovado pelo proprietário: visual e interativo; nome da aba "Painel do sistema")
- **O que foi feito:** item "Painel do sistema" no grupo Administração (só ADMIN) e rota `/sistema/painel` protegida; página com abas: **Visão geral** (o que é, números, saúde ao vivo; clicar num componente abre a arquitetura), **Arquitetura** (diagrama SVG interativo com estado ao vivo, ligações ativas animadas e painel de detalhes), **Módulos** (cartões expansíveis com atalhos), **Perfis e permissões** (seletor de perfil com a matriz destacada), **Agentes de IA** (motor, modelo na GPU, fluxo de cada agente, métricas e "Experimentar"), **Integrações** (Ollama, INPE, Esri, OpenStreetMap, Claude opcional: comportamento, custo, dados e estado; pacotes do INPE), **Desenvolvimento** (Claude Code: Issues, subagentes, autopilot, skills; tecnologias). "Verificar agora" e atualização automática a cada 30 s; Esri e OpenStreetMap verificados pelo navegador. Nome do sistema em `src/config/sistema.js` (troca futura). Matriz de permissões extraída para `admin/permissoes.js` (usada também na área administrativa).
- **Ambiente:** a `node_modules` do checkout principal foi apagada ao remover worktrees anteriores com junção (falha silenciosa do `rmdir` + `git worktree remove --force`); restaurada com `npm ci` (versões do `package-lock.json`).
- **Testes:** `PainelSistema.test.jsx` (6); suíte 330/330; lint e build.
