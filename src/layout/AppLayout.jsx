import { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AssistenteGlobalGaveta from './AssistenteGlobalGaveta.jsx';
import DemoBanner from './DemoBanner.jsx';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';

const SIDEBAR_ID = 'nx-sidebar';
const COLLAPSE_KEY = 'nx.sidebarCollapsed';

function readCollapsed() {
  try {
    // Preferência de interface (não é dado de negócio) — vale só para a sessão do navegador.
    return sessionStorage.getItem(COLLAPSE_KEY) === '1';
  } catch {
    return false;
  }
}

/** Layout das páginas autenticadas: sidebar, topbar, faixa demonstrativa e rodapé. */
export default function AppLayout({ user, onLogout }) {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  // O menu do celular fica aberto só na rota em que foi aberto: navegar o fecha.
  const { pathname } = useLocation();
  const [openAt, setOpenAt] = useState(null);
  const mobileOpen = openAt === pathname;
  const setMobileOpen = (open) => setOpenAt(open ? pathname : null);

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpenAt(null);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen]);

  // Assistente Global: Ctrl+K / Cmd+K abre de qualquer tela, inclusive com o foco num campo de texto
  // (combinação com modificador não digita nada). Não abre sobre outro diálogo modal.
  // O foco volta ao elemento que o abriu (botão da topbar ou o campo em que se estava).
  const [assistente, setAssistente] = useState(false);
  const origemFoco = useRef(null);
  const abrirAssistente = useCallback(() => {
    origemFoco.current = document.activeElement;
    setAssistente(true);
  }, []);
  const fecharAssistente = useCallback(() => {
    setAssistente(false);
    const alvo = origemFoco.current;
    origemFoco.current = null;
    if (alvo?.isConnected) setTimeout(() => alvo.focus(), 0);
  }, []);
  useEffect(() => {
    const atalho = (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.key.toLowerCase() !== 'k') return;
      e.preventDefault();
      if (assistente) return;
      if (document.querySelector('[aria-modal="true"]')) return;
      abrirAssistente();
    };
    document.addEventListener('keydown', atalho);
    return () => document.removeEventListener('keydown', atalho);
  }, [assistente, abrirAssistente]);

  function toggleCollapsed() {
    setCollapsed((value) => {
      const next = !value;
      try {
        sessionStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      } catch {
        // sessionStorage indisponível: mantém só em memória.
      }
      return next;
    });
  }

  const classes = ['nx-app'];
  if (collapsed) classes.push('is-collapsed');
  if (mobileOpen) classes.push('is-mobile-open');

  return (
    <div className={classes.join(' ')}>
      <a href="#conteudo" className="nx-skip-link">
        Pular para o conteúdo
      </a>
      <Sidebar
        id={SIDEBAR_ID}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapsed}
        onNavigate={() => setMobileOpen(false)}
      />
      {mobileOpen && (
        <div className="nx-backdrop" aria-hidden="true" onClick={() => setMobileOpen(false)} />
      )}
      <div className="nx-main">
        <Topbar
          sidebarId={SIDEBAR_ID}
          mobileOpen={mobileOpen}
          onToggleMobile={() => setMobileOpen(!mobileOpen)}
          user={user}
          onLogout={onLogout}
          onAbrirAssistente={abrirAssistente}
        />
        <DemoBanner />
        <main id="conteudo" className="nx-view" tabIndex={-1}>
          <Outlet />
        </main>
        <footer className="nx-footer">
          SEMA ALERTA · plataforma demonstrativa com dados fictícios, sem integração com sistemas
          institucionais.
        </footer>
      </div>
      <AssistenteGlobalGaveta aberta={assistente} onFechar={fecharAssistente} />
    </div>
  );
}
