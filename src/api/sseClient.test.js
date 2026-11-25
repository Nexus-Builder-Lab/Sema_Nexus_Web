import { http, HttpResponse } from 'msw';
import { clearSession, saveSession } from '../auth/sessionStore.js';
import { respostaSse } from '../mocks/handlers.js';
import { server } from '../mocks/server.js';
import { reduzirProgresso, PROGRESSO_INICIAL, rotuloFerramenta } from './agentesStream.js';
import { setUnauthorizedHandler, mensagemDeErro } from './httpClient.js';
import {
  criarParserSse,
  ErroDoStream,
  postSse,
  postSseComAlternativa,
  StreamIndisponivel,
} from './sseClient.js';

const URL_STREAM = '/api/x/stream';

describe('criarParserSse', () => {
  it('lê quadros completos, com data de várias linhas', () => {
    const p = criarParserSse();
    const q = p.push('event: a\ndata: {"x":1}\n\nevent: b\ndata: linha1\ndata: linha2\n\n');
    expect(q).toEqual([
      { event: 'a', data: '{"x":1}' },
      { event: 'b', data: 'linha1\nlinha2' },
    ]);
  });

  it('junta quadros partidos em qualquer fronteira (byte a byte e CRLF)', () => {
    const texto = 'event: inicio\r\ndata: {"a":"é"}\r\n\r\nevent: fim\ndata: 2\n\n';
    const p = criarParserSse();
    const q = [];
    for (const ch of texto) q.push(...p.push(ch));
    expect(q).toEqual([
      { event: 'inicio', data: '{"a":"é"}' },
      { event: 'fim', data: '2' },
    ]);
  });

  it('ignora comentários, campos desconhecidos, linhas sem dois-pontos e quadros sem data', () => {
    const p = criarParserSse();
    const q = p.push(
      ':keepalive\n\nid: 9\nretry: 5\nlixo\nevent: so-evento\n\n: c\nevent: ok\ndata:sem-espaco\n\n',
    );
    expect(q).toEqual([{ event: 'ok', data: 'sem-espaco' }]);
  });

  it('descarta quadro incompleto e usa "message" sem event', () => {
    const p = criarParserSse();
    expect(p.push('data: 1\n\ndata: parcial')).toEqual([{ event: 'message', data: '1' }]);
  });
});

