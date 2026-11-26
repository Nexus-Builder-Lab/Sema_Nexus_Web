import { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  baixarEGuardarFoto,
  baixarFotoFiscalizacao,
  enviarFotoFiscalizacao,
  excluirFotoFiscalizacao,
  listarFotosFiscalizacao,
} from '../../api/demandasApi.js';
import { mensagemDeErro } from '../../api/httpClient.js';
import { podeEnviarFoto, podeExcluirFoto } from '../../auth/perfis.js';
import { useAuth } from '../../auth/useAuth.js';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import Icon from '../../components/Icon.jsx';
import Loading from '../../components/Loading.jsx';
import { useToast } from '../../components/Toasts.jsx';
import useCarregar from '../../hooks/useCarregar.js';
import { formatarData } from '../../utils/datas.js';
import { formatarTamanho } from '../docia/validarDocumento.js';
import {
  AVISO_FOTOS_DEMONSTRATIVAS,
  CONFERENCIA_EXIF,
  formatarDataHoraExif,
  formatarDistanciaKm,
  MAX_FOTOS_POR_DEMANDA,
  mensagemDeErroFoto,
  validarArquivoFoto,
} from './fotosFiscalizacao.js';

function SeloExif({ conferencia }) {
  const info = CONFERENCIA_EXIF[conferencia] ?? {
    rotulo: conferencia || 'EXIF: Desconhecido',
    badge: 'nx-badge-gray',
    icone: 'alert',
    descricao: 'Status de conferência EXIF.',
  };
  return (
    <span className={`nx-badge ${info.badge}`} title={info.descricao}>
      <Icon name={info.icone} size={12} />
      {info.rotulo}
    </span>
  );
}

/**
 * Listagem, upload multipart, download autenticado, prévia e exclusão de fotos de evidência
 * da fiscalização (Issue #149 / API#145). Sem `<form>` interno para poder ser usado dentro do
 * `FiscalizacaoModal` e na seção da `DemandaDetailPage`.
 */
