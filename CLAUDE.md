# CLAUDE.md — SEMA NEXUS · Sema_Nexus_Web

Regras permanentes. Detalhes (arquitetura, API, Docker, autopilot, agentes, Definition of Done) em `Sema_Nexus_API/docs/` — leia só o que a tarefa exigir.

## Projeto
- Plataforma **demonstrativa** (inteligência ambiental, demandas de fiscalização, gestão documental) de **Mato Grosso**. **Só dados fictícios** (municípios/biomas do IBGE são reais). Exceção aprovada: dados públicos do INPE na camada de satélite, sempre identificados e separados.
- **Nenhuma integração institucional** (SEMA-MT, SIGA, SISREV…). Telas com dados simulados exibem "AMBIENTE DEMONSTRATIVO — DADOS FICTÍCIOS".
- Implementação até 25/11/2026 · revisão/tag 26/11 · apresentação 27/11.
- Repos: este = frontend; `Sema_Nexus_API` = backend + compose/docs; `FabricioJorge0/prototipo_SEMA_NEXUS` = referência, nunca alterar. Nunca misturar código: uma Issue e um PR por repositório.

## Stack e arquitetura
React 18 em **JavaScript** (sem TypeScript) · Vite · Bootstrap 5.3 · React Router 6 · Axios · Chart.js · Leaflet · MSW · Vitest/Testing Library · ESLint/Prettier · Nginx. Sem bibliotecas pesadas novas sem aprovação.
- `src/api` (httpClient `baseURL=/api`), `src/mocks`, `src/auth`, `src/layout`, `src/components`, `src/pages/{core,intelligence,flux,docia}`, `src/styles/theme.scss`, `public/geo` (malha IBGE, mapa offline).
- API sempre por `/api` relativo; nunca acessar banco. Regras de negócio e autorização ficam na API (esconder botão não é autorização). Divergência de contrato → Issue na API.
- Token JWT em memória + `sessionStorage`; nada de dados de negócio em LocalStorage; nada secreto em `VITE_*`.
- Interface: tokens do tema, responsivo (375/768/1366 px), estados de carregamento/vazio/erro/sucesso, acessibilidade básica, confirmação em ações destrutivas. Busca documental é textual; IA demonstrativa sempre identificada.

- **Paridade visual:** Issues `paridade-prototipo` seguem `docs/PARIDADE_PROTOTIPO.md` (protótipo em `C:\SEMANEXUS\referencia\prototipo_SEMA_NEXUS`, capturas em `C:\SEMANEXUS\referencia\capturas`). `lucide-react` aprovado para os ícones.

## Segurança (inegociável)
- Sem segredos no código, Dockerfile, imagem ou `nginx.conf`.
- Credencial `admin@admin.com` / `12345678` **só demonstrativa**: aparece só no aviso do login quando `/api/auth/config` indicar `demo: true`; nunca pré-preenchida; texto puro só em README e testes.
- Nunca `docker compose down -v`, apagar volumes, parar/remover containers de outros projetos, nem encerrar processos que você não iniciou. Acesse sempre por `127.0.0.1` (em `localhost`/IPv6 as portas 8080 e 3000 são de outro serviço) e use as portas do `.env` da API (hoje `API_PORT=18081`, `WEB_PORT=3000`).
- GitHub: nunca se adicionar como colaborador, convidar contas, mudar permissões/visibilidade, apagar histórico, force push ou push na `main`. Tag/release só com autorização.

## Fluxo
- Sempre a partir de uma Issue. Títulos `[SEMA_NEXUS_WEB][MÓDULO] ...` (`[CORE]` `[INTELLIGENCE]` `[FLUX]` `[DOCIA]` `[INFRA]` `[TEST]` `[DOCS]`).
- Branch `feature/GH-<n>` (n = Issue deste repo; nenhum outro padrão). Commits `GH-<n>: ...` (aspas → `git commit -F arquivo`). PR `GH-<n> — <título>` com `Closes #<n>`.
- Escopo novo = proposta ao proprietário. Não inventar resultado de teste/CI. Atualizar docs (Implementado / Planejado / Futuro).
- **Definition of Done:** escopo e critérios com evidência, lint/testes/build aprovados, CI verde, funciona via Docker contra a API real quando aplicável, docs atualizados, sem erro crítico (inclusive no console).

## Autopilot (autorizado pelo proprietário)
- `/next-issue` orquestra agentes (`.claude/agents/`). **Merge automático só se:** CI verde · validador aprovou · critérios comprovados · Docker validado quando aplicável · dependências (inclusive da API) fechadas · revisor sem bloqueante. Só falta dependência → `aguardando-dependencia`. Após 3 ciclos sem sucesso → `autopilot-falhou` + `C:\SEMANEXUS\autopilot\RELATORIO_ERROS.md`.
- Só o orquestrador faz push, PR, merge, labels e Status. Diário em `docs/DIARIO_DESENVOLVIMENTO.md` no mesmo PR.
- Modelos: Sonnet 5.5 médio (padrão); tarefas mecânicas por script (0 tokens) ou Haiku 5.5; Opus 5.5 médio só no `diagnosticador` e na retentativa após falha de código.

## Economia de tokens (obrigatório)
- **Saídas de comando mínimas:** log para arquivo, só resumo/erro no contexto. Ex.: `npm test -- --reporter=dot > $env:TEMP\test.log 2>&1; if ($LASTEXITCODE) { Get-Content $env:TEMP\test.log -Tail 40 }`; `npm ci --silent`; `npm run build --silent > $env:TEMP\build.log 2>&1`. CI: `gh pr checks <pr> --watch --interval 30 > $null; gh pr checks <pr>`.
- Leia só o necessário: `Grep`/`Glob` antes de `Read`; `Read` com offset/limit; não releia; não liste diretórios inteiros.
- Testes: durante o desenvolvimento só os afetados (`npx vitest run <arquivos>`); suíte completa e build uma vez, no validador.
- Relatórios de agentes curtos (sem colar logs).
