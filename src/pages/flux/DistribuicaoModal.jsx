import { useCallback, useState } from 'react';
import { listarEquipes, listarMembros } from '../../api/catalogosApi.js';
import { distribuirDemanda } from '../../api/demandasApi.js';
import { mensagemDeErro } from '../../api/httpClient.js';
import { podeDistribuir } from '../../auth/perfis.js';
import { useAuth } from '../../auth/useAuth.js';
import ErrorState from '../../components/ErrorState.jsx';
import Loading from '../../components/Loading.jsx';
import Modal from '../../components/Modal.jsx';
import useCarregar from '../../hooks/useCarregar.js';
import { hojeISO } from '../../utils/datas.js';
import AgenteDistribuicaoCard from './AgenteDistribuicaoCard.jsx';

/**
 * Modal de distribuição: equipe → fiscais da equipe (apenas membros FISCAL ativos), prazo e
 * observações. Os fiscais só são carregados e listados depois de escolher a equipe.
 */
export default function DistribuicaoModal({ demanda, onClose, onSucesso }) {
  const { usuario } = useAuth();
  const equipes = useCarregar(listarEquipes);
  const [equipeId, setEquipeId] = useState('');
  const [fiscalId, setFiscalId] = useState('');
  const [prazo, setPrazo] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const hoje = hojeISO();

  const carregarMembros = useCallback(
    () => (equipeId ? listarMembros(equipeId) : Promise.resolve([])),
    [equipeId],
  );
  const membros = useCarregar(carregarMembros);
  const fiscais = (membros.data ?? []).filter((m) => m.perfil === 'FISCAL' && m.ativo !== false);

  function escolherEquipe(valor) {
    setEquipeId(valor);
    setFiscalId('');
  }

  // Só preenche o formulário; a confirmação (e a validação) continuam no envio.
  function aplicarSugestao({ equipeId: eq, fiscalId: fi, prazo: pz }) {
    if (eq) setEquipeId(eq);
    if (fi) setFiscalId(fi);
    if (pz) setPrazo(pz);
    setErros({});
  }

  async function enviar(event) {
    event.preventDefault();
    if (enviando) return;
    const encontrados = {};
    if (!equipeId) encontrados.equipeId = 'Selecione a equipe.';
    if (!fiscalId) encontrados.fiscalId = 'Selecione o fiscal.';
    if (!prazo) encontrados.prazo = 'Informe o prazo.';
    else if (prazo < hoje) encontrados.prazo = 'O prazo não pode ser anterior a hoje.';
    if (observacoes.length > 2000) encontrados.observacoes = 'Máximo de 2000 caracteres.';
    setErros(encontrados);
    setErroGeral(null);
    if (Object.keys(encontrados).length > 0) return;

    setEnviando(true);
    try {
      await distribuirDemanda(demanda.id, {
        equipeId: Number(equipeId),
        fiscalId: Number(fiscalId),
        prazo,
        observacoes: observacoes.trim() || null,
      });
      await onSucesso('Demanda distribuída com sucesso.');
    } catch (erro) {
      const doBackend = {};
      for (const { campo, mensagem } of erro.response?.data?.errors ?? []) {
        if (!(campo in doBackend)) doBackend[campo] = mensagem;
      }
      if (erro.response?.status === 400 && Object.keys(doBackend).length > 0) setErros(doBackend);
      else setErroGeral(mensagemDeErro(erro, 'Não foi possível distribuir a demanda.'));
      setEnviando(false);
    }
  }

  const classe = (campo, base = 'form-control') => `${base}${erros[campo] ? ' is-invalid' : ''}`;
  const campoErro = (campo) =>
    erros[campo] && <div className="invalid-feedback">{erros[campo]}</div>;

  let textoFiscal = 'Selecione';
  if (!equipeId) textoFiscal = 'Selecione a equipe primeiro';
  else if (membros.loading) textoFiscal = 'Carregando fiscais...';
  else if (fiscais.length === 0) textoFiscal = 'Nenhum fiscal nesta equipe';

  let corpo;
  if (equipes.error) {
    corpo = (
      <div className="modal-body">
        <ErrorState
          title="Não foi possível carregar as equipes"
          message={mensagemDeErro(equipes.error)}
          onRetry={equipes.recarregar}
        />
      </div>
    );
  } else if (equipes.loading) {
    corpo = (
      <div className="modal-body">
        <Loading message="Carregando equipes..." />
      </div>
    );
  } else {
    corpo = (
      <form noValidate onSubmit={enviar} aria-label="Distribuir demanda">
        <div className="modal-body">
          {erroGeral && (
            <div className="alert alert-danger" role="alert">
              {erroGeral}
            </div>
          )}
          {podeDistribuir(usuario) && (
            <AgenteDistribuicaoCard demandaId={demanda.id} onAplicar={aplicarSugestao} />
          )}
          <div className="mb-3">
            <label htmlFor="dist-equipe" className="form-label">
              Equipe *
            </label>
            <select
              id="dist-equipe"
              className={classe('equipeId', 'form-select')}
              value={equipeId}
              onChange={(e) => escolherEquipe(e.target.value)}
              aria-invalid={erros.equipeId ? 'true' : undefined}
            >
              <option value="">Selecione</option>
              {equipes.data
                .filter((e) => e.ativo !== false)
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nome}
                  </option>
                ))}
            </select>
            {campoErro('equipeId')}
          </div>
          <div className="mb-3">
            <label htmlFor="dist-fiscal" className="form-label">
              Fiscal *
            </label>
            <select
              id="dist-fiscal"
              className={classe('fiscalId', 'form-select')}
              value={fiscalId}
              onChange={(e) => setFiscalId(e.target.value)}
              disabled={!equipeId || membros.loading}
              aria-invalid={erros.fiscalId ? 'true' : undefined}
            >
              <option value="">{textoFiscal}</option>
              {fiscais.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
            {campoErro('fiscalId')}
            {membros.error && (
              <div className="text-danger small mt-1" role="alert">
                {mensagemDeErro(membros.error, 'Não foi possível carregar os fiscais.')}
              </div>
            )}
          </div>
          <div className="mb-3">
            <label htmlFor="dist-prazo" className="form-label">
              Prazo *
            </label>
            <input
              id="dist-prazo"
              type="date"
              min={hoje}
              className={classe('prazo')}
              value={prazo}
              onChange={(e) => setPrazo(e.target.value)}
              aria-invalid={erros.prazo ? 'true' : undefined}
            />
            {campoErro('prazo')}
          </div>
          <div className="mb-1">
            <label htmlFor="dist-obs" className="form-label">
              Observações
            </label>
            <textarea
              id="dist-obs"
              rows={3}
              className={classe('observacoes')}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
            {campoErro('observacoes')}
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
            Distribuir
          </button>
        </div>
      </form>
    );
  }

  return (
    <Modal title={`Distribuir ${demanda.numero}`} onClose={onClose} busy={enviando}>
      {corpo}
    </Modal>
  );
}
