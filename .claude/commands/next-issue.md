---
description: Autopilot — escolhe a próxima Issue P0 desbloqueada deste repositório (ou a Issue informada) e executa o ciclo completo (implementar, testar, PR, CI, merge automático condicionado)
argument-hint: "[número da Issue — opcional, usado na retentativa com modelo de reforço]"
---

Você está em **modo autopilot** (autorizado pelo proprietário em 10/11/2026). Execute **uma única Issue** de ponta a ponta e termine. Leia antes o `CLAUDE.md` deste repositório — em especial a seção **"Modo autopilot"**, que prevalece sobre qualquer regra de "merge só com autorização".

Caminhos fixos (Windows):
- Raiz de trabalho: `C:\SEMANEXUS` · repos lado a lado: `C:\SEMANEXUS\Sema_Nexus_API` e `C:\SEMANEXUS\Sema_Nexus_Web`
- Pasta do autopilot: `C:\SEMANEXUS\autopilot\` (logs, trava do Docker, relatório de erros)
- Utilitário de status do Project: `node C:\SEMANEXUS\planejamento\status.mjs <API-n|WEB-n> "<Status>"`
- JDK: sempre `$env:JAVA_HOME = 'C:\Program Files\Java\jdk-21'` antes de `mvn` (o JAVA_HOME do sistema é JDK 8).
- A porta **8080 do host está ocupada por outro serviço**: nunca o encerre. Para rodar a API fora do Docker use `--server.port=18080`; no compose use `API_PORT=18080` no `.env`.

## Passo 0 — Pendências anteriores
1. `git status` deve estar limpo. Se não estiver, e houver um branch `feature/GH-*` com trabalho seu, continue esse trabalho (pule para o Passo 3 com essa Issue). Nunca descarte alterações.
2. Liste PRs abertos deste repo com a label `aguardando-dependencia`. Para cada um, se as dependências agora estão fechadas: atualize o branch com a `main`, revalide (Passo 5) e, se as condições forem atendidas, faça o merge (Passo 6). Se fizer um merge aqui, **termine a execução** com o resumo.

## Modelos (definido pelo proprietário em 10/11/2026)
- O autopilot roda em **Sonnet 5.5 com esforço alto** para economizar tokens.
- Use **Opus 5.5 com esforço médio** apenas esporadicamente, quando for preciso aprofundar: diagnóstico de falha que persiste após 2 tentativas, decisão de arquitetura com impacto em várias Issues, ou depuração difícil de integração. Faça isso com a ferramenta Agent (`model: "opus"`, `effort: "medium"`), passando o contexto necessário, e aplique você mesmo a correção proposta. Registre no PR quando o Opus foi consultado e por quê.
- Se esta execução já estiver rodando em Opus (retentativa do script), não delegue a outro Opus.

## Passo 1 — Escolher a Issue
0. **Se `$ARGUMENTS` contiver um número**, essa é a Issue desta execução (retentativa com modelo de reforço): ignore a ordenação abaixo, retome o branch `feature/GH-<n>` e o PR existentes, leia o diagnóstico anterior em `C:\SEMANEXUS\autopilot\RELATORIO_ERROS.md` e no PR, e siga do Passo 2. Se concluir com sucesso, marque a entrada correspondente do relatório como **Resolvido (reforço Opus)**.
1. Liste Issues abertas deste repo com label `P0` e **sem** label `autopilot-falhou`: `gh issue list --label P0 --state open --json number,title,labels --limit 100`.
2. Ordene por Sprint (1 → 2 → 3) e depois pelo número.
3. Escolha a primeira cujos bloqueios **do mesmo repositório** (`gh api repos/{owner}/{repo}/issues/<n>/dependencies/blocked_by`) estejam todos fechados.
   - Bloqueios em **outro** repositório podem estar abertos **somente** se o contrato OpenAPI dos endpoints usados já existir (API #7 mesclada) — o Web trabalha contra os mocks MSW. Nesse caso o PR só será mesclado quando esses bloqueios fecharem (Passo 6).
4. Se nenhuma P0 estiver disponível: faça o mesmo com `P1`, nesta ordem: Assistente DocIA (API#27 / Web#16) → **Dados públicos de satélite do INPE na aba Inteligência ambiental (API#34 / Web#22)** → Comparação documental → Indicadores/Painel → Notificações/Auditoria → Usuários/Equipes → Relatórios → Testes de integração Oracle (API#23). **Nunca** pegue P2. Nunca pegue a Issue de tag/release (API #22) — apenas preencha o checklist dela no corpo, sem criar tag.
5. Se nada estiver disponível, escreva `AUTOPILOT: SEM_TRABALHO` na última linha da resposta e termine.

## Passo 2 — Preparar
1. Leia a Issue completa (`gh issue view <n>`), inclusive critérios de aceitação e dependências.
2. `git fetch origin && git switch main && git pull --ff-only` e `git switch -c feature/GH-<n>` (ou reutilize o branch se já existir).
3. Status no Project → "Em andamento".

## Passo 3 — Implementar
- Somente o escopo da Issue. Siga a arquitetura e as regras do `CLAUDE.md`. Reutilize o que existe.
- Testes junto com o código. Atualize a documentação afetada (status Implementado / Planejado).
- Commits pequenos no formato `GH-<n>: descrição`, com a linha final `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Passo 4 — Diário de desenvolvimento
Acrescente ao final de `docs/DIARIO_DESENVOLVIMENTO.md` (neste repositório) uma entrada no formato do arquivo: data/hora, Issue, o que foi feito, decisões técnicas, arquivos principais, testes executados com resultado real, pendências. Faz parte do mesmo PR.

