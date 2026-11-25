import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listarUsuarios } from '../api/adminApi.js';
import { listarDemandas } from '../api/demandasApi.js';
import { listarDocumentos } from '../api/documentosApi.js';
import Icon from '../components/Icon.jsx';
import { STATUS_DEMANDA, buscarNoCatalogo } from '../utils/catalogos.js';

const MINIMO = 2;
const ATRASO_MS = 250;

/** Busca textual nos endpoints de listagem (`q`); a API aplica o perfil (usuários só para ADMIN). */
async function buscar(q, perfil) {
  const tarefas = [
    {
      rotulo: 'Demandas',
      icon: 'clipboard',
      run: async () =>
        (await listarDemandas({ q, page: 0, size: 5 })).content.map((d) => ({
          id: `d${d.id}`,
          titulo: `${d.numero} — ${d.titulo}`,
          sub: `${buscarNoCatalogo(STATUS_DEMANDA, d.status).label}${d.municipio?.nome ? ` · ${d.municipio.nome}/MT` : ''}`,
          href: `/flux/demandas/${d.id}`,
        })),
    },
    {
      rotulo: 'Documentos',
      icon: 'file',
      run: async () =>
        (await listarDocumentos({ q, page: 0, size: 5 })).content.map((d) => ({
          id: `o${d.id}`,
          titulo: d.titulo,
          sub: [d.categoria, d.nomeArquivo].filter(Boolean).join(' · '),
          href: `/docia/documentos/${d.id}`,
        })),
    },
  ];
  if (perfil === 'ADMIN') {
    tarefas.push({
      rotulo: 'Usuários',
      icon: 'users',
      run: async () =>
        (await listarUsuarios({ q, page: 0, size: 5 })).content.map((u) => ({
          id: `u${u.id}`,
          titulo: u.nome,
          sub: u.email,
          href: '/admin',
        })),
    });
  }
  const resultados = await Promise.allSettled(tarefas.map((t) => t.run()));
  return tarefas
    .map((t, i) => ({
      rotulo: t.rotulo,
      icon: t.icon,
      itens: resultados[i].status === 'fulfilled' ? resultados[i].value : [],
      falhou: resultados[i].status === 'rejected',
    }))
    .filter((g) => g.itens.length > 0 || g.falhou);
}

/** Pesquisa global da topbar (Ctrl+/): resultados agrupados, navegação por setas e Enter. */
export default function GlobalSearch({ user }) {
  const navigate = useNavigate();
  const listaId = useId();
  const input = useRef(null);
  const raiz = useRef(null);
  const [texto, setTexto] = useState('');
  const [aberto, setAberto] = useState(false);
  const [resultado, setResultado] = useState({ termo: '', grupos: [] });
  const [foco, setFoco] = useState(-1);
  const termo = texto.trim();
  const ativo = termo.length >= MINIMO;
  const perfil = user?.perfil;

  const carregando = resultado.termo !== termo;
  const grupos = carregando ? [] : resultado.grupos;
  const itens = useMemo(() => grupos.flatMap((g) => g.itens), [grupos]);

  useEffect(() => {
    const atalho = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        input.current?.focus();
        input.current?.select();
        setAberto(true);
      }
    };
    document.addEventListener('keydown', atalho);
    return () => document.removeEventListener('keydown', atalho);
  }, []);

  useEffect(() => {
    if (!aberto) return undefined;
    const fora = (e) => !raiz.current?.contains(e.target) && setAberto(false);
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, [aberto]);

  useEffect(() => {
    if (!ativo) return undefined;
    let cancelado = false;
    const t = setTimeout(async () => {
      const g = await buscar(termo, perfil);
      if (cancelado) return;
      setResultado({ termo, grupos: g });
      setFoco(-1);
    }, ATRASO_MS);
    return () => {
      cancelado = true;
      clearTimeout(t);
    };
  }, [termo, ativo, perfil]);

  function abrir(item) {
    if (!item) return;
    setAberto(false);
    setTexto('');
    input.current?.blur();
    navigate(item.href);
  }

  function teclas(e) {
    if (e.key === 'Escape') {
      setAberto(false);
      input.current?.blur();
    } else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && itens.length) {
      e.preventDefault();
      setAberto(true);
      setFoco((f) => (f + (e.key === 'ArrowDown' ? 1 : -1) + itens.length) % itens.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (foco >= 0) abrir(itens[foco]);
    }
  }

  let indice = -1;
  return (
    <div className="nx-search-wrap" ref={raiz}>
      <form className="nx-search" role="search" onSubmit={(e) => e.preventDefault()}>
        <Icon name="search" size={16} />
        <input
          ref={input}
          type="search"
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            setAberto(true);
          }}
          onFocus={() => setAberto(true)}
          onKeyDown={teclas}
          placeholder="Pesquisar…"
          aria-label="Pesquisa global"
          role="combobox"
          aria-expanded={aberto && ativo}
          aria-controls={listaId}
          aria-autocomplete="list"
          aria-activedescendant={foco >= 0 ? `${listaId}-${foco}` : undefined}
          autoComplete="off"
        />
        <kbd className="nx-search-kbd" aria-hidden="true">
          Ctrl /
        </kbd>
      </form>
      {aberto && ativo && (
        <div className="nx-search-results" id={listaId} role="listbox" aria-label="Resultados">
          {carregando && <div className="nx-search-msg">Buscando…</div>}
          {!carregando && grupos.length === 0 && (
            <div className="nx-search-msg">Nenhum resultado para “{termo}”.</div>
          )}
          {!carregando &&
            grupos.map((g) => (
              <div key={g.rotulo} role="group" aria-label={g.rotulo}>
                <div className="nx-search-group">{g.rotulo}</div>
                {g.falhou && <div className="nx-search-msg">Não foi possível buscar agora.</div>}
                {g.itens.map((item) => {
                  indice += 1;
                  const i = indice;
                  return (
                    <div
                      key={item.id}
                      id={`${listaId}-${i}`}
                      role="option"
                      aria-selected={foco === i}
                      className={`nx-search-item${foco === i ? ' is-active' : ''}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => abrir(item)}
                      onMouseEnter={() => setFoco(i)}
                    >
                      <Icon name={g.icon} size={16} />
                      <div>
                        <strong>{item.titulo}</strong>
                        <span>{item.sub}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
