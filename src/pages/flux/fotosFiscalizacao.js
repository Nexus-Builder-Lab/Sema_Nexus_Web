import { mensagemDeErro } from '../../api/httpClient.js';
import { formatarTamanho } from '../docia/validarDocumento.js';

export const EXTENSOES_FOTO = ['jpg', 'jpeg', 'png', 'webp'];
export const MIMES_FOTO = ['image/jpeg', 'image/png', 'image/webp'];
export const TAMANHO_MAX_FOTO = 10 * 1024 * 1024;
export const MAX_FOTOS_POR_DEMANDA = 20;

export const AVISO_FOTOS_DEMONSTRATIVAS =
  'Fotos demonstrativas. Os metadados EXIF (data/hora e GPS) são declarados pelo arquivo — têm caráter informativo e não constituem prova oficial.';

export const CONFERENCIA_EXIF = {
  CONFERE: {
    rotulo: 'EXIF: Confere',
    badge: 'nx-badge-green',
    icone: 'check',
    descricao: 'GPS do EXIF dentro de 1 km do local da demanda.',
  },
  DIVERGENTE: {
    rotulo: 'EXIF: Divergente',
    badge: 'nx-badge-amber',
    icone: 'alert',
    descricao: 'GPS do EXIF a mais de 1 km do local da demanda.',
  },
  FORA_MT: {
    rotulo: 'EXIF: Fora de MT',
    badge: 'nx-badge-red',
    icone: 'alert',
    descricao: 'Coordenadas GPS do EXIF fora dos limites de Mato Grosso.',
  },
  SEM_GPS: {
    rotulo: 'EXIF: Sem GPS',
    badge: 'nx-badge-gray',
    icone: 'slash',
    descricao: 'Arquivo sem coordenadas GPS no EXIF.',
  },
  SEM_REFERENCIA: {
    rotulo: 'EXIF: Sem referência',
    badge: 'nx-badge-blue',
    icone: 'pin',
    descricao: 'A demanda não possui coordenada ou área de referência para conferência.',
  },
};

/** Validação client-side amigável para fotos da fiscalização (JPG, PNG ou WebP até 10 MB). */
export function validarArquivoFoto(arquivo, totalAtual = 0) {
  if (totalAtual >= MAX_FOTOS_POR_DEMANDA) {
    return `A demanda já atingiu o limite de ${MAX_FOTOS_POR_DEMANDA} fotos.`;
  }
  if (!arquivo) return 'Selecione uma foto.';
  if (arquivo.size === 0) return 'O arquivo está vazio.';
  if (arquivo.size > TAMANHO_MAX_FOTO) {
    return `A foto tem ${formatarTamanho(arquivo.size)} e excede o limite de 10 MB.`;
  }
  const ext = arquivo.name?.includes('.') ? arquivo.name.split('.').pop().toLowerCase() : '';
  const mime = arquivo.type?.toLowerCase() ?? '';
  const mimeValido = !mime || MIMES_FOTO.includes(mime);
  if (!EXTENSOES_FOTO.includes(ext) || !mimeValido) {
    return 'Tipo de arquivo não permitido. Envie imagens JPG, PNG ou WebP.';
  }
  return undefined;
}

/** Formata a distância em km do GPS do EXIF até a demanda. */
export function formatarDistanciaKm(km) {
  if (km == null) return null;
  const valor = Number(km);
  if (!Number.isFinite(valor)) return null;
  if (valor === 0) return '0,00 km (na área da demanda)';
  return `${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km da demanda`;
}

/** Formata data/hora EXIF (`2026-11-10T14:30:00`) sem deslocamento de fuso UTC. */
export function formatarDataHoraExif(iso) {
  if (!iso) return '—';
  const [data, hora] = String(iso).split('T');
  const [ano, mes, dia] = (data || '').split('-');
  if (!ano || !mes || !dia) return '—';
  const hhmm = (hora || '').slice(0, 5);
  return hhmm ? `${dia}/${mes}/${ano} ${hhmm}` : `${dia}/${mes}/${ano}`;
}

/** Mensagem amigável para falhas de upload/exclusão de fotos (413, 415, 403, 409, 429). */
export function mensagemDeErroFoto(erro, padrao = 'Não foi possível concluir a operação.') {
  switch (erro?.response?.status) {
    case 413:
      return 'A foto excede o limite de 10 MB. Reduza o tamanho e tente novamente.';
    case 415:
      return 'Tipo de arquivo não aceito. Envie uma imagem JPG, PNG ou WebP válida.';
    case 403:
      return erro.response?.data?.detail || 'Seu perfil não tem permissão para esta operação.';
    default:
      return mensagemDeErro(erro, padrao);
  }
}

/**
 * Converte respostas `Blob` (ex.: `baixarFotoFiscalizacao` com `responseType: 'blob'`) em JSON
 * `problem+json` antes de extrair a mensagem amigável.
 */
export async function resolverMensagemDeErroFoto(
  erro,
  padrao = 'Não foi possível concluir a operação.',
) {
  const dados = erro?.response?.data;
  if (dados instanceof Blob || (dados && typeof dados.text === 'function')) {
    try {
      const json = JSON.parse(await dados.text());
      return mensagemDeErroFoto({ ...erro, response: { ...erro.response, data: json } }, padrao);
    } catch {
      // Blob não é JSON válido; cai no tratamento padrão.
    }
  }
  return mensagemDeErroFoto(erro, padrao);
}
