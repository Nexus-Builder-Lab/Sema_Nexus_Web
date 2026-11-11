# CLAUDE.md — SEMA NEXUS · Sema_Nexus_Web

Referência permanente para sessões de desenvolvimento com Claude Code neste repositório.
Leia este arquivo inteiro antes de qualquer alteração.

---

## 1. Identidade do projeto

- **SEMA NEXUS**: plataforma **demonstrativa** de inteligência ambiental, gestão de demandas de fiscalização e gestão documental, no contexto de **Mato Grosso**.
- **Somente dados fictícios.** Municípios e biomas são referências geográficas reais (IBGE), mas tudo associado a eles é simulado.
- **Nenhuma integração institucional** (SEMA-MT, SIGA, SISREV ou outros).
- Nunca apresentar simulação como dado oficial. Telas com dados simulados exibem **"AMBIENTE DEMONSTRATIVO — DADOS FICTÍCIOS"**.
- Prazo: implementação até **25/11/2026**; **26/11** revisão, testes e tag; apresentação **27/11/2026**. Máximo de 3 sprints.

## 2. Repositórios

| Repositório | Conteúdo |
|---|---|
| `Nexus-Builder-Lab/Sema_Nexus_Web` (este) | Frontend React. |
| `Nexus-Builder-Lab/Sema_Nexus_API` | Backend Spring Boot **e** infraestrutura/documentação transversal (`docker-compose.yml`, `scripts/`, `docs/`, project-health). Não há repositório hub. |
| `FabricioJorge0/prototipo_SEMA_NEXUS` | Protótipo HTML/CSS/JS de referência visual e funcional. **Somente leitura — nunca alterar.** Ativos necessários (tokens CSS, malha GeoJSON do IBGE) são **copiados** para este repo pelas Issues. |

Frontend → este repositório. Backend → Sema_Nexus_API. **Nunca misturar código dos dois.** Uma mudança que exija os dois repositórios = uma Issue por repositório, ligadas por dependência, e um PR por repositório.
Documentação transversal (arquitetura, API, banco, Docker, demo, sprints) está em `Sema_Nexus_API/docs/`.

## 3. Tecnologias

React 18 com **JavaScript** (sem TypeScript) · Vite · Bootstrap 5.3 · React Router 6 · Axios · Chart.js 4 (react-chartjs-2) · Leaflet 1.9 (react-leaflet) · MSW 2 · Vitest + Testing Library · ESLint + Prettier · Nginx (imagem Docker) · **Docker e Docker Compose** · GitHub Actions.
Backend (outro repo): Java 21, Spring Boot, Oracle Database, API REST.
Não trocar tecnologia nem adicionar bibliotecas pesadas sem aprovação do proprietário.

## 4. Arquitetura do frontend

```
src/
  api/          httpClient.js (Axios, baseURL "/api", interceptors) + um módulo por recurso
  mocks/        handlers MSW gerados do openapi.json da API (VITE_USE_MOCKS=true)
  auth/         AuthContext, ProtectedRoute, RequireRole
  layout/       AppLayout, Sidebar, Topbar, Breadcrumbs, DemoBanner
  components/   DataTable, Pagination, FilterBar, EmptyState, Loading, ErrorState, ConfirmDialog, Toasts, StatusBadge, KpiCard, ChartCard
  pages/        core/ intelligence/ flux/ docia/
  styles/       theme.scss (tokens do protótipo sobre Bootstrap)
public/geo/     mt-uf.geojson, mt-municipios.geojson (IBGE) — mapa funciona offline
```
- Sempre chamar a API por `/api` relativo (proxy do Vite em dev; proxy do Nginx no Docker). **Nunca** acessar Oracle ou qualquer banco a partir do frontend.
- Regras de negócio ficam na API. O Web valida para usabilidade, mas quem decide é o backend; esconder um botão não é autorização.
- Token JWT em memória + `sessionStorage`. **Nada de LocalStorage como persistência de dados de negócio.**
- O contrato é o `openapi.json` exportado pelo CI da API. Divergência de contrato → Issue na API, não gambiarra no Web.
- Mapa: camada base com a malha GeoJSON local; tiles OpenStreetMap só como opção desligada por padrão.

## 5. Regras de desenvolvimento

