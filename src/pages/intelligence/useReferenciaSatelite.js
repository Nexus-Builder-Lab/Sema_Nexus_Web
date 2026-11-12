import { useEffect, useMemo, useState } from 'react';
import {
  obterReferenciaMetadados,
  obterReferenciaPontos,
  obterReferenciaPorMunicipio,
} from '../../api/intelligenceApi.js';
import { LIMITE_PONTOS_SATELITE } from './mapaConfig.js';

const VAZIO = { chave: null, erro: null, dados: null };

/** Executa `buscar` quando `chave` muda; `carregando` = resposta guardada não é a da chave atual. */
function useConsulta(chave, buscar, ativo = true) {
  const [resp, setResp] = useState(VAZIO);
  useEffect(() => {
    if (!ativo) return undefined;
    let vivo = true;
    buscar()
      .then((dados) => vivo && setResp({ chave, erro: null, dados }))
      .catch((erro) => vivo && setResp({ chave, erro, dados: null }));
    return () => {
      vivo = false;
    };
    // `buscar` é recriada a cada render; a chave identifica a consulta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave, ativo]);
  return { ...resp, carregando: ativo && resp.chave !== chave };
}

/**
 * Dados da camada INPE. `filtros`: `{ municipioId, bioma, satDe, satAte }`; `ligadas`: camadas ativas.
 * O resumo por município (painel) é sempre carregado; os pontos só quando a camada está ligada.
 * A API só filtra `por-municipio` por período, então município/bioma são aplicados aqui.
 */
export default function useReferenciaSatelite(filtros, ligadas, agregadoManual, tentativa = 0) {
  const { municipioId, bioma, satDe, satAte } = filtros;
  const periodo = { de: satDe, ate: satAte };
  const chaveF = `${tentativa}|${satDe}|${satAte}`;
  const chaveP = `${chaveF}|${municipioId}|${bioma}`;

  const meta = useConsulta(`m${tentativa}`, obterReferenciaMetadados);
  const resumo = useConsulta(chaveF, () =>
    obterReferenciaPorMunicipio({ tipo: 'FOCO_CALOR', ...periodo }),
  );

  const itens = useMemo(
    () =>
      (resumo.dados?.itens ?? []).filter(
        (i) =>
          (!municipioId || String(i.municipioId) === String(municipioId)) &&
          (!bioma || i.bioma === bioma),
      ),
    [resumo.dados, municipioId, bioma],
  );
  const total = itens.reduce((soma, i) => soma + i.total, 0);
  const agregado = agregadoManual || total > LIMITE_PONTOS_SATELITE;

  const focos = useConsulta(
    `f${chaveP}`,
    () =>
      obterReferenciaPontos({
        tipo: 'FOCO_CALOR',
        ...periodo,
        municipioId,
        bioma,
        limite: LIMITE_PONTOS_SATELITE,
      }),
    ligadas.FOCO_CALOR && !agregado && !resumo.carregando,
  );
  const deter = useConsulta(
    `d${chaveP}`,
    () => obterReferenciaPontos({ tipo: 'DESMATAMENTO', ...periodo, municipioId, bioma }),
    ligadas.DESMATAMENTO,
  );

  const importacoes = meta.dados?.importacoes ?? [];
  return {
    atualizadoEm: meta.dados?.atualizadoEm ?? resumo.dados?.atualizadoEm ?? null,
    fonte: meta.dados?.fonte ?? 'INPE — dados públicos',
    temDeter: importacoes.some((i) => i.tipo === 'DESMATAMENTO' && i.registros > 0),
    resumo: { carregando: resumo.carregando, erro: resumo.erro, total, itens },
    agregado,
    focos: focos.dados?.pontos ?? [],
    deter: deter.dados?.pontos ?? [],
    truncado: Boolean(focos.dados?.truncado),
    erroPontos: focos.erro ?? deter.erro,
    carregandoPontos: focos.carregando || deter.carregando,
  };
}
