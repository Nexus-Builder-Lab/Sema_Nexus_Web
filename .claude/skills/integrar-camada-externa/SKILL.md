---
name: integrar-camada-externa
description: Padrão do SEMA ALERTA para integrar um serviço ou camada externa ao mapa (como a visão de satélite Esri e os dados públicos do INPE) — chave só no servidor via proxy do Nginx, variável no .env/compose, camada separada e identificada, atribuição, testes de configuração e licença. Use ao adicionar mapa de fundo, tiles, API de terceiros, dados públicos ou qualquer recurso que exija chave.
---

# Integrar camada ou serviço externo

Antes de tudo: integração nova é **escopo novo** → proposta ao proprietário e Issue aprovada. **Nenhuma integração institucional** (SEMA-MT, SIGA, SISREV…). Dados reais só com aprovação explícita (aprovados até hoje: INPE público e imagens Esri).

## Escolha do padrão

| Caso | Padrão | Exemplo |
|---|---|---|
| Dados públicos que mudam pouco | API baixa/importa, guarda versão local, expõe endpoint `/api/...`; web consome por `/api` | INPE: `scripts/referencia/baixar-inpe.*` → `src/main/resources/referencia/*.csv.gz` → `/api/intelligence/referencia/*` |
| Tiles/serviço com chave, consumido pelo navegador | **Proxy no Nginx** com a chave acrescentada no servidor | Esri: `/tiles/esri/{z}/{y}/{x}` |

## Padrão proxy com chave (Esri)

1. **Chave** só no `.env` do `Sema_Nexus_API` (fora do Git). Quem cria a conta/chave é o **proprietário** — nunca criar contas, tokens ou chaves em nome dele.
2. **Compose** (repo API, Issue própria): `NOME_DA_CHAVE: ${NOME_DA_CHAVE:-}` no serviço `web`; entrada comentada e vazia no `.env.example`; instruções em `docs/DOCKER.md`/`docs/DEMO.md`.
3. **Nginx** (`nginx/default.conf.template`, envsubst em tempo de execução):
   - `set $x_key "${NOME_DA_CHAVE}";`
   - `location = /tiles/<servico>/status` → `204` se `$x_key` casar o formato esperado, senão `404` (o front habilita/desabilita o botão por aqui).
   - rota de tiles com **capturas nomeadas** (`(?<z>\d+)`…): um `if` com regex sobrescreve `$1..$3`.
   - `proxy_pass` com a chave **na URL do upstream** se o serviço não aceitar header (a Esri só aceita `?token=`); `error_log /dev/stderr crit` nessa location para não logar a URL; limpar `Cookie`/`Authorization`; `proxy_ssl_server_name on`; timeout curto.
   - **Sem cache local/offline dos tiles** quando os termos proibirem (Esri proíbe).
4. **Dockerfile:** nenhuma menção à chave (entra só em execução).
5. **Front:** consultar `/tiles/<servico>/status` (HEAD); botão desabilitado com explicação quando indisponível; camada **desligada por padrão**; nunca `VITE_*` com a chave.
6. **Mapa:** tiles no `tilePane`; camada de área em pane fixo < 400 (regra da skill `revisao-visual-mapa`); fundos mutuamente exclusivos quando fizer sentido.
7. **Identificação:** atribuição exigida pelo provedor **sempre visível** (Esri: "Powered by Esri | Imagens: Esri, Maxar, Earthstar Geographics e GIS User Community"); dados públicos com nome da fonte na camada e na legenda (ex.: "Focos de calor — INPE (dados públicos)"), separados dos dados fictícios.

## Testes obrigatórios

- `src/dockerConfig.test.js`: exceção **explícita e única** para a referência à variável no Nginx; teste de que nenhum valor de chave aparece; Dockerfile sem a variável.
- MSW: handler do status retornando `404` (testes rodam sem chave).
- Teste de componente: botão desabilitado sem chave; habilitado com `204`; atribuição presente.
- Verificação real: `verificar-ambiente.ps1` (skill `preparar-demo`, no repo API) baixa um tile de teste; revisão no Chrome (skill `revisao-visual-mapa`).
- Skill `verificar-seguranca` nos dois repos antes do PR.

## Licença

Chave gratuita de desenvolvedor cobre desenvolvimento e apresentação. **Uso em produção por órgão público exige licença/conta do próprio órgão** — registrar essa limitação em `docs/` sempre que integrar um serviço com termos de uso.
