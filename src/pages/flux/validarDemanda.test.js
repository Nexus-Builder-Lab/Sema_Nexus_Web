import { MUNICIPIOS } from '../../mocks/fixtures/catalogos.js';
import {
  encontrarMunicipio,
  errosDaApi,
  lerCoordenada,
  montarCorpo,
  validarDemanda,
  valoresDaDemanda,
  valoresDaUrl,
  VALORES_INICIAIS,
} from './validarDemanda.js';

const HOJE = '2026-11-10';

const valido = {
  ...VALORES_INICIAIS,
  titulo: 'Supressão de vegetação nativa',
  descricao: 'Relato fictício.',
  origem: 'DENUNCIA',
  municipio: 'Cuiabá',
  dataRecebimento: '2026-11-09',
};

const validar = (mudancas = {}) =>
  validarDemanda({ ...valido, ...mudancas }, { municipios: MUNICIPIOS, hoje: HOJE });

describe('validarDemanda', () => {
  it('aceita um formulário válido (campos opcionais vazios)', () => {
    expect(validar()).toEqual({});
  });

  it('exige os campos obrigatórios', () => {
    const erros = validarDemanda(VALORES_INICIAIS, { municipios: MUNICIPIOS, hoje: HOJE });
    expect(Object.keys(erros).sort()).toEqual([
      'dataRecebimento',
      'descricao',
      'municipio',
      'origem',
      'titulo',
    ]);
  });

  it('limita o título a 5–200 caracteres', () => {
    expect(validar({ titulo: 'abcd' }).titulo).toMatch(/entre 5 e 200/);
    expect(validar({ titulo: 'a'.repeat(201) }).titulo).toMatch(/entre 5 e 200/);
    expect(validar({ titulo: 'a'.repeat(200) }).titulo).toBeUndefined();
  });

  it('limita descrição, localidade e observações', () => {
    expect(validar({ descricao: 'a'.repeat(4001) }).descricao).toBeDefined();
    expect(validar({ localidade: 'a'.repeat(201) }).localidade).toBeDefined();
    expect(validar({ observacoes: 'a'.repeat(2001) }).observacoes).toBeDefined();
  });

  it('só aceita município de Mato Grosso do catálogo, sem diferenciar acentos', () => {
    expect(validar({ municipio: 'São Paulo' }).municipio).toMatch(/Mato Grosso/);
    expect(validar({ municipio: 'cuiaba' }).municipio).toBeUndefined();
    expect(encontrarMunicipio('  VARZEA GRANDE ', MUNICIPIOS)?.id).toBe(5108402);
  });

  it('valida as coordenadas dentro do retângulo de MT, aceitando vírgula', () => {
    expect(validar({ latitude: '-15,601', longitude: '-56,097' })).toEqual({});
    expect(validar({ latitude: '-5' }).latitude).toMatch(/entre -18,1 e -7,3/);
    expect(validar({ longitude: '-70' }).longitude).toMatch(/entre -61,7 e -50,2/);
    expect(validar({ latitude: 'abc' }).latitude).toMatch(/número/);
  });

  it('exige latitude e longitude juntas (regra da API)', () => {
    expect(validar({ latitude: '-15,6' }).longitude).toBe('Informe latitude e longitude juntas.');
    expect(validar({ longitude: '-56,1' }).latitude).toBe('Informe latitude e longitude juntas.');
    expect(validar({ latitude: '', longitude: '' })).toEqual({});
  });

  it('rejeita área afetada <= 0, inválida ou incompatível com o polígono (> 2%)', () => {
    expect(validar({ areaHa: '0' }).areaHa).toMatch(/maior que zero/);
    expect(validar({ areaHa: 'abc' }).areaHa).toMatch(/maior que zero/);
    expect(validar({ areaHa: '42,35' })).toEqual({});
    const poli = {
      type: 'Polygon',
      coordinates: [
        [
          [-56.1, -15.6],
          [-56.09, -15.6],
          [-56.09, -15.59],
          [-56.1, -15.59],
          [-56.1, -15.6],
        ],
      ],
    };
    expect(validar({ areaGeometria: poli, areaHa: '10' }).areaHa).toMatch(/diverge mais de 2%/);
  });

  it('rejeita data de recebimento futura e prazo anterior ao recebimento', () => {
    expect(validar({ dataRecebimento: '2026-11-11' }).dataRecebimento).toMatch(/futura/);
    expect(validar({ dataRecebimento: HOJE })).toEqual({});
    expect(validar({ prazoSugerido: '2026-11-01' }).prazoSugerido).toMatch(/anterior/);
    expect(validar({ prazoSugerido: '2026-11-09' })).toEqual({});
  });
});

