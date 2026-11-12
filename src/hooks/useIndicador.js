import { useCallback } from 'react';
import useCarregar from './useCarregar.js';

/** Carrega um indicador da API com os filtros aplicados (recarrega quando eles mudam). */
export default function useIndicador(funcao, filtros = {}) {
  const chave = JSON.stringify(filtros);
  // `chave` identifica o conteúdo dos filtros: o callback só muda quando eles mudam.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const carregar = useCallback(() => funcao(filtros), [funcao, chave]);
  return useCarregar(carregar);
}
