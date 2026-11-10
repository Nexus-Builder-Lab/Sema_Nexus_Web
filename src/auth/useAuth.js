import { useContext } from 'react';
import { AuthContext } from './authContext.js';

/** Acesso ao estado de autenticação: `usuario`, `autenticado`, `login`, `logout`, `sessaoExpirada`. */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>.');
  return ctx;
}
