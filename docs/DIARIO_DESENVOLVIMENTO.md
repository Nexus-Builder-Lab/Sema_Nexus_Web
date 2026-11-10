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