export default function FotosFiscalizacao({
  demanda,
  onAlterado,
  onUploadEstadoChange,
  emModal = false,
}) {
  const { usuario } = useAuth();
  const { showToast } = useToast();
  const inputId = useId();
  const ajudaId = useId();
  const inputRef = useRef(null);

  const [enviando, setEnviando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [erroUpload, setErroUpload] = useState(null);
  const [baixandoId, setBaixandoId] = useState(null);
  const [excluindo, setExcluindo] = useState(null);
  const [confirmandoInline, setConfirmandoInline] = useState(null);
  const [removendo, setRemovendo] = useState(false);
  const [previa, setPrevia] = useState(null); // { foto, url }
  const [carregandoPreviaId, setCarregandoPreviaId] = useState(null);
  const previaUrlRef = useRef(null);

  const fotos = useCarregar(useCallback(() => listarFotosFiscalizacao(demanda.id), [demanda.id]));

  useEffect(() => {
    return () => {
      if (previaUrlRef.current) {
        URL.revokeObjectURL(previaUrlRef.current);
        previaUrlRef.current = null;
      }
    };
  }, []);

  function fecharPrevia() {
    if (previaUrlRef.current) {
      URL.revokeObjectURL(previaUrlRef.current);
      previaUrlRef.current = null;
    }
    setPrevia(null);
  }

  function atualizarEnviando(ativo) {
    setEnviando(ativo);
    onUploadEstadoChange?.(ativo);
  }

  async function aoSelecionarFoto(event) {
    const arquivo = event.target.files?.[0] ?? null;
    event.target.value = '';
    if (!arquivo) return;
    const totalAtual = fotos.data?.length ?? 0;
    const erroValidacao = validarArquivoFoto(arquivo, totalAtual);
    if (erroValidacao) {
      setErroUpload(erroValidacao);
      return;
    }
    setErroUpload(null);
    setProgresso(0);
    atualizarEnviando(true);
    try {
      const nova = await enviarFotoFiscalizacao(demanda.id, arquivo, setProgresso);
      showToast({ message: `Foto "${nova.nomeOriginal}" enviada.` });
      fotos.recarregar();
      onAlterado?.();
    } catch (erro) {
      setErroUpload(mensagemDeErroFoto(erro, 'Não foi possível enviar a foto.'));
    } finally {
      atualizarEnviando(false);
    }
  }

  async function baixar(foto) {
    setBaixandoId(foto.id);
    try {
      await baixarEGuardarFoto(demanda.id, foto);
    } catch (erro) {
      showToast({
        variant: 'danger',
        message: mensagemDeErroFoto(erro, 'Não foi possível baixar a foto.'),
      });
    } finally {
      setBaixandoId(null);
    }
  }

  async function visualizar(foto) {
    if (previa?.foto.id === foto.id) {
      fecharPrevia();
      return;
    }
    setCarregandoPreviaId(foto.id);
    try {
      const blob = await baixarFotoFiscalizacao(demanda.id, foto.id);
      const url = URL.createObjectURL(blob);
      if (previaUrlRef.current) URL.revokeObjectURL(previaUrlRef.current);
      previaUrlRef.current = url;
      setPrevia({ foto, url });
    } catch (erro) {
      showToast({
        variant: 'danger',
        message: mensagemDeErroFoto(erro, 'Não foi possível abrir a imagem.'),
      });
    } finally {
      setCarregandoPreviaId(null);
    }
  }

  async function confirmarExclusao(fotoAlvo) {
    if (!fotoAlvo) return;
    setRemovendo(true);
    try {
      await excluirFotoFiscalizacao(demanda.id, fotoAlvo.id);
      if (previa?.foto.id === fotoAlvo.id) fecharPrevia();
      setExcluindo(null);
      setConfirmandoInline(null);
      showToast({ message: `Foto "${fotoAlvo.nomeOriginal}" excluída.` });
      fotos.recarregar();
      onAlterado?.();
    } catch (erro) {
      setExcluindo(null);
      setConfirmandoInline(null);
      showToast({
        variant: 'danger',
        message: mensagemDeErroFoto(erro, 'Não foi possível excluir a foto.'),
      });
    } finally {
      setRemovendo(false);
    }
  }

  const podeEnviar = podeEnviarFoto(usuario, demanda);
  const lista = fotos.data ?? [];
  const limiteAtingido = lista.length >= MAX_FOTOS_POR_DEMANDA;

  return (
    <div>
      <p className="small text-body-secondary mb-2">{AVISO_FOTOS_DEMONSTRATIVAS}</p>

      {podeEnviar && (
        <div className="mb-3">
          <label htmlFor={inputId} className="form-label">
            Anexar foto demonstrativa (JPG, PNG ou WebP, até 10 MB)
          </label>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            className={`form-control form-control-sm${erroUpload ? ' is-invalid' : ''}`}
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            aria-describedby={ajudaId}
            disabled={enviando || limiteAtingido}
            onChange={aoSelecionarFoto}
          />
          <div id={ajudaId} className="form-text">
            {limiteAtingido
              ? `Limite de ${MAX_FOTOS_POR_DEMANDA} fotos atingido nesta demanda.`
              : `Máximo de ${MAX_FOTOS_POR_DEMANDA} fotos por demanda (${lista.length}/${MAX_FOTOS_POR_DEMANDA} enviada(s)).`}
          </div>
          {enviando && (
            <div className="mt-2">
              <progress
                className="w-100"
                max="100"
                value={progresso}
                aria-label="Progresso do envio da foto"
              />
            </div>
          )}
          {erroUpload && (
            <div className="alert alert-danger py-2 small mt-2 mb-0" role="alert">
              {erroUpload}
            </div>
          )}
        </div>
      )}

      {fotos.error ? (
        <ErrorState
          title="Não foi possível carregar as fotos"
          message={mensagemDeErro(fotos.error)}
          onRetry={fotos.recarregar}
        />
      ) : !fotos.data ? (
        <Loading message="Carregando fotos..." />
      ) : lista.length === 0 ? (
        <p className="text-body-secondary mb-0">Nenhuma foto de evidência enviada.</p>
      ) : (
        <ul className="list-group list-group-flush" aria-label="Fotos da fiscalização">
          {lista.map((foto) => {
            const distancia = formatarDistanciaKm(foto.distanciaKm);
            const podeExcluir = podeExcluirFoto(usuario, demanda, foto);
            const confirmandoEsta = emModal && confirmandoInline?.id === foto.id;

            return (
              <li key={foto.id} className="list-group-item px-0">
                <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                  <div className="min-w-0">
                    <div className="d-flex align-items-center flex-wrap gap-2">
                      <strong className="text-break">{foto.nomeOriginal}</strong>
                      <SeloExif conferencia={foto.conferencia} />
                      {distancia && <span className="small text-body-secondary">{distancia}</span>}
                    </div>
                    <div className="small text-body-secondary mt-1">
                      {formatarTamanho(foto.tamanho)} · {foto.mime} · Enviada por{' '}
                      {foto.autor?.nome ?? '—'} em {formatarData(foto.criadoEm)}
                    </div>
                    <div className="small text-body-secondary">
                      Captura (EXIF): {formatarDataHoraExif(foto.exifDataHora)}
                      {foto.exifLatitude != null && foto.exifLongitude != null && (
                        <>
                          {' '}
                          · GPS: {Number(foto.exifLatitude).toFixed(5)},{' '}
                          {Number(foto.exifLongitude).toFixed(5)}
                        </>
                      )}
                      {foto.sha256 && (
                        <>
                          {' '}
                          · SHA-256: <code title={foto.sha256}>{foto.sha256.slice(0, 12)}…</code>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="d-flex flex-wrap gap-2 flex-shrink-0">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      disabled={carregandoPreviaId === foto.id}
                      aria-label={`Visualizar ${foto.nomeOriginal}`}
                      onClick={() => visualizar(foto)}
                    >
                      {carregandoPreviaId === foto.id
                        ? 'Abrindo…'
                        : previa?.foto.id === foto.id
                          ? 'Ocultar'
                          : 'Visualizar'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      disabled={baixandoId === foto.id}
                      aria-label={`Baixar ${foto.nomeOriginal}`}
                      onClick={() => baixar(foto)}
                    >
                      {baixandoId === foto.id ? 'Baixando…' : 'Baixar'}
                    </button>
                    {podeExcluir && !confirmandoEsta && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        disabled={removendo}
                        aria-label={`Excluir ${foto.nomeOriginal}`}
                        onClick={() => (emModal ? setConfirmandoInline(foto) : setExcluindo(foto))}
                      >
                        Excluir
                      </button>
                    )}
                    {confirmandoEsta && (
                      <div className="d-flex align-items-center gap-1">
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          disabled={removendo}
                          onClick={() => confirmarExclusao(foto)}
                        >
                          {removendo ? 'Excluindo…' : 'Confirmar exclusão'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          disabled={removendo}
                          onClick={() => setConfirmandoInline(null)}
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {previa && (
        <figure className="mt-3 p-2 border rounded bg-light mb-0">
          <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
            <figcaption className="small fw-semibold text-break mb-0">
              Pré-visualização: {previa.foto.nomeOriginal}
            </figcaption>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={fecharPrevia}
            >
              Fechar prévia
            </button>
          </div>
          <img
            src={previa.url}
            alt={`Foto de evidência ${previa.foto.nomeOriginal}`}
            className="img-fluid rounded"
            style={{ maxHeight: '320px' }}
          />
        </figure>
      )}

      {!emModal && (
        <ConfirmDialog
          show={Boolean(excluindo)}
          title="Excluir foto de evidência"
          message={`Deseja excluir a foto "${excluindo?.nomeOriginal}"? Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir foto"
          variant="danger"
          busy={removendo}
          onConfirm={() => confirmarExclusao(excluindo)}
          onCancel={() => setExcluindo(null)}
        />
      )}
    </div>
  );
}
