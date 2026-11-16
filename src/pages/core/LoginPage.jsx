import {
  ArrowRight,
  Briefcase,
  ClipboardCheck,
  Eye,
  FileSearch,
  LineChart,
  LogIn,
  Radar,
  ShieldCheck,
  TriangleAlert,
  Workflow,
} from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import * as authApi from '../../api/authApi.js';
import { mensagemDeErro } from '../../api/httpClient.js';
import { useAuth } from '../../auth/useAuth.js';
import Logo from '../../components/Logo.jsx';
import DemoBanner from '../../layout/DemoBanner.jsx';
import ContornoMT from './ContornoMT.jsx';
import { validarLogin } from './validarLogin.js';

const ICONES_PERFIL = {
  ADMIN: ShieldCheck,
  GESTOR: Briefcase,
  FISCAL: ClipboardCheck,
  ANALISTA: LineChart,
  CONSULTA: Eye,
};

const MODULOS = [
  {
    icone: Radar,
    nome: 'SEMA Intelligence',
    texto: 'Indicadores, mapa de ocorrências dos 142 municípios e relatórios gerenciais.',
  },
  {
    icone: Workflow,
    nome: 'SEMA Flux',
    texto: 'Demandas, fluxo de trabalho, prazos e produtividade por setor.',
  },
  {
    icone: FileSearch,
    nome: 'SEMA DocIA',
    texto: 'Gestão documental, análise, comparação e assistente demonstrativo.',
  },
];

function mensagemDeLogin(error) {
  const status = error?.response?.status;
  if (status === 401) return 'E-mail ou senha inválidos.';
  if (status === 403) return 'Usuário inativo. Procure o administrador.';
  if (status === 400) return mensagemDeErro(error, 'Dados inválidos. Revise os campos.');
  return mensagemDeErro(error, 'Não foi possível entrar. Tente novamente.');
}

/** Rota para onde voltar após o login (a que o usuário tentou abrir). */
function destinoAposLogin(location) {
  const from = location.state?.from;
  if (!from?.pathname || from.pathname === '/login') return '/';
  return `${from.pathname}${from.search ?? ''}${from.hash ?? ''}`;
}

