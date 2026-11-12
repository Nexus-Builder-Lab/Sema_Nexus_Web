// Validações de formulário da administração. A API valida de novo (400/409).

export const PERFIS = [
  { codigo: 'ADMIN', rotulo: 'Administrador' },
  { codigo: 'GESTOR', rotulo: 'Gestor' },
  { codigo: 'FISCAL', rotulo: 'Fiscal' },
  { codigo: 'ANALISTA', rotulo: 'Analista' },
  { codigo: 'CONSULTA', rotulo: 'Consulta' },
];

export const rotuloPerfil = (codigo) => PERFIS.find((p) => p.codigo === codigo)?.rotulo ?? codigo;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Senha: obrigatória no cadastro, opcional na edição (só redefine se preenchida); 8 a 72. */
export function validarUsuario({ nome, email, senha, perfil }, { criando }) {
  const erros = {};
  if (!nome.trim()) erros.nome = 'Informe o nome.';
  else if (nome.trim().length > 150) erros.nome = 'Máximo de 150 caracteres.';
  if (!email.trim()) erros.email = 'Informe o e-mail.';
  else if (!EMAIL.test(email.trim())) erros.email = 'Informe um e-mail válido.';
  if (!perfil) erros.perfil = 'Selecione o perfil.';
  if (criando && !senha) erros.senha = 'Informe a senha.';
  else if (senha && senha.length < 8) erros.senha = 'A senha deve ter no mínimo 8 caracteres.';
  else if (senha && senha.length > 72) erros.senha = 'A senha deve ter no máximo 72 caracteres.';
  return erros;
}

export function validarSetor({ sigla, nome }) {
  const erros = {};
  if (!sigla.trim()) erros.sigla = 'Informe a sigla.';
  else if (sigla.trim().length > 20) erros.sigla = 'Máximo de 20 caracteres.';
  if (!nome.trim()) erros.nome = 'Informe o nome.';
  return erros;
}

export function validarEquipe({ nome, setorId }) {
  const erros = {};
  if (!nome.trim()) erros.nome = 'Informe o nome.';
  if (!setorId) erros.setorId = 'Selecione o setor.';
  return erros;
}

/** Erros por campo do ProblemDetail da API (`errors[{campo, mensagem}]`) quando 400. */
export function errosDoBackend(erro) {
  if (erro.response?.status !== 400) return {};
  const porCampo = {};
  for (const { campo, mensagem } of erro.response.data?.errors ?? []) {
    if (!(campo in porCampo)) porCampo[campo] = mensagem;
  }
  return porCampo;
}
