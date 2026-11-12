import { http, HttpResponse } from 'msw';
import { temToken, problema } from '../contrato.js';
import { listarTodasDemandasMock } from './demandas.js';

// Relatório de demandas dos mocks: mesmos filtros e formato da API (Issue #28), sobre as demandas
// fictícias em memória. O contrato OpenAPI publicado ainda não traz `/relatorios`.

const AVISO = 'AMBIENTE DEMONSTRATIVO — DADOS FICTÍCIOS';

function filtrar(params) {
  const g = (n) => params.get(n);
  return listarTodasDemandasMock()
    .filter(
      (d) =>
        (!g('de') || d.dataRecebimento >= g('de')) &&
        (!g('ate') || d.dataRecebimento <= g('ate')) &&
        (!g('municipioId') || String(d.municipio.id) === g('municipioId')) &&
        (!g('bioma') || d.municipio.bioma === g('bioma')) &&
        (!g('categoria') || d.categoria === g('categoria')) &&
        (!g('status') || d.status === g('status')),
    )
    .sort((a, b) => b.dataRecebimento.localeCompare(a.dataRecebimento) || b.id - a.id);
}

const linha = (d) => ({
  numero: d.numero,
  titulo: d.titulo,
  categoria: d.categoria,
  municipio: d.municipio.nome,
  bioma: d.municipio.bioma,
  status: d.status,
  prioridade: d.prioridade,
  dataRecebimento: d.dataRecebimento,
  prazo: d.prazo,
  concluidaEm: d.concluidaEm,
});

const br = (iso) => (iso ? iso.split('-').reverse().join('/') : '');

export function csvMock(params) {
  const cab = [
    'Número',
    'Título',
    'Categoria',
    'Município',
    'Bioma',
    'Status',
    'Prioridade',
    'Recebimento',
    'Prazo',
    'Conclusão',
  ];
  const linhas = filtrar(params).map((d) =>
    [
      d.numero,
      d.titulo,
      d.categoria ?? '',
      d.municipio.nome,
      d.municipio.bioma,
      d.status,
      d.prioridade ?? '',
      br(d.dataRecebimento),
      br(d.prazo),
      br(d.concluidaEm),
    ].join(';'),
  );
  return `﻿${[AVISO, cab.join(';'), ...linhas].join('\r\n')}\r\n`;
}

export const handlersRelatorios = [
  http.get('/api/relatorios/demandas.csv', ({ request }) => {
    if (!temToken(request)) return problema(401, 'Não autenticado', 'Sessão inválida.');
    return new HttpResponse(csvMock(new URL(request.url).searchParams), {
      headers: {
        'Content-Type': 'text/csv;charset=UTF-8',
        'Content-Disposition': 'attachment; filename="relatorio-demandas-ficticio.csv"',
      },
    });
  }),
  http.get('/api/relatorios/demandas', ({ request }) => {
    if (!temToken(request)) return problema(401, 'Não autenticado', 'Sessão inválida.');
    const params = new URL(request.url).searchParams;
    if (params.get('de') && params.get('ate') && params.get('de') > params.get('ate'))
      return problema(400, 'Requisição inválida', 'A data inicial não pode ser posterior à final.');
    const page = Number(params.get('page') ?? 0);
    const size = Math.min(Number(params.get('size') ?? 20), 100);
    const todas = filtrar(params);
    return HttpResponse.json({
      demonstrativo: true,
      aviso: AVISO,
      content: todas.slice(page * size, (page + 1) * size).map(linha),
      page,
      size,
      totalElements: todas.length,
      totalPages: Math.ceil(todas.length / size),
    });
  }),
];