## Passo 5 — Validar (resultados reais, nunca presumidos)
1. Build e testes: API `mvn -B -ntp verify` · Web `npm ci && npm run lint && npm test && npm run build`.
2. Verificação de cada critério de aceitação: marque `[x]` apenas o que você **comprovou**; anote a evidência.
3. **Docker** (obrigatório quando `docker-compose.yml` já existir na `main` da API e a Issue afetar a execução): use a trava `C:\SEMANEXUS\autopilot\docker.lock` — se o arquivo existir e tiver menos de 30 min, aguarde (verifique a cada 60 s, até 30 min); crie-o com seu repo e horário; rode `docker compose up -d --build` em `C:\SEMANEXUS\Sema_Nexus_API`, aguarde todos `healthy`, faça login com o usuário de teste via `http://localhost:${WEB_PORT}/api/auth/login` e o teste específico da Issue; depois `docker compose down` (**nunca** `-v`) e apague a trava.
4. Se algo falhar: corrija e repita. **No máximo 3 tentativas de correção** por problema. Se após a 2ª tentativa o problema persistir e você estiver em Sonnet, consulte um subagente Opus 5.5 (esforço médio) para o diagnóstico antes da 3ª tentativa.

## Passo 6 — PR e merge automático
1. `git push -u origin feature/GH-<n>`; abra o PR com o template do repo: título `GH-<n> — <título da Issue>`, corpo com Resumo, Alterações, Testes (com saídas reais), Evidências e `Closes #<n>`. Status → "PR solicitado".
2. Aguarde o CI: `gh pr checks <pr> --watch --interval 20`.
3. **Merge automático somente se TODAS as condições forem verdadeiras:**
   - (a) todos os checks do CI verdes;
   - (b) testes locais executados e aprovados nesta execução;
   - (c) todos os critérios de aceitação da Issue comprovados e marcados no PR;
   - (d) Docker validado conforme o Passo 5.3, quando aplicável;
   - (e) todas as dependências da Issue (inclusive de outro repositório) fechadas.
4. Se (a)–(d) ok e só (e) faltar: adicione a label `aguardando-dependencia` ao PR, comente quais dependências faltam e termine.
5. Merge: `gh pr merge <pr> --squash --delete-branch --subject "GH-<n>: <resumo> (#<pr>)"`. Depois: `git switch main && git pull --ff-only`, confirme que a Issue fechou e mova o Status para "Finalizado".

## Passo 7 — Falha sem correção
Se após 3 tentativas um problema persistir (ou o CI falhar por motivo que você não consegue resolver):
1. **Não faça merge.** Mantenha o PR aberto (ou abra como draft), com o diagnóstico no corpo.
2. Adicione a label `autopilot-falhou` na Issue e comente o resumo do erro.
3. Acrescente uma entrada em `C:\SEMANEXUS\autopilot\RELATORIO_ERROS.md` (crie se não existir, com o cabeçalho do modelo abaixo), contendo: data/hora, repositório, Issue e PR (links), etapa em que falhou, mensagem de erro **literal** (trecho relevante), o que foi tentado (cada tentativa), hipótese da causa, arquivos envolvidos, como reproduzir e sugestão de correção.
4. Volte para a `main` limpa (o trabalho fica preservado no branch remoto) e termine.

Modelo de cabeçalho do relatório:
```
# SEMA NEXUS — Relatório de erros não corrigidos pelo autopilot
> Cada entrada é um problema que o autopilot não conseguiu resolver em 3 tentativas. A Issue recebeu a label `autopilot-falhou`. Depois de corrigir, remova a label e marque a entrada como **Resolvido**.
```

## Proibido (mesmo em autopilot)
Force push; push direto na `main`; editar migration já mesclada; criar tags/releases; `docker compose down -v`, `docker volume rm`, `docker system prune`; encerrar processos que não foram iniciados por você (inclusive o serviço da porta 8080); alterar permissões, colaboradores, visibilidade ou configurações da organização; criar tokens; trabalhar em P2; ampliar escopo; marcar critério sem evidência; inventar resultado de teste ou CI; usar dados reais.

## Saída final
Termine **sempre** com um resumo curto e, na última linha, exatamente um destes marcadores:
`AUTOPILOT: MERGED #<pr>` · `AUTOPILOT: AGUARDANDO_DEPENDENCIA #<pr>` · `AUTOPILOT: FALHOU #<issue>` · `AUTOPILOT: SEM_TRABALHO`
