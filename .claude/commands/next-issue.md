---
description: Autopilot multiagente — escolhe a próxima Issue P0 desbloqueada deste repositório (ou a Issue informada) e orquestra os subagentes (planejar, implementar, validar, revisar, documentar) até o PR e o merge automático condicionado
argument-hint: "[número da Issue — opcional, usado na retentativa com modelo de reforço]"
---

Você está em **modo autopilot** (autorizado pelo proprietário em 10/11/2026) como **ORQUESTRADOR**. Execute **uma única Issue** de ponta a ponta e termine. Leia antes o `CLAUDE.md` deste repositório — em especial as seções **8.1 (Modo autopilot)** e **8.2 (Agentes)**.

Caminhos fixos (Windows):
- Raiz de trabalho: `C:\SEMANEXUS` · repos lado a lado: `C:\SEMANEXUS\Sema_Nexus_API` e `C:\SEMANEXUS\Sema_Nexus_Web`
- Pasta do autopilot: `C:\SEMANEXUS\autopilot\` (logs, trava do Docker, relatório de erros, rascunhos de PR)
- Utilitário de status do Project: `node C:\SEMANEXUS\planejamento\status.mjs <API-n|WEB-n> "<Status>"`
- JDK: sempre `$env:JAVA_HOME = 'C:\Program Files\Java\jdk-21'` antes de `mvn` (o JAVA_HOME do sistema é JDK 8).
- A porta **8080 do host está ocupada por outro serviço**: nunca o encerre. Fora do Docker use `--server.port=18080`; no compose, `API_PORT=18080` no `.env`.

## Papel do orquestrador (você)
- **Você decide; os subagentes executam.** Delegue cada etapa ao subagente indicado (ferramenta Agent, pelo nome do agente) e passe a ele o contexto necessário: número da Issue, branch e os relatórios anteriores relevantes.
- **Somente você** cria branch, faz push, abre PR, acompanha o CI, faz merge, altera labels, comenta em Issues, move o Status no Project e escreve no `RELATORIO_ERROS.md`. Nenhum subagente faz isso.
- Leia os relatórios dos subagentes com senso crítico: um veredito sem evidência não vale como aprovação.
- Mantenha seu próprio contexto enxuto: não leia arquivos grandes que um subagente já resumiu.

### Subagentes disponíveis (`.claude/agents/`)
| Etapa | Agente | Modelo |
|---|---|---|
| Escolher a Issue | `selecionador-issue` | **Haiku 5.5 · baixo** |
| Planejar | `planejador-issue` | Sonnet 5.5 · médio |
| Implementar / corrigir | `implementador-backend` (API) · `implementador-frontend` (Web) | Sonnet 5.5 · médio |
| Validar (build, testes, Docker, critérios) | `validador-qa` | Sonnet 5.5 · médio |
| Revisar código | `revisor-codigo` | Sonnet 5.5 · médio |
| Revisar segurança (quando aplicável) | `revisor-seguranca` | Sonnet 5.5 · médio |
| Revisar interface e acessibilidade (só Web, Issues com telas) | `revisor-ui-acessibilidade` | Sonnet 5.5 · médio |
| Documentar (diário, status, rascunho do PR) | `documentador` | **Haiku 5.5 · baixo** |
| Diagnosticar (esporádico) | `diagnosticador` | **Opus 5.5 · médio** |

### Política de modelos (definida pelo proprietário em 11/11/2026)
- **Sonnet 5.5 com esforço médio** é o padrão (você, o orquestrador, também roda nele).
- **Tarefas simples → modelo menor:** escolha da Issue e documentação usam Haiku 5.5. Para outras tarefas mecânicas e curtas (ex.: conferir o estado de uma lista de Issues, ler um log e extrair a linha de erro, resumir uma saída longa), delegue com a ferramenta Agent usando `model: "haiku"`, `effort: "low"`. Não use Haiku para escrever código de produção, revisar segurança nem decidir merge.
- **Opus 5.5 com esforço médio** só esporadicamente, pelo `diagnosticador`, quando um problema persistir após 2 ciclos. Se esta execução já estiver rodando em Opus (retentativa do script), não acione o `diagnosticador`.

## Passo 0 — Pendências anteriores
1. `git status` deve estar limpo. Se não estiver, e houver um branch `feature/GH-*` com trabalho seu, continue essa Issue a partir do Passo 4 (validar) — o trabalho não commitado é do implementador de uma execução interrompida. Nunca descarte alterações.
2. Liste PRs abertos deste repo com a label `aguardando-dependencia`. Para cada um, se as dependências agora estão fechadas: atualize o branch com a `main`, revalide com o `validador-qa` e, se as condições forem atendidas, faça o merge (Passo 7). Se fizer um merge aqui, **termine a execução** com o resumo.

## Passo 1 — Escolher a Issue
0. **Se `$ARGUMENTS` contiver um número**, essa é a Issue desta execução (retentativa com modelo de reforço): ignore a ordenação abaixo, retome o branch `feature/GH-<n>` e o PR existentes, leia o diagnóstico anterior em `C:\SEMANEXUS\autopilot\RELATORIO_ERROS.md` e no PR, e siga do Passo 2. Se concluir com sucesso, marque a entrada correspondente do relatório como **Resolvido (reforço Opus)**.
1. Acione o **`selecionador-issue`** (Haiku). Ele aplica as regras 2–4 e devolve `ISSUE: <n>` ou `ISSUE: NENHUMA`. **Confira** você mesmo os bloqueios da Issue indicada (`gh api repos/{owner}/{repo}/issues/<n>/dependencies/blocked_by`) antes de começar; se a indicação violar as regras, aplique-as diretamente.
2. Regra de ordem: Issues abertas deste repo com label `P0` e **sem** label `autopilot-falhou`, ordenadas por Sprint (1 → 2 → 3) e depois pelo número.
3. Regra de bloqueio: a primeira cujos bloqueios **do mesmo repositório** estejam todos fechados.
   - Bloqueios em **outro** repositório podem estar abertos **somente** se o contrato OpenAPI dos endpoints usados já existir (API #7 mesclada) — o Web trabalha contra os mocks MSW. Nesse caso o PR só será mesclado quando esses bloqueios fecharem (Passo 7).
4. Se nenhuma P0 estiver disponível: faça o mesmo com `P1`, nesta ordem: Assistente DocIA (API#27 / Web#16) → **Dados públicos de satélite do INPE na aba Inteligência ambiental (API#34 / Web#22)** → Comparação documental → Indicadores/Painel → Notificações/Auditoria → Usuários/Equipes → Relatórios → Testes de integração Oracle (API#23). **Nunca** pegue P2. Nunca pegue a Issue de tag/release (API #22) — apenas preencha o checklist dela no corpo, sem criar tag.
5. Se nada estiver disponível, escreva `AUTOPILOT: SEM_TRABALHO` na última linha da resposta e termine.

## Passo 2 — Preparar e planejar
1. `git fetch origin && git switch main && git pull --ff-only` e `git switch -c feature/GH-<n>` (ou reutilize o branch se já existir). Status no Project → "Em andamento".
2. **`planejador-issue`**: obtenha o plano (arquivos, passos, testes, mapa dos critérios, riscos, se precisa de revisão de segurança).

## Passo 3 — Implementar
**Implementador do repositório** (`implementador-backend` na API, `implementador-frontend` no Web): passe o número da Issue, o branch e o plano. Ele implementa, escreve testes, roda o build local e faz commits no branch.

## Passo 4 — Validar e revisar (em paralelo)
Acione **na mesma mensagem**, para rodarem em paralelo:
- **`validador-qa`** (sempre): build, testes, Docker quando aplicável e evidência de cada critério de aceitação.
- **`revisor-codigo`** (sempre).
- **`revisor-seguranca`** quando o plano indicar, ou quando o diff tocar autenticação, autorização, upload, segredos, logs ou CORS.
- **`revisor-ui-acessibilidade`** (só no Web) quando a Issue criar ou alterar telas.

Consolide os relatórios: a Issue está pronta quando o validador **APROVOU** e nenhum revisor apontou achado **bloqueante/crítico/alto**. Achados menores podem ser corrigidos agora (se baratos) ou listados como pendência no PR.

## Passo 5 — Ciclo de correção (máximo 3)
Se houver reprovação ou achado bloqueante:
1. Envie ao implementador **apenas** os achados a corrigir (com arquivo:linha e cenário).
2. Repita o Passo 4 só com os agentes que reprovaram (e o `validador-qa`, sempre).
3. **Após o 2º ciclo sem sucesso**, acione o **`diagnosticador`** (Opus 5.5, médio) com o erro literal, as tentativas e os relatórios; repasse a correção recomendada ao implementador para o 3º ciclo.
4. Se o diagnosticador indicar **bloqueio de ambiente/permissão** (não de código), não gaste o 3º ciclo: vá para o Passo 8.

## Passo 6 — Documentar
**`documentador`**: entrada no `docs/DIARIO_DESENVOLVIMENTO.md` (com a lista de agentes que atuaram), status nos docs e rascunho do corpo do PR em `C:\SEMANEXUS\autopilot\pr-GH-<n>-<repo>.md`.

## Passo 7 — PR e merge automático (somente o orquestrador)
1. `git push -u origin feature/GH-<n>`; abra o PR: título `GH-<n> — <título da Issue>`, corpo a partir do rascunho do documentador (`--body-file`), com `Closes #<n>` e a seção "Agentes". Status → "PR solicitado".
2. Aguarde o CI: `gh pr checks <pr> --watch --interval 20` (se ainda não houver checks, consulte de novo em instantes).
3. **Merge automático somente se TODAS as condições forem verdadeiras:**
   - (a) todos os checks do CI verdes;
   - (b) `validador-qa` APROVOU nesta execução (testes locais reais);
   - (c) todos os critérios de aceitação comprovados e marcados no PR;
   - (d) Docker validado pelo `validador-qa`, quando aplicável;
   - (e) todas as dependências da Issue (inclusive de outro repositório) fechadas;
   - (f) nenhum achado bloqueante/crítico/alto em aberto dos revisores.
