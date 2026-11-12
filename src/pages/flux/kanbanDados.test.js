import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server.js';
import { antigaFinalizada, carregarTodasDemandas } from './kanbanDados.js';

const dias = (n) => new Date(Date.now() - n * 86400000).toISOString();

describe('antigaFinalizada', () => {
  it('usa concluidaEm, não a data de recebimento', () => {
    const d = { status: 'FINALIZADA', dataRecebimento: '2020-01-01', concluidaEm: dias(1) };
    expect(antigaFinalizada(d)).toBe(false);
    expect(antigaFinalizada({ ...d, concluidaEm: dias(40) })).toBe(true);
  });
  it('cai para atualizadoEm e, sem datas, não oculta', () => {
    expect(antigaFinalizada({ status: 'FINALIZADA', atualizadoEm: dias(40) })).toBe(true);
    expect(antigaFinalizada({ status: 'FINALIZADA', dataRecebimento: '2020-01-01' })).toBe(false);
    expect(antigaFinalizada({ status: 'PENDENTE', concluidaEm: dias(40) })).toBe(false);
  });
});

describe('carregarTodasDemandas', () => {
  it('percorre todas as páginas', async () => {
    const paginas = [[{ id: 1 }], [{ id: 2 }], [{ id: 3 }]];
    server.use(
      http.get('/api/demandas', ({ request }) => {
        const p = Number(new URL(request.url).searchParams.get('page'));
        return HttpResponse.json({
          content: paginas[p],
          page: p,
          size: 200,
          totalElements: 3,
          totalPages: 3,
        });
      }),
    );
    const r = await carregarTodasDemandas();
    expect(r.content.map((d) => d.id)).toEqual([1, 2, 3]);
  });
});
