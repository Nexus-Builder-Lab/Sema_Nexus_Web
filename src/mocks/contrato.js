import { http, HttpResponse } from 'msw';
import openapi from './openapi.json';

// Handlers MSW gerados do contrato OpenAPI exportado pelo CI da API (src/mocks/openapi.json).
// Cada operação responde com a resposta 2xx do contrato, preenchida com os `example` do schema
// (dados fictícios). Fixtures mais ricas e comportamentos específicos entram em handlers.js.
// Para atualizar: baixe o artefato `openapi` do job "Exportar contrato OpenAPI" do CI da API
// e substitua src/mocks/openapi.json.

const MAX_DEPTH = 6;
const METODOS = ['get', 'post', 'put', 'patch', 'delete'];

function resolver(schema) {
  if (schema?.$ref) {
    const nome = schema.$ref.replace('#/components/schemas/', '');
    return openapi.components.schemas[nome];
  }
  return schema;
}

/** Gera um valor fictício a partir de um schema do contrato. */
export function gerarExemplo(schemaOuRef, chave = '', profundidade = 0) {
  const schema = resolver(schemaOuRef);
  if (!schema || profundidade > MAX_DEPTH) return null;
  if (schema.example !== undefined) return schema.example;
  if (schema.enum) return schema.enum[0];
  const composto = schema.allOf ?? schema.oneOf ?? schema.anyOf;
  if (composto) return gerarExemplo(composto[0], chave, profundidade + 1);

  const tipo = Array.isArray(schema.type) ? schema.type.find((t) => t !== 'null') : schema.type;
  switch (tipo) {
    case 'object': {
      const saida = {};
      for (const [nome, prop] of Object.entries(schema.properties ?? {})) {
        saida[nome] = gerarExemplo(prop, nome, profundidade + 1);
      }
      return saida;
    }
    case 'array':
      return [gerarExemplo(schema.items, chave, profundidade + 1)];
    case 'integer':
    case 'number':
      return chave === 'page' ? 0 : 1;
    case 'boolean':
      return true;
    case 'string':
      if (schema.format === 'date') return '2026-11-10';
      if (schema.format === 'date-time') return '2026-11-10T09:00:00';
      return 'texto de exemplo (fictício)';
    default:
      return null;
  }
}

/** Exemplo fictício de um schema de `components.schemas` pelo nome (ex.: `DemandaDetalhe`). */
export function exemploDoSchema(nome) {
  return gerarExemplo({ $ref: `#/components/schemas/${nome}` });
}

/** Resposta de erro no formato problem+json (RFC 9457) da API. */
export function problema(status, title, detail, instance) {
  return HttpResponse.json(
    {
      type: `https://semanexus.demo/problemas/${status === 401 ? 'nao-autenticado' : 'erro'}`,
      title,
      status,
      detail,
      instance,
    },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  );
}

/** `true` quando a requisição traz `Authorization: Bearer <token>` não vazio. */
export function temToken(request) {
  const valor = request.headers.get('Authorization') ?? '';
  return /^Bearer\s+\S+/.test(valor);
}

function criarResposta(operacao) {
  const codigo = Object.keys(operacao.responses ?? {})
    .filter((c) => c.startsWith('2'))
    .sort()[0];
  if (!codigo) return null;
  const status = Number(codigo);
  const conteudo = operacao.responses[codigo].content;
  if (!conteudo || status === 204) return () => new HttpResponse(null, { status });
  if (conteudo['application/json']) {
    const corpo = gerarExemplo(conteudo['application/json'].schema);
    return () => HttpResponse.json(corpo, { status });
  }
  return () => new HttpResponse('conteúdo de exemplo (fictício)', { status });
}

/** Um handler por operação do contrato que tenha resposta 2xx documentada. */
export function criarHandlersDoContrato() {
  const handlers = [];
  for (const [caminho, operacoes] of Object.entries(openapi.paths)) {
    const rota = caminho.replace(/\{(\w+)\}/g, ':$1');
    for (const metodo of METODOS) {
      const operacao = operacoes[metodo];
      if (!operacao) continue;
      const responder = criarResposta(operacao);
      if (!responder) continue;
      const publica = Array.isArray(operacao.security) && operacao.security.length === 0;
      handlers.push(
        http[metodo](rota, ({ request }) => {
          if (!publica && !temToken(request)) {
            return problema(401, 'Não autenticado', 'Token ausente ou inválido.', caminho);
          }
          return responder();
        }),
      );
    }
  }
  return handlers;
}
