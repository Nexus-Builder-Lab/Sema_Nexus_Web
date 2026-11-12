import { extrairCampos } from './analiseEngine.js';

/** Junta metadados do cadastro (API) e campos "Rótulo: valor" do texto extraído dos dois documentos. */
export function montarCampos(metadados, textoA, textoB) {
  const campos = (metadados ?? []).map((m) => ({
    campo: m.campo,
    origem: 'cadastro',
    a: m.valorA || undefined,
    b: m.valorB || undefined,
    status: m.igual ? 'igual' : m.valorA && m.valorB ? 'diferente' : 'ausente',
  }));
  const mapa = (t) => new Map(extrairCampos(t).map((c) => [c.campo, c.valor]));
  const ma = mapa(textoA);
  const mb = mapa(textoB);
  [...new Set([...ma.keys(), ...mb.keys()])].forEach((campo) => {
    const a = ma.get(campo);
    const b = mb.get(campo);
    const status = a === undefined || b === undefined ? 'ausente' : a === b ? 'igual' : 'diferente';
    campos.push({ campo, origem: 'texto', a, b, status });
  });
  return campos;
}
