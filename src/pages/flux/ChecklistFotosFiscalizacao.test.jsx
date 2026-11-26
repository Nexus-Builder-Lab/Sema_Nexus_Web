import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import App from '../../App.jsx';
import { podeEnviarFoto, podeExcluirFoto } from '../../auth/perfis.js';
import {
  buscarDemanda,
  registrarFiscalizacaoMock,
  resetDemandasMock,
} from '../../mocks/fixtures/demandas.js';
import { server } from '../../mocks/server.js';
import { iniciarSessao } from '../../test/auth.js';
import {
  checklistTemResposta,
  formatarValorChecklist,
  respostasIniciaisChecklist,
  validarENormalizarChecklist,
} from './fiscalizacaoChecklist.js';
import {
  formatarDataHoraExif,
  formatarDistanciaKm,
  mensagemDeErroFoto,
  resolverMensagemDeErroFoto,
  validarArquivoFoto,
} from './fotosFiscalizacao.js';

function abrir(id) {
  return render(
    <MemoryRouter initialEntries={[`/flux/demandas/${id}`]}>
      <App />
    </MemoryRouter>,
  );
}

describe('helpers de checklist e fotos da fiscalização', () => {
  const modelo = {
    categoria: 'DESMATAMENTO_ILEGAL',
    rotulo: 'Desmatamento ilegal',
    versao: 1,
    itens: [
      { id: 'local_acessivel', rotulo: 'Local acessível?', tipo: 'BOOLEANO', obrigatorio: true },
      { id: 'area_estimada_ha', rotulo: 'Área (ha)', tipo: 'NUMERO', obrigatorio: true },
      { id: 'observacoes_checklist', rotulo: 'Obs', tipo: 'TEXTO', obrigatorio: false },
    ],
  };

  it('inicializa, detecta resposta e valida itens obrigatórios e tipos do checklist', () => {
    const vazio = respostasIniciaisChecklist(modelo, null);
    expect(vazio).toEqual({
      local_acessivel: null,
      area_estimada_ha: '',
      observacoes_checklist: '',
    });
    expect(checklistTemResposta(modelo, vazio)).toBe(false);

    const parcial = { ...vazio, local_acessivel: true, area_estimada_ha: '-3' };
    expect(checklistTemResposta(modelo, parcial)).toBe(true);
    const inv = validarENormalizarChecklist(modelo, parcial);
    expect(inv.erros['checklist.area_estimada_ha']).toMatch(/entre 0 e/);

    const valido = validarENormalizarChecklist(modelo, {
      local_acessivel: false,
      area_estimada_ha: '12,5',
      observacoes_checklist: '  Área isolada.  ',
    });
    expect(valido.erros).toEqual({});
    expect(valido.checklist).toEqual({
      local_acessivel: false,
      area_estimada_ha: 12.5,
      observacoes_checklist: 'Área isolada.',
    });
    expect(formatarValorChecklist(true)).toBe('Sim');
    expect(formatarValorChecklist(false)).toBe('Não');
  });

  it('valida arquivos de foto client-side (extensão/MIME, vazio, >10 MB, limite 20)', () => {
    const pdf = new File(['%PDF'], 'doc.pdf', { type: 'application/pdf' });
    expect(validarArquivoFoto(pdf, 0)).toMatch(/JPG, PNG ou WebP/);

    const vazio = new File([], 'foto.jpg', { type: 'image/jpeg' });
    expect(validarArquivoFoto(vazio, 0)).toBe('O arquivo está vazio.');

    const grande = { name: 'grande.jpg', type: 'image/jpeg', size: 11 * 1024 * 1024 };
    expect(validarArquivoFoto(grande, 0)).toMatch(/excede o limite de 10 MB/);

    const ok = new File(['jpg'], 'vistoria.webp', { type: 'image/webp' });
    expect(validarArquivoFoto(ok, 0)).toBeUndefined();
    expect(validarArquivoFoto(ok, 20)).toMatch(/limite de 20 fotos/);
  });

  it('formata distância, data/hora EXIF e mensagens de erro 413/415/403', () => {
    expect(formatarDistanciaKm(0)).toBe('0,00 km (na área da demanda)');
    expect(formatarDistanciaKm(1.5)).toBe('1,50 km da demanda');
    expect(formatarDistanciaKm(null)).toBeNull();
    expect(formatarDataHoraExif('2026-11-10T14:30:00')).toBe('10/11/2026 14:30');
    expect(mensagemDeErroFoto({ response: { status: 413 } })).toMatch(/10 MB/);
    expect(mensagemDeErroFoto({ response: { status: 415 } })).toMatch(/JPG, PNG ou WebP/);
    expect(mensagemDeErroFoto({ response: { status: 403 } })).toMatch(/permissão/);
  });

  it('interpreta problem+json retornado em Blob por respostas responseType blob', async () => {
    const blob = new Blob([JSON.stringify({ detail: 'Foto fora do escopo da equipe.' })], {
      type: 'application/problem+json',
    });
    const msg = await resolverMensagemDeErroFoto({
      response: { status: 403, data: blob },
    });
    expect(msg).toBe('Foto fora do escopo da equipe.');
  });

  it('respeita regras de permissão de envio e exclusão de fotos', () => {
    const emAndamento = { status: 'EM_ANDAMENTO', fiscal: { id: 3 } };
    const finalizada = { status: 'FINALIZADA', fiscal: { id: 3 } };
    const fotoAutor3 = { id: 1, autor: { id: 3 } };

    expect(podeEnviarFoto({ id: 3, perfil: 'FISCAL' }, emAndamento)).toBe(true);
    expect(podeEnviarFoto({ id: 9, perfil: 'FISCAL' }, emAndamento)).toBe(false);
    expect(podeEnviarFoto({ id: 1, perfil: 'ANALISTA' }, emAndamento)).toBe(false);
    expect(podeEnviarFoto({ id: 1, perfil: 'ADMIN' }, finalizada)).toBe(false);

    expect(podeExcluirFoto({ id: 3, perfil: 'FISCAL' }, emAndamento, fotoAutor3)).toBe(true);
    expect(podeExcluirFoto({ id: 1, perfil: 'ADMIN' }, emAndamento, fotoAutor3)).toBe(false);
    expect(podeExcluirFoto({ id: 3, perfil: 'FISCAL' }, finalizada, fotoAutor3)).toBe(false);
  });
});

