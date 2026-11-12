import httpClient from './httpClient.js';

/** POST /api/auth/login → `{ token, expiresIn, usuario }`. */
export async function login(email, senha) {
  const { data } = await httpClient.post('/auth/login', { email, senha });
  return data;
}

/** POST /api/auth/logout → 204. */
export async function logout() {
  await httpClient.post('/auth/logout');
}

/** GET /api/auth/me → `{ id, nome, email, perfil }`. */
export async function me() {
  const { data } = await httpClient.get('/auth/me');
  return data;
}

/** GET /api/auth/config (público) → `{ demo: boolean }`. */
export async function config() {
  const { data } = await httpClient.get('/auth/config');
  return data;
}

/** POST /api/auth/demo/{perfil} (só no profile `demo`) → mesmo corpo do login; sem senha no Web. */
export async function loginDemo(perfil) {
  const { data } = await httpClient.post(`/auth/demo/${encodeURIComponent(perfil)}`);
  return data;
}