4. Se (a)–(d) e (f) ok e só (e) faltar: adicione a label `aguardando-dependencia` ao PR, comente quais dependências faltam e termine.
5. Merge: confirme `gh pr view <pr> --json mergeable` = `MERGEABLE` (aguarde se `UNKNOWN`), então `gh pr merge <pr> --squash --delete-branch --subject "GH-<n>: <resumo> (#<pr>)"`. **Só depois de confirmar `state: MERGED`**: `git switch main && git pull --ff-only`, confira que a Issue fechou e mova o Status para "Finalizado". Nunca apague o branch antes de o merge estar confirmado (apagar fecha o PR).

## Passo 8 — Falha sem correção
Se após 3 ciclos o problema persistir (ou o CI falhar por motivo que não dá para resolver, ou houver bloqueio de ambiente):
1. **Não faça merge.** Mantenha o PR aberto (ou abra como draft), com o diagnóstico no corpo.
2. Adicione a label `autopilot-falhou` na Issue e comente o resumo do erro.
3. Acrescente uma entrada em `C:\SEMANEXUS\autopilot\RELATORIO_ERROS.md` (crie se não existir, com o cabeçalho do modelo abaixo) — use o texto do `diagnosticador` quando houver: data/hora, repositório, Issue e PR (links), etapa em que falhou, mensagem de erro **literal**, o que foi tentado (cada ciclo e quais agentes), hipótese da causa, arquivos envolvidos, como reproduzir e sugestão de correção.
4. Volte para a `main` limpa (o trabalho fica preservado no branch remoto) e termine.

