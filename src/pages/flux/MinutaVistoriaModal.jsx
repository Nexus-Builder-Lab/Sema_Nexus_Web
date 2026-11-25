import { useEffect, useRef, useState } from 'react';
import { gerarMinutaVistoria } from '../../api/demandasApi.js';
import { enviarDocumento, vincularDocumento } from '../../api/documentosApi.js';
import { mensagemDeErro } from '../../api/httpClient.js';
import Loading from '../../components/Loading.jsx';
import Modal from '../../components/Modal.jsx';
import { hojeISO } from '../../utils/datas.js';
import { rotuloModo } from './agenteTriagem.js';
import MarkdownSeguro from './MarkdownSeguro.jsx';

export const AVISO_MINUTA = 'MINUTA GERADA PARA REVISÃO HUMANA — AMBIENTE DEMONSTRATIVO';

function erroDaMinuta(e) {
  const status = e.response?.status;
  if (status === 403) return 'Seu perfil não tem permissão para gerar a minuta desta demanda.';
  if (status === 404) return 'Demanda não encontrada.';
  if (status === 429) return 'Muitas solicitações ao agente. Aguarde um instante e tente de novo.';
  return mensagemDeErro(e, 'Não foi possível gerar a minuta.');
}

/**
 * Minuta de relatório de vistoria (API#137): gera o rascunho, deixa a pessoa editar e, só após
 * confirmação explícita em duas etapas, envia como documento .md vinculado à demanda. Nunca salva
 * sozinho; respostas de pedidos antigos são descartadas.
 */
