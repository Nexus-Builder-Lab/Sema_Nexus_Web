import { getToken } from '../auth/sessionStore.js';
import { API_BASE_URL, mensagemDeErro, notificarNaoAutorizado } from './httpClient.js';

/**
 * Cliente SSE sobre `fetch` + `ReadableStream`. Não usa `EventSource` porque o JWT precisa ir no
 * cabeçalho `Authorization` (nunca na query string) e o endpoint é POST.
 */

const FIM_DE_LINHA = /\r\n|\n|\r/;

/**
 * Analisador incremental do formato `text/event-stream`. `push(texto)` aceita pedaços em qualquer
 * fronteira (até no meio de um quadro ou entre `\r` e `\n`) e devolve os quadros completos
 * `{ event, data }` (`data` = linhas `data:` unidas por `\n`). Comentários (`:keepalive`), campos
 * desconhecidos e quadros sem `data` são ignorados; um quadro incompleto no fim é descartado.
 */
export function criarParserSse() {
  let resto = '';
  let evento = '';
  let dados = [];
  let primeiro = true;

  function linha(texto, saida) {
    if (texto === '') {
      if (dados.length > 0) saida.push({ event: evento || 'message', data: dados.join('\n') });
      evento = '';
      dados = [];
      return;
    }
    if (texto.startsWith(':')) return;
    const i = texto.indexOf(':');
    const campo = i === -1 ? texto : texto.slice(0, i);
    let valor = i === -1 ? '' : texto.slice(i + 1);
    if (valor.startsWith(' ')) valor = valor.slice(1);
    if (campo === 'event') evento = valor;
    else if (campo === 'data') dados.push(valor);
  }

  return {
    push(pedaco) {
      let texto = resto + pedaco;
      if (primeiro && texto.length > 0) {
        primeiro = false;
        if (texto.charCodeAt(0) === 0xfeff) texto = texto.slice(1);
      }
      const saida = [];
      let inicio = 0;
      for (;;) {
        const m = FIM_DE_LINHA.exec(texto.slice(inicio));
        if (!m) break;
        const fim = inicio + m.index + m[0].length;
        // "\r" no fim do pedaço pode ser a metade de um "\r\n": espera o próximo pedaço.
        if (m[0] === '\r' && fim === texto.length) break;
        linha(texto.slice(inicio, inicio + m.index), saida);
        inicio = fim;
      }
      resto = texto.slice(inicio);
      return saida;
    },
  };
}

/** Erro de "streaming indisponível" (quem chama deve usar o endpoint JSON). */
export class StreamIndisponivel extends Error {
  constructor(motivo) {
    super(`Streaming indisponível: ${motivo}`);
    this.name = 'StreamIndisponivel';
  }
}

/** Erro enviado pelo servidor no evento `erro` (já com mensagem pública). */
export class ErroDoStream extends Error {
  constructor(mensagem, referencia) {
    super(mensagem || 'O agente não conseguiu concluir a resposta.');
    this.name = 'ErroDoStream';
    this.referencia = referencia ?? null;
  }
}

/** Mensagem amigável: a do evento `erro` do stream ou, antes dele, a do problem+json (`mensagemDeErro`). */
export function mensagemDeErroStream(e, padrao) {
  return e instanceof ErroDoStream ? e.message : mensagemDeErro(e, padrao);
}

export function foiCancelado(e) {
  return e?.name === 'AbortError' || e?.code === 'ERR_CANCELED' || e?.name === 'CanceledError';
}

function urlAbsoluta(caminho) {
  const base = globalThis.location?.href ?? 'http://localhost/';
  return new URL(`${API_BASE_URL}${caminho}`, base).toString();
}

async function erroHttp(resposta) {
  let dados = null;
  try {
    dados = JSON.parse(await resposta.text());
  } catch {
    /* corpo não JSON */
  }
  const headers = {};
  resposta.headers.forEach((v, k) => {
    headers[k.toLowerCase()] = v;
  });
  const erro = new Error(`HTTP ${resposta.status}`);
  erro.response = { status: resposta.status, data: dados, headers };
  return erro;
}

