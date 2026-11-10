import { useEffect, useId, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import * as authApi from '../../api/authApi.js';
import { mensagemDeErro } from '../../api/httpClient.js';
import { useAuth } from '../../auth/useAuth.js';
import DemoBanner from '../../layout/DemoBanner.jsx';
import { validarLogin } from './validarLogin.js';

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
  const { autenticado, login, sessaoExpirada } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const emailId = useId();
  const senhaId = useId();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [demo, setDemo] = useState(false);

  // O aviso com o usuário de teste só aparece quando a API informa `demo: true`.
  useEffect(() => {
    let ativo = true;
    authApi
      .config()
      .then((cfg) => ativo && setDemo(cfg?.demo === true))
      .catch(() => ativo && setDemo(false));
    return () => {
      ativo = false;
    };
  }, []);

  if (autenticado && !enviando) {
    return <Navigate to={destinoAposLogin(location)} replace />;
  }

  async function aoEnviar(event) {
    event.preventDefault();
    const encontrados = validarLogin({ email, senha });
    setErros(encontrados);
    setErroGeral('');
    if (Object.keys(encontrados).length > 0) return;

    setEnviando(true);
    try {
      await login(email.trim(), senha);
      navigate(destinoAposLogin(location), { replace: true });
    } catch (error) {
      setErroGeral(mensagemDeLogin(error));
      setEnviando(false);
    }
  }

  return (
    <div className="nx-login">
      <DemoBanner />
      <main className="nx-login-main">
        <section className="card shadow-sm nx-login-card" aria-labelledby="login-titulo">
          <div className="card-body p-4">
            <div className="nx-module-tag">Core</div>
            <h1 id="login-titulo" className="h4 mb-1">
              SEMA NEXUS
            </h1>
            <p className="text-body-secondary mb-3">Entre com seu e-mail e senha.</p>

            {sessaoExpirada && !erroGeral && (
              <div className="alert alert-warning" role="alert">
                Sua sessão expirou. Entre novamente.
              </div>
            )}
            {demo && (
              <div className="alert alert-info" role="note">
                Ambiente demonstrativo — dados fictícios. Usuário de teste: admin@admin.com
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
                  'Entrar'
                )}
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