export default function LoginPage() {
  const { autenticado, login, loginDemo, sessaoExpirada } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const emailId = useId();
  const senhaId = useId();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [perfisDemo, setPerfisDemo] = useState([]);

  // Os cartões de "Modo demonstração" só aparecem quando a API informa `demo: true`.
  useEffect(() => {
    let ativo = true;
    authApi
      .config()
      .then((cfg) => {
        if (!ativo) return;
        setPerfisDemo(cfg?.demo === true && Array.isArray(cfg.perfisDemo) ? cfg.perfisDemo : []);
      })
      .catch(() => ativo && setPerfisDemo([]));
    return () => {
      ativo = false;
    };
  }, []);

  if (autenticado && !enviando) {
    return <Navigate to={destinoAposLogin(location)} replace />;
  }

  async function executar(acao) {
    setErroGeral('');
    setEnviando(true);
    try {
      await acao();
      navigate(destinoAposLogin(location), { replace: true });
    } catch (error) {
      setErroGeral(mensagemDeLogin(error));
      setEnviando(false);
    }
  }

  function aoEnviar(event) {
    event.preventDefault();
    const encontrados = validarLogin({ email, senha });
    setErros(encontrados);
    setErroGeral('');
    if (Object.keys(encontrados).length > 0) return;
    executar(() => login(email.trim(), senha));
  }

  return (
    <div className="nx-login">
      <DemoBanner />
      <div className="nx-login-grid">
        <section className="nx-login-hero" aria-label="Apresentação do SEMA ALERTA">
          <ContornoMT />
          <div className="nx-login-hero-body">
            <Logo subtitulo="Gestão ambiental · Mato Grosso" />
            <h1>Plataforma Inteligente de Gestão, Análise e Apoio à Decisão Ambiental</h1>
            <p className="nx-login-lead">
              Integra dados ambientais, demandas de fiscalização e documentos em um único ambiente
              demonstrativo de Mato Grosso.
            </p>
            <ul className="nx-login-pillars list-unstyled">
              {MODULOS.map(({ icone: Icone, nome, texto }) => (
                <li key={nome} className="nx-login-pillar">
                  <span className="nx-login-pillar-ico" aria-hidden="true">
                    <Icone size={20} />
                  </span>
                  <span>
                    <strong>{nome}</strong>
                    <span>{texto}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <footer className="nx-login-hero-foot">
            Protótipo demonstrativo com dados fictícios. Amazônia · Cerrado · Pantanal.
          </footer>
        </section>

        <main className="nx-login-panel">
          <section className="nx-login-card" aria-labelledby="login-titulo">
            <h2 id="login-titulo" className="h4 mb-1">
              Acesso ao sistema
            </h2>
            <p className="text-body-secondary mb-4">Entre com seu e-mail e senha.</p>

            {sessaoExpirada && !erroGeral && (
              <div className="alert alert-warning" role="alert">
                Sua sessão expirou. Entre novamente.
              </div>
            )}
            {erroGeral && (
              <div className="alert alert-danger" role="alert">
                {erroGeral}
              </div>
            )}

            <form onSubmit={aoEnviar} noValidate>
              <div className="mb-3">
                <label htmlFor={emailId} className="form-label">
                  E-mail
                </label>
                <input
                  id={emailId}
                  type="email"
                  className={`form-control${erros.email ? ' is-invalid' : ''}`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  maxLength={254}
                  aria-invalid={erros.email ? 'true' : undefined}
                  aria-describedby={erros.email ? `${emailId}-erro` : undefined}
                  disabled={enviando}
                />
                {erros.email && (
                  <div id={`${emailId}-erro`} className="invalid-feedback">
                    {erros.email}
                  </div>
                )}
              </div>
              <div className="mb-3">
                <label htmlFor={senhaId} className="form-label">
                  Senha
                </label>
                <input
                  id={senhaId}
                  type="password"
                  className={`form-control${erros.senha ? ' is-invalid' : ''}`}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  autoComplete="current-password"
                  maxLength={128}
                  aria-invalid={erros.senha ? 'true' : undefined}
                  aria-describedby={erros.senha ? `${senhaId}-erro` : undefined}
                  disabled={enviando}
                />
                {erros.senha && (
                  <div id={`${senhaId}-erro`} className="invalid-feedback">
                    {erros.senha}
                  </div>
                )}
              </div>
              <button type="submit" className="btn btn-primary w-100" disabled={enviando}>
                {enviando ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
                    Entrando...
                  </>
                ) : (
                  <>
                    <LogIn size={16} className="me-2" aria-hidden="true" />
                    Entrar
                  </>
                )}
              </button>
            </form>

            {perfisDemo.length > 0 && (
              <section aria-labelledby="demo-titulo">
                <h3 id="demo-titulo" className="nx-login-divider">
                  Modo demonstração
                </h3>
                <div className="nx-demo-profiles">
                  {perfisDemo.map(({ perfil, nome, descricao }) => {
                    const Icone = ICONES_PERFIL[perfil] ?? Eye;
                    return (
                      <button
                        key={perfil}
                        type="button"
                        className="nx-demo-profile"
                        onClick={() => executar(() => loginDemo(perfil))}
                        disabled={enviando}
                        aria-label={`Entrar como ${nome ?? perfil}`}
                      >
                        <span className="nx-demo-profile-ico" aria-hidden="true">
                          <Icone size={18} />
                        </span>
                        <span className="nx-demo-profile-txt">
                          <strong>{nome ?? perfil}</strong>
                          <span>{descricao}</span>
                        </span>
                        <ArrowRight size={16} className="nx-demo-profile-seta" aria-hidden="true" />
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            <p className="nx-login-note">
              <TriangleAlert size={15} aria-hidden="true" />
              <span>
                Ambiente de demonstração com dados fictícios, sem integração com sistemas
                institucionais.
              </span>
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}
