import {
  AlertTriangle,
  Banknote,
  Calendar,
  CheckCircle2,
  Download,
  FileText,
  GitCompare,
  Hash,
  Info,
  ListChecks,
  MapPin,
  Percent,
  Ruler,
  Search,
  Timer,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { detalharDocumento, listarDocumentos } from '../../api/documentosApi.js';
import { mensagemDeErro } from '../../api/httpClient.js';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import Loading from '../../components/Loading.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import useCarregar from '../../hooks/useCarregar.js';
import { formatarData, hojeISO } from '../../utils/datas.js';
import useGeoJson from '../intelligence/useGeoJson.js';
import { extrair, palavrasChave, resumir, segmentar, verificar } from './analiseEngine.js';

const NIVEIS = {
  ok: { Icone: CheckCircle2, classe: 'alert-success' },
  warn: { Icone: AlertTriangle, classe: 'alert-warning' },
  info: { Icone: Info, classe: 'alert-info' },
};

const norm = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

function Grupo({ Icone, titulo, itens }) {
  return (
    <div className="mb-3">
      <h4 className="h6 d-flex align-items-center gap-1 mb-2">
        <Icone size={15} aria-hidden="true" />
        {titulo} <span className="text-body-secondary fw-normal">({itens.length})</span>
      </h4>
      {itens.length ? (
        <div className="d-flex flex-wrap gap-1">
          {itens.map((x) => (
            <span key={x} className="nx-badge nx-badge-gray">
              {x}
            </span>
          ))}
        </div>
      ) : (
        <span className="small text-body-secondary">Nenhum item identificado.</span>
      )}
    </div>
  );
}

function exportar(doc, ex, resumo, ver) {
  const linhas = [
    'ANÁLISE DOCUMENTAL AUTOMATIZADA (POR REGRAS — SEM IA) — SEMA NEXUS · Ambiente demonstrativo',
    `Documento: ${doc.titulo}`,
    '',
    'RESUMO EXTRATIVO',
    ...resumo.map((f, i) => `${i + 1}. ${f}`),
    '',
    `DATAS: ${ex.datas.map((d) => d.txt).join(', ')}`,
    `PROCESSOS: ${ex.processos.join(', ')}`,
    `MUNICÍPIOS (MT): ${ex.municipios.join(', ')}`,
    `ÁREAS: ${ex.areas.join(', ')}`,
    `VALORES: ${ex.valores.join(', ')}`,
    '',
    'VERIFICAÇÕES',
    ...ver.map((v) => `- [${v.nivel.toUpperCase()}] ${v.texto}`),
    '',
    'Resultado gerado por regras determinísticas. Deve ser validado por servidor responsável.',
  ];
  const url = URL.createObjectURL(new Blob([linhas.join('\n')], { type: 'text/plain' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `analise_${doc.id}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function Resultado({ id, nomesMunicipios }) {
  const carregar = useCallback(() => detalharDocumento(id), [id]);
  const { data: doc, loading, error, recarregar } = useCarregar(carregar);

  const analise = useMemo(() => {
    if (!doc?.textoExtraido) return null;
    const t = doc.textoExtraido;
    const ex = extrair(t, nomesMunicipios);
    return {
      ex,
      resumo: resumir(t, 3),
      termos: palavrasChave(t, 12),
      ver: verificar(doc, ex, hojeISO()),
      segmentos: segmentar(t),
      palavras: t.split(/\s+/).filter(Boolean).length,
    };
  }, [doc, nomesMunicipios]);

  if (loading) return <Loading message="Analisando documento…" />;
  if (error)
    return (
      <ErrorState
        message={mensagemDeErro(error, 'Não foi possível carregar o documento.')}
        onRetry={recarregar}
      />
    );
  if (!analise)
    return (
      <EmptyState
        title="Documento sem conteúdo textual"
        message="A API não retornou texto extraído para este documento (por exemplo, arquivos escaneados ou imagens)."
      />
    );

  const { ex, resumo, termos, ver, segmentos, palavras } = analise;
  return (
    <div className="d-flex flex-column gap-3">
      <div className="card">
        <div className="card-body">
          <div className="d-flex flex-wrap justify-content-between gap-2 mb-3">
            <div className="min-w-0">
              <h2 className="h5 mb-1 d-flex align-items-center gap-2">
                <FileText size={18} aria-hidden="true" />
                {doc.titulo}
              </h2>
              <span className="small text-body-secondary">
                {doc.categoria} · {palavras.toLocaleString('pt-BR')} palavras
              </span>
            </div>
            <div className="d-flex gap-2 flex-wrap align-items-start">
              <Link className="btn btn-sm btn-outline-secondary" to="/docia/comparacao">
                <GitCompare size={14} aria-hidden="true" /> Comparar
              </Link>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => exportar(doc, ex, resumo, ver)}
              >
                <Download size={14} aria-hidden="true" /> Exportar análise
              </button>
            </div>
          </div>
          <div className="row g-4">
            <div className="col-lg-6">
              <h3 className="h6 d-flex align-items-center gap-1">
                <ListChecks size={15} aria-hidden="true" /> Resumo extrativo (3 frases mais
                representativas)
              </h3>
              {resumo.length ? (
                <ol className="nx-summary-box">
                  {resumo.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ol>
              ) : (
                <p className="small text-body-secondary">Texto curto demais para resumir.</p>
              )}
              <h3 className="h6 mt-3">Termos mais frequentes</h3>
              <div className="d-flex flex-wrap gap-1">
                {termos.length ? (
                  termos.map(([t, n]) => (
                    <span key={t} className="nx-badge nx-badge-gray">
                      {t} <strong>{n}</strong>
                    </span>
                  ))
                ) : (
                  <span className="small text-body-secondary">Nenhum termo repetido.</span>
                )}
              </div>
            </div>
            <div className="col-lg-6">
              <h3 className="h6">Verificações e possíveis inconsistências</h3>
              {ver.map((v) => {
                const { Icone, classe } = NIVEIS[v.nivel];
                return (
                  <div key={v.texto} className={`alert ${classe} d-flex gap-2 py-2 mb-2`}>
                    <Icone size={16} className="flex-shrink-0 mt-1" aria-hidden="true" />
                    <div>{v.texto}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-lg-6">
          <div className="card h-100">
            <div className="card-body">
              <h3 className="h6 mb-3">Informações extraídas</h3>
              <Grupo Icone={Calendar} titulo="Datas" itens={ex.datas.map((d) => d.txt)} />
              <Grupo Icone={Hash} titulo="Números de processo" itens={ex.processos} />
              <Grupo
                Icone={FileText}
                titulo="Números de documentos / autos"
                itens={[...ex.numerosDocumento, ...ex.autos, ...ex.demandas]}
              />
              <Grupo Icone={MapPin} titulo="Municípios de MT citados" itens={ex.municipios} />
              <Grupo Icone={Ruler} titulo="Áreas" itens={ex.areas} />
              <Grupo Icone={Banknote} titulo="Valores monetários" itens={ex.valores} />
              <Grupo
                Icone={Percent}
                titulo="Percentuais e vazões"
                itens={[...ex.percentuais, ...ex.vazoes]}
              />
              <Grupo Icone={MapPin} titulo="Coordenadas" itens={ex.coordenadas} />
              <Grupo Icone={Timer} titulo="Prazos em dias" itens={ex.prazos} />
            </div>
          </div>
        </div>
        <div className="col-lg-6">
          <div className="card h-100">
            <div className="card-body">
              <h3 className="h6 mb-3">Campos estruturados identificados</h3>
              {ex.campos.length ? (
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead>
                      <tr>
                        <th scope="col">Campo</th>
                        <th scope="col">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ex.campos.map((c, i) => (
                        <tr key={`${c.campo}-${i}`}>
                          <th scope="row" className="fw-semibold">
                            {c.campo}
                          </th>
                          <td>{c.valor}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="small text-body-secondary mb-0">
                  Nenhum campo &quot;Rótulo: valor&quot; encontrado.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="d-flex flex-wrap justify-content-between gap-2 mb-2">
            <h3 className="h6 mb-0">Texto com marcações</h3>
            <div className="small d-flex gap-3">
              <span>
                <mark className="nx-mark-proc">Processos</mark>
              </span>
              <span>
                <mark className="nx-mark-date">Datas</mark>
              </span>
              <span>
                <mark className="nx-mark-num">Valores, áreas e vazões</mark>
              </span>
            </div>
          </div>
          <div className="nx-doc-content" data-testid="texto-marcado">
            {segmentos.map((s, i) =>
              s.tipo ? (
                <mark key={i} className={`nx-mark-${s.tipo}`}>
                  {s.texto}
                </mark>
              ) : (
                <span key={i}>{s.texto}</span>
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Análise documental (`/docia/analise`): extração por regras sobre o texto retornado pela API. */
export default function AnaliseDocumentalPage() {
  const [params, setParams] = useSearchParams();
  const sel = params.get('id');
  const [busca, setBusca] = useState('');
  const [docs, setDocs] = useState(null);
  const [erro, setErro] = useState(null);
  const [tentativa, setTentativa] = useState(0);
  const geo = useGeoJson('/geo/mt-municipios.geojson');
  const nomesMunicipios = useMemo(
    () => geo?.features?.map((f) => f.properties?.nome).filter(Boolean) ?? [],
    [geo],
  );

  useEffect(() => {
    let ativo = true;
    listarDocumentos({ page: 0, size: 200, sort: 'dataDocumento,desc' })
      .then((p) => ativo && (setDocs(p.content ?? []), setErro(null)))
      .catch(
        (e) => ativo && setErro(mensagemDeErro(e, 'Não foi possível carregar os documentos.')),
      );
    return () => {
      ativo = false;
    };
  }, [tentativa]);

  const filtrados = useMemo(
    () => (docs ?? []).filter((d) => !busca || norm(d.titulo).includes(norm(busca))),
    [docs, busca],
  );

  return (
    <>
      <PageHeader
        module="DocIA"
        title="Análise documental"
        description="Selecione um documento para extrair informações, gerar um resumo e identificar datas, números de processo e possíveis inconsistências."
      />
      <div className="nx-ai-disclaimer d-flex gap-2 mb-3" role="note">
        <Info size={16} className="flex-shrink-0 mt-1" aria-hidden="true" />
        <div>
          <strong>Análise automatizada por regras — sem uso de inteligência artificial.</strong> Os
          resultados são obtidos por expressões regulares e estatística de frequência de termos
          sobre o texto extraído pela API. O resumo é <em>extrativo</em>: reproduz frases do próprio
          documento, sem gerar conteúdo novo. Toda conclusão deve ser validada por um servidor.
          Documentos fictícios.
        </div>
      </div>

      <div className="row g-3">
        <div className="col-lg-4 col-xl-3">
          <div className="card">
            <div className="card-body pb-2">
              <h2 className="h6 d-flex align-items-center gap-2">
                <FileText size={16} aria-hidden="true" /> Documentos
              </h2>
              <div className="position-relative mb-2">
                <label htmlFor="filtro-docs" className="visually-hidden">
                  Filtrar documentos
                </label>
                <Search
                  size={14}
                  className="position-absolute top-50 translate-middle-y ms-2 text-body-secondary"
                  aria-hidden="true"
                />
                <input
                  id="filtro-docs"
                  className="form-control form-control-sm ps-4"
                  placeholder="Filtrar documentos"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </div>
            </div>
            <div className="nx-doc-select-list">
              {erro ? (
                <ErrorState message={erro} onRetry={() => setTentativa((n) => n + 1)} />
              ) : docs === null ? (
                <Loading message="Carregando documentos…" />
              ) : filtrados.length ? (
                filtrados.map((d) => (
                  <button
                    type="button"
                    key={d.id}
                    className={`nx-doc-pick${String(d.id) === sel ? ' active' : ''}`}
                    aria-pressed={String(d.id) === sel}
                    onClick={() => setParams({ id: String(d.id) })}
                  >
                    <FileText size={16} className="flex-shrink-0 text-success" aria-hidden="true" />
                    <span className="min-w-0">
                      <strong>{d.titulo}</strong>
                      <span>
                        {d.categoria}
                        {d.dataDocumento ? ` · ${formatarData(d.dataDocumento)}` : ''}
                      </span>
                    </span>
                  </button>
                ))
              ) : (
                <EmptyState title="Nenhum documento" />
              )}
            </div>
          </div>
        </div>
        <div className="col-lg-8 col-xl-9">
          {sel ? (
            <Resultado id={sel} nomesMunicipios={nomesMunicipios} />
          ) : (
            <div className="card">
              <div className="card-body">
                <EmptyState
                  title="Selecione um documento"
                  message="Escolha um documento na lista ao lado para iniciar a análise."
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
