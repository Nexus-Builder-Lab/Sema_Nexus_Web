import { SESSION_KEY } from '../auth/sessionStore.js';
import { TOKEN_MOCK } from '../mocks/handlers.js';

export const USUARIO_ADMIN = {
  id: 1,
  nome: 'Administrador Demonstrativo',
  email: 'admin@admin.com',
  perfil: 'ADMIN',
};

/** Simula uma sessão já iniciada (token dos mocks + usuário) no sessionStorage. */
export function iniciarSessao(usuario = USUARIO_ADMIN, token = TOKEN_MOCK) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token, usuario }));
}
