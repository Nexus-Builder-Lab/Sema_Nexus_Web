// Motor de análise documental (cliente). Regras determinísticas — NÃO é inteligência artificial.
// Portado de docia-engine.js do protótipo: expressões regulares, resumo extrativo por frequência.

const norm = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
const pad = (n) => String(n).padStart(2, '0');
const uniq = (arr) => [...new Set(arr)];

const STOP = new Set(
  (
    'a o e é de da do das dos em no na nos nas um uma uns umas para por com sem sob sobre que se ao aos à às ou ' +
    'como mais menos foi foram ser são está estão este esta esse essa isso isto aquele aquela pelo pela pelos pelas entre até ' +
    'após antes também já não sim seu sua seus suas nº n° documento fictício demonstração data processo mt'
  ).split(' '),
);

const MESES = {
  janeiro: 1,
  fevereiro: 2,
  marco: 3,
  abril: 4,
  maio: 5,
  junho: 6,
  julho: 7,
  agosto: 8,
  setembro: 9,
  outubro: 10,
  novembro: 11,
  dezembro: 12,
};

const RX = {
  data: /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g,
  dataExtenso:
    /\b(\d{1,2}) de (janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro) de (\d{4})\b/gi,
  processo: /\b(?:DEMO-\d{4}\/\d{3,6}|\d{5,6}[.\-/]\d{3,6}[.\-/]\d{4}(?:[.-]\d{1,2})?)\b/g,
  numeroDoc: /\b(?:n[º°o]\.?\s*)(\d{1,5}\/\d{4})\b/gi,
  auto: /\bDEMO-AI-\d{3,5}\/\d{4}\b/g,
  demanda: /\bDEM-\d{4}\/\d{4}\b/g,
  area: /\b(\d{1,3}(?:\.\d{3})*(?:,\d+)?|\d+(?:,\d+)?)\s?(?:ha|hectares?)\b/gi,
  valor: /R\$\s?\d{1,3}(?:\.\d{3})*(?:,\d{2})?/g,
  coord: /(-\d{1,2}[,.]\d{2,6})\s*\/\s*(-\d{1,2}[,.]\d{2,6})/g,
  percent: /\b\d{1,3}(?:,\d+)?\s?%/g,
  vazao: /\b\d+(?:[.,]\d+)?\s?m³\/(?:s|dia|h)\b/gi,
  prazoDias: /\b(?:prazo|em até|no prazo de)[^.\n]{0,25}?(\d{1,3})\s+dias\b/gi,
};

function todos(rx, texto, mapa) {
  const out = [];
  for (const m of texto.matchAll(new RegExp(rx.source, rx.flags))) out.push(mapa ? mapa(m) : m[0]);
  return out;
}

const limpar = (s) =>
  ` ${norm(s)
    .replace(/[^a-z0-9' ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()} `;

/** Municípios de MT citados (nomes oficiais IBGE); "Nova Mutum" não implica "Mutum". */
export function extrairMunicipios(texto, nomes = []) {
  const t = limpar(texto);
  const achados = nomes.filter((nome) => {
    const n = limpar(nome);
    return n.trim().length > 3 && t.includes(n);
  });
  return achados.filter((nm) => {
    const n = limpar(nm);
    const maiores = achados.filter((o) => o !== nm && limpar(o).includes(n));
    if (!maiores.length) return true;
    let resto = t;
    maiores.forEach((o) => {
      resto = resto.split(limpar(o)).join(' ');
    });
    return resto.includes(n);
  });
}

/** Campos estruturados "Rótulo: valor" (uma linha). */
export function extrairCampos(texto) {
  const out = [];
  String(texto ?? '')
    .split(/\r?\n/)
    .forEach((linha) => {
      const m = /^\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9 ()/.-]{2,45}?)\s*:\s*(.{1,200})$/.exec(linha);
      if (m && !/^https?$/i.test(m[1])) out.push({ campo: m[1].trim(), valor: m[2].trim() });
    });
  return out;
}

function extrairDatas(texto) {
  const d = [
    ...todos(RX.data, texto, (m) => ({ txt: m[0], iso: `${m[3]}-${pad(m[2])}-${pad(m[1])}` })),
    ...todos(RX.dataExtenso, texto, (m) => ({
      txt: m[0],
      iso: `${m[3]}-${pad(MESES[norm(m[2])])}-${pad(m[1])}`,
    })),
  ];
  const vistas = new Set();
  return d
    .filter((x) => !vistas.has(x.iso) && vistas.add(x.iso))
    .sort((a, b) => a.iso.localeCompare(b.iso));
}

/** Extração completa de entidades. */
export function extrair(texto, nomesMunicipios = []) {
  const t = texto ?? '';
  return {
    datas: extrairDatas(t),
    processos: uniq(todos(RX.processo, t)),
    numerosDocumento: uniq(todos(RX.numeroDoc, t, (m) => `nº ${m[1]}`)),
    autos: uniq(todos(RX.auto, t)),
    demandas: uniq(todos(RX.demanda, t)),
    areas: uniq(todos(RX.area, t, (m) => `${m[1]} ha`)),
    valores: uniq(todos(RX.valor, t)),
    coordenadas: uniq(todos(RX.coord, t, (m) => `${m[1]} / ${m[2]}`)),
    percentuais: uniq(todos(RX.percent, t).map((s) => s.replace(/\s/g, ''))),
    vazoes: uniq(todos(RX.vazao, t)),
    prazos: uniq(todos(RX.prazoDias, t, (m) => `${m[1]} dias`)),
    municipios: extrairMunicipios(t, nomesMunicipios),
    campos: extrairCampos(t),
  };
}

function tokens(s) {
  return norm(s)
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w) && !/^\d+$/.test(w));
}

