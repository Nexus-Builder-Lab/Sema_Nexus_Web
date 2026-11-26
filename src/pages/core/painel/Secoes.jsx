import { Check, Minus } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../../components/Icon.jsx';
import {
  DESCRICAO_SISTEMA,
  NOME_SISTEMA,
  OBJETIVO_SISTEMA,
  PROBLEMA_SISTEMA,
} from '../../../config/sistema.js';
import { PERMISSOES } from '../admin/permissoes.js';
import { PERFIS } from '../admin/validarAdmin.js';
import {
  DESENVOLVIMENTO,
  INTEGRACOES,
  MODULOS,
  PERFIS_DESCRICAO,
  TECNOLOGIAS,
} from './conteudo.js';
import EstadoBadge from './EstadoBadge.jsx';
import { duracao, segundosDe } from './estados.js';
import GovernancaIaSecao from './GovernancaIaSecao.jsx';

const ORDEM_VISAO = ['web', 'api', 'banco', 'ia', 'inpe', 'armazenamento', 'esri', 'osm'];

// ------------------------------------------------------------------------------------- Visão geral

export function VisaoGeral({ painel, verificacoes, onAbrir }) {
  const banco = verificacoes.banco?.detalhes ?? {};
  const inpe = verificacoes.inpe?.detalhes ?? {};
  const operando = ORDEM_VISAO.filter((id) => verificacoes[id]?.estado === 'OK').length;
  const kpis = [
    {
      rotulo: 'Componentes operando',
      valor: painel ? `${operando}/${ORDEM_VISAO.length}` : '—',
      icone: 'activity',
    },
    { rotulo: 'Demandas', valor: banco.demandas ?? '—', icone: 'clipboard' },
    { rotulo: 'Documentos', valor: banco.documentos ?? '—', icone: 'file' },
    { rotulo: 'Usuários ativos', valor: banco.usuariosAtivos ?? '—', icone: 'users' },
    {
      rotulo: 'Registros do INPE',
      valor: inpe.totalRegistros != null ? inpe.totalRegistros.toLocaleString('pt-BR') : '—',
      icone: 'satellite',
    },
    { rotulo: 'API no ar há', valor: duracao(painel?.sistema?.segundosNoAr), icone: 'clock' },
  ];
  return (
    <div className="d-grid gap-3">
      <section className="card nx-card nx-painel-hero" aria-label={`O que é o ${NOME_SISTEMA}`}>
        <div className="card-body">
          <div className="d-flex align-items-center gap-2 mb-2">
            <span className="nx-painel-logo" aria-hidden="true">
              <Icon name="leaf" size={20} />
            </span>
            <h2 className="h4 mb-0">{NOME_SISTEMA}</h2>
            <span className="badge text-bg-light border">Ambiente demonstrativo</span>
          </div>
          <p className="mb-3">{DESCRICAO_SISTEMA}</p>
          <div className="row g-3 small">
            <div className="col-md-6">
              <div className="fw-semibold mb-1">O problema</div>
              {PROBLEMA_SISTEMA}
            </div>
            <div className="col-md-6">
              <div className="fw-semibold mb-1">O objetivo</div>
              {OBJETIVO_SISTEMA}
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Números do sistema" className="nx-painel-kpis">
        {kpis.map((k) => (
          <div key={k.rotulo} className="card nx-card">
            <div className="card-body py-2">
              <div className="small text-body-secondary d-flex align-items-center gap-1">
                <Icon name={k.icone} size={14} /> {k.rotulo}
              </div>
              <div className="fs-4 fw-semibold">{k.valor}</div>
            </div>
          </div>
        ))}
      </section>

      <section className="card nx-card" aria-label="Saúde dos componentes">
        <div className="card-body">
          <h2 className="h6">Saúde dos componentes agora</h2>
          <p className="small text-body-secondary">
            Clique em um componente para vê-lo no diagrama de arquitetura.
          </p>
          <div className="nx-painel-saude">
            {ORDEM_VISAO.map((id) => {
              const v = verificacoes[id] ?? {};
              return (
                <button
                  type="button"
                  key={id}
                  className="nx-painel-saude-item"
                  onClick={() => onAbrir('arquitetura', id)}
                >
                  <div className="d-flex justify-content-between align-items-start gap-2">
                    <span className="fw-semibold text-start">{v.nome ?? id}</span>
                    <EstadoBadge estado={v.estado} latenciaMs={v.latenciaMs} />
                  </div>
                  <span className="small text-body-secondary text-start">{v.resumo ?? '…'}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

// ------------------------------------------------------------------------------------------ Módulos

export function Modulos() {
  const [aberto, setAberto] = useState(MODULOS[0].id);
  return (
    <div className="nx-painel-modulos">
      {MODULOS.map((m) => {
        const expandido = aberto === m.id;
        return (
          <section
            key={m.id}
            className={`card nx-card nx-painel-modulo ${m.cor}`}
            aria-label={m.nome}
          >
            <div className="card-body">
              <button
                type="button"
                className="nx-painel-modulo-cab"
                aria-expanded={expandido}
                onClick={() => setAberto(expandido ? null : m.id)}
              >
                <span className="nx-painel-modulo-icone" aria-hidden="true">
                  <Icon name={m.icone} size={18} />
                </span>
                <span className="text-start">
                  <span className="d-block fw-semibold">{m.nome}</span>
                  <span className="d-block small text-body-secondary">{m.resumo}</span>
                </span>
                <Icon
                  name="chevronDown"
                  size={16}
                  className={`ms-auto${expandido ? ' girado' : ''}`}
                />
              </button>
              {expandido && (
                <div className="mt-2">
                  <ul className="small mb-2">
                    {m.funcionalidades.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                  <div className="d-flex flex-wrap gap-2">
                    {m.rotas.map((r) => (
                      <Link key={r.to} to={r.to} className="btn btn-sm btn-outline-secondary">
                        Abrir {r.rotulo}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------------------------- Perfis e permissões

export function PerfisInterativos() {
  const [perfil, setPerfil] = useState('ADMIN');
  const permitidas = PERMISSOES.filter((p) => p.perfis.includes(perfil)).length;
  return (
    <section className="card nx-card" aria-label="Perfis e permissões">
      <div className="card-body">
        <h2 className="h6">Escolha um perfil para ver o que ele pode fazer</h2>
        <div className="d-flex flex-wrap gap-2 mb-3" role="radiogroup" aria-label="Perfil">
          {PERFIS.map((p) => (
            <button
              type="button"
              key={p.codigo}
              role="radio"
              aria-checked={perfil === p.codigo}
              className={`btn btn-sm ${perfil === p.codigo ? 'btn-success' : 'btn-outline-secondary'}`}
              onClick={() => setPerfil(p.codigo)}
            >
              {p.rotulo}
            </button>
          ))}
        </div>
        <p className="small mb-2" data-testid="perfil-descricao">
          <strong>{PERFIS.find((p) => p.codigo === perfil)?.rotulo}:</strong>{' '}
          {PERFIS_DESCRICAO[perfil]}
        </p>
        <div
          className="progress mb-3"
          role="progressbar"
          aria-label="Permissões do perfil"
          aria-valuenow={permitidas}
          aria-valuemin={0}
          aria-valuemax={PERMISSOES.length}
        >
          <div
            className="progress-bar bg-success"
            style={{ width: `${(permitidas / PERMISSOES.length) * 100}%` }}
          >
            {permitidas} de {PERMISSOES.length}
          </div>
        </div>
        <ul className="list-unstyled nx-painel-permissoes mb-2">
          {PERMISSOES.map((perm) => {
            const pode = perm.perfis.includes(perfil);
            return (
              <li key={perm.chave} className={pode ? 'pode' : 'nao-pode'}>
                {pode ? (
                  <Check size={16} aria-hidden="true" />
                ) : (
                  <Minus size={16} aria-hidden="true" />
                )}
                <span>{perm.rotulo}</span>
                <span className="visually-hidden">
                  {pode ? ' (permitido)' : ' (não permitido)'}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="small text-body-secondary mb-0">
          A autorização é sempre validada pela API (o menu só esconde o que o perfil não usa). O
          Fiscal enxerga apenas as demandas da sua equipe ou atribuídas a ele.
        </p>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------------------------------ Agentes

const ROTULO_AQUECIMENTO = {
  PRONTO: 'Pronto',
  AQUECENDO: 'Carregando o modelo…',
  FALHOU: 'Falhou (os agentes usam as regras locais até o Ollama responder)',
  INDISPONIVEL: 'Ollama indisponível ou modelo não baixado',
  NAO_INICIADO: 'Não iniciado',
};

/** Aquecimento automático do modelo ao iniciar a API (API#120) e tempo de permanência na memória de vídeo. */
function Aquecimento({ aquecimento, manterCarregado }) {
  if (!aquecimento && !manterCarregado) return null;
  const a = aquecimento ?? {};
  const hora = a.em
    ? new Date(a.em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : null;
  return (
    <div className="mt-2" data-testid="painel-aquecimento">
      <span className="text-body-secondary">Aquecimento ao iniciar: </span>
      <span className="fw-semibold">{ROTULO_AQUECIMENTO[a.estado] ?? a.estado ?? '—'}</span>
      {a.estado === 'PRONTO' && hora && (
        <span className="text-body-secondary">
          {' '}
          · às {hora} em{' '}
          {(a.duracaoMs / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} s
        </span>
      )}
      {manterCarregado && (
        <span className="text-body-secondary">
          {' '}
          · fica na memória por {manterCarregado === '-1'
            ? 'tempo indeterminado'
            : manterCarregado}{' '}
          após o último uso
        </span>
      )}
    </div>
  );
}

function Fluxo({ ferramentas, modelo }) {
  const etapas = [
    { titulo: 'Pedido', texto: 'O usuário pede uma sugestão na tela' },
    { titulo: 'Ferramentas', texto: ferramentas.join(' · '), destaque: true },
    { titulo: 'Modelo', texto: modelo },
    {
      titulo: 'Validação',
      texto: 'A API confere a resposta e monta as citações (enums, duplicatas, trechos reais)',
    },
    { titulo: 'Pessoa decide', texto: 'Sugestão revisada; nada é gravado pelo agente' },
  ];
  return (
    <ol className="nx-painel-fluxo" aria-label="Como o agente trabalha">
      {etapas.map((e, i) => (
        <li key={e.titulo} className={e.destaque ? 'destaque' : ''}>
          <span className="nx-painel-fluxo-n">{i + 1}</span>
          <span className="fw-semibold small d-block">{e.titulo}</span>
          <span className="small text-body-secondary">{e.texto}</span>
        </li>
      ))}
    </ol>
  );
}

export function AgentesIa({ painel, verificacoes }) {
  const ia = verificacoes.ia ?? {};
  const d = ia.detalhes ?? {};
  const links = {
    triagem: '/flux/demandas',
    distribuicao: '/flux/demandas',
    docia: '/docia/assistente',
  };
  return (
    <div className="d-grid gap-3">
      <section className="card nx-card" aria-label="Motor de IA">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center gap-2 flex-wrap mb-2">
            <h2 className="h6 mb-0">Motor de IA dos agentes</h2>
            <EstadoBadge estado={ia.estado} latenciaMs={d.latenciaMs} />
          </div>
          <p className="small mb-2">{ia.resumo ?? '…'}</p>
          <div className="row g-3 small">
            <div className="col-md-4">
              <div className="text-body-secondary">Provedor</div>
              <div className="fw-semibold">{d.provedor ?? '—'}</div>
              {d.versao && <div className="text-body-secondary">versão {d.versao}</div>}
            </div>
            <div className="col-md-8">
              <div className="text-body-secondary mb-1">Modelos carregados na memória</div>
              {(d.carregados ?? []).length === 0 && (
                <div>
                  Nenhum agora (a API carrega o modelo ao iniciar e ele fica{' '}
                  {d.manterCarregado ?? '4h'} na memória após o último uso).
                </div>
              )}
              {(d.carregados ?? []).map((m) => (
                <div key={m.nome} className="mb-1">
                  <div className="d-flex justify-content-between">
                    <span className="fw-semibold">{m.nome}</span>
                    <span>
                      {m.percentualGpu}% na GPU · {m.memoriaVideoMb} MB de vídeo
                    </span>
                  </div>
                  <div className="progress" style={{ height: 6 }} aria-hidden="true">
                    <div
                      className="progress-bar bg-success"
                      style={{ width: `${m.percentualGpu}%` }}
                    />
                  </div>
                </div>
              ))}
              <Aquecimento aquecimento={d.aquecimento} manterCarregado={d.manterCarregado} />
              {(d.instalados ?? []).length > 0 && (
                <div className="text-body-secondary mt-1">
                  Instalados:{' '}
                  {d.instalados
                    .map((m) => `${m.nome} (${m.parametros}, ${m.quantizacao}, ${m.tamanhoMb} MB)`)
                    .join('; ')}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {(painel?.agentes ?? []).map((a) => {
        const m = a.metricas ?? {};
        const taxa = m.execucoes ? Math.round((m.sucessos / m.execucoes) * 100) : null;
        return (
          <section key={a.id} className="card nx-card" aria-label={a.nome}>
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start gap-2 flex-wrap mb-2">
                <div>
                  <h2 className="h6 mb-0">{a.nome}</h2>
                  <div className="small text-body-secondary">{a.modulo}</div>
                </div>
                <div className="d-flex gap-2 align-items-center">
                  <span className="badge nx-agente-selo">
                    {a.modo === 'DEMONSTRATIVO'
                      ? 'Regras locais'
                      : a.modo === 'CLAUDE'
                        ? 'Claude'
                        : 'IA local'}{' '}
                    · {a.modelo}
                  </span>
                  <Link
                    to={links[a.id] ?? '/flux/demandas'}
                    className="btn btn-sm btn-outline-success"
                  >
                    Experimentar
                  </Link>
                </div>
              </div>
              <Fluxo ferramentas={a.ferramentas} modelo={a.modelo} />
              <div className="nx-painel-metricas" aria-label={`Métricas do ${a.nome}`}>
                <div>
                  <span>Execuções com IA</span>
                  <strong>{m.execucoes ?? 0}</strong>
                </div>
                <div>
                  <span>Taxa de sucesso</span>
                  <strong>{taxa == null ? '—' : `${taxa}%`}</strong>
                </div>
                <div>
                  <span>Tempo médio</span>
                  <strong>{segundosDe(m.tempoMedioMs)}</strong>
                </div>
                <div>
                  <span>Modo demonstrativo</span>
                  <strong>{m.demonstrativo ?? 0}</strong>
                </div>
                <div>
                  <span>Última execução</span>
                  <strong>
                    {m.ultimaExecucao
                      ? new Date(m.ultimaExecucao).toLocaleTimeString('pt-BR')
                      : '—'}
                  </strong>
                </div>
              </div>
              <p className="small text-body-secondary mb-0 mt-2">
                Métricas desde que a API foi iniciada.
                {m.ultimaFalha && ` Última falha: ${m.ultimaFalha}`}
              </p>
            </div>
          </section>
        );
      })}

      <GovernancaIaSecao governanca={painel?.governanca} />
    </div>
  );
}

// ------------------------------------------------------------------------------------- Integrações

export function Integracoes({ verificacoes }) {
  const importacoes = verificacoes.inpe?.detalhes?.importacoes ?? [];
  return (
    <div className="d-grid gap-3">
      <div className="nx-painel-integracoes">
        {INTEGRACOES.map((i) => {
          const v = verificacoes[i.id] ?? {};
          return (
            <section key={i.id} className="card nx-card" aria-label={i.nome}>
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start gap-2 mb-1">
                  <h2 className="h6 mb-0">{i.nome}</h2>
                  <EstadoBadge estado={v.estado} latenciaMs={v.latenciaMs} />
                </div>
                <div className="small text-body-secondary mb-2">{i.tipo}</div>
                <p className="small mb-2">{i.comportamento}</p>
                {v.resumo && (
                  <p className="small mb-2">
                    <strong>Agora: </strong>
                    {v.resumo}
                  </p>
                )}
                <div className="d-flex flex-wrap gap-2 small">
                  <span className="badge text-bg-light border">Custo: {i.custo}</span>
                  <span className="badge text-bg-light border">Dados: {i.dados}</span>
                </div>
              </div>
            </section>
          );
        })}
      </div>
      <section className="card nx-card" aria-label="Pacotes do INPE importados">
        <div className="card-body">
          <h2 className="h6">Pacotes de dados públicos do INPE</h2>
          {importacoes.length === 0 ? (
            <p className="small mb-0">Nenhum pacote importado.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm small align-middle mb-0">
                <thead>
                  <tr>
                    <th scope="col">Tipo</th>
                    <th scope="col">Fonte</th>
                    <th scope="col">Período</th>
                    <th scope="col" className="text-end">
                      Registros
                    </th>
                    <th scope="col">Licença</th>
                  </tr>
                </thead>
                <tbody>
                  {importacoes.map((x) => (
                    <tr key={`${x.tipo}-${x.periodoDe}`}>
                      <td>{x.tipo === 'FOCO_CALOR' ? 'Focos de calor' : 'Alertas DETER'}</td>
                      <td>{x.fonte}</td>
                      <td className="text-nowrap">
                        {x.periodoDe} a {x.periodoAte}
                      </td>
                      <td className="text-end">{Number(x.registros).toLocaleString('pt-BR')}</td>
                      <td>{x.licenca}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// --------------------------------------------------------------------------------- Desenvolvimento

export function Desenvolvimento() {
  return (
    <div className="d-grid gap-3">
      <section aria-label="Como foi desenvolvido" className="nx-painel-dev">
        {DESENVOLVIMENTO.map((d) => (
          <div key={d.titulo} className="card nx-card">
            <div className="card-body">
              <div className="d-flex align-items-center gap-2 mb-1">
                <span className="nx-painel-modulo-icone" aria-hidden="true">
                  <Icon name={d.icone} size={16} />
                </span>
                <h2 className="h6 mb-0">{d.titulo}</h2>
              </div>
              <p className="small mb-0">{d.texto}</p>
            </div>
          </div>
        ))}
      </section>
      <section className="card nx-card" aria-label="Tecnologias">
        <div className="card-body">
          <h2 className="h6">Tecnologias por camada</h2>
          {TECNOLOGIAS.map((t) => (
            <div key={t.camada} className="d-flex flex-wrap align-items-center gap-2 mb-2">
              <span className="fw-semibold small nx-painel-camada">{t.camada}</span>
              {t.itens.map((i) => (
                <span key={i} className="badge text-bg-light border">
                  {i}
                </span>
              ))}
            </div>
          ))}
          <p className="small text-body-secondary mb-0">
            Desenvolvido com o Claude Code (Anthropic) a partir de Issues no GitHub, com testes e CI
            em cada mudança.
          </p>
        </div>
      </section>
    </div>
  );
}
