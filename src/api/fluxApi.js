import httpClient from './httpClient.js';

/** GET /api/flux/prazos/resumo → `{ vencidas, proximas, noPrazo, concluidasNoPrazo, concluidasComAtraso, maisAntigaVencida, demonstrativo }`. */
export async function obterResumoPrazos(diasAlerta) {
  const { data } = await httpClient.get('/flux/prazos/resumo', {
    params: diasAlerta == null ? undefined : { diasAlerta },
  });
  return data;
}

/** GET /api/flux/prazos → página de `PrazoItem`. `estado`: VENCIDA | PROXIMA | NO_PRAZO | CONCLUIDA. */
export async function listarPrazos(params = {}) {
  const { data } = await httpClient.get('/flux/prazos', { params });
  return data;
}

/** GET /api/flux/produtividade → `{ kpis, porSetorSituacao, tempoMedioPorSetor, historicoMensal, porResponsavel }`. */
export async function obterProdutividade(params = {}) {
  const { data } = await httpClient.get('/flux/produtividade', { params });
  return data;
}
