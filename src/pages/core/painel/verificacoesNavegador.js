// Verificações feitas pelo próprio navegador (Web#123): serviços que a API não enxerga.

/** Carrega uma imagem com tempo limite; resolve com a latência em ms ou rejeita. */
function carregarImagem(url, limiteMs) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const inicio = performance.now();
    const timer = setTimeout(() => {
      img.src = '';
      reject(new Error('tempo esgotado'));
    }, limiteMs);
    img.onload = () => {
      clearTimeout(timer);
      resolve(Math.round(performance.now() - inicio));
    };
    img.onerror = () => {
      clearTimeout(timer);
      reject(new Error('falha ao carregar'));
    };
    img.src = url;
  });
}

/** Esri: o Nginx responde 204 em /tiles/esri/status quando a chave está configurada; depois, um tile de teste. */
export async function verificarEsri() {
  try {
    const r = await fetch('/tiles/esri/status', { method: 'HEAD', cache: 'no-store' });
    if (r.status !== 204) {
      return { estado: 'NAO_CONFIGURADO', resumo: 'Chave não configurada no servidor (opcional).' };
    }
  } catch {
    return { estado: 'INDISPONIVEL', resumo: 'Servidor web não respondeu.' };
  }
  try {
    const ms = await carregarImagem(`/tiles/esri/5/16/11?t=${Date.now()}`, 8000);
    return {
      estado: 'OK',
      latenciaMs: ms,
      resumo: 'Chave configurada; imagem de teste carregada.',
    };
  } catch {
    return {
      estado: 'ATENCAO',
      resumo: 'Chave configurada, mas a imagem de teste falhou (internet?).',
    };
  }
}

/** OpenStreetMap: carrega um tile público pelo navegador (precisa de internet). */
export async function verificarOsm() {
  try {
    const ms = await carregarImagem(
      `https://tile.openstreetmap.org/5/11/16.png?t=${Date.now()}`,
      8000,
    );
    return { estado: 'OK', latenciaMs: ms, resumo: 'Tiles públicos acessíveis pelo navegador.' };
  } catch {
    return {
      estado: 'ATENCAO',
      resumo: 'Sem acesso (sem internet?). O mapa de MT continua offline.',
    };
  }
}