Modelo de cabeçalho do relatório:
```
# SEMA NEXUS — Relatório de erros não corrigidos pelo autopilot
> Cada entrada é um problema que o autopilot não conseguiu resolver em 3 tentativas. A Issue recebeu a label `autopilot-falhou`. Depois de corrigir, remova a label e marque a entrada como **Resolvido**.
```

## Proibido (mesmo em autopilot)
Force push; push direto na `main`; editar migration já mesclada; criar tags/releases; `docker compose down -v`, `docker volume rm`, `docker system prune`; encerrar processos que não foram iniciados por você (inclusive o serviço da porta 8080); alterar permissões, colaboradores, visibilidade ou configurações da organização; criar tokens; trabalhar em P2; ampliar escopo; marcar critério sem evidência; inventar resultado de teste ou CI; usar dados reais (exceto os dados públicos do INPE aprovados para a camada de satélite).

## Saída final
Termine **sempre** com um resumo curto (incluindo quais agentes atuaram e os vereditos) e, na última linha, exatamente um destes marcadores:
`AUTOPILOT: MERGED #<pr>` · `AUTOPILOT: AGUARDANDO_DEPENDENCIA #<pr>` · `AUTOPILOT: FALHOU #<issue>` · `AUTOPILOT: SEM_TRABALHO`
