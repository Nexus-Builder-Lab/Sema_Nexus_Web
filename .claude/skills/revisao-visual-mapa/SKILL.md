---
name: revisao-visual-mapa
description: Roteiro de validação visual do mapa de Mato Grosso do SEMA Intelligence no Chrome (marcadores clicáveis, panes, fundos OpenStreetMap/satélite Esri, tooltip do município, coroplético, camada INPE). Use após qualquer mudança em src/pages/intelligence (MapaMT, SatelliteLayer, ConcentracaoLayer, mapaConfig, filtros) ou quando o proprietário relatar algo errado no mapa.
---

# Revisão visual do mapa

Os testes unitários (jsdom) não pegam sobreposição de camadas: os bugs Web#103 (mapa branco) e Web#109 (marcadores sem clique após trocar o fundo) só apareceram no navegador. Esta revisão é obrigatória para mudanças no mapa.

## Regra dos panes (não quebrar)

Tudo que é **área** ou é **recriado** (`key`) fica em pane fixo **abaixo de 400**; marcadores ficam no `overlayPane` (400). Camada recriada sem pane próprio entra por último no `overlayPane` e cobre os marcadores.

| z-index | Pane | Conteúdo |
|---|---|---|
| 200 | tilePane | OpenStreetMap / satélite Esri |
| 350 | `PANE_FUNDO_UF` | preenchimento da UF (fundo quando OSM desligado) |
| 360 | `PANE_MALHA` (`nx-malha`) | malha municipal interativa (`.nx-malha-municipio`, tooltip do nome) |
| 370 | `PANE_CONCENTRACAO` | coroplético "Concentração por município" |
| 380 | `PANE_INPE_AREAS` (`nx-inpe-areas`) | áreas DETER/INPE |
| 400 | overlayPane | marcadores de demanda, focos INPE, contorno |

Constantes em `src/pages/intelligence/mapaConfig.js` e `MapaMT.jsx`. Nova camada de área → novo pane < 400 com constante exportada e teste em `InteligenciaAmbientalPage.test.jsx`.

## Preparação

1. Ambiente com a versão nova: `.\scripts\demo-up.ps1` no `Sema_Nexus_API` (reconstrói o `web`).
2. Carregar a skill `claude-in-chrome`; abrir aba nova em **http://127.0.0.1:3000** (nunca `localhost`), login `admin@admin.com`, ir a `/intelligence/inteligencia-ambiental`.
3. **Recarregar sem cache** (o SPA mantém o JS antigo): `location.reload()` após o deploy; peça Ctrl+F5 ao proprietário quando ele testar.
4. `resize_window` não muda a largura útil (fica ~2400 px): para 375/768 px use um `iframe` de largura fixa via `javascript_tool`.

## Roteiro (repetir cada passo após ligar e após desligar os fundos)

1. **Fundos:** ligar/desligar "Mapa de fundo OpenStreetMap" e "Visão de satélite" (exclusivos; satélite desabilitado sem `ESRI_API_KEY`). Com ambos desligados o mapa **não** fica branco (fundo UF). Com satélite: atribuição "Powered by Esri | Imagens: Esri, Maxar, Earthstar Geographics e GIS User Community" visível.
2. **Marcadores no topo** — no centro de cada marcador, o elemento retornado deve ser o marcador:
   ```js
   [...document.querySelectorAll('.leaflet-overlay-pane path.leaflet-interactive, .leaflet-marker-icon')].slice(0, 20)
     .map(el => { const r = el.getBoundingClientRect(); const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
       return top === el || el.contains(top) ? 'ok' : (top?.className?.baseVal ?? top?.className); })
   ```
   Qualquer resultado diferente de `ok` (ex.: `nx-malha-municipio`) = camada cobrindo.
3. **Clique real** (`computer` → left_click) em um marcador de demanda e em um foco INPE: popup abre.
4. **Tooltip:** passar o mouse em um município sem marcador → nome do município (modo Ocorrências).
5. **Concentração por município:** cores na escala do protótipo, tooltip "Município · N demanda(s) · Bioma", clique filtra pelo município, legenda "Ocorrências por município".
6. **INPE:** ligar "Referência por satélite (INPE)"; camada identificada como dados públicos, legenda própria, separada das demandas.
7. **Filtros:** bioma restringe a lista de municípios; setor/status/período alteram marcadores e coroplético.
8. **Console:** `read_console_messages` sem erros (filtrar por `error`).

## Registro

No PR: `Revisão visual do mapa: OK` + o que foi conferido (passos, fundo usado, largura). Problema encontrado → Issue `type:bug` (skill `nova-issue-sema` no `Sema_Nexus_API`). Não acionar alertas/diálogos do navegador.
