import axios from 'axios';
import { getToken } from '../auth/sessionStore.js';

// A API é sempre chamada por caminho relativo: proxy do Vite em dev e do Nginx no Docker.
export const API_BASE_URL = '/api';

const httpClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { Accept: 'application/json, application/problem+json' },
});

let unauthorizedHandler = null;

/**
 * Registra o que fazer quando a API responder 401 em uma sessão autenticada
 * (o AuthProvider limpa a sessão; a rota protegida leva ao login).
 * Devolve uma função que remove o registro.
 */
export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
  return () => {
    if (unauthorizedHandler === handler) unauthorizedHandler = null;
  };
}

httpClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Rotas públicas: um 401 aqui não significa sessão expirada (ex.: senha incorreta no login).
const PUBLIC_PATHS = ['/auth/login', '/auth/config'];

function isPublic(url = '') {
  return PUBLIC_PATHS.some((path) => url.endsWith(path));
}

httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    if (status === 401 && getToken() && !isPublic(error.config?.url)) {
      unauthorizedHandler?.();
    }
    return Promise.reject(error);
  },
);

/** Extrai uma mensagem amigável de um erro Axios (problem+json da API quando houver). */
export function mensagemDeErro(error, padrao = 'Não foi possível concluir a operação.') {
  if (!error?.response) {
    return 'Não foi possível conectar ao servidor. Verifique a conexão e tente novamente.';
  }
  const dados = error.response.data;
  const primeiroCampo = dados?.errors?.[0]?.mensagem;
  return primeiroCampo || dados?.detail || dados?.title || padrao;
}

export default httpClient;
