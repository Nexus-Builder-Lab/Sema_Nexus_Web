---
name: paridade-prototipo
description: Compara e aproxima uma tela do SEMA NEXUS do protótipo publicado (https://semanexus.vercel.app), usando o código e as capturas locais de referência. Use em Issues com a label paridade-prototipo ou quando o proprietário pedir que uma tela fique "igual/parecida com o protótipo".
---

# Paridade visual com o protótipo

Guia completo: `docs/PARIDADE_PROTOTIPO.md` (mapeamento de domínio, regras do mapa, Definition of Done). Esta skill é o passo a passo.

## Referências (somente leitura — nunca alterar)

| O quê | Onde |
|---|---|
| Código do protótipo (= site publicado) | `C:\SEMANEXUS\referencia\prototipo_SEMA_NEXUS` (repo `FabricioJorge0/prototipo_SEMA_NEXUS`) |
| Capturas por tela | `C:\SEMANEXUS\referencia\capturas\<modulo>-<tela>.jpg` (abrir com `Read`) |
| Imagens enviadas pelo proprietário | `C:\SEMANEXUS\mapa_cencentração_municipio` |
| Tokens visuais | `assets/css/global.css` → trazer para `src/styles/theme.scss` |
| Componentes / telas | `assets/css/components.css`, `modules.css`, `assets/js/core/ui.js`, `components.js` (Chart.js), `assets/js/modules/*.js` |

Use `Grep` para achar só o trecho da tela; não leia o protótipo inteiro.

## Passo a passo

1. **Captura de referência:** abrir a imagem da tela em `capturas`. Se precisar ver interação, abrir https://semanexus.vercel.app no Chrome (skill `claude-in-chrome`), sem digitar credenciais reais.
2. **Tela atual:** http://127.0.0.1:3000 (nunca `localhost`), zoom do navegador **100%** (pedidos feitos com outro zoom enganam: a Web#92 foi desfeita na Web#111 por isso).
3. **Listar diferenças** (layout, cores, tipografia, espaçamento, ícones, gráficos, textos) e decidir o que reproduzir.
4. **Implementar com a nossa stack:** React + Bootstrap 5 + `theme.scss`; componentes reutilizáveis (`PageHeader`, `KpiCard`, `ChartCard`, chips, badges); ícones `lucide-react` importados individualmente; Chart.js com as cores de `NX.charts`.
5. **Manter o nosso domínio:** 7 status, 5 perfis, categorias de fiscalização, dados da API real (nada de LocalStorage com dados de negócio).
6. **Conferir lado a lado** em 1366, 768 e 375 px (iframe de largura fixa via `javascript_tool`), sem rolagem horizontal, console sem erros.

## Não copiar

- Textos que pareçam oficiais: "SEMA/MT · Governo de Mato Grosso", "credenciais institucionais", a Secretaria como emissora de relatório. Usar **"SEMA NEXUS · Ambiente demonstrativo"** e manter **"AMBIENTE DEMONSTRATIVO — DADOS FICTÍCIOS"**.
- Funcionalidades fora do escopo (registrar ocorrência, unidades organizacionais, Configurações, backup, página de apresentação); "NEXUS AI" vira "Assistente DocIA".
- Senhas no frontend (o modo demonstração do login usa o endpoint da API, só no profile `demo`).

## Registro no PR

Captura de referência usada, diferenças que restaram e por quê, larguras conferidas. Sem navegador (autopilot): registrar `VISUAL PENDENTE (lote)` — a sessão principal confere no Chrome.
