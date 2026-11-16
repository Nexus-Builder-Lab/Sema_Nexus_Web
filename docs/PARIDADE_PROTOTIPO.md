# Paridade visual com o protótipo

> Pedido do proprietário em 12/11/2026: deixar o SEMA ALERTA **visualmente o mais parecido possível** com o protótipo publicado em https://semanexus.vercel.app — primeiro **Login** e **SEMA Intelligence (mapas)**, depois todos os módulos. Issues com a label `paridade-prototipo`.

## Referências (somente leitura)

| O quê | Onde |
|---|---|
| Código-fonte do protótipo (idêntico ao site publicado, verificado em 12/11/2026) | `C:\SEMANEXUS\referencia\prototipo_SEMA_NEXUS` (repo `FabricioJorge0/prototipo_SEMA_NEXUS`) |
| Capturas de tela de referência | `C:\SEMANEXUS\referencia\capturas\*.jpg|png` (abra com `Read`) |
| Tokens visuais | `assets/css/global.css` (cores, tipografia, raios, sombras) |
| Layout (sidebar, topbar, login) | `assets/css/layout.css`, `index.html`, `assets/js/app.js` |
| Componentes (botões, cards KPI, tabelas, badges, abas, modais) | `assets/css/components.css`, `assets/js/core/ui.js`, `assets/js/core/components.js` (Chart.js) |
| Telas dos módulos | `assets/css/modules.css`, `assets/js/modules/*.js` |
| Logo (folha) | `assets/images/favicon.svg` |

Leia **só** o arquivo e o trecho relacionados à tela da sua Issue (Grep antes de Read).

## Como reproduzir

- **Mesma aparência, nossa implementação:** React + Bootstrap 5 + `theme.scss`. Traga para `theme.scss` os tokens que faltarem (cores, `--radius`, sombras, fonte) e reproduza o markup/estilos do protótipo em componentes React reutilizáveis (`PageHeader` com eyebrow do módulo, `KpiCard` com ícone em chip colorido, `ChartCard`, abas, chips de filtro, badges de status/prioridade).
- **Ícones:** o protótipo usa Lucide. Use `lucide-react` (dependência aprovada pelo proprietário para esta paridade; importe ícones individualmente para não pesar o bundle).
- **Gráficos:** Chart.js com as mesmas cores e opções de `assets/js/core/components.js` (`NX.charts`).
- **Mapa:** Leaflet com a malha local `public/geo/mt-municipios.geojson` (propriedade `id` = código IBGE) e `mt-uf.geojson`.
  - Modo **Ocorrências** = o mapa atual de marcadores (aprovado pelo proprietário — manter).
  - Modo **Concentração por município** (coroplético), igual a `intel-painel.js` (linhas ~207–223): escala `['#FFF7ED','#FED7AA','#FDBA74','#FB923C','#EA580C','#9A3412']`, classe `min(5, ceil(n/max*5))`, sem cor quando 0; contorno `#9CA3AF` 0,6; `fillOpacity` 0,85; **tooltip ao passar o mouse** `<strong>Município</strong><br>N demanda(s) · Bioma` (sticky); **clique filtra pelo município**; legenda "Ocorrências por município" com "até X" em 5 faixas e "Clique em um município para filtrar".
  - Dados: `GET /api/intelligence/por-municipio` (todos os municípios com `municipioId` IBGE, nome, bioma, total) com os mesmos filtros do painel.

## Mapeamento de domínio (protótipo → SEMA ALERTA)

| Protótipo | SEMA ALERTA (manter o nosso) |
|---|---|
| "Ocorrências ambientais" simuladas | Demandas de fiscalização **fictícias** por categoria; camada separada de **dados públicos do INPE** (Web #22) |
| 6 status (Aberta, Em análise, Em andamento, Pendente, Concluída, Cancelada) | **7 status** da especificação; reaproveite as cores por semelhança |
| Perfis Administrador / Gestor / Servidor | **5 perfis**: Administrador, Gestor, Fiscal, Analista, Consulta |
| Tipos de demanda genéricos | Só **categorias de fiscalização** |
| Setores e servidores fictícios | Setores, equipes e usuários do nosso seed |
| Dados no LocalStorage / login no navegador | **API real** (Oracle + JWT); nada de dados de negócio em LocalStorage |

## Não copiar

- Textos que pareçam oficiais: "SEMA/MT · Governo de Mato Grosso", "credenciais institucionais", "Secretaria de Estado de Meio Ambiente de Mato Grosso" como emissor de relatório. Use **"SEMA ALERTA · Ambiente demonstrativo"** e mantenha a faixa **"AMBIENTE DEMONSTRATIVO — DADOS FICTÍCIOS"**.
- Fora do escopo: registrar ocorrência, unidades organizacionais, Configurações, Dados e backup, página de apresentação, "NEXUS AI" com nome de produto (use "Assistente DocIA").
- Senhas no frontend: os cartões de "Modo demonstração" do login usam o endpoint de login demonstrativo da API (só no profile `demo`) — nunca embutir senha no código.

## Definition of Done da paridade

- Comparação lado a lado com a captura de referência (descrever no PR as diferenças que restarem e por quê).
- Testes de componente atualizados; lint, testes e build verdes; tela funcionando contra a API real no Docker.
- Responsivo (375/768/1366 px), sem rolagem horizontal da página, console sem erros — **conferido em lote pela sessão principal no Chrome**; o autopilot (sem navegador) registra `VISUAL PENDENTE (lote)` no PR e não reprova por isso.
