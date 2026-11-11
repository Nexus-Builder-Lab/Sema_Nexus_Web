import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  desvincularDocumento,
  listarDocumentos,
  listarDocumentosDaDemanda,
  vincularDocumento,
} from '../../api/documentosApi.js';
import { mensagemDeErro } from '../../api/httpClient.js';
import { useAuth } from '../../auth/useAuth.js';
import { podeEscreverDocumentos } from '../../auth/perfis.js';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import Loading from '../../components/Loading.jsx';
import Modal from '../../components/Modal.jsx';
import { useToast } from '../../components/Toasts.jsx';
import useCarregar from '../../hooks/useCarregar.js';
import { formatarData } from '../../utils/datas.js';

function erroDeVinculo(erro, padrao) {
  switch (erro.response?.status) {
    case 403:
      return 'Seu perfil não tem permissão para esta operação.';
    case 409:
      return 'Este documento já está vinculado à demanda.';
    case 404:
      return 'Documento ou vínculo não encontrado.';
    default:
      return mensagemDeErro(erro, padrao);
  }
}

/** Busca textual de documento para vincular à demanda. */
function VincularModal({ demandaId, jaVinculados, onClose, onVinculado }) {
  const { showToast } = useToast();
  const [termo, setTermo] = useState('');
  const [resultado, setResultado] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [erroBusca, setErroBusca] = useState(null);
  const [vinculando, setVinculando] = useState(null);

  async function buscar(event) {
    event.preventDefault();
    setBuscando(true);
    setErroBusca(null);
    try {
      const pagina = await listarDocumentos({ q: termo.trim(), size: 10, sort: 'criadoEm,desc' });
      setResultado(pagina.content);
    } catch (erro) {
      setResultado(null);
      setErroBusca(mensagemDeErro(erro, 'Não foi possível pesquisar os documentos.'));
    } finally {
      setBuscando(false);
    }
  }

  async function vincular(documento) {
    setVinculando(documento.id);
    try {
      await vincularDocumento(demandaId, documento.id);
      onVinculado(`Documento "${documento.titulo}" vinculado à demanda.`);
    } catch (erro) {
      showToast({ variant: 'danger', message: erroDeVinculo(erro, 'Não foi possível vincular.') });
      setVinculando(null);
    }
  }

  return (
    <Modal title="Vincular documento existente" onClose={onClose} busy={vinculando != null}>
      <div className="modal-body">
        <form onSubmit={buscar} role="search" aria-label="Buscar documento" className="mb-3">
          <label htmlFor="busca-documento" className="form-label">
            Pesquisar documento
          </label>
          <div className="input-group">
            <input
              id="busca-documento"
              type="search"
              className="form-control"
              aria-describedby="busca-documento-ajuda"
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
            />
            <button type="submit" className="btn btn-primary" disabled={buscando}>
              {buscando ? 'Buscando…' : 'Buscar'}
            </button>
          </div>
          <div id="busca-documento-ajuda" className="form-text">
            Busca textual em título, descrição, palavras-chave e conteúdo.
          </div>
        </form>
        {buscando && <Loading message="Pesquisando..." />}
        {erroBusca && <div className="alert alert-danger">{erroBusca}</div>}
        {!buscando && resultado && resultado.length === 0 && (
          <EmptyState title="Nenhum documento encontrado" message="Tente outros termos." />
        )}
        {!buscando && resultado?.length > 0 && (
          <ul className="list-group" aria-label="Resultado da busca">
            {resultado.map((doc) => {
              const vinculado = jaVinculados.includes(doc.id);
              return (
                <li
                  key={doc.id}
                  className="list-group-item d-flex justify-content-between align-items-center gap-2"
                >
                  <span className="min-w-0 text-break">
                    {doc.titulo}
                    <span className="d-block small text-body-secondary">
                      {doc.categoria} · {formatarData(doc.dataDocumento)}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary flex-shrink-0"
                    disabled={vinculado || vinculando != null}
                    aria-label={`Vincular ${doc.titulo}`}
                    onClick={() => vincular(doc)}
                  >
                    {vinculado ? 'Já vinculado' : 'Vincular'}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className="modal-footer">
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={onClose}
          disabled={vinculando != null}
        >
          Fechar
        </button>
      </div>
    </Modal>
  );
}

/** Documentos da demanda: listar, vincular (busca), desvincular e enviar já vinculado. */
export default function DemandaDocumentos({ demandaId, onAlterado }) {
  const { usuario } = useAuth();
  const { showToast } = useToast();
  const podeEscrever = podeEscreverDocumentos(usuario);
  const [vinculando, setVinculando] = useState(false);
  const [removendo, setRemovendo] = useState(null);
  const [executando, setExecutando] = useState(false);

  const documentos = useCarregar(
    useCallback(() => listarDocumentosDaDemanda(demandaId), [demandaId]),
  );

  function aposAlterar(mensagem) {
    showToast({ message: mensagem });
    documentos.recarregar();
    onAlterado?.();
  }

  async function desvincular() {
    setExecutando(true);
    try {
      await desvincularDocumento(demandaId, removendo.id);
      setRemovendo(null);
      aposAlterar('Documento desvinculado da demanda.');
    } catch (erro) {
      setRemovendo(null);
      showToast({
        variant: 'danger',
        message: erroDeVinculo(erro, 'Não foi possível desvincular o documento.'),
      });
    } finally {
      setExecutando(false);
    }
  }

  let conteudo;
  if (documentos.error) {
    conteudo = (
      <ErrorState
        title="Não foi possível carregar os documentos"
        message={mensagemDeErro(documentos.error)}
        onRetry={documentos.recarregar}
      />
    );
  } else if (!documentos.data) {
    conteudo = <Loading message="Carregando documentos..." />;
  } else if (documentos.data.length === 0) {
    conteudo = <p className="text-body-secondary mb-0">Nenhum documento associado.</p>;
  } else {
    conteudo = (
      <ul className="list-group list-group-flush" aria-label="Documentos da demanda">
        {documentos.data.map((doc) => (
          <li
            key={doc.id}
            className="list-group-item px-0 d-flex justify-content-between align-items-start gap-2"
          >
            <span className="min-w-0 text-break">
              <Link to={`/docia/documentos/${doc.id}`}>{doc.titulo}</Link>
              <span className="d-block small text-body-secondary">
                {doc.categoria} · {formatarData(doc.dataDocumento)}
              </span>
            </span>
            {podeEscrever && (
              <button
                type="button"
                className="btn btn-sm btn-outline-danger flex-shrink-0"
                aria-label={`Desvincular ${doc.titulo}`}
                onClick={() => setRemovendo(doc)}
              >
                Desvincular
              </button>
            )}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="card card-body shadow-sm h-100">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <h2 id="docs-demanda" className="h5 mb-0">
          Documentos
        </h2>
        {podeEscrever && (
          <div className="d-flex gap-2 flex-wrap">
            <button
              type="button"
              className="btn btn-sm btn-outline-primary"
              onClick={() => setVinculando(true)}
            >
              Vincular documento
            </button>
            <Link
              to={`/docia/documentos/novo?demandaId=${demandaId}`}
              className="btn btn-sm btn-primary"
            >
              Enviar novo documento
            </Link>
          </div>
        )}
      </div>
      {conteudo}
      {vinculando && (
        <VincularModal
          demandaId={demandaId}
          jaVinculados={(documentos.data ?? []).map((doc) => doc.id)}
          onClose={() => setVinculando(false)}
          onVinculado={(mensagem) => {
            setVinculando(false);
            aposAlterar(mensagem);
          }}
        />
      )}
      <ConfirmDialog
        show={removendo != null}
        title="Desvincular documento"
        message={`Remover o vínculo do documento "${removendo?.titulo}" com esta demanda? O documento continua na biblioteca.`}
        confirmLabel="Desvincular"
        busy={executando}
        onConfirm={desvincular}
        onCancel={() => setRemovendo(null)}
      />
    </div>
  );
}