export default function MinutaVistoriaModal({ demanda, onClose, onSucesso }) {
  const [fase, setFase] = useState('gerando'); // gerando | editando | confirmando | enviando
  const [minuta, setMinuta] = useState(null);
  const [texto, setTexto] = useState('');
  const [titulo, setTitulo] = useState(`Minuta de relatório — ${demanda.numero}`);
  const [previa, setPrevia] = useState(false);
  const [erro, setErro] = useState(null);
  const [erroEnvio, setErroEnvio] = useState(null);
  const [docCriado, setDocCriado] = useState(false);
  const pedidoAtual = useRef(0);
  const enviado = useRef(null); // documento já criado (para repetir só o vínculo)

  async function gerar() {
    pedidoAtual.current += 1;
    const pedido = pedidoAtual.current;
    setFase('gerando');
    setErro(null);
    try {
      const r = await gerarMinutaVistoria(demanda.id);
      if (pedido !== pedidoAtual.current) return;
      setMinuta(r);
      setTexto(r.markdown ?? '');
      setFase('editando');
    } catch (e) {
      if (pedido !== pedidoAtual.current) return;
      setErro(erroDaMinuta(e));
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    gerar();
    return () => {
      pedidoAtual.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tituloValido = titulo.trim().length >= 3 && titulo.trim().length <= 200;
  const textoValido = texto.trim().length > 0;
  const ocupado = fase === 'enviando';

  async function enviar() {
    setFase('enviando');
    setErroEnvio(null);
    try {
      if (!enviado.current) {
        const arquivo = new File([texto], minuta?.nomeArquivoSugerido || 'minuta-vistoria.md', {
          type: 'text/markdown',
        });
        enviado.current = await enviarDocumento(
          {
            titulo: titulo.trim(),
            categoria: 'Relatório técnico',
            tipo: 'Minuta de relatório',
            dataDocumento: hojeISO(),
            palavrasChave: ['minuta', 'vistoria'],
          },
          arquivo,
        );
        setDocCriado(true);
      }
      try {
        await vincularDocumento(demanda.id, enviado.current.id);
      } catch (e) {
        if (e.response?.status !== 409) throw e;
      }
      onSucesso('Minuta enviada como documento e vinculada à demanda.');
    } catch (e) {
      setErroEnvio(
        enviado.current
          ? `Documento enviado, mas o vínculo à demanda falhou: ${mensagemDeErro(e)}`
          : mensagemDeErro(e, 'Não foi possível enviar a minuta.'),
      );
      setFase('confirmando');
    }
  }

  return (
    <Modal title="Minuta de relatório de vistoria" onClose={onClose} busy={ocupado}>
      <div className="modal-body">
        <p className="fw-semibold text-warning-emphasis mb-2" role="note">
          {AVISO_MINUTA}
        </p>
        {fase === 'gerando' && !erro && (
          <Loading message="Gerando a minuta... A primeira chamada da IA pode levar de 30 a 50 segundos." />
        )}
        {erro && (
          <div className="alert alert-danger" role="alert">
            {erro}
            <div className="mt-2">
              <button type="button" className="btn btn-sm btn-outline-danger" onClick={gerar}>
                Tentar de novo
              </button>
            </div>
          </div>
        )}
        {minuta && fase !== 'gerando' && (
          <>
            <p className="mb-2">
              <span className="nx-badge nx-badge-blue me-2">{rotuloModo(minuta)}</span>
              <span className="small text-body-secondary">
                Rascunho: nada foi salvo. Revise e edite à vontade.
              </span>
            </p>
            {(minuta.avisos ?? []).length > 0 && (
              <ul className="small text-body-secondary" aria-label="Avisos do agente">
                {minuta.avisos.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            )}
            {fase === 'editando' && (
              <>
                <div className="d-flex gap-2 mb-2" role="group" aria-label="Modo de exibição">
                  <button
                    type="button"
                    className={`btn btn-sm ${previa ? 'btn-outline-secondary' : 'btn-secondary'}`}
                    aria-pressed={!previa}
                    onClick={() => setPrevia(false)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${previa ? 'btn-secondary' : 'btn-outline-secondary'}`}
                    aria-pressed={previa}
                    onClick={() => setPrevia(true)}
                  >
                    Pré-visualizar
                  </button>
                </div>
                {previa ? (
                  <div className="border rounded p-3" aria-label="Pré-visualização da minuta">
                    <MarkdownSeguro texto={texto} />
                  </div>
                ) : (
                  <>
                    <label htmlFor="minuta-texto" className="form-label">
                      Texto da minuta (Markdown)
                    </label>
                    <textarea
                      id="minuta-texto"
                      className="form-control font-monospace"
                      rows={16}
                      value={texto}
                      onChange={(e) => setTexto(e.target.value)}
                    />
                  </>
                )}
              </>
            )}
            {(fase === 'confirmando' || fase === 'enviando') && (
              <div className="border rounded p-3" role="group" aria-label="Confirmar envio">
                <p className="mb-2">
                  Enviar a minuta revisada como novo documento (.md) e vincular à demanda{' '}
                  <strong>{demanda.numero}</strong>? Nada é salvo antes desta confirmação.
                </p>
                <label htmlFor="minuta-titulo" className="form-label">
                  Título do documento
                </label>
                <input
                  id="minuta-titulo"
                  className="form-control mb-2"
                  value={titulo}
                  maxLength={200}
                  disabled={ocupado || docCriado}
                  onChange={(e) => setTitulo(e.target.value)}
                />
                <p className="small text-body-secondary mb-0">
                  Categoria: Relatório técnico · Tipo: Minuta de relatório · Data: {hojeISO()}
                </p>
                {erroEnvio && (
                  <div className="alert alert-danger mt-2 mb-0" role="alert">
                    {erroEnvio}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
      <div className="modal-footer flex-wrap">
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={onClose}
          disabled={ocupado}
        >
          {fase === 'editando' ? 'Descartar' : 'Fechar'}
        </button>
        {fase === 'editando' && (
          <button
            type="button"
            className="btn btn-primary"
            disabled={!textoValido}
            onClick={() => setFase('confirmando')}
          >
            Enviar como documento
          </button>
        )}
        {(fase === 'confirmando' || fase === 'enviando') && (
          <>
            <button
              type="button"
              className="btn btn-outline-secondary"
              disabled={ocupado}
              onClick={() => setFase('editando')}
            >
              Voltar à edição
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={ocupado || !tituloValido}
              onClick={enviar}
            >
              {ocupado ? 'Enviando...' : 'Confirmar envio'}
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}
