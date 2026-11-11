import { buscarNoCatalogo, STATUS_DEMANDA } from '../utils/catalogos.js';

const TIPOS_HISTORICO = {
  CADASTRO: 'Cadastro',
  EDICAO: 'Edição',
  TRIAGEM: 'Triagem',
  COMPLEMENTACAO: 'Complementação solicitada',
  DISTRIBUICAO: 'Distribuição',
  INICIO: 'Início da fiscalização',
  ATIVIDADE: 'Atividade',
  FISCALIZACAO: 'Fiscalização',
  CONCLUSAO: 'Conclusão',
  DEVOLUCAO: 'Devolução',
  DOCUMENTO: 'Documento',
  EXCLUSAO: 'Exclusão',
};

function formatarDataHora(iso) {
  if (!iso) return '—';
  const [data, hora = ''] = String(iso).split('T');
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}${hora ? ` ${hora.slice(0, 5)}` : ''}`;
}

/** Linha do tempo do histórico da demanda (já ordenado do mais recente ao mais antigo). */
export default function Timeline({ itens = [] }) {
  if (itens.length === 0) {
    return <p className="text-body-secondary mb-0">Nenhum evento registrado no histórico.</p>;
  }
  return (
    <ol className="list-unstyled mb-0 nx-timeline" aria-label="Histórico da demanda">
      {itens.map((item) => (
        <li key={item.id} className="border-start border-2 ps-3 pb-3 position-relative">
          <div className="d-flex flex-wrap gap-2 align-items-baseline">
            <strong>{TIPOS_HISTORICO[item.tipo] ?? item.tipo}</strong>
            <small className="text-body-secondary">
              {formatarDataHora(item.data)}
              {item.usuario?.nome ? ` · ${item.usuario.nome}` : ''}
            </small>
          </div>
          {item.statusNovo && (
            <div className="small">
              {item.statusAnterior
                ? `${buscarNoCatalogo(STATUS_DEMANDA, item.statusAnterior).label} → `
                : ''}
              {buscarNoCatalogo(STATUS_DEMANDA, item.statusNovo).label}
            </div>
          )}
          {item.texto && <div className="small mt-1">{item.texto}</div>}
        </li>
      ))}
    </ol>
  );
}