describe('postSse', () => {
  afterEach(() => {
    clearSession();
    setUnauthorizedHandler(null);
  });

  it('envia o JWT só no cabeçalho, entrega eventos e resolve com o concluido', async () => {
    saveSession({ token: 'tok', usuario: {} });
    let visto;
    server.use(
      http.post(URL_STREAM, async ({ request }) => {
        visto = {
          auth: request.headers.get('authorization'),
          url: request.url,
          corpo: await request.json(),
        };
        return respostaSse([
          ['inicio', { agente: 'docia' }],
          ['delta_texto', { texto: 'oi' }],
          ['concluido', { resposta: 'ok' }],
        ]);
      }),
    );
    const eventos = [];
    const r = await postSse('/x/stream', { pergunta: 'q' }, { onEvento: (n) => eventos.push(n) });
    expect(r).toEqual({ resposta: 'ok' });
    expect(eventos).toEqual(['inicio', 'delta_texto', 'concluido']);
    expect(visto.auth).toBe('Bearer tok');
    expect(visto.url).not.toMatch(/tok|token/);
    expect(visto.corpo).toEqual({ pergunta: 'q' });
  });

  it('evento erro vira ErroDoStream', async () => {
    server.use(
      http.post(URL_STREAM, () =>
        respostaSse([
          ['inicio', {}],
          ['erro', { mensagem: 'Falhou (ref. ERR-1)', referencia: 'ERR-1' }],
        ]),
      ),
    );
    await expect(postSse('/x/stream', null)).rejects.toMatchObject({
      name: 'ErroDoStream',
      referencia: 'ERR-1',
      message: 'Falhou (ref. ERR-1)',
    });
  });

  it('ignora quadros com JSON malformado', async () => {
    server.use(
      http.post(
        URL_STREAM,
        () =>
          new HttpResponse(
            'event: delta_texto\ndata: {quebrado\n\nevent: concluido\ndata: {"a":1}\n\n',
            {
              headers: { 'Content-Type': 'text/event-stream' },
            },
          ),
      ),
    );
    const eventos = [];
    expect(await postSse('/x/stream', null, { onEvento: (n) => eventos.push(n) })).toEqual({
      a: 1,
    });
    expect(eventos).toEqual(['concluido']);
  });

  it('fim do fluxo sem conclusão: erro após eventos, indisponível se vazio', async () => {
    server.use(http.post(URL_STREAM, () => respostaSse([['inicio', {}]])));
    await expect(postSse('/x/stream', null)).rejects.toBeInstanceOf(ErroDoStream);
    server.use(
      http.post(
        URL_STREAM,
        () => new HttpResponse('', { headers: { 'Content-Type': 'text/event-stream' } }),
      ),
    );
    await expect(postSse('/x/stream', null)).rejects.toBeInstanceOf(StreamIndisponivel);
  });

  it('problem+json antes do stream mantém o formato do Axios (mensagemDeErro, 429)', async () => {
    server.use(
      http.post(URL_STREAM, () =>
        HttpResponse.json(
          { title: 'Conflito', detail: 'Estado inválido.' },
          { status: 409, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );
    const e = await postSse('/x/stream', null).catch((x) => x);
    expect(e.response.status).toBe(409);
    expect(mensagemDeErro(e)).toBe('Estado inválido.');

    server.use(
      http.post(URL_STREAM, () =>
        HttpResponse.json(
          { retryAfterSegundos: 7 },
          { status: 429, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );
    expect(mensagemDeErro(await postSse('/x/stream', null).catch((x) => x))).toMatch(/7 s/);
  });

  it('401 com sessão aciona o tratador de sessão', async () => {
    saveSession({ token: 'tok', usuario: {} });
    const tratador = vi.fn();
    setUnauthorizedHandler(tratador);
    server.use(
      http.post(URL_STREAM, () =>
        HttpResponse.json(
          { title: 'Não autenticado' },
          { status: 401, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );
    await expect(postSse('/x/stream', null)).rejects.toMatchObject({ response: { status: 401 } });
    expect(tratador).toHaveBeenCalledTimes(1);
  });

  it('aborta pelo AbortController', async () => {
    server.use(
      http.post(URL_STREAM, () => {
        const enc = new TextEncoder();
        return new HttpResponse(
          new ReadableStream({
            start(c) {
              c.enqueue(enc.encode('event: inicio\ndata: {}\n\n'));
            },
          }),
          { headers: { 'Content-Type': 'text/event-stream' } },
        );
      }),
    );
    const ctl = new AbortController();
    const p = postSse('/x/stream', null, { signal: ctl.signal, onEvento: () => ctl.abort() });
    await expect(p).rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('postSseComAlternativa', () => {
  it('usa o endpoint JSON se o stream não existe (404 sem problem+json, 405, JSON 200)', async () => {
    for (const resposta of [
      () => new HttpResponse('Not Found', { status: 404 }),
      () => new HttpResponse(null, { status: 405 }),
      () => HttpResponse.json({ a: 1 }),
    ]) {
      server.use(http.post(URL_STREAM, resposta));
      const alt = vi.fn().mockResolvedValue({ via: 'json' });
      const eventos = [];
      const r = await postSseComAlternativa('/x/stream', null, {
        alternativa: alt,
        onEvento: (n) => eventos.push(n),
      });
      expect(r).toEqual({ via: 'json' });
      expect(eventos).toEqual(['alternativa']);
    }
  });

  it('não usa a alternativa em 404 problem+json nem em erro do stream', async () => {
    server.use(
      http.post(URL_STREAM, () =>
        HttpResponse.json(
          { title: 'Não encontrado' },
          { status: 404, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );
    const alt = vi.fn();
    await expect(
      postSseComAlternativa('/x/stream', null, { alternativa: alt }),
    ).rejects.toMatchObject({
      response: { status: 404 },
    });
    expect(alt).not.toHaveBeenCalled();
  });
});

describe('agentesStream', () => {
  it('reduz o progresso e rotula as ferramentas', () => {
    let e = reduzirProgresso(PROGRESSO_INICIAL, 'inicio');
    e = reduzirProgresso(e, 'ferramenta_iniciada', { ferramenta: 'obter_demanda', ordem: 1 });
    e = reduzirProgresso(e, 'ferramenta_concluida', {
      ferramenta: 'obter_demanda',
      ordem: 1,
      resumo: 'ok',
      erro: false,
    });
    e = reduzirProgresso(e, 'fallback_demonstrativo', { motivo: 'IA indisponível' });
    e = reduzirProgresso(e, 'delta_texto', { texto: 'abc' });
    expect(e).toMatchObject({ iniciado: true, texto: 'abc', fallback: 'IA indisponível' });
    expect(e.ferramentas).toEqual([
      { ordem: 1, nome: 'obter_demanda', estado: 'ok', resumo: 'ok' },
    ]);
    expect(rotuloFerramenta('obter_demanda')).toMatch(/demanda/i);
    expect(rotuloFerramenta('qualquer_coisa')).not.toMatch(/_/);
  });
});
