// Sessão de autenticação: token JWT em memória + sessionStorage (some ao fechar a aba).
// Nunca usar localStorage. O sessionStorage guarda só token e dados básicos do usuário
// (não é dado de negócio) para sobreviver a um F5.

export const SESSION_KEY = 'nx.auth';

let memory = null;

function readStorage() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data && typeof data.token === 'string' && data.token ? data : null;
  } catch {
    return null;
  }
}

/** Devolve `{ token, usuario }` da sessão atual ou `null`. */
export function getSession() {
  if (!memory) memory = readStorage();
  return memory;
}

export function getToken() {
  return getSession()?.token ?? null;
}

export function saveSession({ token, usuario }) {
  memory = { token, usuario };
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(memory));
  } catch {
    // sessionStorage indisponível: a sessão vive só em memória.
  }
}

export function clearSession() {
  memory = null;
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // nada a limpar
  }
}
