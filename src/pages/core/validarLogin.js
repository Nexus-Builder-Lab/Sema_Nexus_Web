const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Validação de usabilidade do formulário; quem decide é a API. */
export function validarLogin({ email, senha }) {
  const erros = {};
  if (!email.trim()) erros.email = 'Informe o e-mail.';
  else if (email.trim().length > 254 || !EMAIL_RE.test(email.trim()))
    erros.email = 'Informe um e-mail válido.';
  if (!senha) erros.senha = 'Informe a senha.';
  else if (senha.length > 128) erros.senha = 'A senha deve ter no máximo 128 caracteres.';
  return erros;
}
