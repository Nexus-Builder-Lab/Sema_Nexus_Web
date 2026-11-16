// Usuários, setores e equipes fictícios dos mocks (contrato da Issue API#24), com store em memória.
import { http, HttpResponse } from 'msw';
import { problema, temToken } from '../contrato.js';
import { EQUIPES, MEMBROS } from './catalogos.js';

const clonar = (v) => JSON.parse(JSON.stringify(v));

let setores;
let usuarios;
let equipes;
let membros; // equipeId -> [usuarioId]
let proximo;

const SETORES_BASE = [
  { id: 1, sigla: 'DEMO-GAB', nome: 'Gabinete (demonstração)', ativo: true },
  { id: 2, sigla: 'DEMO-FISC', nome: 'Setor de Fiscalização (demonstração)', ativo: true },
  { id: 3, sigla: 'DEMO-DOC', nome: 'Setor Documental (demonstração)', ativo: true },
];

export function resetAdminMock() {
  setores = clonar(SETORES_BASE);
  usuarios = [
    {
      id: 1,
      nome: 'Administrador Demonstrativo',
      email: 'admin@admin.com',
      perfil: 'ADMIN',
      setorId: 1,
      ativo: true,
    },
    {
      id: 2,
      nome: 'Gestor Demonstrativo',
      email: 'gestor@demo.semaalerta.local',
      perfil: 'GESTOR',
      setorId: 2,
      ativo: true,
    },
  ];
  for (const lista of Object.values(MEMBROS)) {
    for (const m of lista) {
      if (!usuarios.some((u) => u.id === m.id)) {
        usuarios.push({
          id: m.id,
          nome: m.nome,
          email: m.email,
          perfil: m.perfil,
          setorId: 2,
          ativo: m.ativo,
        });
      }
    }
  }
  equipes = clonar(EQUIPES).map((e) => ({ ...e, totalMembros: undefined }));
  membros = Object.fromEntries(
    Object.entries(MEMBROS).map(([id, lista]) => [id, lista.map((m) => m.id)]),
  );
  proximo = 100;
}
resetAdminMock();

const siglaDe = (setorId) => setores.find((s) => s.id === setorId)?.sigla ?? null;
const usuarioDto = (u) => ({
  ...u,
  setorSigla: siglaDe(u.setorId),
  ultimoAcesso: null,
  criadoEm: '2026-11-01T10:00:00',
});
const equipeDto = (e) => {
  const resp = usuarios.find((u) => u.id === e.responsavelId);
  return {
    ...e,
    responsavelId: undefined,
    setorSigla: siglaDe(e.setorId),
    ...(resp ? { responsavel: { id: resp.id, nome: resp.nome } } : {}),
    totalMembros: (membros[e.id] ?? []).length,
  };
};
const membroDto = (id) => {
  const u = usuarios.find((x) => x.id === id);
  return { id: u.id, nome: u.nome, email: u.email, perfil: u.perfil, ativo: u.ativo };
};

function invalido(erros, instance) {
  return HttpResponse.json(
    {
      type: 'https://semanexus.demo/problemas/validacao',
      title: 'Dados inválidos',
      status: 400,
      detail: 'Um ou mais campos são inválidos.',
      instance,
      errors: erros,
    },
    { status: 400, headers: { 'Content-Type': 'application/problem+json' } },
  );
}

const naoEncontrado = (o, instance) =>
  problema(404, 'Não encontrado', `${o} inexistente.`, instance);
const conflito = (detail, instance) => problema(409, 'Conflito', detail, instance);

function protegido(resposta) {
  return async ({ request, params }) => {
    const url = new URL(request.url);
    if (!temToken(request)) {
      return problema(401, 'Não autenticado', 'Autenticação necessária.', url.pathname);
    }
    const comCorpo = ['POST', 'PUT', 'PATCH'].includes(request.method);
    const corpo = comCorpo ? await request.json().catch(() => ({})) : null;
    return resposta({ params, corpo, url });
  };
}

const PERFIS = ['ADMIN', 'GESTOR', 'FISCAL', 'ANALISTA', 'CONSULTA'];

