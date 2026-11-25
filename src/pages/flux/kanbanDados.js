import { listarDemandas } from '../../api/demandasApi.js';
import { diasEntre, hojeISO } from '../../utils/datas.js';

const LIMITE = 200;

/** Finalizada há mais de 30 dias, pela data de conclusão (fallback: atualização). Sem data, não é antiga. */
export function antigaFinalizada(d) {
  if (d.status !== 'FINALIZADA') return false;
  const ref = (d.concluidaEm ?? d.atualizadoEm ?? '').slice(0, 10);
  return Boolean(ref) && diasEntre(ref, hojeISO()) > 30;
}

/** Carrega todas as páginas de demandas (size máximo), até esgotar. */
export async function carregarTodasDemandas() {
  const primeira = await listarDemandas({ page: 0, size: LIMITE, sort: 'numero,desc' });
  const content = [...primeira.content];
  for (let p = 1; p < (primeira.totalPages ?? 1); p += 1) {
    content.push(...(await listarDemandas({ page: p, size: LIMITE, sort: 'numero,desc' })).content);
  }
  return { ...primeira, content, totalPages: 1 };
}
