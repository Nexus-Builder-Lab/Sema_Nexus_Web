import { useState } from 'react';
import { decidirTriagem } from '../../api/demandasApi.js';
import { mensagemDeErro } from '../../api/httpClient.js';
import Modal from '../../components/Modal.jsx';
import AgenteTriagemCard from './AgenteTriagemCard.jsx';

const TEXTOS = {
  CLASSIFICAR: {
    titulo: 'Concluir triagem',
    confirmar: 'Concluir triagem',
    ajuda: 'A demanda será classificada e seguirá para Aguardando distribuição.',
  },
  SOLICITAR_COMPLEMENTACAO: {
    titulo: 'Solicitar complementação',
    confirmar: 'Solicitar complementação',
    ajuda: 'A demanda volta para Pendente até que as informações sejam complementadas.',
  },
};

/**
 * Modal de triagem. `decisao`: CLASSIFICAR (categoria, prioridade e justificativa) ou
 * SOLICITAR_COMPLEMENTACAO (só justificativa). Erros 400 por campo e 409 aparecem no modal.
 */
export default function TriagemModal({ demanda, decisao, catalogos, onClose, onSucesso }) {
  const classificar = decisao === 'CLASSIFICAR';
  const textos = TEXTOS[decisao];
  const [categoria, setCategoria] = useState(demanda.categoria ?? '');
  const [prioridade, setPrioridade] = useState(demanda.prioridade ?? '');
  const [justificativa, setJustificativa] = useState('');
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(event) {
    event.preventDefault();
    if (enviando) return;
    const encontrados = {};
    if (classificar && !categoria) encontrados.categoria = 'Informe a categoria.';
    if (classificar && !prioridade) encontrados.prioridade = 'Informe a prioridade.';
    if (!justificativa.trim()) encontrados.justificativa = 'Informe a justificativa.';
    else if (justificativa.length > 2000) encontrados.justificativa = 'Máximo de 2000 caracteres.';
    setErros(encontrados);
    setErroGeral(null);
    if (Object.keys(encontrados).length > 0) return;

    setEnviando(true);
    try {
      await decidirTriagem(demanda.id, {
        decisao,
        categoria: classificar ? categoria : null,
        prioridade: classificar ? prioridade : null,
        justificativa: justificativa.trim(),
      });
      await onSucesso(
        classificar ? 'Triagem concluída com sucesso.' : 'Complementação solicitada com sucesso.',
      );
    } catch (erro) {
      const doBackend = {};
      for (const { campo, mensagem } of erro.response?.data?.errors ?? []) {
        if (!(campo in doBackend)) doBackend[campo] = mensagem;
      }
      if (erro.response?.status === 400 && Object.keys(doBackend).length > 0) setErros(doBackend);
      else setErroGeral(mensagemDeErro(erro, 'Não foi possível registrar a triagem.'));
      setEnviando(false);
    }
  }

  // Sugestão do Agente de Triagem (Issue API#107): só preenche o formulário; a pessoa revisa e confirma.
  function aplicarSugestao({ categoria: c, prioridade: p, justificativa: j }) {
    if (classificar && c) setCategoria(c);
    if (classificar && p) setPrioridade(p);
    if (j) setJustificativa(j.slice(0, 2000));
    setErros({});
  }

  const campoErro = (campo) =>
    erros[campo] && <div className="invalid-feedback">{erros[campo]}</div>;
  const classe = (campo, base = 'form-control') => `${base}${erros[campo] ? ' is-invalid' : ''}`;

  return (
    <Modal title={textos.titulo} onClose={onClose} busy={enviando}>
      <form noValidate onSubmit={enviar} aria-label={textos.titulo}>
        <div className="modal-body">
          <p className="text-body-secondary">{textos.ajuda}</p>
          <AgenteTriagemCard
            demandaId={demanda.id}
            decisao={decisao}
            catalogos={catalogos}
            onAplicar={aplicarSugestao}
          />
          {erroGeral && (
            <div className="alert alert-danger" role="alert">
              {erroGeral}
            </div>
          )}
          {classificar && (
            <>
              <div className="mb-3">
                <label htmlFor="triagem-categoria" className="form-label">
                  Categoria *
                </label>
                <select
                  id="triagem-categoria"
                  className={classe('categoria', 'form-select')}
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  aria-invalid={erros.categoria ? 'true' : undefined}
                >
                  <option value="">Selecione</option>
                  {catalogos.categorias.map((c) => (
                    <option key={c.codigo} value={c.codigo}>
                      {c.rotulo}
                    </option>
                  ))}
                </select>
                {campoErro('categoria')}
              </div>
              <div className="mb-3">
                <label htmlFor="triagem-prioridade" className="form-label">
                  Prioridade *
                </label>
                <select
                  id="triagem-prioridade"
                  className={classe('prioridade', 'form-select')}
                  value={prioridade}
                  onChange={(e) => setPrioridade(e.target.value)}
                  aria-invalid={erros.prioridade ? 'true' : undefined}
                >
                  <option value="">Selecione</option>
                  {catalogos.prioridades.map((p) => (
                    <option key={p.codigo} value={p.codigo}>
                      {p.rotulo}
                    </option>
                  ))}
                </select>
                {campoErro('prioridade')}
              </div>
            </>
          )}
          <div className="mb-1">
            <label htmlFor="triagem-justificativa" className="form-label">
              Justificativa *
            </label>
            <textarea
              id="triagem-justificativa"
              rows={4}
              className={classe('justificativa')}
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              aria-invalid={erros.justificativa ? 'true' : undefined}
            />
            {campoErro('justificativa')}
          </div>
        </div>
        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={onClose}
            disabled={enviando}
          >
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={enviando}>
            {enviando && (
              <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
            )}
            {textos.confirmar}
          </button>
        </div>
      </form>
    </Modal>
  );
}