export function frases(texto) {
  return String(texto ?? '')
    .replace(/\r/g, '')
    .split(/\n+/)
    .flatMap((p) => p.split(/(?<=[.!?])\s+(?=[A-ZÀ-Ú0-9])/))
    .map((s) => s.trim())
    .filter((s) => s.length > 25 && !/^[A-ZÀ-Ú0-9 ºª.\-—/]+$/.test(s));
}

const PISTAS =
  /(conclus|recomenda|opina|deferi|indeferi|constatad|verific|solicit|prazo|condicionante|embargo|autua|notifica)/i;

/** Resumo extrativo: as n frases mais representativas, na ordem original. */
export function resumir(texto, n = 3) {
  const fs = frases(texto);
  if (!fs.length) return [];
  const freq = {};
  fs.forEach((f) => tokens(f).forEach((w) => (freq[w] = (freq[w] || 0) + 1)));
  const maxf = Math.max(1, ...Object.values(freq));
  return fs
    .map((f, i) => {
      const t = tokens(f);
      let s = t.reduce((a, w) => a + freq[w] / maxf, 0) / Math.sqrt(t.length || 1);
      if (PISTAS.test(f)) s *= 1.6;
      if (i < 2) s *= 1.15;
      return { f, i, s };
    })
    .sort((a, b) => b.s - a.s)
    .slice(0, n)
    .sort((a, b) => a.i - b.i)
    .map((x) => x.f);
}

/** Termos mais frequentes: `[termo, contagem]` (só os repetidos). */
export function palavrasChave(texto, n = 12) {
  const freq = {};
  tokens(texto).forEach((w) => {
    if (w.length > 3) freq[w] = (freq[w] || 0) + 1;
  });
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n)
    .filter((x) => x[1] > 1);
}

/**
 * Divide o texto em segmentos `{ texto, tipo }` (tipo: 'proc' | 'date' | 'num' | null)
 * para marcar entidades sem `dangerouslySetInnerHTML`.
 */
export function segmentar(texto) {
  const t = String(texto ?? '');
  const regras = [
    [RX.processo, 'proc'],
    [RX.auto, 'proc'],
    [RX.demanda, 'proc'],
    [RX.data, 'date'],
    [RX.dataExtenso, 'date'],
    [RX.area, 'num'],
    [RX.valor, 'num'],
    [RX.vazao, 'num'],
  ];
  const marcas = [];
  for (const [rx, tipo] of regras) {
    for (const m of t.matchAll(new RegExp(rx.source, rx.flags))) {
      const ini = m.index;
      const fim = ini + m[0].length;
      if (!marcas.some((x) => ini < x.fim && fim > x.ini)) marcas.push({ ini, fim, tipo });
    }
  }
  marcas.sort((a, b) => a.ini - b.ini);
  const out = [];
  let pos = 0;
  for (const m of marcas) {
    if (m.ini > pos) out.push({ texto: t.slice(pos, m.ini), tipo: null });
    out.push({ texto: t.slice(m.ini, m.fim), tipo: m.tipo });
    pos = m.fim;
  }
  if (pos < t.length) out.push({ texto: t.slice(pos), tipo: null });
  return out;
}

const fmtBR = (iso) => iso.split('-').reverse().join('/');

/**
 * Verificações de consistência entre o texto e o cadastro (`doc`: dataDocumento ISO, textoExtraido,
 * municipio.nome, demandas[{numero}]). Cada item: `{ nivel: 'ok'|'warn'|'info', texto }`.
 */
export function verificar(doc, ex, hoje) {
  const out = [];
  if (ex.processos.length > 1)
    out.push({
      nivel: 'info',
      texto: `O texto menciona mais de um número de processo: ${ex.processos.join(', ')}.`,
    });
  const futuras = ex.datas.filter((d) => d.iso > hoje);
  if (futuras.length)
    out.push({
      nivel: 'info',
      texto: `Datas futuras identificadas (possíveis prazos): ${futuras.map((d) => d.txt).join(', ')}.`,
    });
  if (doc.dataDocumento) {
    const post = ex.datas.filter((d) => d.iso > doc.dataDocumento && d.iso <= hoje);
    if (post.length)
      out.push({
        nivel: 'warn',
        texto: `Há datas posteriores à data do documento (${fmtBR(doc.dataDocumento)}): ${post.map((d) => d.txt).join(', ')}.`,
      });
  }
  if (
    /\/(?:AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/.test(
      doc.textoExtraido || '',
    )
  )
    out.push({
      nivel: 'warn',
      texto:
        'O texto contém referência a localidade com UF diferente de MT. Verifique a abrangência territorial.',
    });
  const mun = doc.municipio?.nome;
  if (mun && ex.municipios.length) {
    out.push(
      ex.municipios.includes(mun)
        ? { nivel: 'ok', texto: `O município do cadastro (${mun}) confere com o texto.` }
        : {
            nivel: 'warn',
            texto: `O município do cadastro (${mun}) não aparece no texto, que cita: ${ex.municipios.join(', ')}.`,
          },
    );
  }
  (doc.demandas ?? []).forEach((d) => {
    if (!d.numero) return;
    if (ex.demandas.includes(d.numero))
      out.push({ nivel: 'ok', texto: `A demanda vinculada ${d.numero} confere com o texto.` });
    else if (ex.demandas.length)
      out.push({
        nivel: 'warn',
        texto: `A demanda vinculada ${d.numero} não é citada no texto, que cita: ${ex.demandas.join(', ')}.`,
      });
  });
  if (!out.length)
    out.push({
      nivel: 'ok',
      texto: 'Nenhuma inconsistência identificada pelas regras disponíveis.',
    });
  return out;
}