describe('Checklist por categoria e fotos com EXIF na fiscalização', () => {
  beforeEach(() => {
    resetDemandasMock();
    iniciarSessao();
  });

  it('exige itens obrigatórios quando o checklist é iniciado, envia ao contrato e exibe no detalhe', async () => {
    let corpoEnviado;
    const postSpy = http.post('/api/demandas/:id/fiscalizacao', async ({ request, params }) => {
      corpoEnviado = await request.json();
      return HttpResponse.json(registrarFiscalizacaoMock(buscarDemanda(params.id), corpoEnviado));
    });

    const user = userEvent.setup();
    // Demanda 12: status EM_ANDAMENTO, categoria FAUNA_SILVESTRE.
    abrir(12);
    await user.click(await screen.findByRole('button', { name: 'Registrar fiscalização' }));
    const modal = await screen.findByRole('dialog');

    expect(within(modal).getByText(/Checklist da categoria — Fauna silvestre/)).toBeInTheDocument();

    await user.type(within(modal).getByLabelText(/^Atividades realizadas/), 'Vistoria em campo.');
    await user.type(within(modal).getByLabelText(/^Resultado/), 'Fauna verificada.');
    await user.type(within(modal).getByLabelText(/^Evidências/), 'Registro em texto.');

    // Preenche apenas um item e deixa outro obrigatório sem resposta.
    const grupoAcessivel = within(modal).getByRole('group', {
      name: /O local estava acessível para a vistoria\?/,
    });
    await user.click(within(grupoAcessivel).getByLabelText('Sim'));
    await user.click(within(modal).getByRole('button', { name: 'Registrar fiscalização' }));

    expect(
      within(modal).getByText('Item obrigatório: Foram encontrados animais silvestres?'),
    ).toBeInTheDocument();

    // Completa o item obrigatório restante e informa número opcional.
    const grupoAnimais = within(modal).getByRole('group', {
      name: /Foram encontrados animais silvestres\?/,
    });
    await user.click(within(grupoAnimais).getByLabelText('Não'));
    await user.type(within(modal).getByLabelText(/^Quantidade de animais/), '0');

    server.use(postSpy);
    await user.click(within(modal).getByRole('button', { name: 'Registrar fiscalização' }));

    const secao = await screen.findByRole('region', { name: 'Fiscalização' });
    expect(await within(secao).findByText('Checklist da fiscalização')).toBeInTheDocument();
    expect(within(secao).getByText(/Fauna silvestre · v1/)).toBeInTheDocument();
    expect(corpoEnviado.checklist).toEqual({
      local_acessivel: true,
      animais_encontrados: false,
      quantidade_animais: 0,
    });
  }, 15000);

  it('preserva o checklist anterior no reenvio após devolução quando não alterado', async () => {
    const user = userEvent.setup();
    const demanda = buscarDemanda(12);
    demanda.fiscalizacao = {
      id: 12,
      data: '2026-11-08',
      equipe: demanda.equipe,
      atividades: 'Primeira vistoria.',
      resultado: 'Pendência de dados.',
      evidencias: 'Relato inicial.',
      recomendacoes: null,
      registradoPor: { id: 1, nome: 'Administrador Demonstrativo' },
      registradoEm: '2026-11-08T10:00:00',
      checklist: {
        versao: 1,
        categoria: 'FAUNA_SILVESTRE',
        itens: { local_acessivel: true, animais_encontrados: true, quantidade_animais: 3 },
      },
    };

    let corpoReenvio;
    server.use(
      http.post('/api/demandas/:id/fiscalizacao', async ({ request }) => {
        corpoReenvio = await request.json();
        return HttpResponse.json({
          ...demanda,
          status: 'AGUARDANDO_CONCLUSAO',
          fiscalizacao: {
            ...demanda.fiscalizacao,
            atividades: corpoReenvio.atividades,
          },
        });
      }),
    );

    abrir(12);
    await user.click(await screen.findByRole('button', { name: 'Registrar fiscalização' }));
    const modal = await screen.findByRole('dialog');

    expect(
      within(modal).getByText(/Checklist anterior carregado\. Se não alterar os itens/),
    ).toBeInTheDocument();
    expect(
      within(modal).queryByRole('button', { name: 'Restaurar checklist anterior' }),
    ).not.toBeInTheDocument();
    expect(within(modal).getByLabelText(/^Quantidade de animais/)).toHaveValue(3);

    const campoAtividades = within(modal).getByLabelText(/^Atividades realizadas/);
    await user.clear(campoAtividades);
    await user.type(campoAtividades, 'Vistoria complementada.');
    await user.click(within(modal).getByRole('button', { name: 'Registrar fiscalização' }));

    await screen.findByText('Fiscalização registrada com sucesso.');
    expect(corpoReenvio.checklist).toBeUndefined();
    const secao = screen.getByRole('region', { name: 'Fiscalização' });
    expect(within(secao).getByText('Checklist da fiscalização')).toBeInTheDocument();
    expect(within(secao).getByText('3')).toBeInTheDocument();
  });

  it('valida foto no cliente, envia multipart, exibe selo EXIF e distância e respeita permissões de download/exclusão', async () => {
    const user = userEvent.setup({ applyAccept: false });
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-foto');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    let chamadasPost = 0;
    let contentTypeEnviado = '';
    const ouvir = ({ request }) => {
      if (request.method === 'POST' && request.url.includes('/fotos')) {
        chamadasPost += 1;
        contentTypeEnviado = request.headers.get('content-type') || '';
      }
    };
    server.events.on('request:start', ouvir);

    try {
      abrir(12);
      const secaoFotos = await screen.findByRole('region', { name: 'Fotos de evidência' });
      expect(within(secaoFotos).getByText(/Fotos demonstrativas\./)).toBeInTheDocument();

      const input = within(secaoFotos).getByLabelText(/Anexar foto demonstrativa/);

      // Validação client-side amigável para tipo inválido (sem chamar API).
      const arquivoPdf = new File(['%PDF-1.4'], 'invalido.pdf', { type: 'application/pdf' });
      await user.upload(input, arquivoPdf);
      expect(await within(secaoFotos).findByRole('alert')).toHaveTextContent(/JPG, PNG ou WebP/);
      expect(chamadasPost).toBe(0);

      // Upload válido JPEG com EXIF CONFERE (via multipart).
      const fotoConfere = new File(['jpeg-bytes'], 'vistoria-01.jpg', { type: 'image/jpeg' });
      await user.upload(input, fotoConfere);
      expect(await within(secaoFotos).findByText('foto.jpg')).toBeInTheDocument();
      expect(contentTypeEnviado).toMatch(/^multipart\/form-data/);
      expect(within(secaoFotos).getByText('EXIF: Confere')).toBeInTheDocument();
      expect(within(secaoFotos).getByText('0,42 km da demanda')).toBeInTheDocument();

      // Upload PNG com EXIF SEM_GPS.
      const fotoPng = new File(['png-bytes'], 'sem-gps.png', { type: 'image/png' });
      await user.upload(input, fotoPng);
      expect(await within(secaoFotos).findByText('foto.png')).toBeInTheDocument();
      expect(within(secaoFotos).getByText('EXIF: Sem GPS')).toBeInTheDocument();

      // Download autenticado via Blob (sem JWT na URL).
      await user.click(within(secaoFotos).getByRole('button', { name: 'Baixar foto.jpg' }));
      await waitFor(() => expect(anchorClick).toHaveBeenCalledTimes(1));

      // Pré-visualização autenticada.
      await user.click(within(secaoFotos).getByRole('button', { name: 'Visualizar foto.jpg' }));
      expect(await within(secaoFotos).findByAltText(/Foto de evidência foto\.jpg/)).toHaveAttribute(
        'src',
        'blob:mock-foto',
      );
      expect(createObjectURL).toHaveBeenCalled();

      // Exclusão com confirmação pelo próprio autor (id=1).
      await user.click(within(secaoFotos).getByRole('button', { name: 'Excluir foto.jpg' }));
      const confirmacao = await screen.findByRole('dialog');
      await user.click(within(confirmacao).getByRole('button', { name: 'Excluir foto' }));
      await waitFor(() =>
        expect(within(secaoFotos).queryByText('foto.jpg')).not.toBeInTheDocument(),
      );
    } finally {
      server.events.removeListener('request:start', ouvir);
      createObjectURL.mockRestore();
      revokeObjectURL.mockRestore();
      anchorClick.mockRestore();
    }
  }, 20000);

  it('oculta upload e exclusão quando o usuário não tem permissão e exibe selos DIVERGENTE e FORA_MT', async () => {
    iniciarSessao({ id: 99, nome: 'Consulta', email: 'c@demo', perfil: 'CONSULTA' });
    server.use(
      http.get('/api/demandas/:id/fotos', () =>
        HttpResponse.json([
          {
            id: 7,
            demandaId: 12,
            nomeOriginal: 'evidencia-campo.jpg',
            mime: 'image/jpeg',
            tamanho: 12345,
            sha256: 'abc123def4567890',
            exifDataHora: '2026-11-10T09:30:00',
            exifLatitude: -15.65,
            exifLongitude: -56.15,
            distanciaKm: 8.42,
            gpsForaMt: false,
            conferencia: 'DIVERGENTE',
            autor: { id: 3, nome: 'Fiscal Demonstrativo 1' },
            criadoEm: '2026-11-10T10:00:00',
          },
          {
            id: 8,
            demandaId: 12,
            nomeOriginal: 'fora-mt.jpg',
            mime: 'image/jpeg',
            tamanho: 10240,
            sha256: 'def456abc1237890',
            exifDataHora: '2026-11-10T09:45:00',
            exifLatitude: -23.55,
            exifLongitude: -46.63,
            distanciaKm: 1350.2,
            gpsForaMt: true,
            conferencia: 'FORA_MT',
            autor: { id: 99, nome: 'Consulta' },
            criadoEm: '2026-11-10T10:05:00',
          },
        ]),
      ),
    );

    abrir(12);
    const secaoFotos = await screen.findByRole('region', { name: 'Fotos de evidência' });
    expect(await within(secaoFotos).findByText('evidencia-campo.jpg')).toBeInTheDocument();
    expect(within(secaoFotos).getByText('EXIF: Divergente')).toBeInTheDocument();
    expect(within(secaoFotos).getByText('8,42 km da demanda')).toBeInTheDocument();
    expect(within(secaoFotos).getByText('EXIF: Fora de MT')).toBeInTheDocument();
    expect(
      within(secaoFotos).queryByLabelText(/Anexar foto demonstrativa/),
    ).not.toBeInTheDocument();
    expect(within(secaoFotos).queryByRole('button', { name: /Excluir/ })).not.toBeInTheDocument();
    expect(
      within(secaoFotos).getByRole('button', { name: 'Baixar evidencia-campo.jpg' }),
    ).toBeInTheDocument();
  });

  it('permite anexar e excluir foto inline dentro do FiscalizacaoModal e trata erro 415', async () => {
    const user = userEvent.setup();
    abrir(12);
    await user.click(await screen.findByRole('button', { name: 'Registrar fiscalização' }));
    const modal = await screen.findByRole('dialog');

    const inputModal = within(modal).getByLabelText(/Anexar foto demonstrativa/);
    const foto = new File(['webp-bytes'], 'campo.webp', { type: 'image/webp' });
    await user.upload(inputModal, foto);

    expect(await within(modal).findByText('foto.webp')).toBeInTheDocument();
    expect(within(modal).getByText('EXIF: Confere')).toBeInTheDocument();

    // Confirmação inline no modal (sem empilhar dois modais), com foco gerenciado.
    const btnExcluir = within(modal).getByRole('button', { name: 'Excluir foto.webp' });
    await user.click(btnExcluir);
    const btnCancelarInline = within(
      within(modal).getByRole('group', { name: 'Confirmar exclusão de foto.webp' }),
    ).getByRole('button', { name: 'Cancelar' });
    expect(btnCancelarInline).toHaveFocus();
    await user.click(btnCancelarInline);
    expect(within(modal).getByRole('button', { name: 'Excluir foto.webp' })).toHaveFocus();

    await user.click(within(modal).getByRole('button', { name: 'Excluir foto.webp' }));
    await user.click(within(modal).getByRole('button', { name: 'Confirmar exclusão' }));
    await waitFor(() => expect(within(modal).queryByText('foto.webp')).not.toBeInTheDocument());

    // Erro 415 da API exibe mensagem amigável.
    server.use(
      http.post('/api/demandas/:id/fotos', () =>
        HttpResponse.json(
          { title: 'Tipo não suportado', status: 415, detail: 'Magic bytes inválidos.' },
          { status: 415, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );
    await user.upload(inputModal, new File(['bad'], 'falsa.jpg', { type: 'image/jpeg' }));
    expect(await within(modal).findByRole('alert')).toHaveTextContent(/Tipo de arquivo não aceito/);
  });

  it('evita corrida no preview e não cria ObjectURL após desmontar', async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockImplementation(() => 'blob:ok');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const liberar = [];

    server.use(
      http.get('/api/demandas/:id/fotos', () =>
        HttpResponse.json([
          {
            id: 10,
            demandaId: 12,
            nomeOriginal: 'lenta.jpg',
            mime: 'image/jpeg',
            tamanho: 100,
            sha256: '111122223333',
            conferencia: 'SEM_GPS',
            autor: { id: 1, nome: 'Administrador Demonstrativo' },
            criadoEm: '2026-11-10T10:00:00',
          },
          {
            id: 11,
            demandaId: 12,
            nomeOriginal: 'rapida.jpg',
            mime: 'image/jpeg',
            tamanho: 100,
            sha256: '444455556666',
            conferencia: 'SEM_GPS',
            autor: { id: 1, nome: 'Administrador Demonstrativo' },
            criadoEm: '2026-11-10T10:01:00',
          },
        ]),
      ),
      http.get('/api/demandas/:id/fotos/:fotoId/arquivo', async ({ params }) => {
        if (params.fotoId === '10') {
          await new Promise((resolve) => {
            liberar.push(resolve);
          });
        }
        return new HttpResponse(new Uint8Array([1, 2, 3]), {
          status: 200,
          headers: { 'Content-Type': 'image/jpeg' },
        });
      }),
    );

    try {
      // 1) Corrida entre dois cliques: rapida.jpg vence e lenta.jpg obsoleta é descartada.
      const primeiro = abrir(12);
      const secao = await screen.findByRole('region', { name: 'Fotos de evidência' });
      await within(secao).findByText('lenta.jpg');

      await user.click(within(secao).getByRole('button', { name: 'Visualizar lenta.jpg' }));
      await user.click(within(secao).getByRole('button', { name: 'Visualizar rapida.jpg' }));

      expect(await within(secao).findByAltText('Foto de evidência rapida.jpg')).toBeInTheDocument();
      liberar.shift()?.();
      await new Promise((r) => setTimeout(r, 0));
      expect(within(secao).getByAltText('Foto de evidência rapida.jpg')).toBeInTheDocument();
      expect(createObjectURL).toHaveBeenCalledTimes(1);

      primeiro.unmount();
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:ok');

      // 2) Desmontar durante o carregamento não pode gerar ObjectURL depois.
      createObjectURL.mockClear();
      const segundo = abrir(12);
      const secao2 = await screen.findByRole('region', { name: 'Fotos de evidência' });
      await within(secao2).findByText('lenta.jpg');
      await user.click(within(secao2).getByRole('button', { name: 'Visualizar lenta.jpg' }));
      segundo.unmount();
      liberar.shift()?.();
      await new Promise((r) => setTimeout(r, 0));
      expect(createObjectURL).not.toHaveBeenCalled();
    } finally {
      while (liberar.length) liberar.shift()?.();
      createObjectURL.mockRestore();
      revokeObjectURL.mockRestore();
    }
  });

  it('encaminha erro 400 no campo raiz checklist para o alerta geral do FiscalizacaoModal', async () => {
    server.use(
      http.post('/api/demandas/:id/fiscalizacao', () =>
        HttpResponse.json(
          {
            title: 'Dados inválidos',
            status: 400,
            detail: 'Um ou mais campos são inválidos.',
            errors: [{ campo: 'checklist', mensagem: 'Checklist com itens demais.' }],
          },
          { status: 400, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );
    const user = userEvent.setup();
    abrir(12);
    await user.click(await screen.findByRole('button', { name: 'Registrar fiscalização' }));
    const modal = await screen.findByRole('dialog');

    await user.type(within(modal).getByLabelText(/^Atividades realizadas/), 'Vistoria');
    await user.type(within(modal).getByLabelText(/^Resultado/), 'Ok');
    await user.type(within(modal).getByLabelText(/^Evidências/), 'Fotos');
    await user.click(within(modal).getByRole('button', { name: 'Registrar fiscalização' }));

    expect(await within(modal).findByRole('alert')).toHaveTextContent(
      'Checklist com itens demais.',
    );
  });
});
