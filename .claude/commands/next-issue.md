---
description: Autopilot econômico — executa UMA Issue (ou um PR pendente) com agentes e faz merge condicionado
argument-hint: "<n> | <n> reforco | pr <n>   (sem argumento: escolhe com proxima.mjs)"
---

Você é o **orquestrador** do autopilot (autorizado pelo proprietário). Faça **uma** tarefa e termine. Regras: `CLAUDE.md` (inclusive "Economia de tokens" — vale para você e para cada comando que rodar).

Repo atual: `Sema_Nexus_API` → agente implementador `implementador-backend`; `Sema_Nexus_Web` → `implementador-frontend`. Status no Project: `node C:\SEMANEXUS\planejamento\status.mjs <API-n|WEB-n> "<Status>"`.

## 0. Tarefa (`$ARGUMENTS`)
- `pr <n>` → só revalidar e mesclar o PR pendente `n`: vá ao passo 4 (validador) e depois ao 6.
- `<n>` → trabalhar na Issue `n`. Se o diretório já estiver em `feature/GH-<n>` (com ou sem alterações), continue dali.
- `<n> reforco` → retentativa em Opus de uma Issue que falhou: leia antes o diagnóstico no PR/`RELATORIO_ERROS.md`; não acione o `diagnosticador`; se der certo, marque a entrada do relatório como **Resolvido (reforço Opus)**.
- Sem argumento → `node C:\SEMANEXUS\Sema_Nexus_API\scripts\autopilot\proxima.mjs --repo <API|WEB>`; se `acao` for `nada`, termine com `AUTOPILOT: SEM_TRABALHO`.

## 1. Preparar
`git fetch -q origin`; se não estiver em `feature/GH-<n>`: `git switch -q main; git pull -q --ff-only; git switch -q -c feature/GH-<n>` (ou `git switch` se já existir). Status → "Em andamento". Não releia a Issue: o implementador lê.

## 2. Implementar
Acione o implementador do repo com: Issue, branch e "planeje e implemente". Só para Issues grandes (estimativa ≥ 6 h ou várias camadas) acione antes o `planejador-issue` e repasse o plano.

## 3. Validar e revisar (na mesma mensagem, em paralelo)
- `validador-qa`: Issue, branch, e se afeta a execução (Docker só nesse caso).
- `revisor`: Issue e branch.

## 4. Correções (máx. 3 ciclos)
Pronto = validador **APROVADO** e revisor sem achado **bloqueante**. Senão, envie ao implementador **só** os achados (arquivo:linha + cenário) e repita o passo 3 **apenas** com quem reprovou (o validador sempre; Docker só se a correção mexeu na execução). Após o 2º ciclo sem sucesso, acione o `diagnosticador` (exceto em `reforco`); se ele indicar **AMBIENTE**, pule direto ao passo 7 com `FALHOU_AMBIENTE`.

## 5. PR
`git push -q -u origin feature/GH-<n>`. Corpo do PR em arquivo (Resumo, Alterações, Testes com resultados reais **resumidos**, Evidências, "Agentes: implementador/validador/revisor → vereditos", `Closes #<n>`) e `gh pr create --body-file`. Status → "PR solicitado".

## 6. Merge (só você)
`gh pr checks <pr> --watch --interval 30 > $null; gh pr checks <pr>`. Mescle **só se**: CI verde · validador aprovou nesta execução · critérios comprovados e marcados no PR · Docker validado quando aplicável · dependências da Issue fechadas (`gh api repos/{owner}/{repo}/issues/<n>/dependencies/blocked_by`) · revisor sem bloqueante.
- Só falta dependência → label `aguardando-dependencia` no PR, comentário curto, termine.
- Senão: confirme `gh pr view <pr> --json mergeable` = `MERGEABLE`; `gh pr merge <pr> --squash --delete-branch --subject "GH-<n>: <resumo> (#<pr>)"`; **só após `state: MERGED`**: `git switch -q main; git pull -q --ff-only`, Status → "Finalizado".

## 7. Falha
Sem merge. PR aberto (ou draft) com o diagnóstico; label `autopilot-falhou` na Issue; entrada em `C:\SEMANEXUS\autopilot\RELATORIO_ERROS.md` (data, repo, Issue/PR, etapa, erro literal curto, tentativas, hipótese, reprodução, sugestão); volte à `main` limpa.

## Proibido
Force push; push na `main`; editar migration mesclada; tag/release; `down -v`/apagar volumes/parar containers de outros projetos; encerrar processos que você não iniciou; mexer em permissões/visibilidade; P2; ampliar escopo; marcar critério sem evidência; inventar resultado.

## Saída
Resumo de até 5 linhas e, na última linha, exatamente um: `AUTOPILOT: MERGED #<pr>` · `AUTOPILOT: AGUARDANDO_DEPENDENCIA #<pr>` · `AUTOPILOT: FALHOU #<issue>` · `AUTOPILOT: FALHOU_AMBIENTE #<issue>` · `AUTOPILOT: SEM_TRABALHO`
