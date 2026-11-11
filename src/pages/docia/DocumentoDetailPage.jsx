import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { baixarEGuardar, detalharDocumento } from '../../api/documentosApi.js';
import { mensagemDeErro } from '../../api/httpClient.js';
import ErrorState from '../../components/ErrorState.jsx';
import Loading from '../../components/Loading.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import { useToast } from '../../components/Toasts.jsx';
import useCarregar from '../../hooks/useCarregar.js';
import { formatarData } from '../../utils/datas.js';
import { formatarTamanho } from './validarDocumento.js';

function Dado({ rotulo, children }) {
  return (
    <div className="col-12 col-md-6 col-xl-4">
      <dt className="text-body-secondary small fw-normal">{rotulo}</dt>
      <dd className="mb-0 text-break">{children || '—'}</dd>
    </div>
  );
}

/** Detalhes do documento (`/docia/documentos/:id`): metadados, demandas, texto extraído e download. */
export default function DocumentoDetailPage() {
  const { id } = useParams();
  const { showToast } = useToast();
  const [baixando, setBaixando] = useState(false);
  const [textoAberto, setTextoAberto] = useState(false);
  const documento = useCarregar(useCallback(() => detalharDocumento(id), [id]));

  async function baixar() {
    setBaixando(true);
    try {
      await baixarEGuardar(documento.data);
    } catch (erro) {
      showToast({
        variant: 'danger',
        message: mensagemDeErro(erro, 'Não foi possível baixar o arquivo.'),
      });
    } finally {
      setBaixando(false);
    }
  }

  if (documento.error) {
    return (
      <>
        <PageHeader module="DocIA" title="Detalhes do documento" />
        <ErrorState
          title={
            documento.error.response?.status === 404
              ? 'Documento não encontrado'
              : 'Não foi possível carregar o documento'
          }
          message={mensagemDeErro(documento.error)}
          onRetry={documento.recarregar}
        />
        <Link to="/docia/documentos" className="btn btn-outline-secondary mt-3">
          Voltar para documentos
        </Link>
      </>
    );
  }
  if (!documento.data) {
    return (
      <>
        <PageHeader module="DocIA" title="Detalhes do documento" />
        <Loading message="Carregando documento..." />
      </>
    );
  }

  const d = documento.data;
  return (
    <>
      <PageHeader
        module="DocIA"
        title={d.titulo}
        actions={
          <>
            <Link to="/docia/documentos" className="btn btn-outline-secondary">
              Voltar
            </Link>
            <button type="button" className="btn btn-primary" onClick={baixar} disabled={baixando}>
              {baixando ? 'Baixando…' : 'Baixar arquivo'}
            </button>
          </>
        }
      />

      <section className="card card-body shadow-sm mb-3" aria-labelledby="meta-documento">
        <h2 id="meta-documento" className="h5 mb-3">
          Metadados
        </h2>
        <dl className="row g-3 mb-0">
          <Dado rotulo="Categoria">{d.categoria}</Dado>
          <Dado rotulo="Tipo">{d.tipo}</Dado>
          <Dado rotulo="Data do documento">{formatarData(d.dataDocumento)}</Dado>
          <Dado rotulo="Município">{d.municipio?.nome}</Dado>
          <Dado rotulo="Responsável">{d.responsavel?.nome}</Dado>
          <Dado rotulo="Enviado em">{formatarData(d.criadoEm)}</Dado>
          <Dado rotulo="Arquivo">
            {d.nomeArquivo} ({formatarTamanho(d.tamanho)}) · {d.mime}
          </Dado>
          <Dado rotulo="SHA-256">
            <code className="small">{d.sha256}</code>
          </Dado>
          <Dado rotulo="Palavras-chave">
            {d.palavrasChave?.length > 0 &&
              d.palavrasChave.map((p) => (
                <span key={p} className="nx-badge nx-badge-gray me-1">
                  {p}
                </span>
              ))}
          </Dado>
          <div className="col-12">
            <dt className="text-body-secondary small fw-normal">Descrição</dt>
            <dd className="mb-0">{d.descricao || '—'}</dd>
          </div>
        </dl>
      </section>

      <div className="row g-3">
        <section className="col-12 col-lg-5" aria-labelledby="demandas-documento">
          <div className="card card-body shadow-sm h-100">
            <h2 id="demandas-documento" className="h5 mb-3">
              Demandas vinculadas
            </h2>
            {d.demandas?.length > 0 ? (
              <ul className="list-unstyled mb-0">
                {d.demandas.map((dem) => (
                  <li key={dem.id} className="mb-2">
                    <Link to={`/flux/demandas/${dem.id}`}>{dem.numero}</Link>
                    {dem.titulo && <span className="text-body-secondary"> — {dem.titulo}</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-body-secondary mb-0">Nenhuma demanda vinculada.</p>
            )}
          </div>
        </section>

        <section className="col-12 col-lg-7" aria-labelledby="texto-documento">
          <div className="card card-body shadow-sm h-100">
            <h2 id="texto-documento" className="h5 mb-3">
              Texto extraído
            </h2>
            {d.textoExtraido ? (
              <>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm align-self-start mb-2"
                  aria-expanded={textoAberto}
                  aria-controls="texto-extraido"
                  onClick={() => setTextoAberto((aberto) => !aberto)}
                >
                  {textoAberto ? 'Ocultar texto' : 'Mostrar texto'}
                </button>
                {textoAberto && (
                  <pre
                    id="texto-extraido"
                    className="small mb-0 p-2 bg-body-tertiary rounded"
                    style={{ whiteSpace: 'pre-wrap', maxHeight: '24rem', overflow: 'auto' }}
                  >
                    {d.textoExtraido}
                  </pre>
                )}
                <p className="small text-body-secondary mt-2 mb-0">
                  Trecho inicial do conteúdo extraído; a busca textual considera o texto completo.
                </p>
              </>
            ) : (
              <p className="text-body-secondary mb-0">
                Não há texto extraído para este documento (por exemplo, arquivos DOCX).
              </p>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
