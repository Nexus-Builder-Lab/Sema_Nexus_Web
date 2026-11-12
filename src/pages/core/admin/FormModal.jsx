import { useState } from 'react';
import { mensagemDeErro } from '../../../api/httpClient.js';
import Modal from '../../../components/Modal.jsx';
import { errosDoBackend } from './validarAdmin.js';

/**
 * Casca de modal de formulário da administração: validação local, envio, erros por campo da API
 * (400) e erro geral (409/403/rede). `children(ctx)` recebe `{ erros, classe, campoErro, enviando }`.
 */
export default function FormModal({
  title,
  submitLabel = 'Salvar',
  validar,
  onSubmit,
  onClose,
  children,
}) {
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(event) {
    event.preventDefault();
    if (enviando) return;
    const encontrados = validar();
    setErros(encontrados);
    setErroGeral(null);
    if (Object.keys(encontrados).length > 0) return;
    setEnviando(true);
    try {
      await onSubmit();
    } catch (erro) {
      const doBackend = errosDoBackend(erro);
      if (Object.keys(doBackend).length > 0) setErros(doBackend);
      else setErroGeral(mensagemDeErro(erro, 'Não foi possível salvar.'));
      setEnviando(false);
    }
  }

  const classe = (campo, base = 'form-control') => `${base}${erros[campo] ? ' is-invalid' : ''}`;
  const campoErro = (campo) =>
    erros[campo] && <div className="invalid-feedback">{erros[campo]}</div>;

  return (
    <Modal title={title} onClose={onClose} busy={enviando}>
      <form noValidate onSubmit={enviar} aria-label={title}>
        <div className="modal-body">
          {erroGeral && (
            <div className="alert alert-danger" role="alert">
              {erroGeral}
            </div>
          )}
          {children({ erros, classe, campoErro, enviando })}
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
            {submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