describe('montarCorpo e conversões', () => {
  it('monta o corpo da API: IBGE do município, números nas coordenadas e vazio → null', () => {
    const corpo = montarCorpo(
      { ...valido, titulo: '  Título válido  ', latitude: '-15,601', localidade: '  ' },
      MUNICIPIOS,
    );
    expect(corpo).toEqual({
      titulo: 'Título válido',
      descricao: 'Relato fictício.',
      origem: 'DENUNCIA',
      categoria: null,
      municipioId: 5103403,
      localidade: null,
      latitude: -15.601,
      longitude: null,
      areaHa: null,
      areaGeometria: null,
      dataRecebimento: '2026-11-09',
      prioridade: null,
      prazoSugerido: null,
      observacoes: null,
    });
  });

  it('montarCorpo na edição preserva área intocada e envia removerArea=true ao remover', () => {
    const areaOriginal = {
      areaHa: 42.35,
      areaGeometria: {
        type: 'Polygon',
        coordinates: [
          [
            [-56.1, -15.6],
            [-56.09, -15.6],
            [-56.09, -15.59],
            [-56.1, -15.59],
            [-56.1, -15.6],
          ],
        ],
      },
    };
    const preservado = montarCorpo(
      { ...valido, areaHa: '42,35', areaGeometria: areaOriginal.areaGeometria },
      MUNICIPIOS,
      { editando: true, areaOriginal },
    );
    expect(preservado.areaHa).toBeNull();
    expect(preservado.areaGeometria).toBeNull();
    expect(preservado.removerArea).toBe(false);

    const removido = montarCorpo(
      { ...valido, areaHa: '', areaGeometria: null, removerArea: true },
      MUNICIPIOS,
      { editando: true, areaOriginal },
    );
    expect(removido.areaHa).toBeNull();
    expect(removido.areaGeometria).toBeNull();
    expect(removido.removerArea).toBe(true);
  });

  it('lerCoordenada: vazio → null, inválido → NaN', () => {
    expect(lerCoordenada('')).toBeNull();
    expect(lerCoordenada('-15,5')).toBe(-15.5);
    expect(lerCoordenada('1e3')).toBeNaN();
  });

  it('valoresDaDemanda preenche o formulário de edição', () => {
    const valores = valoresDaDemanda({
      titulo: 'T',
      municipio: { id: 5103403, nome: 'Cuiabá' },
      latitude: -15.601,
      categoria: null,
    });
    expect(valores.municipio).toBe('Cuiabá');
    expect(valores.latitude).toBe('-15,601');
    expect(valores.categoria).toBe('');
  });

  it('errosDaApi traduz municipioId para o campo do formulário e mantém o 1º erro', () => {
    expect(
      errosDaApi([
        { campo: 'municipioId', mensagem: 'não deve ser nulo' },
        { campo: 'titulo', mensagem: 'a' },
        { campo: 'titulo', mensagem: 'b' },
      ]),
    ).toEqual({ municipio: 'não deve ser nulo', titulo: 'a' });
  });
});

describe('valoresDaUrl (pré-preenchimento da Sentinela)', () => {
  const catalogos = {
    origens: [{ codigo: 'MONITORAMENTO' }],
    categorias: [{ codigo: 'QUEIMADA_INCENDIO' }],
    municipios: [{ id: 5107909, nome: 'Sinop' }],
  };
  it('preenche origem, município por id, coordenadas e título', () => {
    const p = new URLSearchParams(
      'origem=MONITORAMENTO&municipioId=5107909&categoria=QUEIMADA_INCENDIO&lat=-11.86&lon=-55.5&titulo=Monitoramento',
    );
    expect(valoresDaUrl(p, catalogos)).toEqual({
      origem: 'MONITORAMENTO',
      categoria: 'QUEIMADA_INCENDIO',
      titulo: 'Monitoramento',
      municipio: 'Sinop',
      latitude: '-11.86',
      longitude: '-55.5',
    });
  });
  it('ignora valores fora do catálogo ou inválidos', () => {
    const p = new URLSearchParams('origem=XYZ&municipioId=1&latitude=abc');
    expect(valoresDaUrl(p, catalogos)).toEqual({});
  });

  it('preenche área e centroide a partir de location.state.areaGeometria quando sem lat/lon', () => {
    const p = new URLSearchParams('origem=MONITORAMENTO&municipioId=5107909');
    const poli = {
      type: 'Polygon',
      coordinates: [
        [
          [-55.52, -11.88],
          [-55.5, -11.88],
          [-55.5, -11.86],
          [-55.52, -11.86],
          [-55.52, -11.88],
        ],
      ],
    };
    const saida = valoresDaUrl(p, catalogos, { areaGeometria: poli });
    expect(saida.origem).toBe('MONITORAMENTO');
    expect(saida.municipio).toBe('Sinop');
    expect(saida.areaGeometria).toEqual(poli);
    expect(saida.areaHa).toBeTruthy();
    expect(saida.latitude).toBe('-11,87');
    expect(saida.longitude).toBe('-55,51');
  });
});
