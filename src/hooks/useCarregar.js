import { useCallback, useEffect, useState } from 'react';

/**
 * Executa uma chamada assíncrona e expõe `{ data, loading, error, recarregar }`.
 * `carregar` deve ser estável (useCallback) — mudar a função dispara nova carga.
 * Descarta respostas de chamadas antigas (corrida entre filtros).
 */
export default function useCarregar(carregar) {
  const [estado, setEstado] = useState({ data: null, loading: true, error: null });
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    // Marca "carregando" antes de cada nova busca (filtro, página ou tentar novamente).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEstado((atual) => ({ ...atual, loading: true, error: null }));
    carregar().then(
      (data) => ativo && setEstado({ data, loading: false, error: null }),
      (error) => ativo && setEstado({ data: null, loading: false, error }),
    );
    return () => {
      ativo = false;
    };
  }, [carregar, tentativa]);

  const recarregar = useCallback(() => setTentativa((n) => n + 1), []);
  return { ...estado, recarregar };
}