- Analise o código existente antes de alterar; reutilize componentes; evite duplicação; respeite a arquitetura.
- Não insira credenciais ou URLs secretas no código. Variáveis `VITE_*` são públicas no bundle — nunca coloque segredos nelas.
- Crie testes (Vitest + Testing Library + MSW) para o que implementar. `npm test` deve rodar sem modo watch (`vitest run`).
- Atualize a documentação afetada (distinguindo **Implementado / Em desenvolvimento / Planejado / Futuro**).
- Evite dependências desnecessárias. Não remova funcionalidades nem amplie escopo sem aprovação.
- Escopo novo = proposta: descreva, benefício, esforço, impacto no prazo, P0/P1/P2, recomendação. Só implemente após aprovação.

## 6. Interface

- Identidade visual consistente (tokens do protótipo: verde institucional, cinzas, cores de estado), Bootstrap 5, responsivo (375/768/1366 px).
- Componentes reutilizáveis; estados de **carregamento, sucesso, erro e vazio** em toda tela com dados.
- Acessibilidade básica: contraste, foco visível, `label`/`aria-label`, navegação por teclado.
- Confirmação antes de ações destrutivas ou irreversíveis.
- Toda tela com dados fictícios mostra a identificação **AMBIENTE DEMONSTRATIVO — DADOS FICTÍCIOS**.
- IA: nunca afirmar que há IA real quando a resposta for do modo demonstrativo; busca documental é **textual** (não chamar de semântica).

## 7. Docker e credencial de teste (regra permanente)

- Toda funcionalidade deve continuar funcionando via `docker compose up -d --build` (compose em `../Sema_Nexus_API`). **Se quebrar a subida via Docker, não está concluído.**
- Nunca colocar segredos no Dockerfile, na imagem ou no `nginx.conf`.
- **Nunca** executar `docker compose down -v`, `docker volume rm`, `docker system prune` ou equivalente sem confirmação explícita do proprietário.
- Credencial `admin@admin.com` / `12345678` é **exclusivamente demonstrativa** (profiles `demo`/`dev` da API). O Web só a menciona no aviso da tela de login quando `GET /api/auth/config` indicar `demo: true`. Não a deixe pré-preenchida em formulários e não a replique em outro lugar além de README e testes.

## 8. GitHub

- **Nunca** se adicionar como colaborador, convidar contas, alterar permissões de membros, alterar visibilidade ou excluir repositórios/histórico.
- Trabalhe sempre a partir de uma Issue. Não marque Issue como finalizada sem os critérios atendidos.
- Não invente resultados de CI ou de testes. Não faça merge, tag ou release sem autorização do proprietário — exceto o merge no **modo autopilot** (seção 8.1). Tag e release continuam exigindo autorização.

### Títulos de Issue (regra permanente)

- Toda Issue deste repositório começa com **`[SEMA_NEXUS_WEB]`**, seguido do módulo ou tipo e do título: `[SEMA_NEXUS_WEB][FLUX] Tela de cadastro de demanda`.
- Issues de backend, infraestrutura e documentação transversal começam com **`[SEMA_NEXUS_API]`** e ficam em `Sema_Nexus_API`.
- Tags após o prefixo: `[CORE]` `[INTELLIGENCE]` `[FLUX]` `[DOCIA]` `[INFRA]` `[TEST]` `[DOCS]`. Não usar `[BACKEND]`/`[FRONTEND]` (o prefixo já indica o repositório).

### Branches, commits e PRs (regra permanente)

- **Todo branch se chama `feature/GH-<número da Issue>`** — para qualquer tipo de trabalho. Nunca `fix/`, `chore/`, `docs/` ou sufixos.
- O número é o da Issue **deste** repositório (a numeração não é compartilhada com a API). Um branch por Issue, criado da `main` atualizada, só ao iniciar a Issue.
- Commits: `GH-<n>: descrição curta`. PR: título `GH-<n> — <título da Issue>`, corpo com `Closes #<n>` (ou `Closes Nexus-Builder-Lab/Sema_Nexus_API#<n>`), testes executados e evidências.
- O CI valida o nome do branch com `^feature/GH-[0-9]+$`.

## 8.1 Modo autopilot (autorizado pelo proprietário em 10/11/2026)

Quando executado pelo `/next-issue` (ou pelo script `Sema_Nexus_API/scripts/autopilot/autopilot.ps1`), o Claude Code **pode fazer merge sem pedir autorização**, desde que **todas** as condições sejam verdadeiras:

1. todos os checks do CI do PR verdes;
2. `npm run lint`, `npm test` e `npm run build` executados e aprovados na mesma execução;
3. todos os critérios de aceitação da Issue comprovados com evidência e marcados no PR;
4. subida via Docker Compose validada (compose em `../Sema_Nexus_API`), quando ele já existir e a Issue afetar a execução;
5. todas as dependências ("Blocked by") da Issue fechadas — inclusive as da API. Enquanto um endpoint da API não estiver mesclado, o Web pode **desenvolver** contra os mocks MSW, mas o PR fica com a label `aguardando-dependencia` até a dependência fechar.

