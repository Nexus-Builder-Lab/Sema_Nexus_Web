import { mensagemDeErro } from '../../api/httpClient.js';

export const EXTENSOES_PERMITIDAS = ['pdf', 'txt', 'md', 'csv', 'docx'];
export const TAMANHO_MAXIMO = 10 * 1024 * 1024;
export const LIMITES = {
  titulo: { min: 3, max: 200 },
  descricao: { max: 2000 },
  categoria: { max: 60 },
  tipo: { max: 60 },
  palavra: { max: 50 },
  palavras: { max: 20 },
};

export const VALORES_INICIAIS = {
  titulo: '',
  descricao: '',
  categoria: '',
  tipo: '',
  dataDocumento: '',
  municipioId: '',
  palavrasChave: '',
};

/** "a, b ,c" → ["a","b","c"] (sem vazios nem repetidos). */
export function separarPalavras(texto) {
  return [
    ...new Set(
      String(texto ?? '')
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean),
    ),
  ];
}

export function formatarTamanho(bytes) {
  if (bytes == null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1).replace('.', ',')} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

/** Valida extensão e tamanho do arquivo; devolve a mensagem de erro ou `undefined`. */
export function validarArquivo(arquivo) {
  if (!arquivo) return 'Selecione um arquivo.';
  const extensao = arquivo.name.includes('.') ? arquivo.name.split('.').pop().toLowerCase() : '';
  if (!EXTENSOES_PERMITIDAS.includes(extensao)) {
    return `Tipo de arquivo não permitido. Envie ${EXTENSOES_PERMITIDAS.join(', ').toUpperCase()}.`;
  }
  if (arquivo.size > TAMANHO_MAXIMO) {
    return `O arquivo tem ${formatarTamanho(arquivo.size)} e excede o limite de 10 MB.`;
  }
  if (arquivo.size === 0) return 'O arquivo está vazio.';
  return undefined;
}

/** Valida o formulário de upload; devolve `{ campo: mensagem }` (vazio = válido). */
export function validarDocumento(valores, arquivo, { hoje }) {
  const erros = {};
  const erroArquivo = validarArquivo(arquivo);
  if (erroArquivo) erros.arquivo = erroArquivo;

  const titulo = valores.titulo.trim();
  if (titulo.length < LIMITES.titulo.min || titulo.length > LIMITES.titulo.max) {
    erros.titulo = `Informe o título (${LIMITES.titulo.min} a ${LIMITES.titulo.max} caracteres).`;
  }
  if (valores.descricao.length > LIMITES.descricao.max) {
    erros.descricao = `A descrição aceita até ${LIMITES.descricao.max} caracteres.`;
  }
  for (const campo of ['categoria', 'tipo']) {
    const texto = valores[campo].trim();
    if (!texto) erros[campo] = 'Campo obrigatório.';
    else if (texto.length > LIMITES[campo].max) {
      erros[campo] = `Aceita até ${LIMITES[campo].max} caracteres.`;
    }
  }
  if (!valores.dataDocumento) erros.dataDocumento = 'Informe a data do documento.';
  else if (valores.dataDocumento > hoje) erros.dataDocumento = 'A data não pode ser futura.';

  const palavras = separarPalavras(valores.palavrasChave);
  if (palavras.length > LIMITES.palavras.max) {
    erros.palavrasChave = `Informe no máximo ${LIMITES.palavras.max} palavras-chave.`;
  } else if (palavras.some((p) => p.length > LIMITES.palavra.max)) {
    erros.palavrasChave = `Cada palavra-chave aceita até ${LIMITES.palavra.max} caracteres.`;
  }
  return erros;
}

/** Mensagem compreensível para os erros de upload da API (413, 415, 403…). */
export function mensagemDeUpload(erro, padrao = 'Não foi possível enviar o documento.') {
  switch (erro.response?.status) {
    case 413:
      return 'O arquivo excede o limite de 10 MB. Reduza o tamanho e tente novamente.';
    case 415:
      return 'Tipo de arquivo não aceito. Envie PDF, TXT, MD, CSV ou DOCX com conteúdo compatível com a extensão.';
    case 403:
      return 'Seu perfil não tem permissão para enviar documentos.';
    default:
      return mensagemDeErro(erro, padrao);
  }
}
