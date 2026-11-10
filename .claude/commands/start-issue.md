---
description: Inicia o trabalho em uma Issue (verifica dependências, sprint e prioridade e cria o branch feature/GH-<n>)
argument-hint: <número da Issue>
allowed-tools: Bash(gh issue view:*), Bash(gh api:*), Bash(git fetch:*), Bash(git switch:*), Bash(git checkout:*), Bash(git pull:*), Bash(git status:*), Bash(git branch:*), Read, Grep, Glob
---

Inicie o trabalho na Issue **#$ARGUMENTS** deste repositório seguindo o CLAUDE.md (seção "Como executar uma Issue").

1. **Validar o argumento**: deve ser um número inteiro. Se não for, pare e peça o número.
2. **Ler a Issue**: `gh issue view $ARGUMENTS --json number,title,state,labels,body,assignees`. Se estiver fechada ou não existir, pare e informe.
3. **Dependências**: `gh api repos/{owner}/{repo}/issues/$ARGUMENTS/dependencies/blocked_by` e a seção "Dependências" do corpo (inclusive referências `Nexus-Builder-Lab/Sema_Nexus_Web#n`). Liste cada bloqueio com o estado. Se houver bloqueio **aberto**, pare e pergunte se deve continuar mesmo assim.
4. **Sprint, prioridade e MVP**: extraia da tabela "Classificação". Se for P2, pare: P2 não entra no MVP sem aprovação. Se for P1 e ainda houver P0 abertas na mesma sprint, avise.
5. **Branch**:
   - `git status` precisa estar limpo; se não estiver, pare.
   - `git fetch origin` e `git switch main` e `git pull --ff-only`.
   - Se `feature/GH-$ARGUMENTS` já existir (local ou remoto), use-o; senão crie com `git switch -c feature/GH-$ARGUMENTS`.
   - Nunca use outro padrão de nome.
6. **Análise**: leia os arquivos relevantes para o escopo e apresente um plano curto de implementação (arquivos a criar/alterar, testes previstos, impacto no Docker e na documentação).
7. **Pare aqui** e aguarde aprovação do plano antes de escrever código.

Lembretes: commits `GH-$ARGUMENTS: descrição`; PR com `Closes #$ARGUMENTS`; sem merge sem autorização; nada fora do escopo da Issue.
