import { useState } from 'react';
import { mensagemDeErro } from '../../../api/httpClient.js';
import { avaliarAgentes } from '../../../api/sistemaApi.js';
import { useAuth } from '../../../auth/useAuth.js';
import Icon from '../../../components/Icon.jsx';

const ROTULO_AGENTE = {
  triagem: 'Agente de Triagem',
  distribuicao: 'Agente de Distribuição',
  docia: 'Assistente DocIA',
};

const ROTULO_CATEGORIA = {
  DESMATAMENTO_ILEGAL: 'Desmatamento ilegal',
  QUEIMADA_INCENDIO: 'Queimada / incêndio',
  RECURSOS_HIDRICOS: 'Recursos hídricos',
  FAUNA_SILVESTRE: 'Fauna silvestre',
  PESCA_IRREGULAR: 'Pesca irregular',
  MINERACAO_IRREGULAR: 'Mineração irregular',
  RESIDUOS_POLUICAO: 'Resíduos e poluição',
  AREA_PRESERVACAO_PERMANENTE: 'Área de preservação permanente',
  SEM_CATEGORIA: 'Sem categoria',
};

const ROTULO_TIPO_CASO = {
  REGRESSAO: 'Regressão',
  ADVERSARIAL: 'Adversarial',
};

function formatarPct(valor) {
  if (valor == null) return '—';
  return `${Number(valor).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

function nomeAgente(codigo) {
  return ROTULO_AGENTE[codigo] ?? codigo ?? '—';
}

function nomeCategoria(codigo) {
  return ROTULO_CATEGORIA[codigo] ?? codigo ?? '—';
}

/**
 * Governança de IA (Issue #135 / API #131):
 * 1) Taxa de concordância Humano × IA (por agente e por categoria) e feedback do Assistente DocIA.
 * 2) Bateria determinística de autoverificação dos agentes (somente ADMIN, sem gravar dados operacionais).
 */
export default function GovernancaIaSecao({ governanca }) {
  const { usuario } = useAuth();
  const ehAdmin = usuario?.perfil === 'ADMIN';
  const [executando, setExecutando] = useState(false);
  const [erroAvaliacao, setErroAvaliacao] = useState(null);
  const [relatorio, setRelatorio] = useState(null);

  async function executarAutoverificacao() {
    if (executando) return;
    setExecutando(true);
    setErroAvaliacao(null);
    try {
      setRelatorio(await avaliarAgentes());
    } catch (e) {
      setErroAvaliacao(
        mensagemDeErro(e, 'Não foi possível executar a autoverificação dos agentes.'),
      );
    } finally {
      setExecutando(false);
    }
  }

  const porAgente = governanca?.porAgente ?? [];
  const porCategoria = governanca?.porCategoria ?? [];
  const docia = governanca?.docia;
  const totalDocia = (docia?.util ?? 0) + (docia?.imprecisa ?? 0);

  return (
    <div className="d-grid gap-3">
      <section className="card nx-card" aria-label="Concordância Humano × IA">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-baseline flex-wrap gap-2 mb-2">
            <h2 className="h6 mb-0">Governança de IA · Concordância Humano × IA</h2>
            {governanca && (
              <span className="small text-body-secondary">
                Últimos {governanca.periodoDias ?? 30} dias
              </span>
            )}
          </div>

          {!governanca ? (
            <p className="small text-body-secondary mb-0">
              Métricas de governança indisponíveis no momento.
            </p>
          ) : (
            <div className="d-grid gap-3">
              <div className="row g-3">
                {porAgente.length === 0 ? (
                  <div className="col-12">
                    <p className="small text-body-secondary mb-0">
                      Nenhuma decisão humana de triagem ou distribuição avaliada no período.
                    </p>
                  </div>
                ) : (
                  porAgente.map((item) => (
                    <div key={item.agente} className="col-md-4">
                      <div
                        className="border rounded p-3 h-100"
                        data-testid={`concordancia-${item.agente}`}
                      >
                        <div className="small text-body-secondary mb-1">
                          {nomeAgente(item.agente)}
                        </div>
                        <div className="d-flex align-items-baseline gap-2 mb-1">
                          <span className="fs-4 fw-semibold">
                            {formatarPct(item.concordanciaPct)}
                          </span>
                          <span className="small text-body-secondary">concordância integral</span>
                        </div>
                        <div className="small mb-1">
                          Aproveitamento (integral + parcial):{' '}
                          <strong>{formatarPct(item.aproveitamentoPct)}</strong>
                        </div>
                        <div className="small text-body-secondary">
                          {item.avaliadas ?? 0} avaliada(s) · {item.aceitaIntegral ?? 0} aceita(s) ·{' '}
                          {item.ajustadaParcial ?? 0} ajustada(s) · {item.descartada ?? 0}{' '}
                          descartada(s)
                        </div>
                      </div>
                    </div>
                  ))
                )}

                <div className="col-md-4">
                  <div className="border rounded p-3 h-100" data-testid="concordancia-docia">
                    <div className="small text-body-secondary mb-1">
                      Assistente DocIA (feedback)
                    </div>
                    <div className="d-flex align-items-baseline gap-2 mb-1">
                      <span className="fs-4 fw-semibold">{formatarPct(docia?.utilPct)}</span>
                      <span className="small text-body-secondary">respostas úteis</span>
                    </div>
                    <div className="small text-body-secondary">
                      {totalDocia === 0
                        ? 'Nenhum feedback registrado no período.'
                        : `${docia?.util ?? 0} útil(eis) · ${docia?.imprecisa ?? 0} imprecisa(s)`}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="h6 mb-2">Concordância por categoria</h3>
                {porCategoria.length === 0 ? (
                  <p className="small text-body-secondary mb-0">
                    Nenhuma avaliação agrupada por categoria no período.
                  </p>
                ) : (
                  <div className="table-responsive">
                    <table
                      className="table table-sm small align-middle mb-0"
                      aria-label="Concordância por categoria"
                    >
                      <thead>
                        <tr>
                          <th scope="col">Agente</th>
                          <th scope="col">Categoria</th>
                          <th scope="col" className="text-end">
                            Avaliadas
                          </th>
                          <th scope="col" className="text-end">
                            Aceitas
                          </th>
                          <th scope="col" className="text-end">
                            Ajustadas
                          </th>
                          <th scope="col" className="text-end">
                            Descartadas
                          </th>
                          <th scope="col" className="text-end">
                            Concordância
                          </th>
                          <th scope="col" className="text-end">
                            Aproveitamento
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {porCategoria.map((c) => (
                          <tr key={`${c.agente}-${c.categoria}`}>
                            <td>{nomeAgente(c.agente)}</td>
                            <td>{nomeCategoria(c.categoria)}</td>
                            <td className="text-end">{c.avaliadas ?? 0}</td>
                            <td className="text-end">{c.aceitaIntegral ?? 0}</td>
                            <td className="text-end">{c.ajustadaParcial ?? 0}</td>
                            <td className="text-end">{c.descartada ?? 0}</td>
                            <td className="text-end fw-semibold">
                              {formatarPct(c.concordanciaPct)}
                            </td>
                            <td className="text-end">{formatarPct(c.aproveitamentoPct)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="card nx-card" aria-label="Autoverificação dos agentes">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
            <div>
              <h2 className="h6 mb-1">Autoverificação dos agentes</h2>
              <p className="small text-body-secondary mb-0">
                Bateria determinística de regressão e casos adversariais sobre as regras locais de
                Triagem, Distribuição e DocIA. Não chama modelo de IA e não lê nem grava dados
                operacionais.
              </p>
            </div>
            {ehAdmin && (
              <button
                type="button"
                className="btn btn-sm btn-outline-success text-nowrap"
                onClick={executarAutoverificacao}
                disabled={executando}
              >
                {executando ? (
                  <span className="spinner-border spinner-border-sm me-1" aria-hidden="true" />
                ) : (
                  <Icon name="play" size={14} className="me-1" />
                )}
                {executando ? 'Executando bateria…' : 'Executar autoverificação dos agentes'}
              </button>
            )}
          </div>

          {erroAvaliacao && (
            <div className="alert alert-danger mt-2 mb-0" role="alert">
              {erroAvaliacao}
            </div>
          )}

          {relatorio && (
            <div className="mt-3" data-testid="resultado-autoverificacao">
              <div className="d-flex flex-wrap align-items-center gap-2 mb-2 small">
                <span
                  className={`badge ${relatorio.reprovados === 0 ? 'text-bg-success' : 'text-bg-danger'}`}
                >
                  {relatorio.aprovados}/{relatorio.total} aprovados
                </span>
                <span className="badge text-bg-light border">
                  Modo:{' '}
                  {relatorio.modo === 'DETERMINISTICO'
                    ? 'Determinístico (sem modelo de IA)'
                    : relatorio.modo}
                </span>
                {relatorio.duracaoMs != null && (
                  <span className="text-body-secondary">{relatorio.duracaoMs} ms</span>
                )}
                {relatorio.executadaEm && (
                  <span className="text-body-secondary">
                    · executado às {new Date(relatorio.executadaEm).toLocaleTimeString('pt-BR')}
                  </span>
                )}
              </div>
              <p className="small text-body-secondary mb-2">
                Nenhum dado operacional foi lido ou gravado (execução registrada apenas na
                auditoria).
              </p>
              <div className="table-responsive">
                <table
                  className="table table-sm small align-middle mb-0"
                  aria-label="Casos da autoverificação"
                >
                  <thead>
                    <tr>
                      <th scope="col">ID</th>
                      <th scope="col">Agente</th>
                      <th scope="col">Tipo</th>
                      <th scope="col">Descrição</th>
                      <th scope="col">Esperado</th>
                      <th scope="col">Obtido</th>
                      <th scope="col">Resultado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(relatorio.casos ?? []).map((caso) => (
                      <tr key={caso.id}>
                        <td className="text-nowrap fw-semibold">{caso.id}</td>
                        <td>{nomeAgente(caso.agente)}</td>
                        <td>{ROTULO_TIPO_CASO[caso.tipo] ?? caso.tipo}</td>
                        <td>{caso.descricao}</td>
                        <td>{caso.esperado}</td>
                        <td>{caso.obtido}</td>
                        <td>
                          <span
                            className={`badge ${caso.aprovado ? 'text-bg-success' : 'text-bg-danger'}`}
                          >
                            {caso.aprovado ? 'Aprovado' : 'Reprovado'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
