import { useCallback, useEffect, useRef, useState } from 'react';
import { PROGRESSO_INICIAL, reduzirProgresso } from './agentesStream.js';

/**
 * Executa uma chamada de agente com SSE: mantém o progresso e um AbortController único (nova
 * execução, `cancelar()` e desmontagem abortam a anterior). `executar(fn)` chama
 * `fn({ signal, onEvento })` e devolve o resultado, ou `undefined` se foi substituída/cancelada.
 */
export function useAgenteStream() {
  const [progresso, setProgresso] = useState(PROGRESSO_INICIAL);
  const controlador = useRef(null);

  const cancelar = useCallback(() => {
    controlador.current?.abort();
    controlador.current = null;
  }, []);
  useEffect(() => cancelar, [cancelar]);

  const executar = useCallback(
    async (fn) => {
      cancelar();
      const ctl = new AbortController();
      controlador.current = ctl;
      setProgresso(PROGRESSO_INICIAL);
      const onEvento = (evento, dados) => {
        if (!ctl.signal.aborted) setProgresso((p) => reduzirProgresso(p, evento, dados));
      };
      try {
        const r = await fn({ signal: ctl.signal, onEvento });
        return ctl.signal.aborted ? undefined : r;
      } catch (e) {
        if (ctl.signal.aborted) return undefined;
        throw e;
      } finally {
        if (controlador.current === ctl) controlador.current = null;
      }
    },
    [cancelar],
  );

  return { progresso, executar, cancelar };
}