function dadosDoQuadro(quadro) {
  try {
    return JSON.parse(quadro.data);
  } catch {
    return undefined; // quadro malformado: ignorado
  }
}

/**
 * POST em um endpoint SSE e entrega cada evento a `onEvento(nome, dados)`. Resolve com o `dados` do
 * evento `concluido`. Falhas antes de abrir o stream: problem+json (400/401/403/404/409/429/503) vira
 * um erro no formato do Axios (`error.response`), compatível com `mensagemDeErro`; 401 aciona o
 * tratador de sessão. Sem suporte ao stream (404/405/501 sem problem+json, rede, proxy sem corpo
 * ou fim sem nenhum evento) lança `StreamIndisponivel`. Evento `erro` lança `ErroDoStream`.
 */
export async function postSse(caminho, corpo, { signal, onEvento } = {}) {
  const headers = { Accept: 'text/event-stream', 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let resposta;
  try {
    resposta = await fetch(urlAbsoluta(caminho), {
      method: 'POST',
      headers,
      body: corpo == null ? undefined : JSON.stringify(corpo),
      signal,
    });
  } catch (e) {
    if (foiCancelado(e)) throw e;
    throw new StreamIndisponivel('falha de rede');
  }

  if (!resposta.ok) {
    const tipo = resposta.headers.get('content-type') ?? '';
    const ehProblema = /json/i.test(tipo);
    if ([404, 405, 501].includes(resposta.status) && !ehProblema) {
      throw new StreamIndisponivel(`HTTP ${resposta.status}`);
    }
    const erro = await erroHttp(resposta);
    if (resposta.status === 401) notificarNaoAutorizado();
    throw erro;
  }
  if (!/text\/event-stream/i.test(resposta.headers.get('content-type') ?? '') || !resposta.body) {
    throw new StreamIndisponivel('resposta não é um fluxo de eventos');
  }

  const parser = criarParserSse();
  const decoder = new TextDecoder();
  const leitor = resposta.body.getReader();
  let recebeu = false;
  let concluido;
  const aoAbortar = () => leitor.cancel().catch(() => {});
  signal?.addEventListener('abort', aoAbortar);
  try {
    for (;;) {
      let leitura;
      try {
        leitura = await leitor.read();
      } catch (e) {
        if (foiCancelado(e)) throw e;
        if (!recebeu) throw new StreamIndisponivel('conexão interrompida');
        throw new ErroDoStream('A conexão com o agente foi interrompida antes do fim da resposta.');
      }
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      if (leitura.done) break;
      for (const quadro of parser.push(decoder.decode(leitura.value, { stream: true }))) {
        const dados = dadosDoQuadro(quadro);
        if (dados === undefined) continue;
        recebeu = true;
        if (quadro.event === 'erro') throw new ErroDoStream(dados?.mensagem, dados?.referencia);
        onEvento?.(quadro.event, dados);
        if (quadro.event === 'concluido') concluido = dados;
      }
      if (concluido !== undefined) break;
    }
  } finally {
    signal?.removeEventListener('abort', aoAbortar);
    leitor.cancel().catch(() => {});
  }
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  if (concluido === undefined) {
    if (!recebeu) throw new StreamIndisponivel('fluxo vazio');
    throw new ErroDoStream('A resposta do agente terminou sem conclusão. Tente novamente.');
  }
  return concluido;
}

/**
 * Tenta o stream e, se ele não estiver disponível antes de qualquer evento, usa `alternativa()` (o
 * endpoint JSON existente) de forma transparente.
 */
export async function postSseComAlternativa(caminho, corpo, { signal, onEvento, alternativa }) {
  try {
    return await postSse(caminho, corpo, { signal, onEvento });
  } catch (e) {
    if (e instanceof StreamIndisponivel) {
      onEvento?.('alternativa', {});
      return alternativa();
    }
    throw e;
  }
}