Se um problema persistir após **3 tentativas de correção**, não há merge: a Issue recebe a label `autopilot-falhou` e o erro é registrado em `C:\SEMANEXUS\autopilot\RELATORIO_ERROS.md`.
Toda Issue concluída acrescenta uma entrada em `docs/DIARIO_DESENVOLVIMENTO.md` (no mesmo PR).
Continuam proibidos no autopilot: tags/releases, push direto na `main`, force push, apagar volumes Docker, Issues P2, ampliar escopo e encerrar processos que o agente não iniciou. Detalhes: `Sema_Nexus_API/docs/AUTOPILOT.md`.

Ambiente desta máquina: a porta 8080 do host está ocupada por outro serviço — a API local roda em 18080 (`VITE_API_PROXY_TARGET=http://localhost:18080`).

## 8.2 Agentes e fluxo multiagente (definido pelo proprietário em 11/11/2026)

O desenvolvimento usa **subagentes especializados** em `.claude/agents/`, coordenados por um **orquestrador** (a sessão que executa `/next-issue` ou `/start-issue`):

| Agente | Papel | Edita código? | Modelo |
|---|---|:-:|---|
| `planejador-issue` | Plano da Issue: arquivos, passos, testes, critérios, riscos | não | Sonnet 5.5 · alto |
| `implementador-frontend` | Implementa e corrige telas, componentes, mocks e testes | sim | Sonnet 5.5 · alto |
| `validador-qa` | Lint, testes, build, Docker e evidência de cada critério | não | Sonnet 5.5 · alto |
| `revisor-codigo` | Revisão independente do diff | não | Sonnet 5.5 · alto |
| `revisor-ui-acessibilidade` | Identidade visual, responsividade, estados, acessibilidade | não | Sonnet 5.5 · alto |
| `revisor-seguranca` | Token, segredos em `VITE_*`, XSS, autorização na API | não | Sonnet 5.5 · alto |
| `documentador` | Diário, status nos docs, rascunho do PR | só docs | Sonnet 5.5 · alto |
| `diagnosticador` | Causa raiz de falha persistente (esporádico) | não | **Opus 5.5 · médio** |

Fluxo: planejar → implementar → **validar ∥ revisar código ∥ revisar interface (telas) ∥ revisar segurança (quando aplicável)** → até 3 ciclos de correção (diagnosticador após o 2º) → documentar → PR → merge.
Regras: **somente o orquestrador** faz push, abre PR, faz merge, altera labels/Status e escreve no `RELATORIO_ERROS.md`. Subagentes de revisão, validação e diagnóstico são somente leitura. Detalhes: `Sema_Nexus_API/docs/AGENTES.md`.

## 9. Como executar uma Issue (use `/start-issue <n>`, ou `/next-issue` no autopilot)

1. Ler a Issue (`gh issue view <n>`).
2. Verificar dependências ("Blocked by"), inclusive as da API — se o endpoint ainda não existir, trabalhar contra os mocks MSW do contrato.
3. Verificar Sprint, prioridade e categoria MVP.
4. Analisar os arquivos envolvidos.
5. Planejar a implementação.
6. Implementar **apenas** o escopo.
7. Executar `npm run lint`, `npm test`, `npm run build` e, quando aplicável, a subida via Docker.
8. Atualizar documentação.
9. Informar resultado, evidências e pendências.

## 10. Definition of Done

- [ ] Implementação dentro do escopo.
- [ ] Critérios de aceitação atendidos.
- [ ] Código organizado.
- [ ] Validações implementadas.
- [ ] Testes pertinentes executados.
- [ ] Testes aprovados.
- [ ] CI aprovada.
- [ ] Funciona via Docker Compose (contra a API real, não só mocks).
- [ ] Documentação atualizada.
- [ ] Nenhum erro crítico conhecido (inclusive no console do navegador).
- [ ] PR revisado e integrado (merge só com autorização).

## 11. Comandos úteis

```bash
npm ci
npm run dev                      # http://localhost:5173 (proxy /api -> localhost:8080)
VITE_USE_MOCKS=true npm run dev  # sem API, usando mocks do contrato
npm run lint && npm test && npm run build
cd ../Sema_Nexus_API && docker compose up -d --build   # ambiente completo em http://localhost:3000
```
