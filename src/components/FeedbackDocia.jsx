import { useState } from 'react';
import { avaliarResposta } from '../api/assistenteApi.js';
import { mensagemDeErro } from '../api/httpClient.js';
import Icon from './Icon.jsx';

const OPCOES = [
  { valor: 'UTIL', rotulo: 'Útil', icone: 'thumbsUp' },
  { valor: 'IMPRECISA', rotulo: 'Imprecisa', icone: 'thumbsDown' },
];

function mensagemErroAvaliacao(error) {
  const status = error?.response?.status;
  if (status === 403) return 'Você não tem permissão para avaliar esta resposta.';
  if (status === 404) return 'Resposta não encontrada ou pertence a outro usuário.';
  return mensagemDeErro(error, 'Não foi possível registrar sua avaliação.');
}

/**
 * Feedback opcional (`UTIL` / `IMPRECISA`) nas respostas do Assistente DocIA com `execucaoId`.
 * Pode ser alterado depois; não bloqueia a leitura da resposta.
 */
export default function FeedbackDocia({ execucaoId }) {
  const [selecionado, setSelecionado] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);

  if (!execucaoId) return null;

  async function enviar(valor) {
    if (enviando || selecionado === valor) return;
    setEnviando(true);
    setErro(null);
    try {
      await avaliarResposta(execucaoId, valor);
      setSelecionado(valor);
    } catch (e) {
      setErro(mensagemErroAvaliacao(e));
    } finally {
      setEnviando(false);
    }
  }

  const rotuloAtual = OPCOES.find((o) => o.valor === selecionado)?.rotulo;

  return (
    <div
      className="border-top pt-2 mt-2 d-flex flex-wrap align-items-center gap-2"
      data-testid="feedback-docia"
    >
      <span className="small text-body-secondary">Esta resposta foi útil?</span>
      <div className="btn-group btn-group-sm" role="group" aria-label="Avaliar resposta">
        {OPCOES.map((op) => {
          const ativo = selecionado === op.valor;
          return (
            <button
              key={op.valor}
              type="button"
              className={`btn ${ativo ? 'btn-success' : 'btn-outline-secondary'}`}
              aria-pressed={ativo}
              disabled={enviando}
              onClick={() => enviar(op.valor)}
            >
              <Icon name={op.icone} size={13} className="me-1" />
              {op.rotulo}
            </button>
          );
        })}
      </div>
      {enviando && (
        <span className="small text-body-secondary" role="status">
          Registrando avaliação…
        </span>
      )}
      {!enviando && rotuloAtual && !erro && (
        <span className="small text-success" role="status" data-testid="feedback-confirmado">
          Avaliação registrada: {rotuloAtual}.
        </span>
      )}
      {erro && (
        <span className="small text-danger" role="alert" data-testid="feedback-erro">
          {erro}
        </span>
      )}
    </div>
  );
}
