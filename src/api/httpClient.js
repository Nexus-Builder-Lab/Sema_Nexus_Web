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

/** Para clientes que não passam pelo Axios (SSE via fetch): trata um 401 como o interceptor abaixo. */
export function notificarNaoAutorizado() {
  if (getToken()) unauthorizedHandler?.();
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

/**
 * Segundos de espera de uma resposta 429 (limite de requisições da API): `retryAfterSegundos` do
 * problem+json, ou o cabeçalho `Retry-After` como reserva. Devolve null se não for 429 ou não houver valor.
 */
export function segundosDeEspera(error) {
  if (error?.response?.status !== 429) return null;
  const corpo = Number(error.response.data?.retryAfterSegundos);
  const cabecalho = Number(error.response.headers?.['retry-after']);
  if (Number.isFinite(corpo) && corpo > 0) return Math.ceil(corpo);
  if (Number.isFinite(cabecalho) && cabecalho > 0) return Math.ceil(cabecalho);
  return null;
}

/** Mensagem amigável para o 429 (login, IA e upload). Não encerra a sessão: é só espera. */
export function mensagemDeLimite(segundos) {
  return segundos
    ? `Muitas solicitações. Tente novamente em ${segundos} s.`
    : 'Muitas solicitações. Tente novamente em instantes.';
}

/** Extrai uma mensagem amigável de um erro Axios (problem+json da API quando houver). */
export function mensagemDeErro(error, padrao = 'Não foi possível concluir a operação.') {
  if (!error?.response) {
    return 'Não foi possível conectar ao servidor. Verifique a conexão e tente novamente.';
  }
  if (error.response.status === 429) return mensagemDeLimite(segundosDeEspera(error));
  const dados = error.response.data;
  const primeiroCampo = dados?.errors?.[0]?.mensagem;
  return primeiroCampo || dados?.detail || dados?.title || padrao;
}

export default httpClient;
