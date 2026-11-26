import { useState } from 'react';
import { listarChecklists, registrarFiscalizacao } from '../../api/demandasApi.js';
import { mensagemDeErro } from '../../api/httpClient.js';
import Modal from '../../components/Modal.jsx';
import useCarregar from '../../hooks/useCarregar.js';
import { hojeISO } from '../../utils/datas.js';
import ChecklistFiscalizacaoFields from './ChecklistFiscalizacaoFields.jsx';
import {
  checklistTemResposta,
  respostasIniciaisChecklist,
  validarENormalizarChecklist,
} from './fiscalizacaoChecklist.js';
import FotosFiscalizacao from './FotosFiscalizacao.jsx';

export const AVISO_FISCALIZACAO = 'Não gera auto de infração nem substitui sistemas oficiais.';

const CAMPOS = [
  { nome: 'data', rotulo: 'Data da fiscalização', tipo: 'date', obrigatorio: true, futuro: false },
  { nome: 'atividades', rotulo: 'Atividades realizadas', obrigatorio: true, max: 4000 },
  { nome: 'resultado', rotulo: 'Resultado', obrigatorio: true, max: 4000 },
  { nome: 'evidencias', rotulo: 'Evidências (fictícias, em texto)', obrigatorio: true, max: 4000 },
  { nome: 'recomendacoes', rotulo: 'Recomendações', max: 4000 },
];

/**
 * Registro da fiscalização (EM_ANDAMENTO → AGUARDANDO_CONCLUSAO), com checklist estruturado por
 * categoria (preservado no reenvio quando não alterado) e upload de fotos demonstrativas.
 */