function validarUsuario(c, criando) {
  const erros = [];
  if (!c.nome?.trim()) erros.push({ campo: 'nome', mensagem: 'Informe o nome.' });
  if (!c.email?.trim()) erros.push({ campo: 'email', mensagem: 'Informe o e-mail.' });
  if (!PERFIS.includes(c.perfil)) erros.push({ campo: 'perfil', mensagem: 'Perfil inválido.' });
  if ((criando || c.senha) && (!c.senha || c.senha.length < 8 || c.senha.length > 72)) {
    erros.push({ campo: 'senha', mensagem: 'A senha deve ter entre 8 e 72 caracteres.' });
  }
  if (c.setorId != null && !setores.some((s) => s.id === c.setorId)) {
    erros.push({ campo: 'setorId', mensagem: 'Setor inexistente.' });
  }
  return erros;
}

const ultimoAdmin = (u) =>
  u.perfil === 'ADMIN' &&
  u.ativo &&
  usuarios.filter((x) => x.perfil === 'ADMIN' && x.ativo).length === 1;

export const handlersAdmin = [
  http.get(
    '/api/usuarios',
    protegido(({ url }) => {
      const q = (url.searchParams.get('q') ?? '').toLowerCase();
      const perfil = url.searchParams.get('perfil');
      const ativo = url.searchParams.get('ativo');
      const page = Number(url.searchParams.get('page') ?? 0);
      const size = Number(url.searchParams.get('size') ?? 20);
      const todos = usuarios
        .filter(
          (u) =>
            (!q || u.nome.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) &&
            (!perfil || u.perfil === perfil) &&
            (ativo == null || ativo === '' || String(u.ativo) === ativo),
        )
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
      return HttpResponse.json({
        content: todos.slice(page * size, page * size + size).map(usuarioDto),
        page,
        size,
        totalElements: todos.length,
        totalPages: Math.ceil(todos.length / size),
      });
    }),
  ),
  http.post(
    '/api/usuarios',
    protegido(({ corpo }) => {
      const erros = validarUsuario(corpo, true);
      if (erros.length) return invalido(erros, '/api/usuarios');
      if (usuarios.some((u) => u.email.toLowerCase() === corpo.email.trim().toLowerCase())) {
        return conflito('E-mail já cadastrado.', '/api/usuarios');
      }
      const novo = {
        id: proximo++,
        nome: corpo.nome.trim(),
        email: corpo.email.trim(),
        perfil: corpo.perfil,
        setorId: corpo.setorId ?? null,
        ativo: true,
      };
      usuarios.push(novo);
      return HttpResponse.json(usuarioDto(novo), {
        status: 201,
        headers: { Location: `/api/usuarios/${novo.id}` },
      });
    }),
  ),
  http.put(
    '/api/usuarios/:id',
    protegido(({ params, corpo }) => {
      const u = usuarios.find((x) => x.id === Number(params.id));
      if (!u) return naoEncontrado('Usuário', `/api/usuarios/${params.id}`);
      const erros = validarUsuario(corpo, false);
      if (erros.length) return invalido(erros, `/api/usuarios/${u.id}`);
      if (corpo.perfil !== 'ADMIN' && ultimoAdmin(u)) {
        return conflito(
          'Não é possível rebaixar o último administrador ativo.',
          `/api/usuarios/${u.id}`,
        );
      }
      Object.assign(u, {
        nome: corpo.nome.trim(),
        email: corpo.email.trim(),
        perfil: corpo.perfil,
        setorId: corpo.setorId ?? null,
      });
      return HttpResponse.json(usuarioDto(u));
    }),
  ),
  http.patch(
    '/api/usuarios/:id/ativacao',
    protegido(({ params, corpo }) => {
      const u = usuarios.find((x) => x.id === Number(params.id));
      if (!u) return naoEncontrado('Usuário', `/api/usuarios/${params.id}/ativacao`);
      if (!corpo.ativo && ultimoAdmin(u)) {
        return conflito(
          'Não é possível desativar o último administrador ativo.',
          `/api/usuarios/${u.id}/ativacao`,
        );
      }
      u.ativo = Boolean(corpo.ativo);
      return HttpResponse.json(usuarioDto(u));
    }),
  ),

  http.get(
    '/api/setores',
    protegido(() => HttpResponse.json(setores)),
  ),
  http.post(
    '/api/setores',
    protegido(({ corpo }) => {
      const erros = [];
      if (!corpo.sigla?.trim()) erros.push({ campo: 'sigla', mensagem: 'Informe a sigla.' });
      if (!corpo.nome?.trim()) erros.push({ campo: 'nome', mensagem: 'Informe o nome.' });
      if (erros.length) return invalido(erros, '/api/setores');
      const sigla = corpo.sigla.trim().toUpperCase();
      if (setores.some((s) => s.sigla === sigla))
        return conflito('Sigla já cadastrada.', '/api/setores');
      const novo = { id: proximo++, sigla, nome: corpo.nome.trim(), ativo: corpo.ativo ?? true };
      setores.push(novo);
      return HttpResponse.json(novo, { status: 201 });
    }),
  ),
  http.put(
    '/api/setores/:id',
    protegido(({ params, corpo }) => {
      const s = setores.find((x) => x.id === Number(params.id));
      if (!s) return naoEncontrado('Setor', `/api/setores/${params.id}`);
      const sigla = (corpo.sigla ?? '').trim().toUpperCase();
      if (setores.some((x) => x.id !== s.id && x.sigla === sigla)) {
        return conflito('Sigla já cadastrada.', `/api/setores/${s.id}`);
      }
      Object.assign(s, { sigla, nome: corpo.nome.trim(), ativo: corpo.ativo ?? s.ativo });
      return HttpResponse.json(s);
    }),
  ),

  http.get(
    '/api/equipes',
    protegido(() => HttpResponse.json(equipes.map(equipeDto))),
  ),
  http.post(
    '/api/equipes',
    protegido(({ corpo }) => {
      const erros = [];
      if (!corpo.nome?.trim()) erros.push({ campo: 'nome', mensagem: 'Informe o nome.' });
      if (!setores.some((s) => s.id === corpo.setorId)) {
        erros.push({ campo: 'setorId', mensagem: 'Selecione o setor.' });
      }
      if (erros.length) return invalido(erros, '/api/equipes');
      if (equipes.some((e) => e.setorId === corpo.setorId && e.nome === corpo.nome.trim())) {
        return conflito('Já existe equipe com esse nome no setor.', '/api/equipes');
      }
      const nova = {
        id: proximo++,
        nome: corpo.nome.trim(),
        setorId: corpo.setorId,
        ativo: corpo.ativo ?? true,
        responsavelId: corpo.responsavelId ?? undefined,
      };
      equipes.push(nova);
      membros[nova.id] = nova.responsavelId ? [nova.responsavelId] : [];
      return HttpResponse.json(equipeDto(nova), { status: 201 });
    }),
  ),
  http.put(
    '/api/equipes/:id',
    protegido(({ params, corpo }) => {
      const e = equipes.find((x) => x.id === Number(params.id));
      if (!e) return naoEncontrado('Equipe', `/api/equipes/${params.id}`);
      if (!corpo.nome?.trim()) {
        return invalido([{ campo: 'nome', mensagem: 'Informe o nome.' }], `/api/equipes/${e.id}`);
      }
      Object.assign(e, {
        nome: corpo.nome.trim(),
        setorId: corpo.setorId,
        ativo: corpo.ativo ?? e.ativo,
        responsavelId: corpo.responsavelId ?? undefined,
      });
      if (e.responsavelId && !membros[e.id].includes(e.responsavelId)) {
        membros[e.id].push(e.responsavelId);
      }
      return HttpResponse.json(equipeDto(e));
    }),
  ),
  http.get(
    '/api/equipes/:id/membros',
    protegido(({ params }) => {
      const lista = membros[params.id];
      return lista
        ? HttpResponse.json(lista.map(membroDto))
        : naoEncontrado('Equipe', `/api/equipes/${params.id}/membros`);
    }),
  ),
  http.put(
    '/api/equipes/:id/membros',
    protegido(({ params, corpo }) => {
      const e = equipes.find((x) => x.id === Number(params.id));
      if (!e) return naoEncontrado('Equipe', `/api/equipes/${params.id}/membros`);
      const ids = corpo.usuarioIds ?? [];
      if (ids.some((id) => !usuarios.find((u) => u.id === id)?.ativo)) {
        return invalido(
          [{ campo: 'usuarioIds', mensagem: 'Só usuários ativos podem ser membros.' }],
          `/api/equipes/${e.id}/membros`,
        );
      }
      membros[e.id] = [...ids];
      if (corpo.responsavelId) e.responsavelId = corpo.responsavelId;
      if (e.responsavelId && !ids.includes(e.responsavelId)) e.responsavelId = undefined;
      return HttpResponse.json(equipeDto(e));
    }),
  ),
];
