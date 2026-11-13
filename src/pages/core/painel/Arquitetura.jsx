import { COMPONENTES, LIGACOES } from './conteudo.js';
import { estadoInfo } from './estados.js';
import EstadoBadge from './EstadoBadge.jsx';

const LARG = 150;
const ALT = 62;
const centro = (c) => ({ x: c.x + LARG / 2, y: c.y + ALT / 2 });
const porId = Object.fromEntries(COMPONENTES.map((c) => [c.id, c]));

/** Detalhes da verificação em lista legível (só valores simples; listas resumidas). */
function Detalhes({ detalhes }) {
  const linhas = Object.entries(detalhes ?? {}).filter(
    ([, v]) => v !== null && v !== '' && typeof v !== 'object',
  );
  if (linhas.length === 0) return null;
  return (
    <dl className="nx-painel-dl small mb-0">
      {linhas.slice(0, 8).map(([k, v]) => (
        <div key={k}>
          <dt>{k.replace(/([A-Z])/g, ' $1').toLowerCase()}</dt>
          <dd>{typeof v === 'boolean' ? (v ? 'sim' : 'não') : String(v)}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Diagrama interativo (Web#123): cada componente com a cor do estado ao vivo; clicar (ou Enter) mostra o
 * que é, com o que se conecta e os detalhes da verificação. Ligações ativas animadas.
 */
export default function Arquitetura({ verificacoes, selecionado, onSelecionar }) {
  const atual = porId[selecionado] ?? porId.api;
  const v = verificacoes[atual.estado ?? atual.id] ?? verificacoes[atual.id];

  return (
    <div className="nx-painel-arq">
      <section className="card nx-card" aria-label="Diagrama da arquitetura">
        <div className="card-body">
          <h2 className="h6">Como os componentes se conectam</h2>
          <p className="small text-body-secondary mb-2">
            Clique em um componente para ver o que ele faz. As cores mostram o estado ao vivo; as
            linhas em movimento são conexões ativas.
          </p>
          <svg
            viewBox="0 0 790 380"
            className="nx-painel-svg"
            role="group"
            aria-label="Componentes"
          >
            <defs>
              <marker
                id="seta"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M0,0 L10,5 L0,10 z" className="nx-painel-seta" />
              </marker>
            </defs>
            <rect x="575" y="15" width="200" height="335" rx="12" className="nx-painel-zona" />
            <text x="675" y="372" textAnchor="middle" className="nx-painel-zona-txt">
              Servidor (Docker) — rede interna
            </text>
            {LIGACOES.map(([de, para, rotulo]) => {
              const a = centro(porId[de]);
              const b = centro(porId[para]);
              const ea = verificacoes[porId[de].estado ?? de]?.estado;
              const eb = verificacoes[porId[para].estado ?? para]?.estado;
              const ativa = ea === 'OK' && eb === 'OK';
              return (
                <g key={`${de}-${para}`}>
                  <line
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    className={`nx-painel-linha${ativa ? ' ativa' : ''}`}
                    markerEnd="url(#seta)"
                  />
                  <text
                    x={(a.x + b.x) / 2}
                    y={(a.y + b.y) / 2 - 6}
                    textAnchor="middle"
                    className="nx-painel-rotulo"
                  >
                    {rotulo}
                  </text>
                </g>
              );
            })}
            {COMPONENTES.map((c) => {
              const est = verificacoes[c.estado ?? c.id]?.estado;
              const ativo = c.id === atual.id;
              return (
                <g
                  key={c.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={ativo}
                  aria-label={`${c.nome}: ${estadoInfo(est).rotulo}`}
                  className={`nx-painel-no ${estadoInfo(est).classe}${ativo ? ' selecionado' : ''}${c.externo ? ' externo' : ''}`}
                  onClick={() => onSelecionar(c.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelecionar(c.id);
                    }
                  }}
                >
                  <rect x={c.x} y={c.y} width={LARG} height={ALT} rx="10" />
                  <circle cx={c.x + 14} cy={c.y + 16} r="5" className="nx-painel-ponto" />
                  <text x={c.x + 26} y={c.y + 21} className="nx-painel-nome">
                    {c.nome}
                  </text>
                  <text x={c.x + 12} y={c.y + 44} className="nx-painel-tipo">
                    {c.tipo}
                  </text>
                </g>
              );
            })}
          </svg>
          <div className="d-flex flex-wrap gap-3 small mt-1" aria-label="Legenda">
            {['OK', 'ATENCAO', 'INDISPONIVEL', 'DESLIGADO'].map((e) => (
              <span key={e} className="d-inline-flex align-items-center gap-1">
                <span className={`nx-painel-bolinha ${estadoInfo(e).classe}`} aria-hidden="true" />
                {estadoInfo(e).rotulo}
              </span>
            ))}
            <span className="d-inline-flex align-items-center gap-1">
              <span className="nx-painel-tracejado" aria-hidden="true" /> Serviço externo
            </span>
          </div>
        </div>
      </section>

      <aside className="card nx-card" aria-label={`Detalhes: ${atual.nome}`} aria-live="polite">
        <div className="card-body">
          <div className="d-flex align-items-center justify-content-between gap-2 mb-1">
            <h2 className="h6 mb-0">{atual.nome}</h2>
            <EstadoBadge estado={v?.estado} latenciaMs={v?.latenciaMs} />
          </div>
          <div className="small text-body-secondary mb-2">{atual.tipo}</div>
          <p className="small">{atual.descricao}</p>
          {v?.resumo && (
            <p className="small mb-2">
              <strong>Agora: </strong>
              {v.resumo}
            </p>
          )}
          <h3 className="h6 small text-uppercase text-body-secondary">Conecta-se com</h3>
          <ul className="small mb-2">
            {atual.conexoes.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <Detalhes detalhes={v?.detalhes} />
        </div>
      </aside>
    </div>
  );
}