export default function FiscalizacaoModal({ demanda, onClose, onSucesso, onFotosAlteradas }) {
  const hoje = hojeISO();
  const anterior = demanda.fiscalizacao;
  const preservadoAnterior = Boolean(anterior?.checklist);

  const [valores, setValores] = useState(() => ({
    data: anterior?.data || hoje,
    atividades: anterior?.atividades || '',
    resultado: anterior?.resultado || '',
    evidencias: anterior?.evidencias || '',
    recomendacoes: anterior?.recomendacoes || '',
  }));
  const [respostasUsuario, setRespostasUsuario] = useState(null);
  const [checklistAlterado, setChecklistAlterado] = useState(false);
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [enviandoFoto, setEnviandoFoto] = useState(false);

  const checklists = useCarregar(listarChecklists);
  const modelo = checklists.data?.find((m) => m.categoria === demanda.categoria) ?? null;
  const respostasChecklist =
    respostasUsuario ?? respostasIniciaisChecklist(modelo, anterior?.checklist);

  function alterarChecklist(itemId, valor) {
    setRespostasUsuario((atual) => ({
      ...(atual ?? respostasIniciaisChecklist(modelo, anterior?.checklist)),
      [itemId]: valor,
    }));
    setChecklistAlterado(true);
    setErros((atual) => {
      const chave = `checklist.${itemId}`;
      if (!(chave in atual)) return atual;
      const copia = { ...atual };
      delete copia[chave];
      return copia;
    });
  }

  function limparChecklist() {
    setRespostasUsuario(null);
    setChecklistAlterado(false);
    setErros((atual) =>
      Object.fromEntries(Object.entries(atual).filter(([k]) => !k.startsWith('checklist.'))),
    );
  }

  async function submeter(event) {
    event.preventDefault();
    if (enviando || enviandoFoto) return;

    const encontrados = {};
    for (const c of CAMPOS) {
      const valor = String(valores[c.nome] ?? '').trim();
      if (c.obrigatorio && !valor) encontrados[c.nome] = `Informe ${c.rotulo.toLowerCase()}.`;
      else if (c.tipo === 'date' && c.futuro === false && valor > hoje)
        encontrados[c.nome] = 'A data não pode ser futura.';
      else if (c.max && valor.length > c.max)
        encontrados[c.nome] = `Máximo de ${c.max} caracteres.`;
    }

    let payloadChecklist;
    const deveEnviarChecklist =
      Boolean(modelo) &&
      checklistAlterado &&
      (preservadoAnterior || checklistTemResposta(modelo, respostasChecklist));

    if (deveEnviarChecklist) {
      const { erros: errosChk, checklist } = validarENormalizarChecklist(
        modelo,
        respostasChecklist,
      );
      Object.assign(encontrados, errosChk);
      payloadChecklist = checklist;
    }

    setErros(encontrados);
    setErroGeral(null);
    if (Object.keys(encontrados).length > 0) return;

    setEnviando(true);
    try {
      const corpo = Object.fromEntries(
        CAMPOS.map((c) => [c.nome, String(valores[c.nome] ?? '').trim() || null]),
      );
      if (deveEnviarChecklist) {
        corpo.checklist = payloadChecklist;
      }
      await registrarFiscalizacao(demanda.id, corpo);
      await onSucesso('Fiscalização registrada com sucesso.');
    } catch (erro) {
      const doBackend = {};
      let erroChecklistRaiz = null;
      for (const { campo, mensagem } of erro.response?.data?.errors ?? []) {
        if (campo === 'checklist') {
          erroChecklistRaiz ??= mensagem;
        } else if (!(campo in doBackend)) {
          doBackend[campo] = mensagem;
        }
      }
      if (
        erro.response?.status === 400 &&
        (Object.keys(doBackend).length > 0 || erroChecklistRaiz)
      ) {
        setErros(doBackend);
        if (erroChecklistRaiz) setErroGeral(erroChecklistRaiz);
      } else if (erro.response?.status === 403)
        setErroGeral('Seu perfil não tem permissão para esta operação.');
      else setErroGeral(mensagemDeErro(erro, 'Não foi possível registrar a fiscalização.'));
      setEnviando(false);
    }
  }

  const ocupado = enviando || enviandoFoto;

  return (
    <Modal
      title={`Registrar fiscalização — ${demanda.numero}`}
      onClose={onClose}
      busy={ocupado}
      size="modal-lg"
    >
      <form noValidate onSubmit={submeter} aria-label="Registrar fiscalização">
        <div className="modal-body">
          <p className="text-body-secondary">
            {`Equipe: ${demanda.equipe?.nome ?? '—'}. Após o registro, a demanda aguarda a conclusão.`}
          </p>
          <div className="alert alert-info py-2 small" role="note">
            {AVISO_FISCALIZACAO}
          </div>
          {erroGeral && (
            <div className="alert alert-danger" role="alert">
              {erroGeral}
            </div>
          )}

          {CAMPOS.map((c) => {
            const id = `fx-${c.nome}`;
            const erroId = `${id}-erro`;
            const classe = `form-control${erros[c.nome] ? ' is-invalid' : ''}`;
            const comum = {
              id,
              name: c.nome,
              className: classe,
              value: valores[c.nome],
              'aria-invalid': erros[c.nome] ? 'true' : undefined,
              'aria-describedby': erros[c.nome] ? erroId : undefined,
              onChange: (e) => setValores({ ...valores, [c.nome]: e.target.value }),
            };
            return (
              <div className="mb-3" key={c.nome}>
                <label htmlFor={id} className="form-label">
                  {c.rotulo}
                  {c.obrigatorio ? ' *' : ''}
                </label>
                {c.tipo === 'date' ? (
                  <input type="date" max={hoje} {...comum} />
                ) : (
                  <textarea rows={3} {...comum} />
                )}
                {erros[c.nome] && (
                  <div id={erroId} className="invalid-feedback">
                    {erros[c.nome]}
                  </div>
                )}
              </div>
            );
          })}

          {!demanda.categoria ? (
            <p className="small text-body-secondary mb-3">
              Demanda sem categoria definida — nenhum checklist específico aplicável.
            </p>
          ) : checklists.error ? (
            <div className="alert alert-warning py-2 small" role="status">
              Não foi possível carregar o modelo de checklist; você ainda pode registrar a
              fiscalização{preservadoAnterior ? ' preservando o checklist anterior' : ''}.
            </div>
          ) : modelo ? (
            <ChecklistFiscalizacaoFields
              modelo={modelo}
              valores={respostasChecklist}
              erros={erros}
              preservadoAnterior={preservadoAnterior}
              alterado={checklistAlterado}
              onChange={alterarChecklist}
              onLimpar={limparChecklist}
            />
          ) : null}

          <fieldset className="border rounded p-3 mb-0">
            <legend className="float-none w-auto px-2 fs-6 fw-semibold mb-1">
              Fotos de evidência (demonstrativas)
            </legend>
            <FotosFiscalizacao
              demanda={demanda}
              emModal
              onAlterado={onFotosAlteradas}
              onUploadEstadoChange={setEnviandoFoto}
            />
          </fieldset>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={onClose}
            disabled={ocupado}
          >
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={ocupado}>
            {enviando && (
              <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
            )}
            Registrar fiscalização
          </button>
        </div>
      </form>
    </Modal>
  );
}
