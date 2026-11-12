import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { mensagemDeErro } from '../api/httpClient.js';
import { contarNaoLidas, listarNotificacoes, marcarLida } from '../api/notificacoesApi.js';
import Icon from '../components/Icon.jsx';

const INTERVALO_MS = 60000;
const dataHora = (iso) => (iso ? new Date(iso).toLocaleString('pt-BR') : '');

/** Sino da topbar: contador de não lidas, lista das últimas notificações e marcação de leitura. */
export default function NotificationBell() {
  const [naoLidas, setNaoLidas] = useState(0);
  const [aberto, setAberto] = useState(false);
  const [lista, setLista] = useState({ loading: false, error: null, itens: [] });
  const raiz = useRef(null);

  const atualizarContador = useCallback(() => {
    contarNaoLidas().then(setNaoLidas, () => {});
  }, []);

  const carregarLista = useCallback(() => {
    setLista((l) => ({ ...l, loading: true, error: null }));
    listarNotificacoes({ size: 10 }).then(
      (d) => setLista({ loading: false, error: null, itens: d.content ?? [] }),
      (e) => setLista({ loading: false, error: mensagemDeErro(e), itens: [] }),
    );
  }, []);

  useEffect(() => {
    atualizarContador();
    const t = setInterval(atualizarContador, INTERVALO_MS);
    return () => clearInterval(t);
  }, [atualizarContador]);

  useEffect(() => {
    if (!aberto) return undefined;
    function fora(e) {
      if (raiz.current && !raiz.current.contains(e.target)) setAberto(false);
    }
    function tecla(e) {
      if (e.key === 'Escape') setAberto(false);
    }
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('mousedown', fora);
      document.removeEventListener('keydown', tecla);
    };
  }, [aberto]);

  function alternar() {
    if (!aberto) {
      carregarLista();
      atualizarContador();
    }
    setAberto(!aberto);
  }

  async function ler(n) {
    if (n.lida) return;
    try {
      await marcarLida(n.id);
      setLista((l) => ({
        ...l,
        itens: l.itens.map((i) => (i.id === n.id ? { ...i, lida: true } : i)),
      }));
    } catch (e) {
      setLista((l) => ({ ...l, error: mensagemDeErro(e, 'Não foi possível marcar como lida.') }));
    }
    atualizarContador();
  }

  const rotulo = naoLidas ? `Notificações (${naoLidas} não lidas)` : 'Notificações';

  return (
    <div className="position-relative" ref={raiz}>
      <button
        type="button"
        className="nx-icon-btn position-relative"
        onClick={alternar}
        aria-label={rotulo}
        aria-expanded={aberto}
        aria-haspopup="true"
        title={rotulo}
      >
        <Icon name="bell" />
        {naoLidas > 0 && (
          <span
            className="badge rounded-pill bg-danger position-absolute top-0 start-100 translate-middle"
            data-testid="contador-notificacoes"
          >
            {naoLidas > 99 ? '99+' : naoLidas}
          </span>
        )}
      </button>
      {aberto && (
        <div
          className="card shadow position-absolute end-0 mt-2"
          style={{ width: 'min(22rem, 92vw)', zIndex: 1050 }}
          role="region"
          aria-label="Lista de notificações"
        >
          <div className="card-header fw-semibold">Notificações</div>
          <div
            className="list-group list-group-flush"
            style={{ maxHeight: '60vh', overflowY: 'auto' }}
          >
            {lista.loading && (
              <div className="list-group-item small" role="status">
                Carregando notificações…
              </div>
            )}
            {lista.error && !lista.loading && (
              <div className="list-group-item small text-danger" role="alert">
                {lista.error}
              </div>
            )}
            {!lista.loading && !lista.error && lista.itens.length === 0 && (
              <div className="list-group-item small text-muted">Nenhuma notificação.</div>
            )}
            {!lista.loading &&
              lista.itens.map((n) => (
                <div
                  key={n.id}
                  className={`list-group-item small ${n.lida ? '' : 'fw-semibold bg-body-tertiary'}`}
                >
                  <div>{n.titulo}</div>
                  <div className="fw-normal">{n.mensagem}</div>
                  <div className="d-flex justify-content-between align-items-center mt-1 fw-normal">
                    <span className="text-muted">{dataHora(n.criadaEm)}</span>
                    <span className="d-flex gap-2">
                      {n.demandaId && (
                        <Link to={`/flux/demandas/${n.demandaId}`} onClick={() => setAberto(false)}>
                          Ver demanda
                        </Link>
                      )}
                      {!n.lida && (
                        <button
                          type="button"
                          className="btn btn-sm btn-link p-0"
                          aria-label={`Marcar como lida: ${n.titulo}`}
                          onClick={() => ler(n)}
                        >
                          Marcar como lida
                        </button>
                      )}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
