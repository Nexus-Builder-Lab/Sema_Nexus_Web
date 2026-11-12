import { useCallback, useEffect, useMemo, useState } from 'react';
import * as authApi from '../api/authApi.js';
import { setUnauthorizedHandler } from '../api/httpClient.js';
import { AuthContext } from './authContext.js';
import { clearSession, getSession, saveSession } from './sessionStore.js';

/** Mantém token e usuário (memória + sessionStorage) e expõe login/logout. */
export default function AuthProvider({ children }) {
  const [session, setSession] = useState(() => getSession());
  const [sessaoExpirada, setSessaoExpirada] = useState(false);

  // 401 em sessão autenticada (token expirado/inválido): limpa e deixa a rota protegida redirecionar.
  useEffect(
    () =>
      setUnauthorizedHandler(() => {
        clearSession();
        setSession(null);
        setSessaoExpirada(true);
      }),
    [],
  );

  const iniciar = useCallback(({ token, usuario }) => {
    saveSession({ token, usuario });
    setSession({ token, usuario });
    setSessaoExpirada(false);
    return usuario;
  }, []);

  const login = useCallback(
    async (email, senha) => iniciar(await authApi.login(email, senha)),
    [iniciar],
  );

  // Login demonstrativo por perfil (profile `demo` da API): o Web não conhece senhas.
  const loginDemo = useCallback(
    async (perfil) => iniciar(await authApi.loginDemo(perfil)),
    [iniciar],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Mesmo que a API falhe (rede, token já expirado), a sessão local é encerrada.
    }
    clearSession();
    setSession(null);
    setSessaoExpirada(false);
  }, []);

  const value = useMemo(
    () => ({
      usuario: session?.usuario ?? null,
      autenticado: Boolean(session?.token),
      sessaoExpirada,
      login,
      loginDemo,
      logout,
    }),
    [session, sessaoExpirada, login, loginDemo, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
