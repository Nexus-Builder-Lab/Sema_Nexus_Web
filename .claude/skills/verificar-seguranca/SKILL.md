---
name: verificar-seguranca
description: Checagem de segurança do frontend do SEMA ALERTA (código React, bundle, variáveis VITE_*, nginx, Dockerfile e imagem web) antes de abrir PR, mesclar ou preparar tag. Use ao revisar um diff, antes de qualquer PR/tag, ou quando o assunto for segredo, chave Esri, token, credencial de teste, dados pessoais ou proxy do Nginx.
---

# Verificar segurança — Sema_Nexus_Web

**Nunca imprima o valor de um segredo** (nem parcial): só arquivo, linha e tipo.

## 1. Varredura automática do diff

Na raiz do repositório (ou do worktree):

```
node .claude/skills/verificar-seguranca/verificar-diff.mjs            # base origin/main
node .claude/skills/verificar-seguranca/verificar-diff.mjs <base>     # ex.: a tag anterior
```

Analisa as linhas adicionadas e os arquivos novos e compara com os segredos reais do `.env` do `Sema_Nexus_API` (ex.: `ESRI_API_KEY`) sem exibi-los. `BLOQUEANTE` → corrigir antes do PR; `AVISO` → conferir e justificar.

## 2. Conferência manual

| Item | Como conferir |
|---|---|
| Nada secreto no bundle | nenhum `VITE_*` com chave/token/senha; após `npm run build`, procurar no `dist/` a chave real **sem exibi-la** (ex.: `node -e` que só imprime `true/false`) |
| Nginx | `nginx/default.conf.template` só referencia `${ESRI_API_KEY}` via `set $esri_key`; o `?token=` é acrescentado no servidor; localização Esri com `error_log ... crit` (não loga a URL com a chave) |
| Dockerfile / imagem | nenhuma `ESRI` nem segredo no `Dockerfile` (a chave entra só em tempo de execução pelo compose) |
| Testes de configuração | `src/dockerConfig.test.js` verde; a única exceção ao padrão `token`/`api_key` é a referência à variável |
| Credencial demonstrativa | `admin@admin.com` só no aviso do login quando `/api/auth/config` retornar `demo: true`; nunca pré-preenchida; texto puro só em README, testes e mocks MSW |
| Armazenamento | JWT em memória + `sessionStorage`; nenhum dado de negócio em `localStorage` |
| Autorização | esconder botão não é autorização; a regra fica na API |
| HTML injetado | conteúdo dinâmico em tooltips/popups do Leaflet passa por `escHtml` |
| Dados | só fictícios; INPE e Esri identificados; nenhum texto que pareça oficial |

## 3. Proibições

Não colar a chave Esri, o `.env` ou tokens em Issue, PR, commit, log ou conversa; não rodar comandos destrutivos do Docker; não alterar colaboradores/permissões.

## 4. Resultado

No PR: `Segurança: verificar-diff OK (0 bloqueantes, N avisos — justificativa)`. Achado já mesclado → Issue `type:bug` P0 e avisar o proprietário. Backend/compose: skill de mesmo nome no `Sema_Nexus_API`.
