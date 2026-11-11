import { useState } from 'react';
import { mensagemDeErro } from '../../api/httpClient.js';
import Modal from '../../components/Modal.jsx';
import { hojeISO } from '../../utils/datas.js';

/**
 * Modal de formulário genérico das ações de fluxo. `campos`: `[{ nome, rotulo, tipo?, obrigatorio?,
 * max?, linhas?, futuro? }]` (tipo `textarea` por padrão ou `date`; `futuro: false` impede datas
 * futuras). Validação local + erros 400 por campo e 409/403 da API exibidos sem fechar o modal.
 */
export default function FormularioModal({
  titulo,
  rotuloFormulario,
  ajuda,
  aviso,
  campos,
  rotuloEnviar,
  variante = 'primary',
  mensagemSucesso,
  mensagemFalha,
  enviar,
  onClose,
  onSucesso,
}) {
  const hoje = hojeISO();
  const [valores, setValores] = useState(() =>
    Object.fromEntries(campos.map((c) => [c.nome, c.tipo === 'date' ? hoje : ''])),
  );
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState(null);
  const [enviando, setEnviando] = useState(false);

  async function submeter(event) {
    event.preventDefault();
    if (enviando) return;
    const encontrados = {};
    for (const c of campos) {
      const valor = valores[c.nome].trim();
      if (c.obrigatorio && !valor) encontrados[c.nome] = `Informe ${c.rotulo.toLowerCase()}.`;
      else if (c.tipo === 'date' && c.futuro === false && valor > hoje)
        encontrados[c.nome] = 'A data não pode ser futura.';
      else if (c.max && valor.length > c.max)
        encontrados[c.nome] = `Máximo de ${c.max} caracteres.`;
    }
    setErros(encontrados);
    setErroGeral(null);
    if (Object.keys(encontrados).length > 0) return;

    setEnviando(true);
    try {
      const corpo = Object.fromEntries(campos.map((c) => [c.nome, valores[c.nome].trim() || null]));
      await enviar(corpo);
      await onSucesso(mensagemSucesso);
    } catch (erro) {
      const doBackend = {};
      for (const { campo, mensagem } of erro.response?.data?.errors ?? []) {
        if (!(campo in doBackend)) doBackend[campo] = mensagem;
      }
      if (erro.response?.status === 400 && Object.keys(doBackend).length > 0) setErros(doBackend);
      else if (erro.response?.status === 403)
        setErroGeral('Seu perfil não tem permissão para esta operação.');
      else setErroGeral(mensagemDeErro(erro, mensagemFalha));
      setEnviando(false);
    }
  }

  return (
    <Modal title={titulo} onClose={onClose} busy={enviando}>
      <form noValidate onSubmit={submeter} aria-label={rotuloFormulario ?? titulo}>
        <div className="modal-body">
          {ajuda && <p className="text-body-secondary">{ajuda}</p>}
          {aviso && (
            <div className="alert alert-info py-2 small" role="note">
              {aviso}
            </div>
          )}
          {erroGeral && (
            <div className="alert alert-danger" role="alert">
              {erroGeral}
            </div>
          )}
          {campos.map((c) => {
            const id = `fx-${c.nome}`;
            const classe = `form-control${erros[c.nome] ? ' is-invalid' : ''}`;
            const comum = {
              id,
              className: classe,
              value: valores[c.nome],
              'aria-invalid': erros[c.nome] ? 'true' : undefined,
              onChange: (e) => setValores({ ...valores, [c.nome]: e.target.value }),
            };
            return (
              <div className="mb-3" key={c.nome}>
                <label htmlFor={id} className="form-label">
                  {c.rotulo}
                  {c.obrigatorio ? ' *' : ''}
                </label>
                {c.tipo === 'date' ? (
                  <input type="date" max={c.futuro === false ? hoje : undefined} {...comum} />
                ) : (
                  <textarea rows={c.linhas ?? 3} {...comum} />
                )}
                {erros[c.nome] && <div className="invalid-feedback">{erros[c.nome]}</div>}
              </div>
            );
          })}
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
          <button type="submit" className={`btn btn-${variante}`} disabled={enviando}>
            {enviando && (
              <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
            )}
            {rotuloEnviar}
          </button>
        </div>
      </form>
    </Modal>
  );
}
