export const LIMITE_TEXTO_CHECKLIST = 500;
export const LIMITE_NUMERO_CHECKLIST = 1_000_000_000;

/**
 * Inicializa os campos do checklist a partir do modelo da categoria, preservando respostas
 * anteriores quando houver (reenvio após devolução).
 */
export function respostasIniciaisChecklist(modelo, checklistAnterior) {
  if (!modelo?.itens) return {};
  const itensAnteriores = checklistAnterior?.itens ?? {};
  const saida = {};
  for (const item of modelo.itens) {
    const anterior = itensAnteriores[item.id];
    if (item.tipo === 'BOOLEANO') {
      saida[item.id] = typeof anterior === 'boolean' ? anterior : null;
    } else if (item.tipo === 'NUMERO') {
      saida[item.id] =
        typeof anterior === 'number' && Number.isFinite(anterior) ? String(anterior) : '';
    } else {
      saida[item.id] = typeof anterior === 'string' ? anterior : '';
    }
  }
  return saida;
}

/** Indica se ao menos um item do checklist recebeu resposta na interface. */
export function checklistTemResposta(modelo, valores) {
  if (!modelo?.itens || !valores) return false;
  return modelo.itens.some((item) => {
    const v = valores[item.id];
    if (item.tipo === 'BOOLEANO') return typeof v === 'boolean';
    return String(v ?? '').trim() !== '';
  });
}

/**
 * Valida as respostas contra o modelo e converte para o payload esperado por `FiscalizacaoRequest.checklist`.
 * Retorna `{ erros, checklist }`, onde `erros` usa chaves `checklist.<id>`.
 */
export function validarENormalizarChecklist(modelo, valores) {
  const erros = {};
  const checklist = {};
  if (!modelo?.itens) return { erros, checklist };

  for (const item of modelo.itens) {
    const bruto = valores?.[item.id];
    if (item.tipo === 'BOOLEANO') {
      if (bruto === true || bruto === false) {
        checklist[item.id] = bruto;
      } else if (item.obrigatorio) {
        erros[`checklist.${item.id}`] = `Item obrigatório: ${item.rotulo}`;
      }
      continue;
    }

    if (item.tipo === 'TEXTO') {
      const texto = String(bruto ?? '').trim();
      if (!texto) {
        if (item.obrigatorio) {
          erros[`checklist.${item.id}`] = `Item obrigatório: ${item.rotulo}`;
        }
      } else if (texto.length > LIMITE_TEXTO_CHECKLIST) {
        erros[`checklist.${item.id}`] =
          `Informe um texto de até ${LIMITE_TEXTO_CHECKLIST} caracteres.`;
      } else {
        checklist[item.id] = texto;
      }
      continue;
    }

    if (item.tipo === 'NUMERO') {
      const texto = String(bruto ?? '')
        .trim()
        .replace(',', '.');
      if (!texto) {
        if (item.obrigatorio) {
          erros[`checklist.${item.id}`] = `Item obrigatório: ${item.rotulo}`;
        }
      } else {
        const numero = Number(texto);
        if (!Number.isFinite(numero) || numero < 0 || numero > LIMITE_NUMERO_CHECKLIST) {
          erros[`checklist.${item.id}`] =
            `Informe um número entre 0 e ${LIMITE_NUMERO_CHECKLIST.toLocaleString('pt-BR')}.`;
        } else {
          checklist[item.id] = numero;
        }
      }
    }
  }

  return { erros, checklist };
}

/** Formata o valor gravado de um item do checklist para exibição na leitura da demanda. */
export function formatarValorChecklist(valor) {
  if (valor === true) return 'Sim';
  if (valor === false) return 'Não';
  if (typeof valor === 'number' && Number.isFinite(valor)) {
    return valor.toLocaleString('pt-BR', { maximumFractionDigits: 4 });
  }
  if (typeof valor === 'string' && valor.trim()) return valor;
  return 'Não informado';
}
